const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { verifyService } = require('../scripts/verify-service');
const { createServer } = require('../server');

async function withServer(handler, run) {
  const server = http.createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

test('service verifier accepts a Node deployment with homepage, health, and API generation', async () => {
  await withServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<title>talk2graph</title><script src="src/graph-engine.js"></script>');
      return;
    }

    if (req.method === 'GET' && req.url === '/healthz') {
      json(res, 200, { ok: true, service: 'talk2graph', modelConfigured: true });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/generate') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const payload = JSON.parse(body || '{}');
      json(res, 200, {
        kind: 'template',
        tikzSource: '\\documentclass{standalone}\\begin{document}\\end{document}',
        svg: '<svg></svg>',
        message: /AC\s*为直径|AC为直径/.test(payload.prompt || '')
          ? '已生成直角三角形、以 AC 为直径的圆，并标出圆与斜边 AB 的交点 D。'
          : '已生成 3-4-5 直角三角形。',
      });
      return;
    }

    res.writeHead(404);
    res.end('not found');
  }, async (baseUrl) => {
    const result = await verifyService(baseUrl);

    assert.equal(result.ok, true);
    assert.deepEqual(result.checks.map((check) => check.name), [
      'homepage is reachable',
      'health endpoint reports readiness',
      'health endpoint does not expose secrets',
      'built-in template generation works',
      'diameter circle template generation works',
      'template response includes SVG preview',
      'template response includes TikZ export',
    ]);
    assert.equal(result.checks.every((check) => check.ok), true);
  });
});

test('service verifier rejects deployments without working API generation', async () => {
  await withServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<title>talk2graph</title>');
      return;
    }

    if (req.method === 'GET' && req.url === '/healthz') {
      json(res, 200, { ok: true, service: 'talk2graph', modelConfigured: false });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/generate') {
      json(res, 500, { error: 'boom' });
      return;
    }

    res.writeHead(404);
    res.end('not found');
  }, async (baseUrl) => {
    const result = await verifyService(baseUrl);

    assert.equal(result.ok, false);
    assert.deepEqual(
      result.checks.filter((check) => !check.ok).map((check) => check.name),
      [
        'built-in template generation works',
        'diameter circle template generation works',
        'template response includes SVG preview',
        'template response includes TikZ export',
      ],
    );
  });
});

test('service verifier rejects stale deployments missing the diameter circle template', async () => {
  await withServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<title>talk2graph</title>');
      return;
    }

    if (req.method === 'GET' && req.url === '/healthz') {
      json(res, 200, { ok: true, service: 'talk2graph', modelConfigured: true });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/generate') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const payload = JSON.parse(body || '{}');
      if (/AC\s*为直径|AC为直径/.test(payload.prompt || '')) {
        json(res, 200, {
          kind: 'llm',
          tikzSource: '\\documentclass{standalone}\\begin{document}\\end{document}',
          svg: '<svg></svg>',
          message: '已由服务端模型生成图形。',
        });
        return;
      }

      json(res, 200, {
        kind: 'template',
        tikzSource: '\\documentclass{standalone}\\begin{document}\\end{document}',
        svg: '<svg></svg>',
        message: '已生成 3-4-5 直角三角形。',
      });
      return;
    }

    res.writeHead(404);
    res.end('not found');
  }, async (baseUrl) => {
    const result = await verifyService(baseUrl);

    assert.equal(result.ok, false);
    assert.ok(
      result.checks.some((check) => check.name === 'diameter circle template generation works' && !check.ok),
    );
  });
});

test('service verifier accepts the real talk2graph server', async () => {
  const server = createServer({ env: {} });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  try {
    const result = await verifyService(`http://127.0.0.1:${port}`);

    assert.equal(result.ok, true);
    assert.equal(result.checks.every((check) => check.ok), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
