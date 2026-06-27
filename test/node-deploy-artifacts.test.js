const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readPackageJson() {
  return JSON.parse(readProjectFile('package.json'));
}

test('Dockerfile runs the Node service on a public container interface', () => {
  const dockerfile = readProjectFile('Dockerfile');

  assert.match(dockerfile, /^FROM node:22-alpine/m);
  assert.match(dockerfile, /WORKDIR \/app/);
  assert.match(dockerfile, /COPY package\*\.json \.\//);
  assert.match(dockerfile, /npm ci --omit=dev/);
  assert.match(dockerfile, /COPY index\.html \.\/index\.html/);
  assert.match(dockerfile, /COPY server\.js \.\/server\.js/);
  assert.match(dockerfile, /COPY src \.\/src/);
  assert.match(dockerfile, /ENV HOST=0\.0\.0\.0/);
  assert.match(dockerfile, /EXPOSE 3000/);
  assert.match(dockerfile, /CMD \["node", "server\.js"\]/);
});

test('.dockerignore keeps local-only and sensitive files out of the image context', () => {
  const dockerignore = readProjectFile('.dockerignore');

  for (const pattern of [
    '.git',
    'node_modules',
    '.env',
    '*.log',
    'test',
    'docs',
    'deploy_cos.py',
    '.DS_Store',
  ]) {
    assert.match(dockerignore, new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
  }
});

test('package exposes a non-Docker Node service packaging command', () => {
  const packageJson = readPackageJson();

  assert.equal(packageJson.scripts['package:service'], 'node scripts/package-service.js');
});

test('Node service package script includes runtime files and excludes local-only files', () => {
  const source = readProjectFile('scripts/package-service.js');

  for (const required of [
    'package.json',
    'package-lock.json',
    'index.html',
    'server.js',
    'src/browser-app.js',
    'src/graph-engine.js',
    'src/llm-client.js',
    'src/tikz-renderer.js',
    'build-info.json',
    'deploy/install-cvm.sh',
    'deploy/systemd/talk2graph.service',
    'deploy/nginx/talk2graph.conf',
  ]) {
    assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const excluded of ['.env', '.git', 'docs', 'test', 'deploy_cos.py', '.DS_Store']) {
    assert.doesNotMatch(source, new RegExp(`['"]${excluded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`));
  }

  assert.match(source, /talk2graph-service\.tar\.gz/);
  assert.match(source, /git/);
  assert.match(source, /rev-parse/);
  assert.match(source, /tar/);
});

test('CVM install script installs the package and verifies the running service metadata', () => {
  const script = readProjectFile('deploy/install-cvm.sh');

  assert.match(script, /set -euo pipefail/);
  assert.match(script, /ARCHIVE=.*talk2graph-service\.tar\.gz/);
  assert.match(script, /APP_DIR=.*\/opt\/talk2graph-service/);
  assert.match(script, /tar -xzf/);
  assert.match(script, /npm ci --omit=dev/);
  assert.match(script, /systemctl daemon-reload/);
  assert.match(script, /systemctl restart "\$\{SERVICE_NAME\}"/);
  assert.match(script, /curl -fsS .*\/healthz/);
  assert.match(script, /curl -fsS/);
  assert.match(script, /\/api\/generate/);
  assert.match(script, /build-info\.json/);
  assert.match(script, /expectedCommit/);
  assert.match(script, /health\.commit/);
  assert.match(script, /diameter circle template/);
});

test('Node deployment docs show how to run the installer directly from the archive', () => {
  const docs = readProjectFile('docs/Node服务部署.md');

  assert.match(docs, /tar -xOf \/tmp\/talk2graph-service\.tar\.gz talk2graph-service\/deploy\/install-cvm\.sh/);
  assert.match(docs, /sudo bash -s -- \/tmp\/talk2graph-service\.tar\.gz/);
});

test('systemd template runs the packaged Node service on a public interface', () => {
  const service = readProjectFile('deploy/systemd/talk2graph.service');

  assert.match(service, /\[Unit\]/);
  assert.match(service, /After=network-online\.target/);
  assert.match(service, /WorkingDirectory=\/opt\/talk2graph-service/);
  assert.match(service, /Environment=NODE_ENV=production/);
  assert.match(service, /Environment=HOST=0\.0\.0\.0/);
  assert.match(service, /Environment=PORT=3000/);
  assert.match(service, /ExecStart=\/usr\/bin\/npm start/);
  assert.match(service, /Restart=always/);
});

test('nginx template reverse proxies browser traffic to the local Node service', () => {
  const nginx = readProjectFile('deploy/nginx/talk2graph.conf');

  assert.match(nginx, /server_name your-domain\.example/);
  assert.match(nginx, /proxy_pass http:\/\/127\.0\.0\.1:3000/);
  assert.match(nginx, /proxy_set_header Host \$host/);
  assert.match(nginx, /proxy_set_header X-Forwarded-Proto \$scheme/);
  assert.match(nginx, /client_max_body_size 2m/);
});
