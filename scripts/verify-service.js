#!/usr/bin/env node

const http = require('node:http');
const https = require('node:https');

const DEFAULT_URL = 'http://127.0.0.1:3000';
const SECRET_PATTERN = /(sk-[A-Za-z0-9_-]+|AKID[A-Za-z0-9]+|OPENAI_API_KEY|TENCENTCLOUD_SECRET)/i;
const BUILT_IN_PROMPTS = [
  {
    name: 'built-in template generation works',
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
    messagePattern: /直角三角形/,
  },
  {
    name: 'diameter circle template generation works',
    prompt: '画直角三角形 ABC，C 为直角顶点，AC=3，BC=4；以 AC 为直径画圆，圆与斜边 AB 相交于点 D',
    messagePattern: /AC 为直径|交点 D/,
  },
];

function check(name, ok, detail) {
  return { name, ok, detail };
}

function requestText(url, options = {}) {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;
    const req = client.request(target, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: 5000,
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          body,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('request timed out'));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function fetchText(url) {
  return requestText(url);
}

async function fetchJson(url, options = {}) {
  const response = await requestText(url, options);
  const body = response.body;
  let json = {};
  try {
    json = body ? JSON.parse(body) : {};
  } catch {
    json = {};
  }
  return {
    ok: response.ok,
    status: response.status,
    json,
    body,
  };
}

async function generatePrompt(baseUrl, prompt) {
  try {
    return await fetchJson(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
  } catch (error) {
    return { ok: false, status: 0, json: {}, body: error.message };
  }
}

async function verifyService(baseUrl = DEFAULT_URL) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const checks = [];

  let homepage;
  try {
    homepage = await fetchText(`${normalizedBaseUrl}/`);
    checks.push(check(
      'homepage is reachable',
      homepage.ok && /talk2graph/i.test(homepage.body),
      `HTTP ${homepage.status}`,
    ));
  } catch (error) {
    return {
      ok: false,
      url: normalizedBaseUrl,
      checks: [check('homepage is reachable', false, error.message)],
    };
  }

  try {
    const health = await fetchJson(`${normalizedBaseUrl}/healthz`);
    const serialized = JSON.stringify(health.json);
    checks.push(check(
      'health endpoint reports readiness',
      health.ok && health.json.ok === true && health.json.service === 'talk2graph',
      `HTTP ${health.status}`,
    ));
    checks.push(check(
      'health endpoint does not expose secrets',
      !SECRET_PATTERN.test(serialized),
      'health response should only expose readiness booleans',
    ));
  } catch (error) {
    checks.push(check('health endpoint reports readiness', false, error.message));
    checks.push(check('health endpoint does not expose secrets', false, error.message));
  }

  const generatedResults = [];
  for (const item of BUILT_IN_PROMPTS) {
    const generated = await generatePrompt(normalizedBaseUrl, item.prompt);
    generatedResults.push(generated);
    checks.push(check(
      item.name,
      generated.ok
        && generated.json.kind === 'template'
        && item.messagePattern.test(generated.json.message || generated.json.tikzSource || ''),
      `HTTP ${generated.status || 'network-error'}; kind=${generated.json.kind || 'missing'}`,
    ));
  }

  const generated = generatedResults[0] || { json: {} };
  checks.push(check(
    'template response includes SVG preview',
    typeof generated.json.svg === 'string' && /<svg/i.test(generated.json.svg),
    'expected svg field in /api/generate response',
  ));
  checks.push(check(
    'template response includes TikZ export',
    typeof generated.json.tikzSource === 'string' && /\\end\{document\}/.test(generated.json.tikzSource),
    'expected full TikZ document in /api/generate response',
  ));

  return {
    ok: checks.every((item) => item.ok),
    url: normalizedBaseUrl,
    checks,
  };
}

function printResult(result) {
  console.log(`Service: ${result.url}`);
  for (const item of result.checks) {
    const marker = item.ok ? 'PASS' : 'FAIL';
    console.log(`[${marker}] ${item.name} - ${item.detail}`);
  }
}

async function main() {
  const url = process.argv[2] || process.env.TALK2GRAPH_SERVICE_URL || DEFAULT_URL;
  const result = await verifyService(url);
  printResult(result);
  process.exitCode = result.ok ? 0 : 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_URL,
  verifyService,
};
