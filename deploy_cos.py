#!/usr/bin/env python3
"""Deploy talk2graph to Tencent Cloud COS static website hosting.

Usage:
  python3 deploy_cos.py --secret-id AKID... --secret-key abc... --region ap-guangzhou

The script will:
  1. Create a COS bucket (if not exists)  
  2. Upload index.html with public-read ACL
  3. Enable static website hosting
  4. Print the public URL
"""

import argparse
import sys
import time

try:
    from qcloud_cos import CosConfig, CosS3Client
except ImportError:
    print("Installing cos-python-sdk-v5...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "cos-python-sdk-v5", "-q"])
    from qcloud_cos import CosConfig, CosS3Client

def main():
    parser = argparse.ArgumentParser(description="Deploy talk2graph to COS")
    parser.add_argument("--secret-id", required=True, help="Tencent Cloud SecretId")
    parser.add_argument("--secret-key", required=True, help="Tencent Cloud SecretKey")
    parser.add_argument("--region", default="ap-guangzhou", help="COS region (default: ap-guangzhou)")
    parser.add_argument("--bucket", default=None, help="Bucket name (auto-generate if not set)")
    args = parser.parse_args()

    bucket_name = args.bucket or f"talk2graph-{int(time.time())}"
    bucket_full = f"{bucket_name}-{os.environ.get('COS_APPID', '')}"

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

    # Step 2: Upload index.html
    print(f"[2/4] Uploading index.html...")
    client.put_object_from_local_file(
        Bucket=bucket_name,
        LocalFilePath='index.html',
        Key='index.html',
        ACL='public-read',
        ContentType='text/html; charset=utf-8',
    )
    print(f"  ✅ Uploaded")

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
    print(f"\n[4/4] ✅ Deployment complete!")
    print(f"\n{'='*60}")
    print(f"  🌐 URL: {url}")
    print(f"  📐 Open this link in any browser in China")
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

    print(f"\nDone! Share this URL with your users: {url}")

if __name__ == "__main__":
    import os
    from qcloud_cos.cos_exception import CosServiceError
    main()
