#!/usr/bin/env python3
"""Deploy talk2graph to Tencent Cloud COS static website hosting.

Usage:
  TENCENTCLOUD_SECRET_ID=AKID... TENCENTCLOUD_SECRET_KEY=abc... python3 deploy_cos.py
  python3 deploy_cos.py --prompt-credentials

The script will:
  1. Create a COS bucket (if not exists)  
  2. Upload frontend static assets with public-read ACL
  3. Enable static website hosting
  4. Verify that the public URL serves the new static demo
"""

import argparse
import getpass
import mimetypes
import os
import subprocess
import sys
from pathlib import Path

DEFAULT_BUCKET = "talk2graph-1259138134"
DEFAULT_REGION = "ap-guangzhou"

def load_cos_sdk():
    try:
        from qcloud_cos import CosConfig, CosS3Client
        from qcloud_cos.cos_exception import CosServiceError
        return CosConfig, CosS3Client, CosServiceError
    except ImportError:
        print("Installing cos-python-sdk-v5...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "cos-python-sdk-v5", "-q"])
        from qcloud_cos import CosConfig, CosS3Client
        from qcloud_cos.cos_exception import CosServiceError
        return CosConfig, CosS3Client, CosServiceError

def main():
    parser = argparse.ArgumentParser(description="Deploy talk2graph to COS")
    parser.add_argument("--secret-id", required=False, default=os.environ.get("TENCENTCLOUD_SECRET_ID"), help="Tencent Cloud SecretId, or TENCENTCLOUD_SECRET_ID")
    parser.add_argument("--secret-key", required=False, default=os.environ.get("TENCENTCLOUD_SECRET_KEY"), help="Tencent Cloud SecretKey, or TENCENTCLOUD_SECRET_KEY")
    parser.add_argument("--region", default=DEFAULT_REGION, help=f"COS region (default: {DEFAULT_REGION})")
    parser.add_argument("--bucket", default=DEFAULT_BUCKET, help=f"Bucket name (default: {DEFAULT_BUCKET})")
    parser.add_argument("--prompt-credentials", action="store_true", help="Prompt for Tencent Cloud credentials without echoing them")
    parser.add_argument("--skip-content-verify", action="store_true", help="Skip npm run verify:deployment after uploading")
    args = parser.parse_args()

    if args.prompt_credentials:
        if not args.secret_id:
            args.secret_id = getpass.getpass("Tencent Cloud SecretId: ")
        if not args.secret_key:
            args.secret_key = getpass.getpass("Tencent Cloud SecretKey: ")

    if not args.secret_id or not args.secret_key:
        parser.error("Tencent Cloud credentials are required via --prompt-credentials, --secret-id/--secret-key, or TENCENTCLOUD_SECRET_ID/TENCENTCLOUD_SECRET_KEY")

    CosConfig, CosS3Client, CosServiceError = load_cos_sdk()
    bucket_name = args.bucket
    config = CosConfig(Region=args.region, SecretId=args.secret_id, SecretKey=args.secret_key)
    client = CosS3Client(config)

    # Step 1: Create bucket
    print(f"[1/4] Creating bucket: {bucket_name}...")
    try:
        client.create_bucket(
            Bucket=bucket_name,
            ACL='public-read',
        )
        print(f"  ✅ Created")
    except CosServiceError as e:
        if 'BucketAlreadyExists' in str(e) or 'BucketAlreadyOwnedByYou' in str(e):
            print(f"  ⚠️  Already exists, skipping")
        else:
            raise

    # Step 2: Upload static assets
    print(f"[2/4] Uploading static assets...")
    assets = [
        Path("index.html"),
        Path("src/browser-app.js"),
        Path("src/graph-engine.js"),
    ]
    for asset in assets:
        if not asset.exists():
            raise FileNotFoundError(f"Missing deploy asset: {asset}")
        content_type = mimetypes.guess_type(str(asset))[0] or "application/octet-stream"
        if asset.suffix in {".html", ".js"}:
            content_type += "; charset=utf-8"
        client.put_object_from_local_file(
            Bucket=bucket_name,
            LocalFilePath=str(asset),
            Key=str(asset),
            ACL='public-read',
            ContentType=content_type,
            ContentDisposition='inline',
            CacheControl='no-cache, no-store, must-revalidate',
        )
        print(f"  ✅ Uploaded {asset}")

    # Step 3: Enable static website
    print(f"[3/4] Configuring static website hosting...")
    client.put_bucket_website(
        Bucket=bucket_name,
        WebsiteConfiguration={
            'IndexDocument': {'Suffix': 'index.html'},
            'ErrorDocument': {'Key': 'index.html'},
        }
    )
    print(f"  ✅ Enabled")

    # Step 4: Get URL
    url = f"https://{bucket_name}.cos-website.{args.region}.myqcloud.com"
    print(f"\n[4/4] Static assets uploaded")
    print(f"\n{'='*60}")
    print(f"  🌐 Static website URL: {url}")
    print(f"  🔍 Run npm run verify:deployment before treating it as user-ready")
    print(f"  🌐 For browser preview, use a custom domain or Node service URL")
    print(f"{'='*60}\n")

    # Test
    print("Testing accessibility...")
    try:
        import urllib.request
        resp = urllib.request.urlopen(url, timeout=10)
        if resp.status == 200:
            print(f"  ✅ Page accessible (HTTP {resp.status})")
        else:
            print(f"  ⚠️  HTTP {resp.status} — check bucket ACL")
    except Exception as e:
        print(f"  ⚠️  Could not verify: {e}")
        print(f"  (This is normal — static website may take 30-60s to propagate)")

    if not args.skip_content_verify:
        print("\nVerifying deployed content...")
        subprocess.run(["npm", "run", "verify:deployment"], check=True)

    print(f"\nUploaded static assets to: {url}")
    print("Share only after npm run verify:deployment passes on a browser-preview URL.")

if __name__ == "__main__":
    main()
