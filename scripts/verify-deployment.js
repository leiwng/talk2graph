#!/usr/bin/env node

const DEFAULT_URL = 'https://talk2graph-1259138134.cos-website.ap-guangzhou.myqcloud.com';

async function fetchText(url) {
  const response = await fetch(url, { redirect: 'follow' });
  const body = await response.text();
  return {
    ok: response.ok,
    status: response.status,
    contentDisposition: response.headers.get('content-disposition') || '',
    forceDownload: response.headers.get('x-cos-force-download') || '',
    body,
    url,
  };
}

function check(name, ok, detail) {
  return { name, ok, detail };
}

async function verifyDeployment(baseUrl = DEFAULT_URL) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const checks = [];

  let homepage;
  try {
    homepage = await fetchText(`${normalizedBaseUrl}/`);
    checks.push(check('homepage is reachable', homepage.ok, `HTTP ${homepage.status}`));
  } catch (error) {
    return {
      ok: false,
      url: normalizedBaseUrl,
      checks: [check('homepage is reachable', false, error.message)],
    };
  }

  checks.push(check(
    'homepage opens inline instead of downloading',
    !/attachment/i.test(homepage.contentDisposition) && !/^true$/i.test(homepage.forceDownload),
    `content-disposition=${homepage.contentDisposition || 'none'}, x-cos-force-download=${homepage.forceDownload || 'none'}`,
  ));
  checks.push(check(
    'homepage removes browser API key configuration',
    !/API Key|api-key|localStorage\.setItem/i.test(homepage.body),
    'old static page exposed browser-side model configuration',
  ));
  checks.push(check(
    'homepage does not load retired TikZJax placeholder',
    !/tikzjax\.bundle\.min\.js/i.test(homepage.body),
    'retired placeholder bundle should not be referenced',
  ));
  checks.push(check(
    'homepage loads the static graph engine',
    /src\/graph-engine\.js/.test(homepage.body),
    'expected src/graph-engine.js script reference',
  ));
  checks.push(check(
    'homepage exposes one-click examples',
    /data-prompt=/.test(homepage.body) && /直角三角形/.test(homepage.body),
    'expected prompt example buttons',
  ));
  checks.push(check(
    'homepage exposes dataset-backed examples',
    /data-prompt="画一个等边三角形，边长 5cm"[^>]*>等边三角形/.test(homepage.body)
      && /data-prompt="画一个正方形，边长 4cm"[^>]*>正方形/.test(homepage.body)
      && /data-prompt="画 y = 2x \+ 1 的图像，在 -5 到 5 范围内"[^>]*>一次函数/.test(homepage.body)
      && /data-prompt="画参数方程绘制的椭圆：x=3cos\(t\), y=2sin\(t\)，t 从 0 到 2π"[^>]*>参数椭圆/.test(homepage.body)
      && /data-prompt="画一个柱状图：一班 85 分，二班 78 分，三班 92 分，四班 80 分"[^>]*>班级柱状图/.test(homepage.body),
    'expected dataset-backed one-click examples',
  ));
  checks.push(check(
    'homepage exposes angle marking examples',
    /data-prompt="标出∠A"[^>]*>标出角A/.test(homepage.body)
      && /data-prompt="把角B标出来"[^>]*>标出角B/.test(homepage.body)
      && /data-prompt="标出∠C"[^>]*>标出角C/.test(homepage.body),
    'expected angle A/B/C modification buttons',
  ));

  try {
    const graphEngine = await fetchText(`${normalizedBaseUrl}/src/graph-engine.js`);
    checks.push(check(
      'graph engine asset is reachable',
      graphEngine.ok && /Talk2GraphEngine/.test(graphEngine.body),
      `HTTP ${graphEngine.status}`,
    ));
  } catch (error) {
    checks.push(check('graph engine asset is reachable', false, error.message));
  }

  return {
    ok: checks.every((item) => item.ok),
    url: normalizedBaseUrl,
    checks,
  };
}

function printResult(result) {
  console.log(`Deployment: ${result.url}`);
  for (const item of result.checks) {
    const marker = item.ok ? 'PASS' : 'FAIL';
    console.log(`[${marker}] ${item.name} - ${item.detail}`);
  }
}

async function main() {
  const url = process.argv[2] || process.env.TALK2GRAPH_DEPLOY_URL || DEFAULT_URL;
  const result = await verifyDeployment(url);
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
  verifyDeployment,
};
