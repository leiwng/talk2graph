const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { generateGraph } = require('./src/graph-engine');
const { callLlm, hasLlmConfig } = require('./src/llm-client');
const { renderTikzToSvg } = require('./src/tikz-renderer');
const packageInfo = require('./package.json');

const ROOT = __dirname;
const STATIC_FILES = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/src/graph-engine.js', 'src/graph-engine.js'],
  ['/src/browser-app.js', 'src/browser-app.js'],
]);

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function readGitCommit() {
  const headPath = path.join(ROOT, '.git', 'HEAD');
  try {
    const head = fs.readFileSync(headPath, 'utf8').trim();
    if (/^[0-9a-f]{40}$/i.test(head)) return head;
    const refMatch = head.match(/^ref:\s+(.+)$/);
    if (!refMatch) return 'unknown';
    const refPath = path.join(ROOT, '.git', refMatch[1]);
    const ref = fs.readFileSync(refPath, 'utf8').trim();
    return /^[0-9a-f]{40}$/i.test(ref) ? ref : 'unknown';
  } catch {
    return 'unknown';
  }
}

function readPackagedCommit() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, 'build-info.json'), 'utf8');
    const info = JSON.parse(raw);
    return typeof info.commit === 'string' ? info.commit : 'unknown';
  } catch {
    return 'unknown';
  }
}

function serviceMetadata(env) {
  const candidates = [
    env.TALK2GRAPH_COMMIT,
    env.GIT_COMMIT,
    readPackagedCommit(),
    readGitCommit(),
  ];
  const rawCommit = candidates.find((candidate) => /^[0-9a-f]{7,40}$/i.test(candidate || '')) || 'unknown';
  const commit = /^[0-9a-f]{7,40}$/i.test(rawCommit) ? rawCommit : 'unknown';
  return {
    version: packageInfo.version,
    commit,
  };
}

function handleHealth(res, env) {
  sendJson(res, 200, {
    ok: true,
    service: 'talk2graph',
    ...serviceMetadata(env),
    modelConfigured: hasLlmConfig(env),
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('请求体过大。'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('请求 JSON 格式不正确。'));
      }
    });
    req.on('error', reject);
  });
}

function safeStaticPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0]);
  const relativePath = STATIC_FILES.get(decodedPath);
  if (!relativePath) return null;
  const fullPath = path.resolve(ROOT, relativePath);
  if (!fullPath.startsWith(ROOT)) return null;
  return fullPath;
}

function serveStatic(req, res) {
  const filePath = safeStaticPath(req.url);
  if (!filePath) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath);
    res.writeHead(200, { 'content-type': CONTENT_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

async function handleGenerate(req, res, options) {
  let payload;
  try {
    payload = await readJson(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const prompt = String(payload.prompt || '').trim();
  if (!prompt) {
    sendJson(res, 400, { error: '请输入要绘制的数学图形。' });
    return;
  }

  const currentTikzSource = String(payload.currentTikzSource || '');
  const generated = generateGraph({ prompt, currentTikzSource });
  if (generated.kind !== 'unmatched') {
    sendJson(res, 200, await withRenderedSvg(generated));
    return;
  }

  if (!hasLlmConfig(options.env)) {
    sendJson(res, 422, {
      kind: 'unmatched',
      error: generated.message,
    });
    return;
  }

  try {
    const llmResult = await callLlm({
      prompt,
      currentTikzSource,
      env: options.env,
      fetchImpl: options.fetchImpl || fetch,
    });
    sendJson(res, 200, await withRenderedSvg(llmResult));
  } catch (error) {
    sendJson(res, 502, {
      error: `模型生成失败：${error.message}`,
    });
  }
}

async function withRenderedSvg(result) {
  if (result.svg) return result;

  try {
    return {
      ...result,
      svg: await renderTikzToSvg(result.tikzSource),
    };
  } catch (error) {
    return {
      ...result,
      renderWarning: `TikZ 源码已生成，但 SVG 渲染失败：${error.message}`,
    };
  }
}

function createServer(options = {}) {
  const env = options.env || process.env;
  return http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/healthz') {
      handleHealth(res, env);
      return;
    }

    if (req.method === 'POST' && req.url === '/api/generate') {
      handleGenerate(req, res, { ...options, env });
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      serveStatic(req, res);
      return;
    }

    sendJson(res, 405, { error: '不支持的请求方法。' });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '127.0.0.1';
  const server = createServer();
  server.listen(port, host, () => {
    console.log(`talk2graph listening on http://${host}:${port}`);
  });
}

module.exports = {
  createServer,
};
