"""
ECR setup and image push — without the AWS CLI.

`aws ecr get-login-password` does nothing more than call ecr:GetAuthorizationToken
and base64-decode the result. boto3 (already installed) can do the same, so the
CLI is not actually required for any of this.

Credentials come from apps/backend/.env, exactly like s3_backup.py.

Usage
-----
  cd apps/backend

  python scripts/ecr_deploy.py login            # create repo if needed + docker login
  python scripts/ecr_deploy.py push             # login, build, tag, push  (the lot)
  python scripts/ecr_deploy.py push --no-build  # tag + push an image you already built
  python scripts/ecr_deploy.py info             # registry URI and image list

Requires the IAM user to hold ECR permissions
(AmazonEC2ContainerRegistryPowerUser covers it).
"""

import argparse
import base64
import os
import subprocess
import sys

from dotenv import load_dotenv

BASE = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(BASE, ".."))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

REGION = os.getenv("AWS_REGION", "ap-south-1")
# Override with ECR_REPOSITORY in .env if this ever changes again.
REPOSITORY = os.getenv("ECR_REPOSITORY", "hrms-dhanadurga")   # matches deploy.yml


def ecr_client():
    try:
        import boto3
    except ImportError:
        sys.exit("boto3 not installed. Run: pip install boto3")
    if not os.getenv("AWS_ACCESS_KEY_ID"):
        sys.exit("AWS_ACCESS_KEY_ID is not set in apps/backend/.env")
    return boto3.client("ecr", region_name=REGION)


def require_docker():
    """
    Building a container image locally needs Docker. If it is missing, the
    GitHub Actions workflow already does the same build on a hosted runner —
    usually the better answer than a multi-GB local install.
    """
    import shutil
    if shutil.which("docker"):
        try:
            subprocess.run(["docker", "info"], capture_output=True, check=True)
            return
        except subprocess.CalledProcessError:
            sys.exit(
                "\nDocker is installed but not running.\n\n"
                "Start Docker Desktop, wait for the whale icon to stop animating,\n"
                "then re-run this command.\n"
            )

    sys.exit(
        "\nDocker is not installed on this machine.\n\n"
        "You do not have to install it. The repo already has a GitHub Actions\n"
        "workflow (.github/workflows/deploy.yml) that builds and pushes this exact\n"
        "image on a hosted runner. To use it:\n\n"
        "  1. GitHub -> your repo -> Settings -> Secrets and variables -> Actions\n"
        "  2. Update these two secrets to the NEW account's credentials:\n"
        "       AWS_ACCESS_KEY_ID\n"
        "       AWS_SECRET_ACCESS_KEY\n"
        "  3. Commit and push any change under apps/backend/ to the main branch.\n"
        "     The workflow builds, pushes to ECR and updates the Lambda for you.\n\n"
        "If you would rather build locally, install Docker Desktop:\n"
        "  winget install -e --id Docker.DockerDesktop\n"
        "  (needs WSL2 and a restart, ~3 GB)\n"
    )


def run(cmd, **kw):
    """Run a command, streaming its output. Exit with a clear message on failure."""
    print(f"\n$ {' '.join(cmd)}\n", flush=True)
    try:
        subprocess.run(cmd, check=True, **kw)
    except FileNotFoundError:
        sys.exit(f"\n'{cmd[0]}' not found. Is Docker installed and on PATH?")
    except subprocess.CalledProcessError as e:
        sys.exit(f"\nCommand failed with exit code {e.returncode}: {' '.join(cmd)}")


def _denied(e):
    return "AccessDenied" in str(e) or "not authorized" in str(e)


def ensure_repository(ecr):
    """
    Create the ECR repository if it does not already exist.

    Note ecr:CreateRepository is NOT in AmazonEC2ContainerRegistryPowerUser —
    that policy grants push/pull only. Creating the repo by hand in the console
    keeps the IAM user least-privileged, so a denial here is not fatal advice.
    """
    try:
        ecr.describe_repositories(repositoryNames=[REPOSITORY])
        print(f"Repository '{REPOSITORY}' already exists.")
        return
    except ecr.exceptions.RepositoryNotFoundException:
        pass
    except Exception as e:
        if _denied(e):
            sys.exit(
                "\nAccess denied listing ECR repositories.\n\n"
                "The IAM user in .env has no ECR permissions at all. Attach\n"
                "'AmazonEC2ContainerRegistryPowerUser' in IAM -> Users -> Add permissions.\n"
            )
        raise

    print(f"Repository '{REPOSITORY}' does not exist. Creating…")
    try:
        ecr.create_repository(
            repositoryName=REPOSITORY,
            imageScanningConfiguration={"scanOnPush": True},
            imageTagMutability="MUTABLE",
        )
        print("Created.")
    except Exception as e:
        if _denied(e):
            sys.exit(
                f"\nNot allowed to CREATE the repository — but push may still work.\n\n"
                f"ecr:CreateRepository is not part of AmazonEC2ContainerRegistryPowerUser.\n"
                f"Two ways forward:\n\n"
                f"  A) Create it once in the console (keeps permissions tight):\n"
                f"       ECR -> Repositories -> Create repository\n"
                f"       Name: {REPOSITORY}      Region: {REGION}\n"
                f"       Leave every other setting default.\n"
                f"     Then re-run this command.\n\n"
                f"  B) Or widen the IAM user:\n"
                f"       IAM -> Users -> hrms-app -> Add permissions ->\n"
                f"       attach 'AmazonEC2ContainerRegistryFullAccess'\n"
            )
        raise


def docker_login(ecr):
    """Exactly what `aws ecr get-login-password | docker login` does."""
    auth = ecr.get_authorization_token()["authorizationData"][0]
    user, password = base64.b64decode(auth["authorizationToken"]).decode().split(":", 1)
    registry = auth["proxyEndpoint"].replace("https://", "")

    print(f"Registry: {registry}")
    proc = subprocess.run(
        ["docker", "login", "--username", user, "--password-stdin", registry],
        input=password.encode(), capture_output=True,
    )
    out = (proc.stdout + proc.stderr).decode(errors="replace").strip()
    if proc.returncode != 0:
        sys.exit(f"\ndocker login failed:\n{out}")
    print(out or "Login Succeeded")
    return registry


def cmd_login(args):
    require_docker()
    ecr = ecr_client()
    ensure_repository(ecr)
    registry = docker_login(ecr)
    image = f"{registry}/{REPOSITORY}"
    print(f"\nReady. Image URI:\n  {image}:latest")
    print("\nNext:")
    print(f"  docker build -t {REPOSITORY} .")
    print(f"  docker tag {REPOSITORY}:latest {image}:latest")
    print(f"  docker push {image}:latest")
    print("\nOr just: python scripts/ecr_deploy.py push")


def cmd_push(args):
    # Check Docker before touching AWS, so a missing prerequisite fails in a
    # second rather than after the repo lookup and auth round-trip.
    require_docker()
    ecr = ecr_client()
    ensure_repository(ecr)
    registry = docker_login(ecr)
    image = f"{registry}/{REPOSITORY}"

    if not args.no_build:
        build = ["docker", "build"]
        if args.platform:
            # Lambda runs x86_64. Newer buildx also emits OCI manifests that
            # Lambda rejects, hence --provenance=false.
            build += ["--platform", args.platform, "--provenance=false"]
        build += ["-t", REPOSITORY, "."]
        run(build, cwd=BACKEND_DIR)

    run(["docker", "tag", f"{REPOSITORY}:latest", f"{image}:{args.tag}"])
    run(["docker", "push", f"{image}:{args.tag}"])

    if args.tag != "latest":
        run(["docker", "tag", f"{REPOSITORY}:latest", f"{image}:latest"])
        run(["docker", "push", f"{image}:latest"])

    print(f"\nPushed:\n  {image}:{args.tag}")
    print("\nNext — point the Lambda at it:")
    print(f"  python scripts/ecr_deploy.py info")


def cmd_info(args):
    ecr = ecr_client()
    try:
        repos = ecr.describe_repositories(repositoryNames=[REPOSITORY])["repositories"]
    except ecr.exceptions.RepositoryNotFoundException:
        sys.exit(f"Repository '{REPOSITORY}' does not exist yet. Run: "
                 f"python scripts/ecr_deploy.py login")

    repo = repos[0]
    print(f"Repository : {repo['repositoryName']}")
    print(f"URI        : {repo['repositoryUri']}")
    print(f"Region     : {REGION}")

    try:
        images = ecr.describe_images(repositoryName=REPOSITORY)["imageDetails"]
    except Exception:
        images = []

    if not images:
        print("\nNo images pushed yet.")
        return

    print(f"\n{'TAGS':28} {'SIZE':>10}  PUSHED")
    print("-" * 62)
    for img in sorted(images, key=lambda i: i.get("imagePushedAt"), reverse=True)[:10]:
        tags = ",".join(img.get("imageTags", [])) or "<untagged>"
        mb = img.get("imageSizeInBytes", 0) / 1024 / 1024
        print(f"{tags[:28]:28} {mb:>9.1f}M  {img['imagePushedAt']:%Y-%m-%d %H:%M}")


def main():
    p = argparse.ArgumentParser(description="ECR setup and push without the AWS CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    l = sub.add_parser("login", help="create repo if needed, then docker login")
    l.set_defaults(func=cmd_login)

    pu = sub.add_parser("push", help="login, build, tag and push")
    pu.add_argument("--tag", default="latest")
    pu.add_argument("--no-build", action="store_true", help="skip docker build")
    pu.add_argument("--platform", default="linux/amd64",
                    help="set empty to skip; Lambda needs linux/amd64")
    pu.set_defaults(func=cmd_push)

    i = sub.add_parser("info", help="show registry URI and pushed images")
    i.set_defaults(func=cmd_info)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
