const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');

function loadApp({ fetchImpl, includeGraphEngine = false }) {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const graphEngineScript = fs.readFileSync(path.join(root, 'src/graph-engine.js'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'src/browser-app.js'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'http://127.0.0.1:3000/',
  });

  dom.window.fetch = fetchImpl;
  const downloads = [];
  dom.window.URL.createObjectURL = (blob) => {
    downloads.push({ blob });
    return `blob:talk2graph-test-${downloads.length}`;
  };
  dom.window.URL.revokeObjectURL = () => {};
  dom.window.HTMLAnchorElement.prototype.click = function click() {
    downloads[downloads.length - 1].download = this.download;
    downloads[downloads.length - 1].href = this.href;
  };
  if (includeGraphEngine) {
    dom.window.eval(graphEngineScript);
  }
  dom.window.eval(script);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

  return { dom, downloads };
}

test('example prompt buttons are disabled while generation is in progress', async () => {
  let resolveFetch;
  const fetchPromise = new Promise((resolve) => {
    resolveFetch = resolve;
  });
  const { dom } = loadApp({
    fetchImpl: async () => fetchPromise,
  });

  const exampleButton = dom.window.document.querySelector('[data-prompt]');
  exampleButton.click();
  await new Promise((resolve) => setImmediate(resolve));

  const exampleButtons = [...dom.window.document.querySelectorAll('[data-prompt]')];
  const templateButtons = [...dom.window.document.querySelectorAll('[data-prompt]:not([data-requires-graph])')];
  assert.equal(dom.window.document.getElementById('send-btn').disabled, true);
  assert.ok(exampleButtons.every((button) => button.disabled));

  resolveFetch(new Response(JSON.stringify({
    kind: 'template',
    tikzSource: '\\documentclass[tikz,border=10pt]{standalone}\n\\begin{document}\n\\end{document}',
    svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>OK</text></svg>',
    message: '已生成图形',
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  }));
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(dom.window.document.getElementById('send-btn').disabled, false);
  assert.ok(templateButtons.every((button) => !button.disabled));
  assert.match(dom.window.document.querySelector('#preview-canvas img').src, /^data:image\/svg\+xml/);
});

test('export buttons are enabled after generation and download SVG/TikZ files', async () => {
  const { dom, downloads } = loadApp({
    fetchImpl: async () => new Response(JSON.stringify({
      kind: 'template',
      tikzSource: '\\documentclass[tikz,border=10pt]{standalone}\n\\begin{document}\n\\begin{tikzpicture}\n\\coordinate (A) at (0,0);\n\\coordinate (B) at (4,0);\n\\coordinate (C) at (0,3);\n\\node at (A) {直角};\n\\end{tikzpicture}\n\\end{document}',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>OK</text></svg>',
      message: '已生成图形',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });

  const svgButton = dom.window.document.getElementById('download-svg-btn');
  const tikzButton = dom.window.document.getElementById('download-tikz-btn');

  assert.equal(svgButton.disabled, true);
  assert.equal(tikzButton.disabled, true);

  dom.window.document.querySelector('[data-prompt]').click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(svgButton.disabled, false);
  assert.equal(tikzButton.disabled, false);

  svgButton.click();
  tikzButton.click();

  assert.equal(downloads.length, 2);
  assert.equal(downloads[0].download, 'talk2graph.svg');
  assert.equal(downloads[0].blob.type, 'image/svg+xml;charset=utf-8');
  assert.equal(downloads[1].download, 'talk2graph.tex');
  assert.equal(downloads[1].blob.type, 'text/plain;charset=utf-8');
});

test('render warnings are shown while keeping TikZ export available', async () => {
  const { dom } = loadApp({
    fetchImpl: async () => new Response(JSON.stringify({
      kind: 'llm',
      tikzSource: '\\documentclass[tikz,border=10pt]{standalone}\n\\begin{document}\n\\draw (0,0) -- (1,1);\n\\end{document}',
      renderWarning: 'TikZ 源码已生成，但 SVG 渲染失败：缺少字体',
      message: '已由服务端模型生成图形。',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });

  dom.window.document.querySelector('[data-prompt]').click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(dom.window.document.getElementById('error-banner').style.display, 'block');
  assert.match(dom.window.document.getElementById('error-banner').textContent, /SVG 渲染失败/);
  assert.equal(dom.window.document.getElementById('download-tikz-btn').disabled, false);
  assert.equal(dom.window.document.getElementById('download-svg-btn').disabled, true);
  assert.equal(dom.window.document.querySelector('#preview-canvas img'), null);
  assert.match(dom.window.document.getElementById('preview-placeholder').textContent, /TikZ 源码已生成/);
});

test('graph modification example buttons are disabled until a graph exists', async () => {
  const { dom } = loadApp({
    fetchImpl: async () => new Response(JSON.stringify({
      kind: 'template',
      tikzSource: '\\documentclass[tikz,border=10pt]{standalone}\n\\begin{document}\n\\begin{tikzpicture}\n\\coordinate (A) at (0,0);\n\\coordinate (B) at (4,0);\n\\coordinate (C) at (0,3);\n\\node at (A) {直角};\n\\end{tikzpicture}\n\\end{document}',
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><text>OK</text></svg>',
      message: '已生成图形',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  });

  const modifierButton = dom.window.document.querySelector('[data-requires-graph="true"]');
  const templateButton = dom.window.document.querySelector('[data-prompt]:not([data-requires-graph])');

  assert.equal(modifierButton.disabled, true);

  templateButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(modifierButton.disabled, false);
});

test('coaching modification examples can be clicked after generating a graph', async () => {
  const { dom } = loadApp({
    includeGraphEngine: true,
    fetchImpl: async () => {
      throw new TypeError('Failed to fetch');
    },
  });

  const triangleButton = dom.window.document.querySelector('[data-prompt="画一个直角三角形，两条直角边分别是 3 和 4，标出边长"]');
  const outsideMarkerButton = dom.window.document.querySelector('[data-prompt="把直角标记从内侧移到外侧"]');
  const auxiliaryButton = dom.window.document.querySelector('[data-prompt="加一条辅助线"]');
  const angleButton = dom.window.document.querySelector('[data-prompt="把角B标出来"]');
  const dashedButton = dom.window.document.querySelector('[data-prompt="把辅助线改成虚线"]');

  assert.equal(outsideMarkerButton.disabled, true);
  assert.equal(auxiliaryButton.disabled, true);
  assert.equal(angleButton.disabled, true);
  assert.equal(dashedButton.disabled, true);

  triangleButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(outsideMarkerButton.disabled, false);
  assert.equal(auxiliaryButton.disabled, false);
  assert.equal(angleButton.disabled, false);
  assert.equal(dashedButton.disabled, false);

  outsideMarkerButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  auxiliaryButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  angleButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
  dashedButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  const historyText = dom.window.document.getElementById('chat-history').textContent;
  assert.match(historyText, /已将直角标记移到外侧/);
  assert.match(historyText, /已添加辅助线/);
  assert.match(historyText, /已标出角 B/);
  assert.match(historyText, /已将辅助线改为虚线/);
  assert.equal(dom.window.document.getElementById('download-svg-btn').disabled, false);
  assert.match(dom.window.document.querySelector('#preview-canvas img').src, /^data:image\/svg\+xml/);
});

test('function range modification example can be clicked after generating a plot', async () => {
  const { dom } = loadApp({
    includeGraphEngine: true,
    fetchImpl: async () => {
      throw new TypeError('Failed to fetch');
    },
  });

  const functionButton = dom.window.document.querySelector('[data-prompt="画 y = sin(x) 和 y = cos(x) 在 -2π 到 2π 的图像，用不同颜色区分"]');
  const rangeButton = dom.window.document.querySelector('[data-prompt="把坐标系的范围改成 -5 到 5"]');

  assert.equal(rangeButton.disabled, true);

  functionButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(rangeButton.disabled, false);

  rangeButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  const historyText = dom.window.document.getElementById('chat-history').textContent;
  assert.match(historyText, /已将坐标系范围改为 -5 到 5/);
  assert.equal(dom.window.document.getElementById('download-svg-btn').disabled, false);
  assert.match(dom.window.document.querySelector('#preview-canvas img').src, /^data:image\/svg\+xml/);
});

test('modification examples are enabled only for compatible graph types', async () => {
  const { dom } = loadApp({
    includeGraphEngine: true,
    fetchImpl: async () => {
      throw new TypeError('Failed to fetch');
    },
  });

  const triangleButton = dom.window.document.querySelector('[data-prompt="画一个直角三角形，两条直角边分别是 3 和 4，标出边长"]');
  const functionButton = dom.window.document.querySelector('[data-prompt="画 y = sin(x) 和 y = cos(x) 在 -2π 到 2π 的图像，用不同颜色区分"]');
  const auxiliaryButton = dom.window.document.querySelector('[data-prompt="加一条辅助线"]');
  const angleButton = dom.window.document.querySelector('[data-prompt="把角B标出来"]');
  const rangeButton = dom.window.document.querySelector('[data-prompt="把坐标系的范围改成 -5 到 5"]');

  triangleButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(auxiliaryButton.disabled, false);
  assert.equal(angleButton.disabled, false);
  assert.equal(rangeButton.disabled, true);

  functionButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(auxiliaryButton.disabled, true);
  assert.equal(angleButton.disabled, true);
  assert.equal(rangeButton.disabled, false);
});

test('static page falls back to local templates when API is unavailable', async () => {
  const { dom } = loadApp({
    includeGraphEngine: true,
    fetchImpl: async () => {
      throw new TypeError('Failed to fetch');
    },
  });

  const triangleButton = dom.window.document.querySelector('[data-prompt]:not([data-requires-graph])');
  triangleButton.click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(dom.window.document.getElementById('error-banner').style.display, 'none');
  assert.equal(dom.window.document.getElementById('download-svg-btn').disabled, false);
  assert.equal(dom.window.document.getElementById('download-tikz-btn').disabled, false);
  assert.match(dom.window.document.querySelector('#preview-canvas img').src, /^data:image\/svg\+xml/);
  assert.match(dom.window.document.getElementById('chat-history').textContent, /已生成 3-4-5 直角三角形/);
});

test('static page shows a product message for unsupported prompts without API', async () => {
  const { dom } = loadApp({
    includeGraphEngine: true,
    fetchImpl: async () => new Response('', { status: 404 }),
  });

  const input = dom.window.document.getElementById('chat-input');
  input.value = '画一个还没有内置模板的复杂几何图形';
  dom.window.document.getElementById('send-btn').click();
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));

  const errorText = dom.window.document.getElementById('error-banner').textContent;
  assert.match(errorText, /超出内置模板范围/);
  assert.doesNotMatch(errorText, /HTTP 404/);
});
