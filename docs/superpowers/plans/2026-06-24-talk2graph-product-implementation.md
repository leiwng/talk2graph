# Talk2Graph Product Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the product described in `docs/产品需求.md`: Chinese natural-language math drawing, precise common templates, continuous code-state modification, and SVG/TikZ export without browser-exposed API keys.

**Architecture:** Add a small Node.js server that serves the frontend and exposes `/api/generate`. Add a tested graph engine with deterministic TikZ templates for product examples and a server-side OpenAI-compatible fallback for unsupported prompts.

**Tech Stack:** Node.js built-in `http`, Node built-in `node:test`, CommonJS modules, TikZ/PGFPlots, browser JavaScript.

---

### Task 1: Core Graph Engine Tests

**Files:**
- Create: `test/graph-engine.test.js`
- Create later: `src/graph-engine.js`

- [ ] **Step 1: Write failing tests**

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  generateGraph,
  extractTikz,
} = require('../src/graph-engine');

test('generates a precise 3-4 right triangle with Chinese labels', () => {
  const result = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\documentclass\[tikz,border=10pt\]\{standalone\}/);
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(4,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(0,3\);/);
  assert.match(result.tikzSource, /\{4\}/);
  assert.match(result.tikzSource, /\{3\}/);
  assert.match(result.tikzSource, /直角/);
});

test('generates sin and cos plots from -2pi to 2pi', () => {
  const result = generateGraph({
    prompt: '画 y = sin(x) 和 y = cos(x) 在 -2π 到 2π 的图像，用不同颜色区分',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\begin\{axis\}/);
  assert.match(result.tikzSource, /xmin=-2\*pi/);
  assert.match(result.tikzSource, /xmax=2\*pi/);
  assert.match(result.tikzSource, /\\addplot\[blue/);
  assert.match(result.tikzSource, /\{sin\(deg\(x\)\)\}/);
  assert.match(result.tikzSource, /\\addplot\[red/);
  assert.match(result.tikzSource, /\{cos\(deg\(x\)\)\}/);
});

test('generates a circle with an inscribed regular hexagon and center label', () => {
  const result = generateGraph({
    prompt: '画一个圆，内接一个正六边形，标注圆心',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\draw\[thick\] \(O\) circle \(2\);/);
  assert.match(result.tikzSource, /\\foreach \\i in \{0,60,120,180,240,300\}/);
  assert.match(result.tikzSource, /圆心/);
});

test('modifies a triangle while preserving unrelated coordinates', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });

  const modified = generateGraph({
    prompt: '去掉边长的标注，加一条斜边上的高',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(B\) at \(4,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(C\) at \(0,3\);/);
  assert.doesNotMatch(modified.tikzSource, /node\[below\]\s*\{4\}/);
  assert.doesNotMatch(modified.tikzSource, /node\[left\]\s*\{3\}/);
  assert.match(modified.tikzSource, /斜边上的高/);
  assert.match(modified.tikzSource, /dashed, gray/);
});

test('extracts fenced TikZ from model output', () => {
  const source = extractTikz('说明\\n```tex\\n\\\\documentclass{standalone}\\n\\\\begin{document}\\nOK\\n\\\\end{document}\\n```');
  assert.equal(source, '\\\\documentclass{standalone}\\n\\\\begin{document}\\nOK\\n\\\\end{document}');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/graph-engine.test.js`
Expected: FAIL with module-not-found for `src/graph-engine.js`.

- [ ] **Step 3: Implement `src/graph-engine.js`**

Create deterministic generation functions, `extractTikz`, and a browser/global export.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/graph-engine.test.js`
Expected: PASS.

### Task 2: Server API Tests

**Files:**
- Create: `test/server.test.js`
- Create later: `server.js`

- [ ] **Step 1: Write failing tests**

Test `/api/generate` for built-in prompts, missing prompt, and unknown prompt without LLM config.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/server.test.js`
Expected: FAIL with module-not-found or missing server export.

- [ ] **Step 3: Implement server**

Create an HTTP server with static file serving and `/api/generate`.

- [ ] **Step 4: Run server tests**

Run: `npm test -- test/server.test.js`
Expected: PASS.

### Task 3: Frontend Product Flow

**Files:**
- Modify: `index.html`
- Create: `src/browser-app.js`

- [ ] **Step 1: Move API calls to `/api/generate`**

Remove browser API key settings from the primary path.

- [ ] **Step 2: Add product states**

Show Chinese states for ready, generating, rendered, export disabled, and errors.

- [ ] **Step 3: Preserve exports and undo**

Keep SVG and TikZ download buttons wired to current state and make undo restore the previous source.

### Task 4: Deployment and Documentation

**Files:**
- Modify: `package.json`
- Modify: `deploy_cos.py`
- Modify: `README.md`
- Modify: `docs/项目状态.md`

- [ ] **Step 1: Add scripts**

Set `npm test` to `node --test` and add `npm start` for `server.js`.

- [ ] **Step 2: Update deployment script**

Upload `index.html` and `src/*` assets when using static hosting.

- [ ] **Step 3: Document runtime**

Explain local start, server environment variables, and static demo limitations.

### Task 5: Verification

**Files:**
- All changed files

- [ ] **Step 1: Run automated tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Run static server smoke check**

Run: `node server.js`
Expected: server listens on `127.0.0.1:3000`.

- [ ] **Step 3: Exercise API**

Run: `curl -fsS http://127.0.0.1:3000/api/generate -H 'content-type: application/json' --data '{"prompt":"画一个圆，内接一个正六边形，标注圆心"}'`
Expected: JSON contains `tikzSource` and `圆心`.
