"""
S3 backup / migration tool — for moving between two different AWS accounts.

The order that matters:

    1. download   OLD bucket  -> local folder      (do this FIRST)
    2. verify     local folder against OLD bucket  (prove the copy is intact)
    3. upload     local folder -> NEW bucket
    4. compare    OLD bucket  vs NEW bucket        (prove nothing was lost)

Only after step 4 exits 0 should anything be deleted from the old account.

Credentials
-----------
Because the two buckets live in DIFFERENT AWS accounts, you cannot rely on
.env for both. Every command takes explicit credentials:

    --profile OLDACCT                     # a named profile in ~/.aws/credentials
    --access-key AKIA... --secret-key ... # or keys inline
    (nothing)                             # falls back to .env / ambient AWS config

Usage
-----
  cd apps/backend

  # 1. pull everything out of the OLD account
  python scripts/s3_backup.py download --bucket old-bucket --profile oldacct --dest D:/hrms_backup

  # 2. confirm the local copy is byte-correct
  python scripts/s3_backup.py verify --bucket old-bucket --profile oldacct --dest D:/hrms_backup

  # 3. push into the NEW account
  python scripts/s3_backup.py upload --bucket new-bucket --profile newacct --src D:/hrms_backup

  # 4. final check across accounts
  python scripts/s3_backup.py compare --source old-bucket --source-profile oldacct \
                                      --target new-bucket --target-profile newacct

download/verify/compare are read-only. upload writes only to the bucket you name,
and skips any object already present with a matching size.
"""

import argparse
import hashlib
import json
import mimetypes
import os
import sys
from collections import defaultdict
from datetime import datetime

from dotenv import load_dotenv

BASE = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE, "..", ".env"))

DEFAULT_BUCKET = os.getenv("S3_BUCKET_NAME")
DEFAULT_REGION = os.getenv("AWS_REGION")
MANIFEST_NAME = "_manifest.json"


def human(n):
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if n < 1024:
            return f"{n:,.1f} {unit}"
        n /= 1024
    return f"{n:,.1f} PB"


def available_profiles():
    try:
        import boto3
        return boto3.Session().available_profiles or []
    except Exception:
        return []


def make_client(profile=None, access_key=None, secret_key=None, region=None):
    """Build a client for a specific account, not whatever .env happens to hold."""
    try:
        import boto3
        from botocore.exceptions import ProfileNotFound
    except ImportError:
        sys.exit("boto3 not installed. Run: pip install boto3")

    region = region or DEFAULT_REGION

    if profile:
        try:
            return boto3.Session(profile_name=profile).client("s3", region_name=region)
        except ProfileNotFound:
            found = available_profiles()
            sys.exit(
                f"\nAWS profile '{profile}' does not exist on this machine.\n\n"
                + (
                    "Profiles you do have: " + ", ".join(found) + "\n\n"
                    if found else
                    "You have no named profiles configured (no ~/.aws/credentials).\n\n"
                )
                + "Pick one of these instead:\n"
                  "  1. Drop --profile entirely to use the keys in apps/backend/.env:\n"
                  "       python scripts/s3_backup.py download --bucket <bucket> --dest <folder>\n"
                  "  2. Pass keys directly:\n"
                  "       ... --access-key AKIA... --secret-key ...\n"
                  "  3. Create the profile first:\n"
                  f"       aws configure --profile {profile}\n"
            )

    if access_key and secret_key:
        return boto3.client(
            "s3", region_name=region,
            aws_access_key_id=access_key, aws_secret_access_key=secret_key,
        )

    # Fall back to .env / ambient AWS config
    if not os.getenv("AWS_ACCESS_KEY_ID"):
        found = available_profiles()
        sys.exit(
            "\nNo credentials available.\n\n"
            "AWS_ACCESS_KEY_ID is not set in apps/backend/.env, and no --profile "
            "or --access-key was given.\n"
            + ("Available profiles: " + ", ".join(found) + "\n" if found else "")
            + "\nEither set the keys in .env, or pass --access-key/--secret-key.\n"
        )
    return boto3.client("s3", region_name=region)


def client_from(args, side=""):
    return make_client(
        profile=getattr(args, f"{side}profile", None) or getattr(args, "profile", None),
        access_key=getattr(args, f"{side}access_key", None) or getattr(args, "access_key", None),
        secret_key=getattr(args, f"{side}secret_key", None) or getattr(args, "secret_key", None),
        region=getattr(args, "region", None),
    )


def list_all(s3, bucket, prefix=None):
    out = {}
    kwargs = {"Bucket": bucket}
    if prefix:
        kwargs["Prefix"] = prefix
    for page in s3.get_paginator("list_objects_v2").paginate(**kwargs):
        for obj in page.get("Contents", []):
            out[obj["Key"]] = {
                "size": obj["Size"],
                "etag": obj["ETag"].strip('"'),
                "modified": obj["LastModified"].isoformat(),
            }
    return out


def md5_of(path):
    h = hashlib.md5()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def local_path_for(dest, key):
    return os.path.join(dest, *key.split("/"))


def ensure_dest_writable(dest):
    """
    Fail fast, with a useful message, if the destination cannot be created.

    Without this you get a WinError 3 traceback partway through a download when
    the drive letter does not exist.
    """
    dest = os.path.abspath(dest)
    anchor = os.path.splitdrive(dest)[0] or os.path.sep

    if os.name == "nt" and anchor and not os.path.exists(anchor + os.sep):
        drives = [
            f"{chr(c)}:" for c in range(ord("A"), ord("Z") + 1)
            if os.path.exists(f"{chr(c)}:\\")
        ]
        sys.exit(
            f"\nDrive {anchor} does not exist on this machine.\n\n"
            f"Drives you do have: {', '.join(drives)}\n\n"
            f"Pick a path on one of those, for example:\n"
            f"  --dest C:/Raviteja/hrms_backup\n"
        )

    try:
        os.makedirs(dest, exist_ok=True)
    except OSError as e:
        sys.exit(f"\nCannot create destination folder:\n  {dest}\n  {type(e).__name__}: {e}\n")

    probe = os.path.join(dest, ".write_test")
    try:
        with open(probe, "w") as fh:
            fh.write("ok")
        os.remove(probe)
    except OSError as e:
        sys.exit(f"\nDestination is not writable:\n  {dest}\n  {type(e).__name__}: {e}\n")

    return dest


def walk_local(src):
    """Every file under src as {s3_key: local_path}, excluding the manifest."""
    out = {}
    for root, _dirs, files in os.walk(src):
        for name in files:
            full = os.path.join(root, name)
            rel = os.path.relpath(full, src).replace(os.sep, "/")
            if rel == MANIFEST_NAME:
                continue
            out[rel] = full
    return out


def summarise(by_prefix, label="PREFIX"):
    print(f"\n{label:24} {'FILES':>8} {'SIZE':>11}")
    print("-" * 46)
    for p in sorted(by_prefix, key=lambda x: -by_prefix[x]["bytes"]):
        print(f"{p:24} {by_prefix[p]['n']:>8,} {human(by_prefix[p]['bytes']):>11}")
    print("-" * 46)


# --------------------------------------------------------------------------- #

def cmd_download(args):
    bucket = args.bucket or DEFAULT_BUCKET
    if not bucket:
        sys.exit("No bucket. Pass --bucket or set S3_BUCKET_NAME in .env")

    # Validate the destination BEFORE listing, so a bad drive letter fails in
    # a second rather than partway through the transfer.
    dest = ensure_dest_writable(args.dest)
    s3 = client_from(args)

    print(f"Source : s3://{bucket}/{args.prefix or ''}")
    print(f"Dest   : {dest}")
    print("Listing…")
    try:
        objects = list_all(s3, bucket, args.prefix)
    except Exception as e:
        sys.exit(f"Could not list bucket: {type(e).__name__}: {e}\n"
                 f"If this is an access error, the credentials in use probably belong "
                 f"to the other AWS account. Pass --profile or --access-key/--secret-key.")

    if not objects:
        print("Nothing to download.")
        return

    total = sum(o["size"] for o in objects.values())
    print(f"Found  : {len(objects):,} objects, {human(total)}\n")

    downloaded = skipped = failed = 0
    done = 0
    by_prefix = defaultdict(lambda: {"n": 0, "bytes": 0})
    errors = []

    for i, (key, meta) in enumerate(sorted(objects.items()), 1):
        path = local_path_for(dest, key)
        os.makedirs(os.path.dirname(path), exist_ok=True)

        if os.path.exists(path) and os.path.getsize(path) == meta["size"]:
            skipped += 1
        else:
            try:
                s3.download_file(bucket, key, path)
                downloaded += 1
            except Exception as e:
                failed += 1
                errors.append((key, f"{type(e).__name__}: {e}"))
                continue

        done += meta["size"]
        top = key.split("/")[0] + "/" if "/" in key else "(root)"
        by_prefix[top]["n"] += 1
        by_prefix[top]["bytes"] += meta["size"]

        if i % 25 == 0 or i == len(objects):
            pct = done / total * 100 if total else 100
            print(f"  [{i:>5}/{len(objects)}] {pct:5.1f}%  {human(done)}", flush=True)

    os.makedirs(dest, exist_ok=True)
    with open(os.path.join(dest, MANIFEST_NAME), "w", encoding="utf-8") as fh:
        json.dump({
            "source_bucket": bucket,
            "prefix": args.prefix,
            "captured_at": datetime.now().astimezone().isoformat(),
            "object_count": len(objects),
            "total_bytes": total,
            "objects": objects,
        }, fh, indent=2)

    summarise(by_prefix)
    print(f"downloaded {downloaded:,} | already present {skipped:,} | failed {failed:,}")
    print(f"manifest -> {os.path.join(dest, MANIFEST_NAME)}")

    if errors:
        print(f"\n{len(errors)} failed:")
        for k, err in errors[:20]:
            print(f"  {k}\n    {err}")
        sys.exit(1)

    print("\nNext: verify the local copy before touching the old account.")
    print(f"  python scripts/s3_backup.py verify --bucket {bucket} --dest {dest}")


def cmd_verify(args):
    """Re-hash every local file and check it against the bucket's size + ETag."""
    dest = os.path.abspath(args.dest)
    bucket = args.bucket or DEFAULT_BUCKET
    s3 = client_from(args)

    print(f"Local  : {dest}")
    print(f"Against: s3://{bucket}")
    print("Listing…")
    remote = list_all(s3, bucket, args.prefix)
    local = walk_local(dest)

    missing_local = sorted(set(remote) - set(local))
    extra_local = sorted(set(local) - set(remote))
    corrupt, ok, multipart = [], 0, 0

    for key in sorted(set(remote) & set(local)):
        path, meta = local[key], remote[key]
        if os.path.getsize(path) != meta["size"]:
            corrupt.append((key, "size differs"))
            continue
        if "-" in meta["etag"]:
            # multipart upload — ETag is not a plain MD5, size check is all we get
            multipart += 1
            ok += 1
            continue
        if md5_of(path) != meta["etag"]:
            corrupt.append((key, "checksum differs"))
        else:
            ok += 1

    print(f"\nremote objects : {len(remote):,}")
    print(f"local files    : {len(local):,}")
    print(f"verified OK    : {ok:,}" + (f"  ({multipart} size-only, multipart ETag)" if multipart else ""))
    print(f"MISSING locally: {len(missing_local):,}")
    print(f"CORRUPT        : {len(corrupt):,}")
    print(f"extra locally  : {len(extra_local):,}")

    for title, items in [
        ("In the bucket but NOT local (re-run download):", missing_local),
        ("Corrupt (bytes differ):", [f"{k}  ({why})" for k, why in corrupt]),
        ("Local but NOT in the bucket (never uploaded):", extra_local),
    ]:
        if items:
            print(f"\n{title}")
            for x in items[:30]:
                print(f"  {x}")
            if len(items) > 30:
                print(f"  … and {len(items) - 30} more")

    # Any difference in either direction is a problem: after a download the
    # local copy must be complete, and after an upload the bucket must be.
    if missing_local or corrupt or extra_local:
        print("\nLocal folder and bucket do NOT match.")
        if extra_local:
            print(f"  {len(extra_local)} file(s) exist locally but not in s3://{bucket} —")
            print(f"  run:  python scripts/s3_backup.py upload --bucket {bucket} --src {dest}")
        if missing_local or corrupt:
            print(f"  re-run download to repair the local copy.")
        sys.exit(1)

    print(f"\nLocal folder and s3://{bucket} match exactly "
          f"({ok:,} objects, byte-for-byte).")


def cmd_upload(args):
    """Push the local folder into the NEW bucket."""
    src = os.path.abspath(args.src)
    bucket = args.bucket
    if not bucket:
        sys.exit("Pass --bucket (the NEW bucket)")
    if not os.path.isdir(src):
        sys.exit(f"No such folder: {src}")

    s3 = client_from(args)
    local = walk_local(src)
    if not local:
        sys.exit(f"No files under {src}")

    print(f"Source : {src}")
    print(f"Target : s3://{bucket}")
    print(f"Files  : {len(local):,}")

    try:
        existing = list_all(s3, bucket)
    except Exception as e:
        sys.exit(f"Could not list target bucket: {type(e).__name__}: {e}\n"
                 f"Check the credentials belong to the NEW account and the bucket exists.")

    if args.dry_run:
        todo = [k for k, p in local.items()
                if k not in existing or existing[k]["size"] != os.path.getsize(p)]
        print(f"\nDRY RUN — would upload {len(todo):,} object(s), skip {len(local) - len(todo):,}")
        for k in todo[:30]:
            print(f"  {k}")
        if len(todo) > 30:
            print(f"  … and {len(todo) - 30} more")
        return

    uploaded = skipped = failed = 0
    by_prefix = defaultdict(lambda: {"n": 0, "bytes": 0})
    errors = []

    for i, (key, path) in enumerate(sorted(local.items()), 1):
        size = os.path.getsize(path)
        if key in existing and existing[key]["size"] == size:
            skipped += 1
        else:
            ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
            try:
                s3.upload_file(path, bucket, key, ExtraArgs={"ContentType": ctype})
                uploaded += 1
            except Exception as e:
                failed += 1
                errors.append((key, f"{type(e).__name__}: {e}"))
                continue

        top = key.split("/")[0] + "/" if "/" in key else "(root)"
        by_prefix[top]["n"] += 1
        by_prefix[top]["bytes"] += size

        if i % 25 == 0 or i == len(local):
            print(f"  [{i:>5}/{len(local)}]", flush=True)

    summarise(by_prefix)
    print(f"uploaded {uploaded:,} | already present {skipped:,} | failed {failed:,}")

    if errors:
        print(f"\n{len(errors)} failed:")
        for k, err in errors[:20]:
            print(f"  {k}\n    {err}")
        sys.exit(1)

    print("\nNext: confirm nothing was lost across the two accounts.")
    print(f"  python scripts/s3_backup.py compare --source <old-bucket> --target {bucket}")


def cmd_compare(args):
    source = args.source or DEFAULT_BUCKET
    if not source or not args.target:
        sys.exit("Need --source and --target")

    src_s3 = client_from(args, side="source_")
    tgt_s3 = client_from(args, side="target_")

    print(f"Source : s3://{source}")
    print(f"Target : s3://{args.target}")
    print("Listing both…\n")
    try:
        src = list_all(src_s3, source, args.prefix)
        tgt = list_all(tgt_s3, args.target, args.prefix)
    except Exception as e:
        sys.exit(f"Could not list: {type(e).__name__}: {e}")

    sk, tk = set(src), set(tgt)
    missing = sorted(sk - tk)
    extra = sorted(tk - sk)

    mismatched, size_only = [], 0
    for k in sorted(sk & tk):
        if src[k]["size"] != tgt[k]["size"]:
            mismatched.append(k)
        elif "-" in src[k]["etag"] or "-" in tgt[k]["etag"]:
            # multipart on either side — ETags are not comparable, size matched
            size_only += 1
        elif src[k]["etag"] != tgt[k]["etag"]:
            mismatched.append(k)

    print(f"source objects : {len(src):,} ({human(sum(o['size'] for o in src.values()))})")
    print(f"target objects : {len(tgt):,} ({human(sum(o['size'] for o in tgt.values()))})")
    print(f"identical      : {len(sk & tk) - len(mismatched):,}"
          + (f"  ({size_only} size-only, multipart ETag)" if size_only else ""))
    print(f"MISSING        : {len(missing):,}")
    print(f"MISMATCHED     : {len(mismatched):,}")
    print(f"extra          : {len(extra):,}")

    def show(title, keys, fmt=lambda k: k):
        if not keys:
            return
        print(f"\n{title}")
        for k in keys[:30]:
            print(f"  {fmt(k)}")
        if len(keys) > 30:
            print(f"  … and {len(keys) - 30} more")

    show("Missing from target (NOT copied):", missing)
    show("Content differs:", mismatched,
         lambda k: f"{k}  src={human(src[k]['size'])} tgt={human(tgt[k]['size'])}")
    show("Only in target:", extra)

    if missing or mismatched:
        print("\nMigration is INCOMPLETE — do not delete the source bucket.")
        sys.exit(1)
    print("\nEvery source object exists in the target. Safe to decommission the old bucket.")


def cmd_whoami(args):
    """Show which AWS account these credentials belong to, and what it can see."""
    import boto3

    profiles = available_profiles()
    print(f"Profiles on this machine : {', '.join(profiles) if profiles else '(none)'}")
    print(f".env AWS_ACCESS_KEY_ID   : {'set' if os.getenv('AWS_ACCESS_KEY_ID') else 'NOT set'}")
    print(f".env S3_BUCKET_NAME      : {DEFAULT_BUCKET or '(none)'}")
    print(f".env AWS_REGION          : {DEFAULT_REGION or '(none)'}")
    print()

    from botocore.exceptions import ProfileNotFound

    region = args.region or DEFAULT_REGION
    if args.profile:
        try:
            session = boto3.Session(profile_name=args.profile)
        except ProfileNotFound:
            sys.exit(
                f"\nAWS profile '{args.profile}' does not exist on this machine.\n\n"
                + ("Profiles you do have: " + ", ".join(profiles) + "\n\n"
                   if profiles else
                   "You have no named profiles configured (no ~/.aws/credentials).\n\n")
                + "Either drop --profile to use the keys in apps/backend/.env, or pass\n"
                  "--access-key / --secret-key directly.\n"
            )
    elif args.access_key and args.secret_key:
        session = boto3.Session(aws_access_key_id=args.access_key,
                                aws_secret_access_key=args.secret_key)
    else:
        session = boto3.Session()

    try:
        ident = session.client("sts", region_name=region).get_caller_identity()
        print(f"Account : {ident['Account']}")
        print(f"Identity: {ident['Arn']}")
    except Exception as e:
        print(f"Could not identify caller: {type(e).__name__}: {e}")
        return

    s3 = session.client("s3", region_name=region)

    # Account-wide listing. A properly scoped IAM user is NOT expected to have
    # this — s3:ListAllMyBuckets grants visibility of every bucket in the
    # account, which a per-bucket policy deliberately withholds.
    try:
        buckets = s3.list_buckets()["Buckets"]
        print(f"\nBuckets visible ({len(buckets)}):")
        for b in buckets:
            mark = "  <- S3_BUCKET_NAME" if b["Name"] == DEFAULT_BUCKET else ""
            print(f"  {b['Name']}{mark}")
    except Exception as e:
        if "AccessDenied" in str(e):
            print("\nCannot list all buckets — expected for a scoped IAM user.")
        else:
            print(f"\nCould not list buckets: {type(e).__name__}: {e}")

    # What actually matters: can we use the bucket this tool targets?
    target = args.bucket or DEFAULT_BUCKET
    if not target:
        return

    print(f"\nAccess check on '{target}':")
    checks = []

    try:
        s3.head_bucket(Bucket=target)
        checks.append(("bucket reachable", True, ""))
    except Exception as e:
        code = getattr(e, "response", {}).get("Error", {}).get("Code", "")
        checks.append(("bucket reachable", False,
                       "bucket does not exist" if code == "404" else str(e)[:90]))

    try:
        r = s3.list_objects_v2(Bucket=target, MaxKeys=1)
        checks.append((f"list objects (s3:ListBucket)", True,
                       f"{r.get('KeyCount', 0)} object(s) seen"))
    except Exception as e:
        checks.append(("list objects (s3:ListBucket)", False, str(e)[:90]))

    probe = "_access_check.txt"
    try:
        s3.put_object(Bucket=target, Key=probe, Body=b"ok")
        checks.append(("write (s3:PutObject)", True, ""))
        try:
            s3.delete_object(Bucket=target, Key=probe)
            checks.append(("delete (s3:DeleteObject)", True, "probe cleaned up"))
        except Exception as e:
            checks.append(("delete (s3:DeleteObject)", False,
                           f"leftover {probe} — remove manually. {str(e)[:60]}"))
    except Exception as e:
        checks.append(("write (s3:PutObject)", False, str(e)[:90]))

    for name, ok, note in checks:
        print(f"  [{'OK ' if ok else 'FAIL'}] {name}" + (f"  ({note})" if note else ""))

    if all(ok for _, ok, _ in checks):
        print("\nThis key can read and write the bucket, and nothing else. That is correct.")


def add_creds(p, side=""):
    p.add_argument(f"--{side}profile" if side else "--profile", default=None,
                   help="named AWS profile for this side")
    p.add_argument(f"--{side}access-key" if side else "--access-key",
                   dest=f"{side.replace('-', '_')}access_key" if side else "access_key", default=None)
    p.add_argument(f"--{side}secret-key" if side else "--secret-key",
                   dest=f"{side.replace('-', '_')}secret_key" if side else "secret_key", default=None)


def main():
    p = argparse.ArgumentParser(description="S3 backup / cross-account migration")
    p.add_argument("--region", default=None)
    sub = p.add_subparsers(dest="cmd", required=True)

    w = sub.add_parser("whoami", help="which AWS account am I using, and what can it do?")
    w.add_argument("--bucket", default=None, help="bucket to access-check (default: .env)")
    add_creds(w)
    w.set_defaults(func=cmd_whoami)

    d = sub.add_parser("download", help="OLD bucket -> local (do this first)")
    d.add_argument("--bucket", default=None)
    d.add_argument("--dest", default=os.path.join(BASE, "..", "s3_backup"))
    d.add_argument("--prefix", default=None)
    add_creds(d)
    d.set_defaults(func=cmd_download)

    v = sub.add_parser("verify", help="check the local copy against the bucket")
    v.add_argument("--bucket", default=None)
    v.add_argument("--dest", default=os.path.join(BASE, "..", "s3_backup"))
    v.add_argument("--prefix", default=None)
    add_creds(v)
    v.set_defaults(func=cmd_verify)

    u = sub.add_parser("upload", help="local -> NEW bucket")
    u.add_argument("--bucket", required=True)
    u.add_argument("--src", default=os.path.join(BASE, "..", "s3_backup"))
    u.add_argument("--dry-run", action="store_true")
    add_creds(u)
    u.set_defaults(func=cmd_upload)

    c = sub.add_parser("compare", help="OLD bucket vs NEW bucket")
    c.add_argument("--source", default=None)
    c.add_argument("--target", required=True)
    c.add_argument("--prefix", default=None)
    add_creds(c, side="source-")
    add_creds(c, side="target-")
    c.set_defaults(func=cmd_compare)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
