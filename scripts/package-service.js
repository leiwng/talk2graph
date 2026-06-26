#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const distDir = path.join(repoRoot, 'dist');
const packageRoot = path.join(distDir, 'talk2graph-service');
const archivePath = path.join(distDir, 'talk2graph-service.tar.gz');

const runtimeFiles = [
  'package.json',
  'package-lock.json',
  'index.html',
  'server.js',
  'src/browser-app.js',
  'src/graph-engine.js',
  'src/llm-client.js',
  'src/tikz-renderer.js',
  'deploy/systemd/talk2graph.service',
  'deploy/nginx/talk2graph.conf',
];

function currentCommit() {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  const commit = result.status === 0 ? result.stdout.trim() : '';
  return /^[0-9a-f]{40}$/i.test(commit) ? commit : 'unknown';
}

function copyFile(relativePath) {
  const source = path.join(repoRoot, relativePath);
  const target = path.join(packageRoot, relativePath);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing runtime file: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function writeBuildInfo() {
  const target = path.join(packageRoot, 'build-info.json');
  const info = {
    commit: currentCommit(),
    packagedAt: new Date().toISOString(),
  };
  fs.writeFileSync(target, `${JSON.stringify(info, null, 2)}\n`);
}

function main() {
  fs.rmSync(packageRoot, { recursive: true, force: true });
  fs.rmSync(archivePath, { force: true });
  fs.mkdirSync(packageRoot, { recursive: true });

  for (const file of runtimeFiles) {
    copyFile(file);
  }
  writeBuildInfo();

  const result = spawnSync('tar', [
    '-czf',
    archivePath,
    '-C',
    distDir,
    'talk2graph-service',
  ], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`tar failed with exit code ${result.status}`);
  }

  console.log(`Created ${path.relative(repoRoot, archivePath)}`);
}

if (require.main === module) {
  main();
}
