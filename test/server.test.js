const test = require('node:test');
const assert = require('node:assert/strict');

const { createServer } = require('../server');

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

async function requestJson(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json();
  return { response, json };
}

test('POST /api/generate returns built-in template TikZ without model config', async (t) => {
  const server = createServer({ env: {} });
  t.after(() => server.close());
  const baseUrl = await listen(server);

  const { response, json } = await requestJson(baseUrl, '/api/generate', {
    prompt: '画一个圆，内接一个正六边形，标注圆心',
  });

  assert.equal(response.status, 200);
  assert.equal(json.kind, 'template');
  assert.match(json.tikzSource, /圆心/);
  assert.match(json.tikzSource, /\\end\{document\}/);
  assert.match(json.svg, /<svg/);
});

test('POST /api/generate validates prompt', async (t) => {
  const server = createServer({ env: {} });
  t.after(() => server.close());
  const baseUrl = await listen(server);

  const { response, json } = await requestJson(baseUrl, '/api/generate', {
    prompt: '',
  });

  assert.equal(response.status, 400);
  assert.equal(json.error, '请输入要绘制的数学图形。');
});

test('POST /api/generate returns controlled error for unknown prompt without model config', async (t) => {
  const server = createServer({ env: {} });
  t.after(() => server.close());
  const baseUrl = await listen(server);

  const { response, json } = await requestJson(baseUrl, '/api/generate', {
    prompt: '画一个非常复杂的随机几何构型',
  });

  assert.equal(response.status, 422);
  assert.equal(json.kind, 'unmatched');
  assert.match(json.error, /需要配置服务端模型/);
});

test('GET / serves the product page', async (t) => {
  const server = createServer({ env: {} });
  t.after(() => server.close());
  const baseUrl = await listen(server);

  const response = await fetch(`${baseUrl}/`);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /talk2graph/);
  assert.match(response.headers.get('content-type'), /text\/html/);
});

test('GET /healthz returns service readiness without exposing secrets', async (t) => {
  const server = createServer({
    env: {
      OPENAI_BASE_URL: 'https://model.example/v1',
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'test-model',
    },
  });
  t.after(() => server.close());
  const baseUrl = await listen(server);

  const response = await fetch(`${baseUrl}/healthz`);
  const json = await response.json();

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.service, 'talk2graph');
  assert.equal(json.modelConfigured, true);
  assert.match(json.version, /^\d+\.\d+\.\d+/);
  assert.match(json.commit, /^[0-9a-f]{7,40}$|^unknown$/);
  assert.doesNotMatch(JSON.stringify(json), /test-key/);
});

test('GET only serves product static assets', async (t) => {
  const server = createServer({ env: {} });
  t.after(() => server.close());
  const baseUrl = await listen(server);

  const appResponse = await fetch(`${baseUrl}/src/browser-app.js`);
  const graphEngineResponse = await fetch(`${baseUrl}/src/graph-engine.js`);
  const retiredTikzJaxResponse = await fetch(`${baseUrl}/tikzjax.bundle.min.js`);
  const packageResponse = await fetch(`${baseUrl}/package.json`);
  const serverSourceResponse = await fetch(`${baseUrl}/server.js`);

  assert.equal(appResponse.status, 200);
  assert.equal(graphEngineResponse.status, 200);
  assert.equal(retiredTikzJaxResponse.status, 404);
  assert.equal(packageResponse.status, 404);
  assert.equal(serverSourceResponse.status, 404);
});

test('POST /api/generate falls back to OpenAI-compatible model when configured', async (t) => {
  const calls = [];
  const server = createServer({
    env: {
      OPENAI_BASE_URL: 'https://model.example/v1',
      OPENAI_API_KEY: 'test-key',
      OPENAI_MODEL: 'test-model',
    },
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return new Response(JSON.stringify({
        choices: [{
          message: {
            content: [
              '```tex',
              '\\documentclass[tikz,border=10pt]{standalone}',
              '\\usepackage{tikz}',
              '\\begin{document}',
              '\\begin{tikzpicture}',
              '\\draw (0,0) -- (1,1);',
              '\\end{tikzpicture}',
              '\\end{document}',
              '```',
            ].join('\n'),
          },
        }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  t.after(() => server.close());
  const baseUrl = await listen(server);

  const { response, json } = await requestJson(baseUrl, '/api/generate', {
    prompt: '画一个还没有内置模板的数学图形',
  });

  assert.equal(response.status, 200);
  assert.equal(json.kind, 'llm');
  assert.match(json.tikzSource, /\\draw \(0,0\) -- \(1,1\);/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://model.example/v1/chat/completions');
  assert.equal(calls[0].options.headers.authorization, 'Bearer test-key');
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, 'test-model');
  assert.equal(body.messages[1].content, '画一个还没有内置模板的数学图形');
});
