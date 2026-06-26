(function initBrowserApp() {
  let currentTikzSource = '';
  let currentSvg = '';
  let currentGraphType = '';
  const tikzHistory = [];
  let isGenerating = false;

  function byId(id) {
    return document.getElementById(id);
  }

  function setError(message) {
    const banner = byId('error-banner');
    if (!message) {
      banner.style.display = 'none';
      banner.textContent = '';
      return;
    }
    banner.textContent = message;
    banner.style.display = 'block';
  }

  function addMessage(role, text) {
    const history = byId('chat-history');
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.textContent = text;
    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
  }

  function clearCanvasImage() {
    const canvas = byId('preview-canvas');
    const oldImg = canvas.querySelector('img');
    if (oldImg) oldImg.remove();
  }

  function setLoading(loading) {
    byId('loading-indicator').style.display = loading ? 'block' : 'none';
    byId('send-btn').disabled = loading;
    document.querySelectorAll('[data-prompt]').forEach((button) => {
      button.disabled = loading;
    });
    isGenerating = loading;
    updateToolbarState();
  }

  function updateToolbarState() {
    byId('download-svg-btn').disabled = isGenerating || !currentSvg;
    byId('download-tikz-btn').disabled = isGenerating || !currentTikzSource;
    byId('undo-btn').disabled = isGenerating || tikzHistory.length === 0;
    document.querySelectorAll('[data-requires-graph="true"]').forEach((button) => {
      const graphScope = button.dataset.graphScope || '';
      const scopeMismatch = graphScope && graphScope !== currentGraphType;
      button.disabled = isGenerating || !currentTikzSource || scopeMismatch;
    });
  }

  function inferGraphType(tikzSource) {
    const source = String(tikzSource || '');
    if (/\\begin\{axis\}/.test(source)) return 'plot';
    if (/\\coordinate \(A\) at \(0,0\);/.test(source)
      && /\\coordinate \(B\) at \(-?\d+(?:\.\d+)?,0\);/.test(source)
      && /\\coordinate \(C\) at \(0,-?\d+(?:\.\d+)?\);/.test(source)
      && /直角/.test(source)) {
      return 'right-triangle';
    }
    return '';
  }

  function setPlaceholder(html, show = true) {
    const placeholder = byId('preview-placeholder');
    placeholder.innerHTML = html;
    placeholder.style.display = show ? 'block' : 'none';
  }

  function encodeSvg(svg) {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  }

  function showMissingPreview(message) {
    clearCanvasImage();
    currentSvg = '';
    setPlaceholder(`<div class="icon">⚠️</div>${message}<br><small>可以先下载 TikZ 源码。</small>`);
  }

  function generateWithLocalTemplate(prompt) {
    const engine = window.Talk2GraphEngine;
    if (!engine || typeof engine.generateGraph !== 'function') return null;

    const result = engine.generateGraph({
      prompt,
      currentTikzSource,
    });
    if (!result || result.kind === 'unmatched') return null;
    return result;
  }

  function localUnsupportedMessage(prompt) {
    const engine = window.Talk2GraphEngine;
    if (!engine || typeof engine.generateGraph !== 'function') return '';

    const result = engine.generateGraph({
      prompt,
      currentTikzSource,
    });
    return result && result.kind === 'unmatched' ? result.message : '';
  }

  async function requestGraph(prompt) {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          prompt,
          currentTikzSource,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (response.ok) {
        return payload;
      }

      const localResult = generateWithLocalTemplate(prompt);
      if (localResult) return localResult;

      const localMessage = localUnsupportedMessage(prompt);
      throw new Error(payload.error || localMessage || `请求失败：HTTP ${response.status}`);
    } catch (error) {
      const localResult = generateWithLocalTemplate(prompt);
      if (localResult) return localResult;
      if (/HTTP 404|Failed to fetch|NetworkError/i.test(error.message)) {
        const localMessage = localUnsupportedMessage(prompt);
        if (localMessage) throw new Error(localMessage);
      }
      throw error;
    }
  }

  async function sendMessage() {
    if (isGenerating) return;
    const input = byId('chat-input');
    const userText = input.value.trim();
    if (!userText) return;

    input.value = '';
    addMessage('user', userText);
    setError('');
    setLoading(true);
    setPlaceholder('<div class="icon">📐</div>正在生成图形...');

    try {
      const result = await requestGraph(userText);
      if (currentTikzSource) {
        tikzHistory.push({
          tikzSource: currentTikzSource,
          svg: currentSvg,
          graphType: currentGraphType,
        });
      }
      currentTikzSource = result.tikzSource;
      currentGraphType = inferGraphType(currentTikzSource);
      if (result.svg) {
        renderSvg(result.svg);
      } else {
        showMissingPreview('TikZ 源码已生成，但当前没有可预览的 SVG。');
      }
      updateToolbarState();
      setError(result.renderWarning || '');
      addMessage('assistant', result.message || '已生成图形');
    } catch (error) {
      setError(error.message);
      addMessage('assistant', error.message);
      if (!currentTikzSource) {
        setPlaceholder('<div class="icon">📐</div>在左侧描述你要画的图形');
      }
    } finally {
      setLoading(false);
    }
  }

  function renderSvg(svg) {
    clearCanvasImage();
    currentSvg = svg;
    const img = document.createElement('img');
    img.src = encodeSvg(svg);
    img.alt = '生成的数学图形';
    byId('preview-canvas').appendChild(img);
    byId('preview-placeholder').style.display = 'none';
  }

  function downloadSVG() {
    if (!currentSvg) return;
    const blob = new Blob([currentSvg], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'talk2graph.svg';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function downloadTeX() {
    if (!currentTikzSource) return;
    const blob = new Blob([currentTikzSource], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'talk2graph.tex';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function undoLast() {
    if (tikzHistory.length === 0) return;
    const previous = tikzHistory.pop();
    currentTikzSource = previous.tikzSource;
    currentGraphType = previous.graphType || inferGraphType(currentTikzSource);
    if (previous.svg) {
      renderSvg(previous.svg);
    } else {
      showMissingPreview('TikZ 源码已恢复，但当前没有可预览的 SVG。');
    }
    updateToolbarState();
    setError('');
    addMessage('assistant', '已撤销到上一版图形。');
  }

  function bindEvents() {
    byId('send-btn').addEventListener('click', sendMessage);
    byId('chat-input').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') sendMessage();
    });
    document.querySelectorAll('[data-prompt]').forEach((button) => {
      button.addEventListener('click', () => {
        byId('chat-input').value = button.dataset.prompt;
        sendMessage();
      });
    });
    byId('download-svg-btn').addEventListener('click', downloadSVG);
    byId('download-tikz-btn').addEventListener('click', downloadTeX);
    byId('undo-btn').addEventListener('click', undoLast);
    updateToolbarState();
  }

  document.addEventListener('DOMContentLoaded', bindEvents);
}());
