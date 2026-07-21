"""
S3 bucket audit — what is actually stored, by prefix.

Run locally (the sandbox cannot reach AWS):

    cd apps/backend
    python scripts/audit_s3.py

Read-only: it only calls list_objects_v2. Nothing is written or deleted.
"""

import os
import sys
from collections import defaultdict
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

BUCKET = os.getenv("S3_BUCKET_NAME")
REGION = os.getenv("AWS_REGION")

# What each prefix holds, and whether it contains personal data.
PREFIX_INFO = {
    "reference_faces/":   ("Enrolment face images (front/left/right/ID card)", "BIOMETRIC"),
    "attendance_faces/":  ("A photo captured on every punch in/out",           "BIOMETRIC"),
    "profile_photos/":    ("Passport photographs",                             "PII"),
    "onboarding_docs/":   ("PAN card, bank passbook, SSC/Inter/UG certs, payslips", "SENSITIVE PII"),
    "documents/":         ("Legacy onboarding uploads + finalised offer PDFs", "SENSITIVE PII"),
    "drafts/":            ("Unsigned offer-letter drafts",                     "PII"),
    "generated_docs/":    ("Generated letters (offer/relieving/experience/payslip) as HTML", "SENSITIVE PII"),
    "historical_docs/":   ("Letters for people never in the users collection", "SENSITIVE PII"),
    "templates/":         ("Jinja2 HTML document templates",                   "internal"),
    "settings/":          ("Payslip layout reference image",                   "internal"),
    "static/":            ("Logo / signature assets",                          "public-ish"),
}


def human(n):
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if n < 1024:
            return f"{n:,.1f} {unit}"
        n /= 1024
    return f"{n:,.1f} PB"


def main():
    if not BUCKET:
        sys.exit("S3_BUCKET_NAME is not set in apps/backend/.env")

    try:
        import boto3
    except ImportError:
        sys.exit("boto3 not installed. Run: pip install boto3")

    s3 = boto3.client("s3", region_name=REGION)
    paginator = s3.get_paginator("list_objects_v2")

    stats = defaultdict(lambda: {"count": 0, "bytes": 0, "newest": None, "oldest": None})
    biggest = []
    total_count = total_bytes = 0

    print(f"Bucket : {BUCKET}")
    print(f"Region : {REGION}")
    print("Scanning…\n")

    try:
        for page in paginator.paginate(Bucket=BUCKET):
            for obj in page.get("Contents", []):
                key, size, mod = obj["Key"], obj["Size"], obj["LastModified"]
                prefix = key.split("/")[0] + "/" if "/" in key else "(root)"

                s = stats[prefix]
                s["count"] += 1
                s["bytes"] += size
                s["newest"] = max(s["newest"] or mod, mod)
                s["oldest"] = min(s["oldest"] or mod, mod)

                total_count += 1
                total_bytes += size
                biggest.append((size, key))
    except Exception as e:
        sys.exit(f"Could not list bucket: {type(e).__name__}: {e}")

    if not total_count:
        print("Bucket is empty.")
        return

    print(f"{'PREFIX':22} {'OBJECTS':>8} {'SIZE':>11}  {'OLDEST':10} {'NEWEST':10}  CLASSIFICATION")
    print("-" * 108)
    for prefix in sorted(stats, key=lambda p: -stats[p]["bytes"]):
        s = stats[prefix]
        desc, cls = PREFIX_INFO.get(prefix, ("(unrecognised prefix)", "UNKNOWN"))
        print(f"{prefix:22} {s['count']:>8,} {human(s['bytes']):>11}  "
              f"{s['oldest'].strftime('%Y-%m-%d'):10} {s['newest'].strftime('%Y-%m-%d'):10}  {cls}")
        print(f"{'':22} {desc}")

    print("-" * 108)
    print(f"{'TOTAL':22} {total_count:>8,} {human(total_bytes):>11}")

    print("\nTop 10 largest objects")
    for size, key in sorted(biggest, reverse=True)[:10]:
        print(f"  {human(size):>10}  {key}")

    # Retention signal: attendance_faces grows by one image per punch forever,
    # and the codebase has no delete path.
    af = stats.get("attendance_faces/")
    if af and af["count"]:
        days = max((af["newest"] - af["oldest"]).days, 1)
        print(f"\nattendance_faces/ growth: {af['count']:,} objects over {days} days "
              f"(~{af['count']/days:.1f}/day, ~{human(af['bytes']/days)}/day)")
        print("  Nothing in the codebase ever deletes these. Consider an S3 lifecycle rule.")


if __name__ == "__main__":
    main()
