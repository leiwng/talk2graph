const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { verifyDeployment } = require('../scripts/verify-deployment');

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

test('deployment verifier accepts the new static demo asset set', async () => {
  await withServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`
        <button data-prompt="画一个直角三角形">直角三角形</button>
        <button data-prompt="画一个等边三角形，边长 5cm">等边三角形</button>
        <button data-prompt="画一个正方形，边长 4cm">正方形</button>
        <button data-prompt="画 y = 2x + 1 的图像，在 -5 到 5 范围内">一次函数</button>
        <button data-prompt="画参数方程绘制的椭圆：x=3cos(t), y=2sin(t)，t 从 0 到 2π">参数椭圆</button>
        <button data-prompt="画一个柱状图：一班 85 分，二班 78 分，三班 92 分，四班 80 分">班级柱状图</button>
        <button data-requires-graph="true" data-prompt="标出∠A">标出角A</button>
        <button data-requires-graph="true" data-prompt="把角B标出来">标出角B</button>
        <button data-requires-graph="true" data-prompt="标出∠C">标出角C</button>
        <script src="src/graph-engine.js"></script>
        <script src="src/browser-app.js"></script>
      `);
      return;
    }

    if (req.url === '/src/graph-engine.js') {
      res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' });
      res.end('window.Talk2GraphEngine = {};');
      return;
    }

    res.writeHead(404);
    res.end('not found');
  }, async (baseUrl) => {
    const result = await verifyDeployment(baseUrl);

    assert.equal(result.ok, true);
    assert.equal(result.checks.length, 9);
    assert.equal(result.checks.every((check) => check.ok), true);
  });
});

test('deployment verifier rejects the old browser-key page', async () => {
  await withServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`
        <label>API Key</label>
        <script>localStorage.setItem('api-key', 'demo')</script>
      `);
      return;
    }

    res.writeHead(404);
    res.end('not found');
  }, async (baseUrl) => {
    const result = await verifyDeployment(baseUrl);

    assert.equal(result.ok, false);
    assert.deepEqual(
      result.checks.filter((check) => !check.ok).map((check) => check.name),
      [
        'homepage removes browser API key configuration',
        'homepage loads the static graph engine',
        'homepage exposes one-click examples',
        'homepage exposes dataset-backed examples',
        'homepage exposes angle marking examples',
        'graph engine asset is reachable',
      ],
    );
  });
});

test('deployment verifier rejects pages that are forced to download by COS', async () => {
  await withServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'content-disposition': 'attachment',
        'x-cos-force-download': 'true',
      });
      res.end(`
        <button data-prompt="画一个直角三角形">直角三角形</button>
        <button data-prompt="画一个等边三角形，边长 5cm">等边三角形</button>
        <button data-prompt="画一个正方形，边长 4cm">正方形</button>
        <button data-prompt="画 y = 2x + 1 的图像，在 -5 到 5 范围内">一次函数</button>
        <button data-prompt="画参数方程绘制的椭圆：x=3cos(t), y=2sin(t)，t 从 0 到 2π">参数椭圆</button>
        <button data-prompt="画一个柱状图：一班 85 分，二班 78 分，三班 92 分，四班 80 分">班级柱状图</button>
        <button data-requires-graph="true" data-prompt="标出∠A">标出角A</button>
        <button data-requires-graph="true" data-prompt="把角B标出来">标出角B</button>
        <button data-requires-graph="true" data-prompt="标出∠C">标出角C</button>
        <script src="src/graph-engine.js"></script>
        <script src="src/browser-app.js"></script>
      `);
      return;
    }

    if (req.url === '/src/graph-engine.js') {
      res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' });
      res.end('window.Talk2GraphEngine = {};');
      return;
    }

    res.writeHead(404);
    res.end('not found');
  }, async (baseUrl) => {
    const result = await verifyDeployment(baseUrl);

    assert.equal(result.ok, false);
    assert.deepEqual(
      result.checks.filter((check) => !check.ok).map((check) => check.name),
      ['homepage opens inline instead of downloading'],
    );
  });
});

test('deployment verifier rejects pages that still load the retired TikZJax placeholder', async () => {
  await withServer((req, res) => {
    if (req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`
        <button data-prompt="画一个直角三角形">直角三角形</button>
        <button data-prompt="画一个等边三角形，边长 5cm">等边三角形</button>
        <button data-prompt="画一个正方形，边长 4cm">正方形</button>
        <button data-prompt="画 y = 2x + 1 的图像，在 -5 到 5 范围内">一次函数</button>
        <button data-prompt="画参数方程绘制的椭圆：x=3cos(t), y=2sin(t)，t 从 0 到 2π">参数椭圆</button>
        <button data-prompt="画一个柱状图：一班 85 分，二班 78 分，三班 92 分，四班 80 分">班级柱状图</button>
        <button data-requires-graph="true" data-prompt="标出∠A">标出角A</button>
        <button data-requires-graph="true" data-prompt="把角B标出来">标出角B</button>
        <button data-requires-graph="true" data-prompt="标出∠C">标出角C</button>
        <script src="tikzjax.bundle.min.js"></script>
        <script src="src/graph-engine.js"></script>
        <script src="src/browser-app.js"></script>
      `);
      return;
    }

    if (req.url === '/src/graph-engine.js') {
      res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8' });
      res.end('window.Talk2GraphEngine = {};');
      return;
    }

    res.writeHead(404);
    res.end('not found');
  }, async (baseUrl) => {
    const result = await verifyDeployment(baseUrl);

    assert.equal(result.ok, false);
    assert.deepEqual(
      result.checks.filter((check) => !check.ok).map((check) => check.name),
      ['homepage does not load retired TikZJax placeholder'],
    );
  });
});
