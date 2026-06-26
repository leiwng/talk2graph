const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('home page exposes one-click Chinese examples for first-use onboarding', () => {
  const html = readProjectFile('index.html');

  assert.match(html, /data-prompt="画一个直角三角形，两条直角边分别是 3 和 4，标出边长"/);
  assert.match(html, /data-prompt="画一个等边三角形，边长 5cm"[^>]*>等边三角形/);
  assert.match(html, /data-prompt="画一个正方形，边长 4cm"[^>]*>正方形/);
  assert.match(html, /data-prompt="画一个圆，半径 3cm，标注圆心"[^>]*>圆心半径/);
  assert.match(html, /data-prompt="画一个等腰三角形，底边长 6cm，腰长 5cm"[^>]*>底腰等腰/);
  assert.match(html, /data-prompt="画直角三角形的内切圆，直角边分别为 3 和 4，标出内切圆圆心和半径"[^>]*>直角内切圆/);
  assert.match(html, /data-prompt="画 y = 2x \+ 1 的图像，在 -5 到 5 范围内"[^>]*>一次函数/);
  assert.match(html, /data-prompt="画 y = x² 的图像，在 -3 到 3 范围内"[^>]*>二次函数/);
  assert.match(html, /data-prompt="画 y = sin\(x\) 的图像，在 -2π 到 2π 范围内"[^>]*>正弦函数/);
  assert.match(html, /data-prompt="画参数方程绘制的椭圆：x=3cos\(t\), y=2sin\(t\)，t 从 0 到 2π"[^>]*>参数椭圆/);
  assert.match(html, /data-prompt="画一个柱状图：一班 85 分，二班 78 分，三班 92 分，四班 80 分"[^>]*>班级柱状图/);
  assert.match(html, /data-prompt="画 y = sin\(x\) 和 y = cos\(x\) 在 -2π 到 2π 的图像，用不同颜色区分"/);
  assert.match(html, /data-prompt="画一个内切圆半径为 3 的等腰三角形"[^>]*>内切圆等腰三角形/);
  assert.match(html, /data-prompt="画一个长方体，被一个平面截成斜截面，标出截面"/);
  assert.match(html, /data-prompt="画一个班级成绩条形统计图，数据为优秀10人，良好18人，及格8人，待提高4人"/);
  assert.match(html, /data-requires-graph="true"[^>]*data-prompt="把直角标记从内侧移到外侧"[^>]*>直角标记外侧/);
  assert.match(html, /data-requires-graph="true"[^>]*>斜边上的高/);
  assert.match(html, /data-requires-graph="true"[^>]*data-prompt="加一条辅助线"[^>]*>加辅助线/);
  assert.match(html, /data-requires-graph="true"[^>]*data-prompt="标出∠A"[^>]*>标出角A/);
  assert.match(html, /data-requires-graph="true"[^>]*data-prompt="把角B标出来"[^>]*>标出角B/);
  assert.match(html, /data-requires-graph="true"[^>]*data-prompt="标出∠C"[^>]*>标出角C/);
  assert.match(html, /data-requires-graph="true"[^>]*data-prompt="把辅助线改成虚线"[^>]*>辅助线虚线/);
  assert.match(html, /data-requires-graph="true"[^>]*data-prompt="把坐标系的范围改成 -5 到 5"[^>]*>范围 -5 到 5/);
  assert.match(html, /class="example-prompts"/);
});

test('home page no longer asks teachers for browser-side API credentials', () => {
  const html = readProjectFile('index.html');

  assert.doesNotMatch(html, /API Key/);
  assert.doesNotMatch(html, /api-key/);
  assert.doesNotMatch(html, /Base URL/);
});

test('browser app wires example prompt buttons into the normal send flow', () => {
  const script = readProjectFile('src/browser-app.js');

  assert.match(script, /querySelectorAll\('\[data-prompt\]'\)/);
  assert.match(script, /button\.dataset\.prompt/);
  assert.match(script, /sendMessage\(\)/);
});

test('browser app does not claim browser-side TikZJax rendering support', () => {
  const script = readProjectFile('src/browser-app.js');

  assert.doesNotMatch(script, /tikzjax/i);
  assert.doesNotMatch(script, /sourceToFallbackSvg/);
});

test('home page loads the local template engine before the browser app', () => {
  const html = readProjectFile('index.html');
  const graphEngineIndex = html.indexOf('src="./src/graph-engine.js"');
  const browserAppIndex = html.indexOf('src="./src/browser-app.js"');

  assert.ok(graphEngineIndex > 0);
  assert.ok(browserAppIndex > graphEngineIndex);
});

test('home page does not load the retired TikZJax placeholder bundle', () => {
  const html = readProjectFile('index.html');

  assert.doesNotMatch(html, /tikzjax\.bundle\.min\.js/);
});

test('home page keeps the mobile first-use flow usable on small screens', () => {
  const html = readProjectFile('index.html');

  assert.match(html, /@media \(max-width: 820px\)/);
  assert.match(html, /body \{[^}]*min-height: 100dvh;[^}]*overflow: auto;[^}]*\}/s);
  assert.match(html, /#chat-input-area \{[^}]*position: sticky;[^}]*bottom: 0;[^}]*background: #fff;[^}]*\}/s);
  assert.match(html, /#preview-canvas \{[^}]*min-height: 280px;[^}]*\}/s);
  assert.match(html, /#preview-header \.actions \{[^}]*width: 100%;[^}]*\}/s);
});
