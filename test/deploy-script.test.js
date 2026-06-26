const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function readDeployScript() {
  return fs.readFileSync(path.join(root, 'deploy_cos.py'), 'utf8');
}

function readPackageJson() {
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
}

test('COS deploy script updates the documented static website bucket by default', () => {
  const source = readDeployScript();

  assert.match(source, /DEFAULT_BUCKET\s*=\s*"talk2graph-1259138134"/);
  assert.match(source, /parser\.add_argument\("--bucket",\s*default=DEFAULT_BUCKET/);
});

test('COS deploy script uploads every asset required by the static page', () => {
  const source = readDeployScript();

  assert.match(source, /Path\("index\.html"\)/);
  assert.match(source, /Path\("src\/browser-app\.js"\)/);
  assert.match(source, /Path\("src\/graph-engine\.js"\)/);
  assert.doesNotMatch(source, /Path\("tikzjax\.bundle\.min\.js"\)/);
});

test('COS deploy script uploads browser assets as inline no-cache content', () => {
  const source = readDeployScript();

  assert.match(source, /ContentDisposition=['"]inline['"]/);
  assert.match(source, /CacheControl=['"]no-cache, no-store, must-revalidate['"]/);
});

test('COS deploy script can read credentials from environment variables', () => {
  const source = readDeployScript();

  assert.match(source, /os\.environ\.get\("TENCENTCLOUD_SECRET_ID"\)/);
  assert.match(source, /os\.environ\.get\("TENCENTCLOUD_SECRET_KEY"\)/);
  assert.match(source, /required=False/);
});

test('COS deploy script can prompt for credentials without putting secrets in the command line', () => {
  const source = readDeployScript();

  assert.match(source, /import getpass/);
  assert.match(source, /--prompt-credentials/);
  assert.match(source, /getpass\.getpass\("Tencent Cloud SecretId: "\)/);
  assert.match(source, /getpass\.getpass\("Tencent Cloud SecretKey: "\)/);
  assert.doesNotMatch(source, /python3 deploy_cos\.py --secret-id AKID\.\.\. --secret-key abc\.\.\./);
});

test('COS SDK is imported only after credential validation', () => {
  const source = readDeployScript();

  const credentialErrorIndex = source.indexOf('Tencent Cloud credentials are required');
  const sdkLoadIndex = source.indexOf('CosConfig, CosS3Client, CosServiceError = load_cos_sdk()');

  assert.ok(credentialErrorIndex > 0);
  assert.ok(sdkLoadIndex > credentialErrorIndex);
});

test('package exposes a COS deployment command beside deployment verification', () => {
  const packageJson = readPackageJson();

  assert.equal(packageJson.scripts['deploy:cos'], 'python3 deploy_cos.py');
  assert.equal(packageJson.scripts['verify:deployment'], 'node scripts/verify-deployment.js');
});

test('COS deploy script runs content verification after upload', () => {
  const source = readDeployScript();

  assert.match(source, /--skip-content-verify/);
  assert.match(source, /npm",\s*"run",\s*"verify:deployment"/);
  assert.match(source, /subprocess\.run\([^)]*check=True/s);
});

test('COS deploy script does not claim the default website URL is user-ready before verification', () => {
  const source = readDeployScript();

  assert.doesNotMatch(source, /Open this link in any browser in China/);
  assert.doesNotMatch(source, /Share this URL with your users/);
  assert.match(source, /verify:deployment/);
  assert.match(source, /custom domain or Node service URL/);
});
