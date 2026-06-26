(function initGraphEngine(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Talk2GraphEngine = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function createGraphEngine() {
  const DOCUMENT_PREFIX = [
    '\\documentclass[tikz,border=10pt]{standalone}',
    '\\usepackage{tikz}',
    '\\usepackage{amsmath}',
    '\\usepackage{pgfplots}',
    '\\pgfplotsset{compat=1.18}',
    '\\begin{document}',
  ].join('\n');

  const DOCUMENT_SUFFIX = '\\end{document}';

  function normalizePrompt(prompt) {
    return String(prompt || '')
      .replace(/\s+/g, '')
      .replace(/，/g, ',')
      .replace(/。/g, '.')
      .replace(/＝/g, '=')
      .replace(/＋/g, '+')
      .replace(/(\d|x)加(?=\d|x)/gi, '$1+')
      .replace(/[－−]/g, '-')
      .toLowerCase();
  }

  function wrapDocument(body) {
    return `${DOCUMENT_PREFIX}\n${body.trim()}\n${DOCUMENT_SUFFIX}`;
  }

  function formatNumber(value) {
    if (Number.isInteger(value)) return String(value);
    return Number(value.toFixed(3)).toString();
  }

  function formatCoordinate(value) {
    return Number(value).toFixed(3);
  }

  function hypotenuseLabel(a, b) {
    const hypotenuse = Math.sqrt(a * a + b * b);
    return formatNumber(hypotenuse);
  }

  function triangleTemplate({ horizontal = 4, vertical = 3 } = {}) {
    const h = formatNumber(horizontal);
    const v = formatNumber(vertical);
    const hypotenuse = hypotenuseLabel(horizontal, vertical);
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (A) at (0,0);
  \coordinate (B) at (${h},0);
  \coordinate (C) at (0,${v});

  \draw[very thick] (A) -- (B) node[below] {${h}} -- (C) node[midway, above right] {${hypotenuse}} -- (A) node[left] {${v}};
  \draw[thick] (0.35,0) -- (0.35,0.35) -- (0,0.35);
  \node[below left] at (A) {直角};
  \node[below] at (A) {$A$};
  \node[below] at (B) {$B$};
  \node[left] at (C) {$C$};
\end{tikzpicture}`);
  }

  function triangleSvg({ horizontal = 4, vertical = 3, labels = true, altitude = false, outsideMarker = false, auxiliary = false, dashedAuxiliary = false, angleA = false, angleB = false, angleC = false } = {}) {
    const baseX = 100;
    const baseY = 330;
    const maxLeg = Math.max(horizontal, vertical);
    const unit = Math.min(240 / maxLeg, 60);
    const bx = baseX + horizontal * unit;
    const cy = baseY - vertical * unit;
    const midpointBCX = (bx + baseX) / 2 + 8;
    const midpointBCY = (baseY + cy) / 2 - 8;
    const sideLabels = labels
      ? `<text x="${(baseX + bx) / 2}" y="${baseY + 20}" text-anchor="middle" class="label">${formatNumber(horizontal)}</text><text x="${baseX - 18}" y="${(baseY + cy) / 2}" text-anchor="middle" class="label">${formatNumber(vertical)}</text><text x="${midpointBCX}" y="${midpointBCY}" text-anchor="middle" class="label">${hypotenuseLabel(horizontal, vertical)}</text>`
      : '';
    const marker = outsideMarker
      ? '<path d="M78 330 L78 358 L50 358" class="shape"/><text x="48" y="376" class="label">直角</text>'
      : `<path d="M${baseX} ${baseY} L${baseX + 28} ${baseY} L${baseX + 28} ${baseY - 28} L${baseX} ${baseY - 28}" class="shape"/><text x="48" y="350" class="label">直角</text>`;
    const altitudeLine = altitude
      ? '<line x1="100" y1="330" x2="193" y2="181" class="helper"/><text x="130" y="242" class="label">斜边上的高</text><path d="M185 194 L197 201 L204 189" class="thin"/>'
      : '';
    const auxiliaryLine = auxiliary
      ? `<line x1="340" y1="330" x2="100" y2="150" class="${dashedAuxiliary ? 'helper' : 'thin'}"/><text x="250" y="220" class="label">辅助线</text>`
      : '';
    const angleAMarker = angleA
      ? `<text x="${baseX + 36}" y="${baseY - 40}" class="label" fill="#dc2626">90°</text>`
      : '';
    const angleBMarker = angleB
      ? `<path d="M${bx - 45} ${baseY} A45 45 0 0 0 ${bx - 36} ${baseY - 27}" fill="none" stroke="#dc2626" stroke-width="2"/><text x="${bx - 66}" y="${baseY - 32}" class="label" fill="#dc2626">θ</text>`
      : '';
    const angleCMarker = angleC
      ? `<path d="M${baseX} ${cy + 45} A45 45 0 0 1 ${baseX + 36} ${cy + 27}" fill="none" stroke="#dc2626" stroke-width="2"/><text x="${baseX + 24}" y="${cy + 68}" class="label" fill="#dc2626">θ</text>`
      : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="400" viewBox="0 0 520 400">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.helper{stroke:#6b7280;stroke-width:2;stroke-dasharray:7 5}.thin{fill:none;stroke:#6b7280;stroke-width:1.5}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="520" height="400" fill="#fff"/>
  <path d="M${baseX} ${baseY} L${bx} ${baseY} L${baseX} ${cy} Z" class="shape"/>
  ${marker}
  ${altitudeLine}
  ${auxiliaryLine}
  ${angleAMarker}
  ${angleBMarker}
  ${angleCMarker}
  ${sideLabels}
  <text x="90" y="352" class="point">A</text>
  <text x="${bx + 6}" y="352" class="point">B</text>
  <text x="78" y="${cy - 2}" class="point">C</text>
</svg>`;
  }

  function rightTriangleDiameterCircleGeometry({ ac = 3, bc = 4 } = {}) {
    const denominator = ac * ac + bc * bc;
    return {
      ac,
      bc,
      ab: Math.sqrt(denominator),
      radius: ac / 2,
      centerY: ac / 2,
      dX: (ac * ac * bc) / denominator,
      dY: (ac * bc * bc) / denominator,
    };
  }

  function rightTriangleDiameterCircleTemplate(options = {}) {
    const geometry = rightTriangleDiameterCircleGeometry(options);
    const ac = formatNumber(geometry.ac);
    const bc = formatNumber(geometry.bc);
    const ab = formatNumber(geometry.ab);
    const radius = formatNumber(geometry.radius);
    const centerY = formatNumber(geometry.centerY);
    const dX = formatNumber(geometry.dX);
    const dY = formatNumber(geometry.dY);

    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (C) at (0,0);
  \coordinate (A) at (0,${ac});
  \coordinate (B) at (${bc},0);
  \coordinate (O) at (0,${centerY});
  \coordinate (D) at (${dX},${dY});

  \draw[very thick] (A) -- (B) -- (C) -- cycle;
  \draw[thick] (0,0.35) -- (0.35,0.35) -- (0.35,0);
  \draw[thick, blue] (O) circle (${radius});
  \draw[dashed] (A) -- (C);

  \node[left] at ($(A)!0.5!(C)$) {${ac}};
  \node[below] at ($(B)!0.5!(C)$) {${bc}};
  \node[above right] at ($(A)!0.5!(B)$) {${ab}};
  \node[below left] at (C) {直角};
  \node[left] at (A) {$A$};
  \node[right] at (B) {$B$};
  \node[below left] at (C) {$C$};
  \fill (O) circle (1.5pt) node[left] {$O$};
  \fill[red] (D) circle (1.8pt) node[above right] {$D$};
  \node[blue, right] at (${radius + 0.25},${centerY}) {以 AC 为直径的圆};
\end{tikzpicture}`);
  }

  function rightTriangleDiameterCircleSvg(options = {}) {
    const geometry = rightTriangleDiameterCircleGeometry(options);
    const baseX = 120;
    const baseY = 330;
    const unit = Math.min(240 / Math.max(geometry.ac, geometry.bc), 60);
    const a = { x: baseX, y: baseY - geometry.ac * unit };
    const b = { x: baseX + geometry.bc * unit, y: baseY };
    const c = { x: baseX, y: baseY };
    const o = { x: baseX, y: baseY - geometry.centerY * unit };
    const d = { x: baseX + geometry.dX * unit, y: baseY - geometry.dY * unit };
    const radius = geometry.radius * unit;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="400" viewBox="0 0 560 400">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.circle{fill:none;stroke:#2563eb;stroke-width:3}.helper{fill:none;stroke:#6b7280;stroke-width:2;stroke-dasharray:7 5}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="560" height="400" fill="#fff"/>
  <path d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)} L${c.x.toFixed(1)} ${c.y.toFixed(1)} Z" class="shape"/>
  <path d="M${c.x.toFixed(1)} ${(c.y - 28).toFixed(1)} L${(c.x + 28).toFixed(1)} ${(c.y - 28).toFixed(1)} L${(c.x + 28).toFixed(1)} ${c.y.toFixed(1)}" class="shape"/>
  <circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="${radius.toFixed(1)}" class="circle"/>
  <line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${c.x.toFixed(1)}" y2="${c.y.toFixed(1)}" class="helper"/>
  <circle cx="${o.x.toFixed(1)}" cy="${o.y.toFixed(1)}" r="4" fill="#111827"/>
  <circle cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="5" fill="#dc2626"/>
  <text x="${(a.x - 18).toFixed(1)}" y="${(a.y - 8).toFixed(1)}" class="point">A</text>
  <text x="${(b.x + 8).toFixed(1)}" y="${(b.y + 5).toFixed(1)}" class="point">B</text>
  <text x="${(c.x - 28).toFixed(1)}" y="${(c.y + 22).toFixed(1)}" class="point">C</text>
  <text x="${(o.x - 28).toFixed(1)}" y="${(o.y + 5).toFixed(1)}" class="point">O</text>
  <text x="${(d.x + 8).toFixed(1)}" y="${(d.y - 8).toFixed(1)}" class="point">D</text>
  <text x="${(a.x - 34).toFixed(1)}" y="${((a.y + c.y) / 2).toFixed(1)}" class="label">${formatNumber(geometry.ac)}</text>
  <text x="${((b.x + c.x) / 2).toFixed(1)}" y="${(c.y + 24).toFixed(1)}" text-anchor="middle" class="label">${formatNumber(geometry.bc)}</text>
  <text x="${((a.x + b.x) / 2 + 22).toFixed(1)}" y="${((a.y + b.y) / 2 - 8).toFixed(1)}" class="label">${formatNumber(geometry.ab)}</text>
  <text x="${(c.x + 34).toFixed(1)}" y="${(c.y - 36).toFixed(1)}" class="label">直角</text>
  <text x="${(o.x + radius + 12).toFixed(1)}" y="${(o.y + 5).toFixed(1)}" class="label">以 AC 为直径的圆</text>
</svg>`;
  }

  function equilateralTriangleTemplate(side = 5) {
    const s = formatNumber(side);
    const height = formatCoordinate((Math.sqrt(3) * side) / 2);
    const half = formatCoordinate(side / 2);
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (A) at (0,0);
  \coordinate (B) at (${s},0);
  \coordinate (C) at (${half},${height});

  \draw[very thick] (A) -- (B) -- (C) -- cycle;
  \node[below] at (2.5,0) {边长 ${s}cm};
  \node[above] at (C) {等边三角形};
  \node at (0.72,0.28) {$60^\circ$};
  \node at (${formatNumber(side - 0.72)},0.28) {$60^\circ$};
  \node[below] at (A) {$A$};
  \node[below] at (B) {$B$};
  \node[above] at (C) {$C$};
\end{tikzpicture}`);
  }

  function equilateralTriangleSvg(side = 5) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="400" viewBox="0 0 520 400">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="520" height="400" fill="#fff"/>
  <path d="M110 320 L410 320 L260 60 Z" class="shape"/>
  <text x="260" y="350" text-anchor="middle" class="label">边长 ${formatNumber(side)}cm</text>
  <text x="260" y="42" text-anchor="middle" class="label">等边三角形</text>
  <text x="145" y="294" class="label">60°</text>
  <text x="345" y="294" class="label">60°</text>
  <text x="94" y="344" class="point">A</text>
  <text x="416" y="344" class="point">B</text>
  <text x="254" y="52" class="point">C</text>
</svg>`;
  }

  function squareTemplate(side = 4) {
    const s = formatNumber(side);
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (A) at (0,0);
  \coordinate (B) at (${s},0);
  \coordinate (C) at (${s},${s});
  \coordinate (D) at (0,${s});

  \draw[very thick] (A) -- (B) -- (C) -- (D) -- cycle;
  \node[below] at (${formatNumber(side / 2)},0) {边长 ${s}cm};
  \node[above] at (${formatNumber(side / 2)},${s}) {正方形};
  \foreach \p/\x/\y in {A/0/0,B/${s}/0,C/${s}/${s},D/0/${s}} {
    \node at (\x+0.28,\y+0.28) {直角};
  }
  \node[below left] at (A) {$A$};
  \node[below right] at (B) {$B$};
  \node[above right] at (C) {$C$};
  \node[above left] at (D) {$D$};
\end{tikzpicture}`);
  }

  function squareSvg(side = 4) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="420" viewBox="0 0 520 420">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="520" height="420" fill="#fff"/>
  <rect x="120" y="80" width="280" height="280" class="shape"/>
  <text x="260" y="390" text-anchor="middle" class="label">边长 ${formatNumber(side)}cm</text>
  <text x="260" y="58" text-anchor="middle" class="label">正方形</text>
  <text x="132" y="104" class="label">直角</text>
  <text x="344" y="104" class="label">直角</text>
  <text x="344" y="346" class="label">直角</text>
  <text x="132" y="346" class="label">直角</text>
  <text x="104" y="382" class="point">A</text>
  <text x="406" y="382" class="point">B</text>
  <text x="406" y="74" class="point">C</text>
  <text x="104" y="74" class="point">D</text>
</svg>`;
  }

  function circleRadiusTemplate(radius = 3) {
    const r = formatNumber(radius);
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (O) at (0,0);
  \draw[thick] (O) circle (${r});
  \draw[very thick, blue] (O) -- (${r},0) node[midway, above] {半径 ${r}cm};
  \fill (O) circle (1.5pt);
  \node[below left] at (O) {圆心 $O$};
\end{tikzpicture}`);
  }

  function circleRadiusSvg(radius = 3) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="420" viewBox="0 0 520 420">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3}.radius{stroke:#2563eb;stroke-width:3}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}</style>
  <rect width="520" height="420" fill="#fff"/>
  <circle cx="260" cy="210" r="130" class="shape"/>
  <line x1="260" y1="210" x2="390" y2="210" class="radius"/>
  <circle cx="260" cy="210" r="4" fill="#111827"/>
  <text x="200" y="236" class="label">圆心 O</text>
  <text x="294" y="196" class="label">半径 ${formatNumber(radius)}cm</text>
</svg>`;
  }

  function sineCosineTemplate({ min = null, max = null, yMin = null, yMax = null, minExpr = null, maxExpr = null, minTickLabel = null, maxTickLabel = null } = {}) {
    const hasNumericRange = Number.isFinite(min) && Number.isFinite(max);
    const xMinValue = hasNumericRange ? (minExpr || formatNumber(min)) : '-2*pi';
    const xMaxValue = hasNumericRange ? (maxExpr || formatNumber(max)) : '2*pi';
    const yMinValue = Number.isFinite(yMin) ? formatNumber(yMin) : '-1.5';
    const yMaxValue = Number.isFinite(yMax) ? formatNumber(yMax) : '1.5';
    const xMinTick = hasNumericRange ? formatNumber(min) : null;
    const xMaxTick = hasNumericRange ? formatNumber(max) : null;
    const tickLines = hasNumericRange
      ? `    xtick={${xMinTick},0,${xMaxTick}},
    xticklabels={${minTickLabel || xMinValue},0,${maxTickLabel || xMaxValue}}`
      : String.raw`    xtick={-6.28318,-3.14159,0,3.14159,6.28318},
    xticklabels={$-2\pi$,$-\pi$,0,$\pi$,$2\pi$}`;

    return wrapDocument(String.raw`
\begin{tikzpicture}
  \begin{axis}[
    axis lines=middle,
    grid=both,
    xmin=${xMinValue},
    xmax=${xMaxValue},
    ymin=${yMinValue},
    ymax=${yMaxValue},
    samples=200,
    xlabel={$x$},
    ylabel={$y$},
    legend pos=north east,
${tickLines}
  ]
    \addplot[blue, very thick, domain=${xMinValue}:${xMaxValue}] {sin(deg(x))};
    \addlegendentry{$y=\sin(x)$}
    \addplot[red, very thick, domain=${xMinValue}:${xMaxValue}] {cos(deg(x))};
    \addlegendentry{$y=\cos(x)$}
  \end{axis}
\end{tikzpicture}`);
  }

  function sineCosineSvg({ min = -6.28318, max = 6.28318, yMin = -1.5, yMax = 1.5, minSvgLabel = null, maxSvgLabel = null } = {}) {
    const width = 680;
    const height = 420;
    const left = 54;
    const right = 24;
    const top = 24;
    const bottom = 52;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const xToSvg = (x) => left + ((x - min) / (max - min)) * plotWidth;
    const yToSvg = (y) => top + ((yMax - y) / (yMax - yMin)) * plotHeight;
    const points = (fn) => {
      const values = [];
      for (let i = 0; i <= 160; i += 1) {
        const x = min + ((max - min) * i) / 160;
        values.push(`${xToSvg(x).toFixed(1)},${yToSvg(fn(x)).toFixed(1)}`);
      }
      return values.join(' ');
    };
    const xAxis = yToSvg(0);
    const yAxis = xToSvg(0);
    const isDefaultTrigRange = Math.abs(min + 6.28318) < 0.001 && Math.abs(max - 6.28318) < 0.001;
    const xTicks = isDefaultTrigRange
      ? [
        { value: -6.28318, label: '-2π' },
        { value: -3.14159, label: '-π' },
        { value: 0, label: '0' },
        { value: 3.14159, label: 'π' },
        { value: 6.28318, label: '2π' },
      ]
      : [
        { value: min, label: minSvgLabel || formatNumber(min) },
        { value: 0, label: '0' },
        { value: max, label: maxSvgLabel || formatNumber(max) },
      ];
    const tickMarks = xTicks.map(({ value, label }) => {
      const x = xToSvg(value);
      return `<line x1="${x}" y1="${xAxis - 5}" x2="${x}" y2="${xAxis + 5}" class="axis"/><text x="${x}" y="${xAxis + 22}" text-anchor="middle" class="label">${label}</text>`;
    }).join('\n  ');
    const yTicks = isDefaultTrigRange
      ? [
        { value: -1, label: '-1' },
        { value: 1, label: '1' },
      ]
      : [
        { value: yMin, label: formatNumber(yMin) },
        { value: yMax, label: formatNumber(yMax) },
      ];
    const yTickMarks = yTicks.map(({ value, label }) => {
      const y = yToSvg(value);
      return `<line x1="${yAxis - 5}" y1="${y}" x2="${yAxis + 5}" y2="${y}" class="axis"/><text x="${yAxis - 10}" y="${y + 4}" text-anchor="end" class="label">${label}</text>`;
    }).join('\n  ');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>.axis{stroke:#111827;stroke-width:1.5}.grid{stroke:#e5e7eb;stroke-width:1}.sin{fill:none;stroke:#2563eb;stroke-width:3}.cos{fill:none;stroke:#dc2626;stroke-width:3}.label{font:14px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}</style>
  <rect width="${width}" height="${height}" fill="#fff"/>
  <line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" class="grid"/>
  <line x1="${width - right}" y1="${top}" x2="${width - right}" y2="${height - bottom}" class="grid"/>
  <line x1="${left}" y1="${yToSvg(1)}" x2="${width - right}" y2="${yToSvg(1)}" class="grid"/>
  <line x1="${left}" y1="${yToSvg(-1)}" x2="${width - right}" y2="${yToSvg(-1)}" class="grid"/>
  <line x1="${left}" y1="${xAxis}" x2="${width - right}" y2="${xAxis}" class="axis"/>
  <line x1="${yAxis}" y1="${top}" x2="${yAxis}" y2="${height - bottom}" class="axis"/>
  ${tickMarks}
  ${yTickMarks}
  <polyline points="${points(Math.sin)}" class="sin"/>
  <polyline points="${points(Math.cos)}" class="cos"/>
  <text x="${width - 160}" y="44" class="label" fill="#2563eb">y=sin(x)</text>
  <text x="${width - 160}" y="68" class="label" fill="#dc2626">y=cos(x)</text>
  <text x="${width - right - 8}" y="${xAxis - 8}" class="label">x</text>
  <text x="${yAxis + 8}" y="${top + 16}" class="label">y</text>
</svg>`;
  }

  function singleFunctionTemplate({ expression, label, color = 'blue', range = null, yMin = null, yMax = null }) {
    const xRange = range || {};
    const xMinValue = xRange.minExpr || '-5';
    const xMaxValue = xRange.maxExpr || '5';
    const yMinValue = Number.isFinite(yMin) ? formatNumber(yMin) : '-5';
    const yMaxValue = Number.isFinite(yMax) ? formatNumber(yMax) : '5';
    return wrapDocument(String.raw`
\begin{tikzpicture}
  \begin{axis}[
    axis lines=middle,
    grid=both,
    xmin=${xMinValue},
    xmax=${xMaxValue},
    ymin=${yMinValue},
    ymax=${yMaxValue},
    samples=160,
    xlabel={$x$},
    ylabel={$y$}
  ]
    \addplot[${color}, very thick, domain=${xMinValue}:${xMaxValue}] {${expression}};
    \node[anchor=west] at (axis cs:${xMinValue},${yMaxValue}) {$${label}$};
  \end{axis}
\end{tikzpicture}`);
  }

  function singleFunctionSvg({ label, fn, min = -5, max = 5, yMin = -5, yMax = 5, color = '#2563eb', minSvgLabel = null, maxSvgLabel = null }) {
    const width = 680;
    const height = 420;
    const left = 54;
    const right = 24;
    const top = 24;
    const bottom = 52;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const xToSvg = (x) => left + ((x - min) / (max - min)) * plotWidth;
    const yToSvg = (y) => top + ((yMax - y) / (yMax - yMin)) * plotHeight;
    const points = [];
    for (let i = 0; i <= 160; i += 1) {
      const x = min + ((max - min) * i) / 160;
      const y = Math.max(yMin, Math.min(yMax, fn(x)));
      points.push(`${xToSvg(x).toFixed(1)},${yToSvg(y).toFixed(1)}`);
    }
    const xAxis = yToSvg(0);
    const yAxis = xToSvg(0);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>.axis{stroke:#111827;stroke-width:1.5}.grid{stroke:#e5e7eb;stroke-width:1}.curve{fill:none;stroke:${color};stroke-width:3}.label{font:14px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}</style>
  <rect width="${width}" height="${height}" fill="#fff"/>
  <line x1="${left}" y1="${xAxis}" x2="${width - right}" y2="${xAxis}" class="axis"/>
  <line x1="${yAxis}" y1="${top}" x2="${yAxis}" y2="${height - bottom}" class="axis"/>
  <line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" class="grid"/>
  <line x1="${width - right}" y1="${top}" x2="${width - right}" y2="${height - bottom}" class="grid"/>
  <polyline points="${points.join(' ')}" class="curve"/>
  <text x="${left}" y="${height - bottom + 24}" class="label">${minSvgLabel || formatNumber(min)}</text>
  <text x="${width - right - 20}" y="${height - bottom + 24}" class="label">${maxSvgLabel || formatNumber(max)}</text>
  <text x="${width - 150}" y="46" class="label" fill="${color}">${label}</text>
</svg>`;
  }

  function quadraticLinearTemplate({ range = null, quadraticStyle = 'blue, very thick', linearStyle = 'red, very thick' } = {}) {
    const xRange = range || { minExpr: '-3', maxExpr: '3' };
    const xMinValue = xRange.minExpr || '-3';
    const xMaxValue = xRange.maxExpr || '3';
    return wrapDocument(String.raw`
\begin{tikzpicture}
  \begin{axis}[
    axis lines=middle,
    grid=both,
    xmin=${xMinValue},
    xmax=${xMaxValue},
    ymin=-2,
    ymax=10,
    samples=160,
    xlabel={$x$},
    ylabel={$y$},
    legend pos=north west
  ]
    \addplot[${quadraticStyle}, domain=${xMinValue}:${xMaxValue}] {x^2};
    \addlegendentry{$y=x^2$}
    \addplot[${linearStyle}, domain=${xMinValue}:${xMaxValue}] {2*x+1};
    \addlegendentry{$y=2x+1$}
  \end{axis}
\end{tikzpicture}`);
  }

  function quadraticLinearSvg({ min = -3, max = 3, quadraticColor = '#2563eb', linearColor = '#dc2626', linearDashed = false } = {}) {
    const width = 680;
    const height = 420;
    const left = 54;
    const right = 24;
    const top = 24;
    const bottom = 52;
    const yMin = -2;
    const yMax = 10;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const xToSvg = (x) => left + ((x - min) / (max - min)) * plotWidth;
    const yToSvg = (y) => top + ((yMax - y) / (yMax - yMin)) * plotHeight;
    const points = (fn) => {
      const values = [];
      for (let i = 0; i <= 160; i += 1) {
        const x = min + ((max - min) * i) / 160;
        const y = Math.max(yMin, Math.min(yMax, fn(x)));
        values.push(`${xToSvg(x).toFixed(1)},${yToSvg(y).toFixed(1)}`);
      }
      return values.join(' ');
    };
    const xAxis = yToSvg(0);
    const yAxis = xToSvg(0);
    const quadraticClass = quadraticColor === '#dc2626' ? 'quadratic-red' : 'quadratic';
    const linearClass = linearDashed ? 'linear-blue-dashed' : 'linear';
    const linearDashStyle = linearDashed ? 'stroke-dasharray:8 6;' : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>.axis{stroke:#111827;stroke-width:1.5}.grid{stroke:#e5e7eb;stroke-width:1}.quadratic{fill:none;stroke:#2563eb;stroke-width:3}.quadratic-red{fill:none;stroke:#dc2626;stroke-width:3}.linear{fill:none;stroke:#dc2626;stroke-width:3}.linear-blue-dashed{fill:none;stroke:#2563eb;stroke-width:3;${linearDashStyle}}.label{font:14px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}</style>
  <rect width="${width}" height="${height}" fill="#fff"/>
  <line x1="${left}" y1="${xAxis}" x2="${width - right}" y2="${xAxis}" class="axis"/>
  <line x1="${yAxis}" y1="${top}" x2="${yAxis}" y2="${height - bottom}" class="axis"/>
  <line x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}" class="grid"/>
  <line x1="${width - right}" y1="${top}" x2="${width - right}" y2="${height - bottom}" class="grid"/>
  <polyline points="${points((x) => x * x)}" class="${quadraticClass}"/>
  <polyline points="${points((x) => 2 * x + 1)}" class="${linearClass}"/>
  <text x="${left}" y="${height - bottom + 24}" class="label">${formatNumber(min)}</text>
  <text x="${width - right - 20}" y="${height - bottom + 24}" class="label">${formatNumber(max)}</text>
  <text x="${width - 150}" y="46" class="label" fill="${quadraticColor}">y=x²</text>
  <text x="${width - 150}" y="70" class="label" fill="${linearDashed ? '#2563eb' : linearColor}">y=2x+1</text>
</svg>`;
  }

  function parametricEllipseTemplate() {
    return wrapDocument(String.raw`
\begin{tikzpicture}
  \begin{axis}[
    axis lines=middle,
    grid=both,
    xmin=-3.5,
    xmax=3.5,
    ymin=-2.5,
    ymax=2.5,
    xlabel={$x$},
    ylabel={$y$},
    axis equal image
  ]
    % 参数形式: (3*cos(t),2*sin(t))
    \addplot[blue, very thick, domain=0:2*pi, samples=200] ({3*cos(deg(x))},{2*sin(deg(x))});
    \node[anchor=west] at (axis cs:0.4,2.2) {椭圆};
    \node[anchor=west] at (axis cs:-3.3,-2.2) {$x=3\cos(t),\ y=2\sin(t)$};
  \end{axis}
\end{tikzpicture}`);
  }

  function parametricEllipseSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="420" viewBox="0 0 620 420">
  <style>.axis{stroke:#111827;stroke-width:1.5}.grid{stroke:#e5e7eb;stroke-width:1}.ellipse{fill:none;stroke:#2563eb;stroke-width:3}.label{font:15px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}</style>
  <rect width="620" height="420" fill="#fff"/>
  <line x1="70" y1="210" x2="560" y2="210" class="axis"/>
  <line x1="310" y1="50" x2="310" y2="360" class="axis"/>
  <ellipse cx="310" cy="210" rx="210" ry="140" class="ellipse"/>
  <text x="338" y="82" class="label">椭圆</text>
  <text x="92" y="382" class="label">x=3cos(t)，y=2sin(t)</text>
</svg>`;
  }

  function polygonAngles(sides) {
    return Array.from({ length: sides }, (_, index) => formatNumber((360 * index) / sides));
  }

  function circlePolygonTemplate(sides = 6) {
    const angles = polygonAngles(sides);
    const angleList = angles.join(',');
    const path = angles.map((angle) => `(P${angle})`).join(' -- ');
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (O) at (0,0);
  \draw[thick] (O) circle (2);
  \foreach \i in {${angleList}} {
    \coordinate (P\i) at (\i:2);
    \fill (P\i) circle (1.2pt);
  }
  \draw[very thick, blue] ${path} -- cycle;
  \fill (O) circle (1.5pt);
  \node[below right] at (O) {圆心 $O$};
\end{tikzpicture}`);
  }

  function circlePolygonSvg(sides = 6) {
    const cx = 260;
    const cy = 210;
    const r = 130;
    const points = polygonAngles(sides).map((deg) => {
      const rad = (deg * Math.PI) / 180;
      return [cx + r * Math.cos(rad), cy - r * Math.sin(rad)];
    });
    const polygon = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const dots = points.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#111827"/>`).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="420" viewBox="0 0 520 420">
  <style>.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}</style>
  <rect width="520" height="420" fill="#fff"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#111827" stroke-width="3"/>
  <polygon points="${polygon}" fill="none" stroke="#2563eb" stroke-width="4"/>
  ${dots}
  <circle cx="${cx}" cy="${cy}" r="4" fill="#111827"/>
  <text x="${cx + 10}" y="${cy + 24}" class="label">圆心 O</text>
</svg>`;
  }

  function isoscelesFromBaseAngle({ baseAngle = 30, waist = 5 } = {}) {
    const radians = (baseAngle * Math.PI) / 180;
    return {
      baseAngle,
      waist,
      halfBase: waist * Math.cos(radians),
      height: waist * Math.sin(radians),
    };
  }

  function isoscelesBaseAngleTemplate(options = {}) {
    const { baseAngle, waist, halfBase, height } = isoscelesFromBaseAngle(options);
    const angle = formatNumber(baseAngle);
    const waistLabel = formatNumber(waist);
    const halfBaseLabel = formatCoordinate(halfBase);
    const heightLabel = formatCoordinate(height);
    const leftArcStart = formatNumber(-halfBase + 0.53);
    const leftLabelX = formatNumber(-halfBase + 0.58);
    const rightArcStart = formatNumber(halfBase - 0.53);
    const rightLabelX = formatNumber(halfBase - 0.58);
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (A) at (-${halfBaseLabel},0);
  \coordinate (B) at (${halfBaseLabel},0);
  \coordinate (C) at (0,${heightLabel});

  \draw[very thick] (A) -- (B) -- (C) node[midway, above right] {腰长 ${waistLabel}cm} -- (A) node[midway, above left] {腰长 ${waistLabel}cm};
  \draw[thick] (${leftArcStart},0) arc[start angle=0,end angle=${angle},radius=0.53];
  \draw[thick] (${rightArcStart},0) arc[start angle=180,end angle=${formatNumber(180 - baseAngle)},radius=0.53];
  \node[above right] at (${leftLabelX},0.18) {$${angle}^\circ$};
  \node[above left] at (${rightLabelX},0.18) {$${angle}^\circ$};
  \node[below] at (A) {$A$};
  \node[below] at (B) {$B$};
  \node[above] at (C) {$C$};
\end{tikzpicture}`);
  }

  function isoscelesBaseAngleSvg(options = {}) {
    const { baseAngle, waist, halfBase, height } = isoscelesFromBaseAngle(options);
    const baseY = 300;
    const centerX = 310;
    const scale = Math.min(190 / halfBase, 220 / height);
    const ax = centerX - halfBase * scale;
    const bx = centerX + halfBase * scale;
    const cy = baseY - height * scale;
    const angle = formatNumber(baseAngle);
    const waistLabel = formatNumber(waist);
    const leftLabelX = ax + (centerX - ax) * 0.38 - 18;
    const leftLabelY = baseY + (cy - baseY) * 0.46;
    const rightLabelX = bx + (centerX - bx) * 0.38 + 18;
    const rightLabelY = leftLabelY;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="360" viewBox="0 0 620 360">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="620" height="360" fill="#fff"/>
  <path d="M${ax.toFixed(1)} ${baseY} L${bx.toFixed(1)} ${baseY} L${centerX} ${cy.toFixed(1)} Z" class="shape"/>
  <path d="M${(ax + 40).toFixed(1)} ${baseY} A40 40 0 0 1 ${(ax + 40 * Math.cos((baseAngle * Math.PI) / 180)).toFixed(1)} ${(baseY - 40 * Math.sin((baseAngle * Math.PI) / 180)).toFixed(1)}" class="shape"/>
  <path d="M${(bx - 40).toFixed(1)} ${baseY} A40 40 0 0 0 ${(bx - 40 * Math.cos((baseAngle * Math.PI) / 180)).toFixed(1)} ${(baseY - 40 * Math.sin((baseAngle * Math.PI) / 180)).toFixed(1)}" class="shape"/>
  <text x="${(ax + 46).toFixed(1)}" y="${(baseY - 18).toFixed(1)}" class="label">${angle}°</text>
  <text x="${(bx - 86).toFixed(1)}" y="${(baseY - 18).toFixed(1)}" class="label">${angle}°</text>
  <text x="${leftLabelX.toFixed(1)}" y="${leftLabelY.toFixed(1)}" class="label">腰长 ${waistLabel}cm</text>
  <text x="${rightLabelX.toFixed(1)}" y="${rightLabelY.toFixed(1)}" class="label">腰长 ${waistLabel}cm</text>
  <text x="${(ax - 8).toFixed(1)}" y="322" class="point">A</text>
  <text x="${(bx + 4).toFixed(1)}" y="322" class="point">B</text>
  <text x="304" y="${(cy - 12).toFixed(1)}" class="point">C</text>
</svg>`;
  }

  function incircleIsoscelesTemplate(radius = 3) {
    const r = formatNumber(radius);
    const halfBase = formatNumber(Math.sqrt(3) * radius);
    const height = formatNumber(3 * radius);
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=0.55]
  \coordinate (A) at (-${halfBase},0);
  \coordinate (B) at (${halfBase},0);
  \coordinate (C) at (0,${height});
  \coordinate (O) at (0,${r});

  \draw[very thick] (A) -- (B) -- (C) -- cycle;
  \draw[thick, blue] (O) circle (${r});
  \draw[dashed, blue] (O) -- (0,0) node[midway, right] {$r=${r}$};
  \fill (O) circle (1.8pt);
  \node[right] at (O) {内切圆};
  \node[below] at (A) {$A$};
  \node[below] at (B) {$B$};
  \node[above] at (C) {$C$};
\end{tikzpicture}`);
  }

  function incircleIsoscelesSvg(radius = 3) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="430" viewBox="0 0 620 430">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.circle{fill:none;stroke:#2563eb;stroke-width:3}.helper{stroke:#2563eb;stroke-width:2;stroke-dasharray:7 5}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="620" height="430" fill="#fff"/>
  <path d="M130 360 L490 360 L310 48 Z" class="shape"/>
  <circle cx="310" cy="256" r="104" class="circle"/>
  <line x1="310" y1="256" x2="310" y2="360" class="helper"/>
  <circle cx="310" cy="256" r="4" fill="#111827"/>
  <text x="322" y="250" class="label">内切圆</text>
  <text x="322" y="314" class="label">r=${formatNumber(radius)}</text>
  <text x="120" y="382" class="point">A</text>
  <text x="494" y="382" class="point">B</text>
  <text x="304" y="36" class="point">C</text>
</svg>`;
  }

  function isoscelesSidesGeometry({ base = 6, waist = 5 } = {}) {
    return {
      base,
      waist,
      halfBase: base / 2,
      height: Math.sqrt(Math.max(waist * waist - (base * base) / 4, 0)),
    };
  }

  function isoscelesSidesTemplate(options = {}) {
    const { base, waist, halfBase, height } = isoscelesSidesGeometry(options);
    const baseLabel = formatNumber(base);
    const waistLabel = formatNumber(waist);
    const halfBaseLabel = formatCoordinate(halfBase);
    const heightLabel = formatCoordinate(height);
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (A) at (-${halfBaseLabel},0);
  \coordinate (B) at (${halfBaseLabel},0);
  \coordinate (C) at (0,${heightLabel});

  \draw[very thick] (A) -- (B) node[midway, below] {底边 ${baseLabel}cm} -- (C) node[midway, above right] {腰长 ${waistLabel}cm} -- (A) node[midway, above left] {腰长 ${waistLabel}cm};
  \draw[thick] (-0.18,${formatNumber(height / 2)}) -- (0.18,${formatNumber(height / 2)});
  \draw[thick] (${formatNumber(halfBase / 2)},${formatNumber(height / 2)}) -- (${formatNumber(halfBase / 2 + 0.36)},${formatNumber(height / 2)});
  \node[below] at (A) {$A$};
  \node[below] at (B) {$B$};
  \node[above] at (C) {$C$};
\end{tikzpicture}`);
  }

  function isoscelesSidesSvg(options = {}) {
    const { base, waist, halfBase, height } = isoscelesSidesGeometry(options);
    const baseY = 320;
    const centerX = 300;
    const scale = Math.min(210 / halfBase, 240 / height);
    const ax = centerX - halfBase * scale;
    const bx = centerX + halfBase * scale;
    const cy = baseY - height * scale;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="400" viewBox="0 0 620 400">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.tick{stroke:#111827;stroke-width:2}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="620" height="400" fill="#fff"/>
  <path d="M${ax.toFixed(1)} ${baseY} L${bx.toFixed(1)} ${baseY} L${centerX} ${cy.toFixed(1)} Z" class="shape"/>
  <line x1="${(ax + centerX) / 2 - 12}" y1="${(baseY + cy) / 2}" x2="${(ax + centerX) / 2 + 12}" y2="${(baseY + cy) / 2}" class="tick"/>
  <line x1="${(bx + centerX) / 2 - 12}" y1="${(baseY + cy) / 2}" x2="${(bx + centerX) / 2 + 12}" y2="${(baseY + cy) / 2}" class="tick"/>
  <text x="${centerX}" y="${baseY + 28}" text-anchor="middle" class="label">底边 ${formatNumber(base)}cm</text>
  <text x="${(ax + centerX) / 2 - 70}" y="${(baseY + cy) / 2}" class="label">腰长 ${formatNumber(waist)}cm</text>
  <text x="${(bx + centerX) / 2 + 20}" y="${(baseY + cy) / 2}" class="label">腰长 ${formatNumber(waist)}cm</text>
  <text x="${(ax - 8).toFixed(1)}" y="${baseY + 24}" class="point">A</text>
  <text x="${(bx + 4).toFixed(1)}" y="${baseY + 24}" class="point">B</text>
  <text x="${centerX - 6}" y="${(cy - 12).toFixed(1)}" class="point">C</text>
</svg>`;
  }

  function isoscelesAngleTemplate(options = {}) {
    const { halfBase, height } = isoscelesSidesGeometry(options);
    const baseAngle = (Math.atan2(height, halfBase) * 180) / Math.PI;
    const vertexAngle = 180 - 2 * baseAngle;
    const halfBaseLabel = formatCoordinate(halfBase);
    const heightLabel = formatCoordinate(height);
    const baseAngleLabel = formatNumber(baseAngle);
    const vertexAngleLabel = formatNumber(vertexAngle);
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (A) at (-${halfBaseLabel},0);
  \coordinate (B) at (${halfBaseLabel},0);
  \coordinate (C) at (0,${heightLabel});

  \draw[very thick] (A) -- (B) -- (C) -- cycle;
  \draw[thick] (-${formatNumber(halfBase - 0.55)},0) arc[start angle=0,end angle=${baseAngleLabel},radius=0.55];
  \draw[thick] (${formatNumber(halfBase - 0.55)},0) arc[start angle=180,end angle=${formatNumber(180 - baseAngle)},radius=0.55];
  \draw[thick] (-0.32,${formatNumber(height - 0.46)}) arc[start angle=235,end angle=305,radius=0.55];
  \node[above right] at (-${formatNumber(halfBase - 0.72)},0.18) {${baseAngleLabel}^\circ};
  \node[above left] at (${formatNumber(halfBase - 0.72)},0.18) {${baseAngleLabel}^\circ};
  \node[below] at (0,${formatNumber(height - 0.68)}) {${vertexAngleLabel}^\circ};
  \node[below] at (A) {$A$};
  \node[below] at (B) {$B$};
  \node[above] at (C) {$C$};
\end{tikzpicture}`);
  }

  function isoscelesAngleSvg(options = {}) {
    const { base, waist, halfBase, height } = isoscelesSidesGeometry(options);
    const baseAngle = (Math.atan2(height, halfBase) * 180) / Math.PI;
    const vertexAngle = 180 - 2 * baseAngle;
    const baseY = 320;
    const centerX = 300;
    const scale = Math.min(210 / halfBase, 240 / height);
    const ax = centerX - halfBase * scale;
    const bx = centerX + halfBase * scale;
    const cy = baseY - height * scale;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="400" viewBox="0 0 620 400">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.angle{fill:none;stroke:#dc2626;stroke-width:2}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.angle-label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#dc2626}.point{font:15px serif;fill:#111827}</style>
  <rect width="620" height="400" fill="#fff"/>
  <path d="M${ax.toFixed(1)} ${baseY} L${bx.toFixed(1)} ${baseY} L${centerX} ${cy.toFixed(1)} Z" class="shape"/>
  <path d="M${(ax + 42).toFixed(1)} ${baseY} A42 42 0 0 1 ${(ax + 42 * Math.cos((baseAngle * Math.PI) / 180)).toFixed(1)} ${(baseY - 42 * Math.sin((baseAngle * Math.PI) / 180)).toFixed(1)}" class="angle"/>
  <path d="M${(bx - 42).toFixed(1)} ${baseY} A42 42 0 0 0 ${(bx - 42 * Math.cos((baseAngle * Math.PI) / 180)).toFixed(1)} ${(baseY - 42 * Math.sin((baseAngle * Math.PI) / 180)).toFixed(1)}" class="angle"/>
  <path d="M${(centerX - 34).toFixed(1)} ${(cy + 48).toFixed(1)} A44 44 0 0 0 ${(centerX + 34).toFixed(1)} ${(cy + 48).toFixed(1)}" class="angle"/>
  <text x="${(ax + 56).toFixed(1)}" y="${(baseY - 18).toFixed(1)}" class="angle-label">${formatNumber(baseAngle)}°</text>
  <text x="${(bx - 96).toFixed(1)}" y="${(baseY - 18).toFixed(1)}" class="angle-label">${formatNumber(baseAngle)}°</text>
  <text x="${centerX}" y="${(cy + 70).toFixed(1)}" text-anchor="middle" class="angle-label">${formatNumber(vertexAngle)}°</text>
  <text x="${(ax - 8).toFixed(1)}" y="${baseY + 24}" class="point">A</text>
  <text x="${(bx + 4).toFixed(1)}" y="${baseY + 24}" class="point">B</text>
  <text x="${centerX - 6}" y="${(cy - 12).toFixed(1)}" class="point">C</text>
  <desc>base=${formatNumber(base)} waist=${formatNumber(waist)}</desc>
</svg>`;
  }

  function rightTriangleIncircleTemplate({ horizontal = 4, vertical = 3 } = {}) {
    const hypotenuse = Math.sqrt(horizontal * horizontal + vertical * vertical);
    const radius = (horizontal + vertical - hypotenuse) / 2;
    const h = formatNumber(horizontal);
    const v = formatNumber(vertical);
    const r = formatNumber(radius);
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (A) at (0,0);
  \coordinate (B) at (${h},0);
  \coordinate (C) at (0,${v});
  \coordinate (O) at (${r},${r});

  \draw[very thick] (A) -- (B) node[below] {${h}} -- (C) node[midway, above right] {${hypotenuseLabel(vertical, horizontal)}} -- (A) node[left] {${v}};
  \draw[thick] (0.35,0) -- (0.35,0.35) -- (0,0.35);
  \draw[thick, blue] (O) circle (${r});
  \draw[dashed, blue] (O) -- (${r},0) node[midway, right] {$r=${r}$};
  \fill (O) circle (1.5pt);
  \node[right] at (O) {内切圆圆心};
  \node[below] at (A) {$A$};
  \node[below] at (B) {$B$};
  \node[left] at (C) {$C$};
\end{tikzpicture}`);
  }

  function rightTriangleIncircleSvg({ horizontal = 4, vertical = 3 } = {}) {
    const hypotenuse = Math.sqrt(horizontal * horizontal + vertical * vertical);
    const radius = (horizontal + vertical - hypotenuse) / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="420" viewBox="0 0 560 420">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.circle{fill:none;stroke:#2563eb;stroke-width:3}.helper{stroke:#2563eb;stroke-width:2;stroke-dasharray:7 5}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="560" height="420" fill="#fff"/>
  <path d="M100 340 L420 340 L100 100 Z" class="shape"/>
  <path d="M128 340 L128 312 L100 312" class="shape"/>
  <circle cx="180" cy="260" r="80" class="circle"/>
  <line x1="180" y1="260" x2="180" y2="340" class="helper"/>
  <circle cx="180" cy="260" r="4" fill="#111827"/>
  <text x="194" y="254" class="label">内切圆圆心</text>
  <text x="194" y="314" class="label">r=${formatNumber(radius)}</text>
  <text x="250" y="366" class="label">${formatNumber(horizontal)}</text>
  <text x="70" y="224" class="label">${formatNumber(vertical)}</text>
  <text x="262" y="210" class="label">${formatNumber(hypotenuse)}</text>
  <text x="88" y="364" class="point">A</text>
  <text x="426" y="364" class="point">B</text>
  <text x="82" y="94" class="point">C</text>
</svg>`;
  }

  function isoscelesPointPProblemTemplate() {
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=0.45]
  \coordinate (A) at (0,12);
  \coordinate (B) at (-4,0);
  \coordinate (C) at (4,0);
  \coordinate (P) at (0,-3);

  \draw[very thick] (A) -- (B) -- (C) -- cycle;
  \draw[very thick, blue] (A) -- (P) -- (B);
  \draw[dashed, gray] (-4.8,0) -- (4.8,0) node[right] {直线 $BC$};
  \draw[thick] (-2.28,6.08) -- (-1.96,5.92);
  \draw[thick] (1.96,5.92) -- (2.28,6.08);
  \draw[red, thick] (-3.1,0) arc[start angle=0,end angle=-36.87,radius=0.9];
  \draw[red, thick] (0.46,10.62) arc[start angle=-71.57,end angle=-108.43,radius=1.45];
  \node[red, right] at (-2.9,-0.65) {$\angle PBC$};
  \node[red, above] at (0,10.15) {$\angle BAC$};
  \node[align=left, anchor=west] at (5.05,7.4) {$AB=AC$};
  \node[align=left, anchor=west] at (5.05,6.15) {$BC=8,\ PB=5$};
  \node[align=left, anchor=west] at (5.05,4.9) {$\angle PBC=\angle BAC$};
  \node[align=left, anchor=west] at (5.05,3.65) {$\angle APB+2\angle PAB=90^\circ$};
  \node[above] at (A) {$A$};
  \node[below left] at (B) {$B$};
  \node[below right] at (C) {$C$};
  \node[below] at (P) {$P$};
\end{tikzpicture}`);
  }

  function isoscelesPointPProblemSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="460" viewBox="0 0 720 460">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.blue{fill:none;stroke:#2563eb;stroke-width:3}.helper{stroke:#9ca3af;stroke-width:2;stroke-dasharray:7 5}.mark{fill:none;stroke:#dc2626;stroke-width:2}.tick{stroke:#111827;stroke-width:2}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.red{font:15px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#dc2626}.point{font:16px serif;fill:#111827}</style>
  <rect width="720" height="460" fill="#fff"/>
  <line x1="70" y1="330" x2="430" y2="330" class="helper"/>
  <path d="M250 42 L110 330 L390 330 Z" class="shape"/>
  <path d="M250 42 L250 435 L110 330" class="blue"/>
  <line x1="177" y1="187" x2="196" y2="176" class="tick"/>
  <line x1="304" y1="176" x2="323" y2="187" class="tick"/>
  <path d="M150 330 A40 40 0 0 1 142 306" class="mark"/>
  <path d="M270 82 A42 42 0 0 1 230 82" class="mark"/>
  <text x="150" y="304" class="red">∠PBC</text>
  <text x="210" y="104" class="red">∠BAC</text>
  <text x="244" y="28" class="point">A</text>
  <text x="92" y="352" class="point">B</text>
  <text x="396" y="352" class="point">C</text>
  <text x="244" y="454" class="point">P</text>
  <text x="456" y="130" class="label">AB=AC</text>
  <text x="456" y="175" class="label">BC=8，PB=5</text>
  <text x="456" y="220" class="label">∠PBC=∠BAC</text>
  <text x="456" y="265" class="label">∠APB+2∠PAB=90°</text>
  <text x="404" y="324" class="label">直线 BC</text>
</svg>`;
  }

  function intersectionRegionTemplate() {
    return wrapDocument(String.raw`
\begin{tikzpicture}
  \begin{axis}[
    axis lines=middle,
    grid=both,
    xmin=-1,
    xmax=3,
    ymin=-1,
    ymax=7,
    samples=120,
    xlabel={$x$},
    ylabel={$y$}
  ]
    \addplot[fill=gray!25, draw=none, domain=-0.414:2.414] {2*x+1} \closedcycle;
    \addplot[white, fill=white, draw=none, domain=-0.414:2.414] {x^2} \closedcycle;
    \addplot[blue, very thick, domain=-1:3] {x^2};
    \addplot[red, very thick, domain=-1:3] {2*x+1};
    \node[anchor=south east] at (axis cs:-0.414,0.172) {$x_1=1-\sqrt{2}$};
    \node[anchor=south west] at (axis cs:2.414,5.828) {$x_2=1+\sqrt{2}$};
    \node[anchor=west] at (axis cs:0.7,2.8) {交点区域};
  \end{axis}
\end{tikzpicture}`);
  }

  function intersectionRegionSvg() {
    const width = 680;
    const height = 460;
    const left = 58;
    const right = 28;
    const top = 28;
    const bottom = 54;
    const minX = -1;
    const maxX = 3;
    const minY = -1;
    const maxY = 7;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const xToSvg = (x) => left + ((x - minX) / (maxX - minX)) * plotWidth;
    const yToSvg = (y) => top + ((maxY - y) / (maxY - minY)) * plotHeight;
    const sample = (fn, from, to, n = 100) => {
      const values = [];
      for (let i = 0; i <= n; i += 1) {
        const x = from + ((to - from) * i) / n;
        values.push([xToSvg(x), yToSvg(fn(x))]);
      }
      return values;
    };
    const x1 = 1 - Math.sqrt(2);
    const x2 = 1 + Math.sqrt(2);
    const upper = sample((x) => 2 * x + 1, x1, x2);
    const lower = sample((x) => x * x, x1, x2).reverse();
    const shaded = upper.concat(lower).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const parabola = sample((x) => x * x, -1, 3).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const line = sample((x) => 2 * x + 1, -1, 3, 2).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>.axis{stroke:#111827;stroke-width:1.5}.grid{stroke:#e5e7eb;stroke-width:1}.parabola{fill:none;stroke:#2563eb;stroke-width:3}.line{fill:none;stroke:#dc2626;stroke-width:3}.label{font:14px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}</style>
  <rect width="${width}" height="${height}" fill="#fff"/>
  <line x1="${left}" y1="${yToSvg(0)}" x2="${width - right}" y2="${yToSvg(0)}" class="axis"/>
  <line x1="${xToSvg(0)}" y1="${top}" x2="${xToSvg(0)}" y2="${height - bottom}" class="axis"/>
  <polygon points="${shaded}" fill="#d1d5db" opacity="0.75"/>
  <polyline points="${parabola}" class="parabola"/>
  <polyline points="${line}" class="line"/>
  <circle cx="${xToSvg(x1).toFixed(1)}" cy="${yToSvg(x1 * x1).toFixed(1)}" r="4" fill="#111827"/>
  <circle cx="${xToSvg(x2).toFixed(1)}" cy="${yToSvg(x2 * x2).toFixed(1)}" r="4" fill="#111827"/>
  <text x="${xToSvg(0.55).toFixed(1)}" y="${yToSvg(2.7).toFixed(1)}" class="label">交点区域</text>
  <text x="${width - 160}" y="48" class="label" fill="#2563eb">y=x²</text>
  <text x="${width - 160}" y="72" class="label" fill="#dc2626">y=2x+1</text>
</svg>`;
  }

  function cuboidSectionTemplate() {
    return wrapDocument(String.raw`
\begin{tikzpicture}[x={(1cm,0cm)}, y={(0.45cm,0.28cm)}, z={(0cm,1cm)}, scale=1]
  \coordinate (A) at (0,0,0);
  \coordinate (B) at (4,0,0);
  \coordinate (C) at (4,2,0);
  \coordinate (D) at (0,2,0);
  \coordinate (E) at (0,0,2.5);
  \coordinate (F) at (4,0,2.5);
  \coordinate (G) at (4,2,2.5);
  \coordinate (H) at (4,2,2.5);
  \coordinate (P) at (0,0,1.2);
  \coordinate (Q) at (4,0,2.0);
  \coordinate (R) at (4,2,1.4);
  \coordinate (S) at (0,2,0.6);

  \draw[gray] (A)--(B)--(C)--(D)--cycle;
  \draw[gray] (E)--(F)--(G)--(H)--cycle;
  \draw[gray] (A)--(E) (B)--(F) (C)--(G) (D)--(H);
  \filldraw[fill=teal!25, draw=teal!80!black, opacity=0.75] (P)--(Q)--(R)--(S)--cycle;
  \node[teal!80!black] at (2,1,1.7) {截面};
  \node[below] at (A) {$A$};
  \node[below] at (B) {$B$};
  \node[right] at (C) {$C$};
  \node[above] at (G) {$G$};
\end{tikzpicture}`);
  }

  function cuboidSectionSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="440" viewBox="0 0 620 440">
  <style>.edge{fill:none;stroke:#4b5563;stroke-width:2}.hidden{fill:none;stroke:#9ca3af;stroke-width:1.5;stroke-dasharray:6 5}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.section{fill:#5eead4;fill-opacity:.45;stroke:#0f766e;stroke-width:3}</style>
  <rect width="620" height="440" fill="#fff"/>
  <polygon points="120,310 410,310 500,250 210,250" class="edge"/>
  <polygon points="120,120 410,120 500,60 210,60" class="edge"/>
  <line x1="120" y1="310" x2="120" y2="120" class="edge"/>
  <line x1="410" y1="310" x2="410" y2="120" class="edge"/>
  <line x1="500" y1="250" x2="500" y2="60" class="edge"/>
  <line x1="210" y1="250" x2="210" y2="60" class="hidden"/>
  <polygon points="120,220 410,150 500,184 210,278" class="section"/>
  <text x="300" y="207" class="label">截面</text>
  <text x="104" y="332" class="label">A</text>
  <text x="414" y="332" class="label">B</text>
  <text x="505" y="266" class="label">C</text>
  <text x="506" y="54" class="label">G</text>
</svg>`;
  }

  const DEFAULT_BAR_CHART_DATA = [
    { label: '优秀', value: 10 },
    { label: '良好', value: 18 },
    { label: '及格', value: 8 },
    { label: '待提高', value: 4 },
  ];

  function barChartYMax(data) {
    const maxValue = Math.max(...data.map((item) => item.value), 1);
    return Math.max(20, Math.ceil(maxValue / 5) * 5);
  }

  function barChartTemplate(data = DEFAULT_BAR_CHART_DATA) {
    const yMax = barChartYMax(data);
    const xCoords = data.map((item) => item.label).join(',');
    const coordinates = data.map((item) => `(${item.label},${formatNumber(item.value)})`).join(' ');
    return wrapDocument(String.raw`
\begin{tikzpicture}
  \begin{axis}[
    ybar,
    bar width=18pt,
    ymin=0,
    ymax=${yMax},
    ylabel={人数},
    symbolic x coords={${xCoords}},
    xtick=data,
    nodes near coords,
    nodes near coords align={vertical},
    enlarge x limits=0.18,
    grid=major
  ]
    \addplot[fill=blue!35, draw=blue!70!black] coordinates {${coordinates}};
  \end{axis}
\end{tikzpicture}`);
  }

  function barChartSvg(data = DEFAULT_BAR_CHART_DATA) {
    const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171'];
    const xPositions = [120, 250, 380, 510];
    const bars = data.map((item, index) => ({
      ...item,
      x: xPositions[index],
      color: colors[index],
    }));
    const base = 340;
    const yMax = barChartYMax(data);
    const scale = 260 / yMax;
    const shapes = bars.map((bar) => {
      const h = bar.value * scale;
      const y = base - h;
      return `<rect x="${bar.x}" y="${y}" width="58" height="${h}" fill="${bar.color}" stroke="#1f2937"/>
  <text x="${bar.x + 29}" y="${y - 8}" text-anchor="middle" class="label">${bar.value}人</text>
  <text x="${bar.x + 29}" y="${base + 28}" text-anchor="middle" class="label">${bar.label}</text>`;
    }).join('\n  ');

    return `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="420" viewBox="0 0 680 420">
  <style>.axis{stroke:#111827;stroke-width:2}.grid{stroke:#e5e7eb;stroke-width:1}.label{font:15px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}</style>
  <rect width="680" height="420" fill="#fff"/>
  <line x1="72" y1="${base}" x2="620" y2="${base}" class="axis"/>
  <line x1="72" y1="62" x2="72" y2="${base}" class="axis"/>
  <line x1="72" y1="${base - 10 * scale}" x2="620" y2="${base - 10 * scale}" class="grid"/>
  <line x1="72" y1="${base - yMax * scale}" x2="620" y2="${base - yMax * scale}" class="grid"/>
  <text x="34" y="78" class="label">人数</text>
  ${shapes}
</svg>`;
  }

  function coordinateAxisTemplate({ xmin, xmax, ymin, ymax, body }) {
    return wrapDocument(String.raw`
\begin{tikzpicture}
  \begin{axis}[
    axis lines=middle,
    grid=both,
    xmin=${formatNumber(xmin)},
    xmax=${formatNumber(xmax)},
    ymin=${formatNumber(ymin)},
    ymax=${formatNumber(ymax)},
    xlabel={$x$},
    ylabel={$y$},
    axis equal image
  ]
${body.trim()}
  \end{axis}
\end{tikzpicture}`);
  }

  function coordinateSvg({ xmin, xmax, ymin, ymax, width = 680, height = 460, content }) {
    const left = 58;
    const right = 34;
    const top = 30;
    const bottom = 58;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const xToSvg = (x) => left + ((x - xmin) / (xmax - xmin)) * plotWidth;
    const yToSvg = (y) => top + ((ymax - y) / (ymax - ymin)) * plotHeight;
    const xAxis = yToSvg(0);
    const yAxis = xToSvg(0);
    const rendered = content({ xToSvg, yToSvg });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>.axis{stroke:#111827;stroke-width:1.8}.grid{stroke:#e5e7eb;stroke-width:1}.shape{fill:none;stroke:#2563eb;stroke-width:3;stroke-linejoin:round}.helper{stroke:#6b7280;stroke-width:1.7;stroke-dasharray:6 5}.point-label{font:15px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.coord-label{font:14px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#4b5563}</style>
  <rect width="${width}" height="${height}" fill="#fff"/>
  <line x1="${left}" y1="${xAxis}" x2="${width - right}" y2="${xAxis}" class="axis"/>
  <line x1="${yAxis}" y1="${top}" x2="${yAxis}" y2="${height - bottom}" class="axis"/>
  <line x1="${left}" y1="${yToSvg(ymin)}" x2="${width - right}" y2="${yToSvg(ymin)}" class="grid"/>
  <line x1="${left}" y1="${yToSvg(ymax)}" x2="${width - right}" y2="${yToSvg(ymax)}" class="grid"/>
  <text x="${width - right - 10}" y="${xAxis - 8}" class="point-label">x</text>
  <text x="${yAxis + 8}" y="${top + 16}" class="point-label">y</text>
  ${rendered}
</svg>`;
  }

  function coordinateTriangleTemplate(points) {
    const pointLines = points.map((point) => `    \\coordinate (${point.label}) at (${formatNumber(point.x)},${formatNumber(point.y)});`).join('\n');
    const dotLines = points.map((point) => `    \\fill (${point.label}) circle (1.6pt) node[above right] {$${point.label}(${formatNumber(point.x)},${formatNumber(point.y)})$};`).join('\n');
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return coordinateAxisTemplate({
      xmin: Math.min(0, ...xs) - 1,
      xmax: Math.max(0, ...xs) + 1,
      ymin: Math.min(0, ...ys) - 1,
      ymax: Math.max(0, ...ys) + 1,
      body: String.raw`
${pointLines}
    \draw[very thick, blue] (A) -- (B) -- (C) -- cycle;
${dotLines}`,
    });
  }

  function coordinateTriangleSvg(points) {
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const xmin = Math.min(0, ...xs) - 1;
    const xmax = Math.max(0, ...xs) + 1;
    const ymin = Math.min(0, ...ys) - 1;
    const ymax = Math.max(0, ...ys) + 1;
    return coordinateSvg({
      xmin,
      xmax,
      ymin,
      ymax,
      content: ({ xToSvg, yToSvg }) => {
        const path = points.map((point) => `${xToSvg(point.x).toFixed(1)},${yToSvg(point.y).toFixed(1)}`).join(' ');
        const labels = points.map((point) => `<circle cx="${xToSvg(point.x).toFixed(1)}" cy="${yToSvg(point.y).toFixed(1)}" r="4" fill="#111827"/><text x="${(xToSvg(point.x) + 8).toFixed(1)}" y="${(yToSvg(point.y) - 8).toFixed(1)}" class="point-label">${point.label}(${formatNumber(point.x)},${formatNumber(point.y)})</text>`).join('\n  ');
        return `<polygon points="${path}" class="shape"/>\n  ${labels}`;
      },
    });
  }

  function coordinateSegmentMidpointTemplate(points) {
    const [a, b] = points;
    const midpoint = {
      label: 'M',
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
    return coordinateAxisTemplate({
      xmin: Math.min(0, a.x, b.x, midpoint.x) - 1,
      xmax: Math.max(0, a.x, b.x, midpoint.x) + 1,
      ymin: Math.min(0, a.y, b.y, midpoint.y) - 1,
      ymax: Math.max(0, a.y, b.y, midpoint.y) + 1,
      body: String.raw`
    \coordinate (A) at (${formatNumber(a.x)},${formatNumber(a.y)});
    \coordinate (B) at (${formatNumber(b.x)},${formatNumber(b.y)});
    \coordinate (M) at (${formatNumber(midpoint.x)},${formatNumber(midpoint.y)});
    \draw[very thick, blue] (A) -- (B);
    \fill (A) circle (1.6pt) node[above left] {$A(${formatNumber(a.x)},${formatNumber(a.y)})$};
    \fill (B) circle (1.6pt) node[above right] {$B(${formatNumber(b.x)},${formatNumber(b.y)})$};
    \fill[red] (M) circle (1.8pt) node[below right] {中点 $M(${formatNumber(midpoint.x)},${formatNumber(midpoint.y)})$};`,
    });
  }

  function coordinateSegmentMidpointSvg(points) {
    const [a, b] = points;
    const midpoint = {
      label: 'M',
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
    return coordinateSvg({
      xmin: Math.min(0, a.x, b.x, midpoint.x) - 1,
      xmax: Math.max(0, a.x, b.x, midpoint.x) + 1,
      ymin: Math.min(0, a.y, b.y, midpoint.y) - 1,
      ymax: Math.max(0, a.y, b.y, midpoint.y) + 1,
      content: ({ xToSvg, yToSvg }) => {
        const pointLabel = (point, dx, dy) => `<circle cx="${xToSvg(point.x).toFixed(1)}" cy="${yToSvg(point.y).toFixed(1)}" r="4" fill="#111827"/><text x="${(xToSvg(point.x) + dx).toFixed(1)}" y="${(yToSvg(point.y) + dy).toFixed(1)}" class="point-label">${point.label}(${formatNumber(point.x)},${formatNumber(point.y)})</text>`;
        return `<line x1="${xToSvg(a.x).toFixed(1)}" y1="${yToSvg(a.y).toFixed(1)}" x2="${xToSvg(b.x).toFixed(1)}" y2="${yToSvg(b.y).toFixed(1)}" class="shape"/>
  ${pointLabel(a, -74, -8)}
  ${pointLabel(b, 8, -8)}
  <circle cx="${xToSvg(midpoint.x).toFixed(1)}" cy="${yToSvg(midpoint.y).toFixed(1)}" r="5" fill="#dc2626"/>
  <text x="${(xToSvg(midpoint.x) + 8).toFixed(1)}" y="${(yToSvg(midpoint.y) + 20).toFixed(1)}" class="point-label">M(${formatNumber(midpoint.x)},${formatNumber(midpoint.y)})</text>`;
      },
    });
  }

  function coordinateCircleTemplate(radius = 5) {
    const r = formatNumber(radius);
    return coordinateAxisTemplate({
      xmin: -radius - 1,
      xmax: radius + 1,
      ymin: -radius - 1,
      ymax: radius + 1,
      body: String.raw`
    \coordinate (O) at (0,0);
    \draw[very thick, blue] (O) circle (${r});
    \fill (O) circle (1.6pt) node[below right] {$O(0,0)$};
    \fill (${r},0) circle (1.4pt) node[below right] {$(${r},0)$};
    \fill (-${r},0) circle (1.4pt) node[below left] {$(-${r},0)$};
    \fill (0,${r}) circle (1.4pt) node[above right] {$(0,${r})$};
    \fill (0,-${r}) circle (1.4pt) node[below right] {$(0,-${r})$};`,
    });
  }

  function coordinateCircleSvg(radius = 5) {
    const r = radius;
    const points = [
      { x: r, y: 0, label: `(${formatNumber(r)},0)` },
      { x: -r, y: 0, label: `(-${formatNumber(r)},0)` },
      { x: 0, y: r, label: `(0,${formatNumber(r)})` },
      { x: 0, y: -r, label: `(0,-${formatNumber(r)})` },
    ];
    return coordinateSvg({
      xmin: -r - 1,
      xmax: r + 1,
      ymin: -r - 1,
      ymax: r + 1,
      content: ({ xToSvg, yToSvg }) => {
        const cx = xToSvg(0);
        const cy = yToSvg(0);
        const svgRadius = Math.abs(xToSvg(r) - xToSvg(0));
        const labels = points.map((point) => `<circle cx="${xToSvg(point.x).toFixed(1)}" cy="${yToSvg(point.y).toFixed(1)}" r="4" fill="#111827"/><text x="${(xToSvg(point.x) + 8).toFixed(1)}" y="${(yToSvg(point.y) - 8).toFixed(1)}" class="point-label">${point.label}</text>`).join('\n  ');
        return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${svgRadius.toFixed(1)}" class="shape"/>
  <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4" fill="#111827"/>
  <text x="${(cx + 8).toFixed(1)}" y="${(cy + 20).toFixed(1)}" class="point-label">O(0,0)</text>
  ${labels}`;
      },
    });
  }

  function pieChartTemplate(data) {
    let start = 0;
    const slices = data.map((item, index) => {
      const end = start + item.value * 3.6;
      const mid = (start + end) / 2;
      const line = `  \\fill[${['blue!35', 'green!35', 'orange!45', 'red!35'][index % 4]}] (0,0) -- (${formatNumber(start)}:2.4) arc[start angle=${formatNumber(start)},end angle=${formatNumber(end)},radius=2.4] -- cycle;\n  \\node at (${formatNumber(mid)}:3.05) {${item.label} ${formatNumber(item.value)}\\%};`;
      start = end;
      return line;
    }).join('\n');
    return wrapDocument(String.raw`
\begin{tikzpicture}
${slices}
  \draw[thick] (0,0) circle (2.4);
\end{tikzpicture}`);
  }

  function pieChartSvg(data) {
    const cx = 260;
    const cy = 210;
    const r = 130;
    let start = -90;
    const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f87171'];
    const polar = (angle, radius) => {
      const rad = (angle * Math.PI) / 180;
      return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
    };
    const slices = data.map((item, index) => {
      const end = start + item.value * 3.6;
      const [x1, y1] = polar(start, r);
      const [x2, y2] = polar(end, r);
      const largeArc = item.value > 50 ? 1 : 0;
      const mid = (start + end) / 2;
      const [labelX, labelY] = polar(mid, r + 44);
      const path = `<path d="M${cx} ${cy} L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${colors[index % colors.length]}" stroke="#fff" stroke-width="2"/>
  <text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" text-anchor="middle" class="label">${item.label} ${formatNumber(item.value)}%</text>`;
      start = end;
      return path;
    }).join('\n  ');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="430" viewBox="0 0 560 430">
  <style>.label{font:15px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}</style>
  <rect width="560" height="430" fill="#fff"/>
  ${slices}
</svg>`;
  }

  function parallelogramGeometry({ sideA = 4, sideB = 3, angle = 60 } = {}) {
    const radians = (angle * Math.PI) / 180;
    return {
      sideA,
      sideB,
      angle,
      dx: sideB * Math.cos(radians),
      dy: sideB * Math.sin(radians),
    };
  }

  function parallelogramTemplate(options = {}) {
    const { sideA, sideB, angle, dx, dy } = parallelogramGeometry(options);
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (A) at (0,0);
  \coordinate (B) at (${formatNumber(sideA)},0);
  \coordinate (D) at (${formatCoordinate(dx)},${formatCoordinate(dy)});
  \coordinate (C) at (${formatCoordinate(sideA + dx)},${formatCoordinate(dy)});

  \draw[very thick] (A) -- (B) node[midway, below] {${formatNumber(sideA)}cm} -- (C) -- (D) node[midway, above left] {${formatNumber(sideB)}cm} -- cycle;
  \draw[thick] (0.65,0) arc[start angle=0,end angle=${formatNumber(angle)},radius=0.65];
  \node at (0.96,0.34) {${formatNumber(angle)}^\circ};
  \node[below left] at (A) {$A$};
  \node[below right] at (B) {$B$};
  \node[above right] at (C) {$C$};
  \node[above left] at (D) {$D$};
  \node[above] at (${formatNumber((sideA + dx) / 2)},${formatNumber(dy + 0.35)}) {平行四边形};
\end{tikzpicture}`);
  }

  function parallelogramSvg(options = {}) {
    const { sideA, sideB, angle, dx, dy } = parallelogramGeometry(options);
    const scale = 62;
    const ax = 95;
    const ay = 320;
    const bx = ax + sideA * scale;
    const by = ay;
    const dxSvg = ax + dx * scale;
    const dySvg = ay - dy * scale;
    const cx = bx + dx * scale;
    const cy = dySvg;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="400" viewBox="0 0 560 400">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.angle{fill:none;stroke:#dc2626;stroke-width:2}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="560" height="400" fill="#fff"/>
  <polygon points="${ax},${ay} ${bx},${by} ${cx.toFixed(1)},${cy.toFixed(1)} ${dxSvg.toFixed(1)},${dySvg.toFixed(1)}" class="shape"/>
  <path d="M${ax + 42} ${ay} A42 42 0 0 1 ${(ax + 42 * Math.cos((angle * Math.PI) / 180)).toFixed(1)} ${(ay - 42 * Math.sin((angle * Math.PI) / 180)).toFixed(1)}" class="angle"/>
  <text x="${ax + 58}" y="${ay - 28}" class="label" fill="#dc2626">${formatNumber(angle)}°</text>
  <text x="${(ax + bx) / 2}" y="${ay + 28}" text-anchor="middle" class="label">${formatNumber(sideA)}cm</text>
  <text x="${(ax + dxSvg) / 2 - 54}" y="${(ay + dySvg) / 2}" class="label">${formatNumber(sideB)}cm</text>
  <text x="278" y="58" text-anchor="middle" class="label">平行四边形</text>
  <text x="${ax - 16}" y="${ay + 22}" class="point">A</text>
  <text x="${bx + 4}" y="${by + 22}" class="point">B</text>
  <text x="${cx + 4}" y="${cy - 8}" class="point">C</text>
  <text x="${dxSvg - 18}" y="${dySvg - 8}" class="point">D</text>
</svg>`;
  }

  function rightTrapezoidTemplate({ topBase = 3, bottomBase = 5, height = 4 } = {}) {
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (A) at (0,0);
  \coordinate (B) at (${formatNumber(bottomBase)},0);
  \coordinate (C) at (${formatNumber(topBase)},${formatNumber(height)});
  \coordinate (D) at (0,${formatNumber(height)});

  \draw[very thick] (A) -- (B) node[midway, below] {下底 ${formatNumber(bottomBase)}cm} -- (C) -- (D) node[midway, above] {上底 ${formatNumber(topBase)}cm} -- cycle;
  \draw[thick] (0.35,0) -- (0.35,0.35) -- (0,0.35);
  \draw[dashed, gray] (D) -- (A) node[midway, left] {高 ${formatNumber(height)}cm};
  \node[below left] at (A) {$A$};
  \node[below right] at (B) {$B$};
  \node[above right] at (C) {$C$};
  \node[above left] at (D) {$D$};
  \node[above] at (${formatNumber(topBase / 2)},${formatNumber(height + 0.5)}) {直角梯形};
\end{tikzpicture}`);
  }

  function rightTrapezoidSvg({ topBase = 3, bottomBase = 5, height = 4 } = {}) {
    const scale = 58;
    const ax = 110;
    const ay = 330;
    const bx = ax + bottomBase * scale;
    const by = ay;
    const cx = ax + topBase * scale;
    const cy = ay - height * scale;
    const dx = ax;
    const dy = cy;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="420" viewBox="0 0 560 420">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.helper{stroke:#6b7280;stroke-width:2;stroke-dasharray:7 5}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="560" height="420" fill="#fff"/>
  <polygon points="${ax},${ay} ${bx},${by} ${cx},${cy} ${dx},${dy}" class="shape"/>
  <path d="M${ax + 28} ${ay} L${ax + 28} ${ay - 28} L${ax} ${ay - 28}" class="shape"/>
  <line x1="${dx}" y1="${dy}" x2="${ax}" y2="${ay}" class="helper"/>
  <text x="${(ax + bx) / 2}" y="${ay + 30}" text-anchor="middle" class="label">下底 ${formatNumber(bottomBase)}cm</text>
  <text x="${(dx + cx) / 2}" y="${dy - 14}" text-anchor="middle" class="label">上底 ${formatNumber(topBase)}cm</text>
  <text x="${ax - 74}" y="${(ay + dy) / 2}" class="label">高 ${formatNumber(height)}cm</text>
  <text x="280" y="52" text-anchor="middle" class="label">直角梯形</text>
  <text x="${ax - 16}" y="${ay + 22}" class="point">A</text>
  <text x="${bx + 4}" y="${by + 22}" class="point">B</text>
  <text x="${cx + 4}" y="${cy - 8}" class="point">C</text>
  <text x="${dx - 18}" y="${dy - 8}" class="point">D</text>
</svg>`;
  }

  function triangleFromSidesGeometry({ ab = 5, bc = 6, ac = 7 } = {}) {
    const x = (ab * ab + ac * ac - bc * bc) / (2 * ab);
    const y = Math.sqrt(Math.max(ac * ac - x * x, 0));
    return { ab, bc, ac, x, y };
  }

  function triangleFromSidesTemplate(options = {}) {
    const { ab, bc, ac, x, y } = triangleFromSidesGeometry(options);
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (A) at (0,0);
  \coordinate (B) at (${formatNumber(ab)},0);
  \coordinate (C) at (${formatCoordinate(x)},${formatCoordinate(y)});

  \draw[very thick] (A) -- (B) node[midway, below] {AB=${formatNumber(ab)}} -- (C) node[midway, above right] {BC=${formatNumber(bc)}} -- (A) node[midway, above left] {AC=${formatNumber(ac)}} -- cycle;
  \node[below left] at (A) {$A$};
  \node[below right] at (B) {$B$};
  \node[above] at (C) {$C$};
\end{tikzpicture}`);
  }

  function triangleFromSidesSvg(options = {}) {
    const { ab, bc, ac, x, y } = triangleFromSidesGeometry(options);
    const baseY = 330;
    const ax = 95;
    const scale = 58;
    const bx = ax + ab * scale;
    const cx = ax + x * scale;
    const cy = baseY - y * scale;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="420" viewBox="0 0 560 420">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="560" height="420" fill="#fff"/>
  <polygon points="${ax},${baseY} ${bx},${baseY} ${cx.toFixed(1)},${cy.toFixed(1)}" class="shape"/>
  <text x="${(ax + bx) / 2}" y="${baseY + 30}" text-anchor="middle" class="label">AB=${formatNumber(ab)}</text>
  <text x="${(bx + cx) / 2 + 18}" y="${(baseY + cy) / 2}" class="label">BC=${formatNumber(bc)}</text>
  <text x="${(ax + cx) / 2 - 70}" y="${(baseY + cy) / 2}" class="label">AC=${formatNumber(ac)}</text>
  <text x="${ax - 16}" y="${baseY + 22}" class="point">A</text>
  <text x="${bx + 4}" y="${baseY + 22}" class="point">B</text>
  <text x="${cx.toFixed(1)}" y="${(cy - 10).toFixed(1)}" class="point">C</text>
</svg>`;
  }

  function regularPolygonTemplate({ sides = 5, side = 3 } = {}) {
    const sideName = regularPolygonSideName(sides);
    const radius = side / (2 * Math.sin(Math.PI / sides));
    const points = Array.from({ length: sides }, (_, index) => {
      const angle = 90 + (360 * index) / sides;
      return {
        label: String.fromCharCode(65 + index),
        x: radius * Math.cos((angle * Math.PI) / 180),
        y: radius * Math.sin((angle * Math.PI) / 180),
      };
    });
    const coordinates = points.map((point) => `  \\coordinate (${point.label}) at (${formatCoordinate(point.x)},${formatCoordinate(point.y)});`).join('\n');
    const path = points.map((point) => `(${point.label})`).join(' -- ');
    const labels = points.map((point) => `  \\node at (${formatCoordinate(point.x * 1.16)},${formatCoordinate(point.y * 1.16)}) {$${point.label}$};`).join('\n');
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
${coordinates}
  \draw[very thick] ${path} -- cycle;
${labels}
  \node[below] at (0,-${formatNumber(radius + 0.55)}) {正${sideName}边形，边长 ${formatNumber(side)}cm};
\end{tikzpicture}`);
  }

  function regularPolygonSvg({ sides = 5, side = 3 } = {}) {
    const sideName = regularPolygonSideName(sides);
    const cx = 260;
    const cy = 210;
    const radius = 130;
    const points = Array.from({ length: sides }, (_, index) => {
      const angle = -90 + (360 * index) / sides;
      const rad = (angle * Math.PI) / 180;
      return {
        label: String.fromCharCode(65 + index),
        x: cx + radius * Math.cos(rad),
        y: cy + radius * Math.sin(rad),
      };
    });
    const polygon = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
    const labels = points.map((point) => {
      const vx = point.x - cx;
      const vy = point.y - cy;
      const len = Math.sqrt(vx * vx + vy * vy) || 1;
      return `<text x="${(point.x + (vx / len) * 22).toFixed(1)}" y="${(point.y + (vy / len) * 22).toFixed(1)}" text-anchor="middle" class="point">${point.label}</text>`;
    }).join('\n  ');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="420" viewBox="0 0 520 420">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="520" height="420" fill="#fff"/>
  <polygon points="${polygon}" class="shape"/>
  ${labels}
  <text x="260" y="388" text-anchor="middle" class="label">正${sideName}边形，边长 ${formatNumber(side)}cm</text>
</svg>`;
  }

  function medianTriangleTemplate() {
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=1]
  \coordinate (A) at (0,0);
  \coordinate (B) at (4,0);
  \coordinate (C) at (1.5,3);
  \coordinate (D) at (2,0);

  \draw[very thick] (A) -- (B) -- (C) -- cycle;
  \draw[dashed, blue] (C) -- (D) node[midway, right] {中线};
  \fill (D) circle (1.6pt);
  \node[below] at (D) {$D$};
  \node[below left] at (A) {$A$};
  \node[below right] at (B) {$B$};
  \node[above] at (C) {$C$};
\end{tikzpicture}`);
  }

  function medianTriangleSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="400" viewBox="0 0 540 400">
  <style>.shape{fill:none;stroke:#111827;stroke-width:3;stroke-linejoin:round}.median{stroke:#2563eb;stroke-width:2.5;stroke-dasharray:8 6}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="540" height="400" fill="#fff"/>
  <polygon points="110,330 430,330 230,90" class="shape"/>
  <line x1="230" y1="90" x2="270" y2="330" class="median"/>
  <circle cx="270" cy="330" r="4" fill="#111827"/>
  <text x="100" y="354" class="point">A</text>
  <text x="436" y="354" class="point">B</text>
  <text x="224" y="80" class="point">C</text>
  <text x="264" y="354" class="point">D</text>
  <text x="282" y="214" class="label">中线 CD</text>
</svg>`;
  }

  function histogramTemplate(data) {
    const yMax = Math.max(...data.map((item) => item.count), 1);
    const rectangles = data.map((item) => `    \\draw[fill=blue!35, draw=blue!70!black] (${formatNumber(item.start)},0) rectangle (${formatNumber(item.end)},${formatNumber(item.count)});\n    \\node[above] at (${formatNumber((item.start + item.end) / 2)},${formatNumber(item.count)}) {${formatNumber(item.count)}};`).join('\n');
    return coordinateAxisTemplate({
      xmin: data[0].start,
      xmax: data[data.length - 1].end,
      ymin: 0,
      ymax: Math.ceil(yMax / 5) * 5,
      body: rectangles,
    });
  }

  function histogramSvg(data) {
    const width = 720;
    const height = 430;
    const left = 64;
    const right = 34;
    const top = 34;
    const bottom = 72;
    const xMin = data[0].start;
    const xMax = data[data.length - 1].end;
    const yMax = Math.ceil(Math.max(...data.map((item) => item.count), 1) / 5) * 5;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const xToSvg = (x) => left + ((x - xMin) / (xMax - xMin)) * plotWidth;
    const yToSvg = (y) => top + ((yMax - y) / yMax) * plotHeight;
    const bars = data.map((item) => {
      const x = xToSvg(item.start);
      const w = xToSvg(item.end) - x;
      const y = yToSvg(item.count);
      const h = yToSvg(0) - y;
      const label = `[${formatNumber(item.start)},${formatNumber(item.end)})`;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#93c5fd" stroke="#1d4ed8"/>
  <text x="${(x + w / 2).toFixed(1)}" y="${(y - 8).toFixed(1)}" text-anchor="middle" class="label">${formatNumber(item.count)}</text>
  <text x="${(x + w / 2).toFixed(1)}" y="${height - 38}" text-anchor="middle" class="small">${label}</text>`;
    }).join('\n  ');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>.axis{stroke:#111827;stroke-width:2}.grid{stroke:#e5e7eb;stroke-width:1}.label{font:15px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.small{font:13px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#4b5563}</style>
  <rect width="${width}" height="${height}" fill="#fff"/>
  <line x1="${left}" y1="${yToSvg(0)}" x2="${width - right}" y2="${yToSvg(0)}" class="axis"/>
  <line x1="${left}" y1="${top}" x2="${left}" y2="${yToSvg(0)}" class="axis"/>
  <line x1="${left}" y1="${yToSvg(yMax)}" x2="${width - right}" y2="${yToSvg(yMax)}" class="grid"/>
  ${bars}
</svg>`;
  }

  function intersectingCirclesTemplate() {
    return wrapDocument(String.raw`
\begin{tikzpicture}[scale=0.85]
  \coordinate (O_1) at (0,0);
  \coordinate (O_2) at (5,0);
  \coordinate (P) at (1.8,2.4);
  \coordinate (Q) at (1.8,-2.4);

  \draw[very thick, blue] (O_1) circle (3);
  \draw[very thick, red] (O_2) circle (4);
  \draw[dashed, gray] (O_1) -- (O_2) node[midway, below] {圆心距 5cm};
  \fill (O_1) circle (1.8pt) node[below left] {$O_1$};
  \fill (O_2) circle (1.8pt) node[below right] {$O_2$};
  \fill (P) circle (1.8pt) node[above] {$P$};
  \fill (Q) circle (1.8pt) node[below] {$Q$};
  \node[blue] at (-1.2,2.7) {$r=3$};
  \node[red] at (6.6,3.2) {$r=4$};
\end{tikzpicture}`);
  }

  function intersectingCirclesSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="460" viewBox="0 0 640 460">
  <style>.circle1{fill:none;stroke:#2563eb;stroke-width:3}.circle2{fill:none;stroke:#dc2626;stroke-width:3}.helper{stroke:#6b7280;stroke-width:2;stroke-dasharray:7 5}.label{font:16px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}.point{font:15px serif;fill:#111827}</style>
  <rect width="640" height="460" fill="#fff"/>
  <circle cx="220" cy="230" r="120" class="circle1"/>
  <circle cx="420" cy="230" r="160" class="circle2"/>
  <line x1="220" y1="230" x2="420" y2="230" class="helper"/>
  <circle cx="220" cy="230" r="4" fill="#111827"/><text x="190" y="252" class="point">O1</text>
  <circle cx="420" cy="230" r="4" fill="#111827"/><text x="430" y="252" class="point">O2</text>
  <circle cx="292" cy="134" r="5" fill="#111827"/><text x="300" y="124" class="point">P</text>
  <circle cx="292" cy="326" r="5" fill="#111827"/><text x="300" y="348" class="point">Q</text>
  <text x="286" y="252" class="label">圆心距 5cm</text>
  <text x="110" y="126" class="label" fill="#2563eb">r=3</text>
  <text x="524" y="104" class="label" fill="#dc2626">r=4</text>
</svg>`;
  }

  function logBaseTwoTemplate() {
    return wrapDocument(String.raw`
\begin{tikzpicture}
  \begin{axis}[
    axis lines=middle,
    grid=both,
    xmin=0.25,
    xmax=8,
    ymin=-2.5,
    ymax=3.5,
    samples=160,
    xlabel={$x$},
    ylabel={$y$}
  ]
    \addplot[blue, very thick, domain=0.25:8] {ln(x)/ln(2)};
    \node[anchor=west] at (axis cs:4.7,2.6) {$y=\log_2(x)$};
    \fill (axis cs:1,0) circle (1.8pt) node[above left] {$(1,0)$};
    \fill (axis cs:2,1) circle (1.8pt) node[above left] {$(2,1)$};
    \fill (axis cs:4,2) circle (1.8pt) node[above left] {$(4,2)$};
  \end{axis}
\end{tikzpicture}`);
  }

  function logBaseTwoSvg() {
    return singleFunctionSvg({
      label: 'y=log₂(x)',
      fn: (x) => Math.log2(x),
      min: 0.25,
      max: 8,
      yMin: -2.5,
      yMax: 3.5,
      color: '#2563eb',
      minSvgLabel: '1/4',
      maxSvgLabel: '8',
    }).replace('</svg>', [
      '<circle cx="112.3" cy="225.3" r="4" fill="#111827"/><text x="120" y="216" class="label">(1,0)</text>',
      '<circle cx="190.0" cy="168.0" r="4" fill="#111827"/><text x="198" y="158" class="label">(2,1)</text>',
      '<circle cx="345.3" cy="110.7" r="4" fill="#111827"/><text x="353" y="101" class="label">(4,2)</text>',
      '</svg>',
    ].join('\n  '));
  }

  function cubicTemplate() {
    return wrapDocument(String.raw`
\begin{tikzpicture}
  \begin{axis}[
    axis lines=middle,
    grid=both,
    xmin=-3,
    xmax=3,
    ymin=-6,
    ymax=6,
    samples=180,
    xlabel={$x$},
    ylabel={$y$}
  ]
    \addplot[blue, very thick, domain=-3:3] {x^3-3*x};
    \fill (axis cs:-1,2) circle (1.8pt) node[above left] {极大 $(-1,2)$};
    \fill (axis cs:1,-2) circle (1.8pt) node[below right] {极小 $(1,-2)$};
    \foreach \x in {-1.732,0,1.732} {
      \fill (axis cs:\x,0) circle (1.5pt);
    }
    \node[below] at (axis cs:0,-0.25) {零点};
  \end{axis}
\end{tikzpicture}`);
  }

  function cubicSvg() {
    const svg = singleFunctionSvg({
      label: 'y=x³-3x',
      fn: (x) => x * x * x - 3 * x,
      min: -3,
      max: 3,
      yMin: -6,
      yMax: 6,
      color: '#2563eb',
    });
    return svg.replace('</svg>', [
      '<text x="210" y="124" class="label">极大点</text>',
      '<text x="388" y="292" class="label">极小点</text>',
      '<text x="314" y="215" class="label">零点</text>',
      '</svg>',
    ].join('\n  '));
  }

  function piecewiseTemplate() {
    return wrapDocument(String.raw`
\begin{tikzpicture}
  \begin{axis}[
    axis lines=middle,
    grid=both,
    xmin=-4,
    xmax=4,
    ymin=-1,
    ymax=9,
    samples=120,
    xlabel={$x$},
    ylabel={$y$}
  ]
    \addplot[blue, very thick, domain=-4:0] {x^2};
    \node[blue] at (axis cs:-2.6,7.4) {$x<0,\ y=x^2$};
    \addplot[red, very thick, domain=0:4] {2*x};
    \node[red] at (axis cs:2.5,4.8) {$x\ge 0,\ y=2x$};
    \fill (axis cs:0,0) circle (1.8pt);
  \end{axis}
\end{tikzpicture}`);
  }

  function piecewiseSvg() {
    const quadratic = singleFunctionSvg({
      label: 'x<0: y=x²',
      fn: (x) => x * x,
      min: -4,
      max: 4,
      yMin: -1,
      yMax: 9,
      color: '#2563eb',
    });
    return quadratic
      .replace(/<polyline points="[^"]+" class="curve"\/>/, '<polyline points="54.0,58.4 57.8,66.9 61.5,75.4 65.3,83.7 69.1,91.9 72.8,100.0 76.6,108.0 80.4,115.9 84.1,123.7 87.9,131.3 91.6,138.9 95.4,146.4 99.2,153.7 102.9,161.0 106.7,168.1 110.5,175.1 114.2,182.0 118.0,188.8 121.8,195.5 125.5,202.1 129.3,208.6 133.1,215.0 136.8,221.2 140.6,227.4 144.4,233.4 148.1,239.3 151.9,245.1 155.7,250.8 159.4,256.4 163.2,261.9 167.0,267.2 170.7,272.5 174.5,277.6 178.3,282.6 182.0,287.5 185.8,292.3 189.5,297.0 193.3,301.6 197.1,306.0 200.8,310.4 204.6,314.6 208.4,318.7 212.1,322.7 215.9,326.6 219.7,330.4 223.4,334.1 227.2,337.6 231.0,341.1 234.7,344.4 238.5,347.6 242.3,350.7 246.0,353.7 249.8,356.5 253.6,359.3 257.3,361.9 261.1,364.4 264.9,366.8 268.6,369.1 272.4,371.3 276.2,373.3 279.9,375.2 283.7,377.0 287.4,378.7 291.2,380.3 295.0,381.7 298.7,383.0 302.5,384.3 306.3,385.4 310.0,386.4 313.8,387.2 317.6,388.0 321.3,388.6 325.1,389.1 328.9,389.5 332.6,389.8 336.4,390.0 340.2,390.0" class="curve"/>')
      .replace('</svg>', [
        '<line x1="340.2" y1="390.0" x2="641.8" y2="114.8" stroke="#dc2626" stroke-width="3"/>',
        '<text x="130" y="92" class="label" fill="#2563eb">x&lt;0: y=x²</text>',
        '<text x="430" y="180" class="label" fill="#dc2626">x≥0: y=2x</text>',
        '</svg>',
      ].join('\n  '));
  }

  function parabolaCircleTemplate() {
    return wrapDocument(String.raw`
\begin{tikzpicture}
  \begin{axis}[
    axis lines=middle,
    grid=both,
    xmin=-2.5,
    xmax=2.5,
    ymin=-2.5,
    ymax=4.5,
    samples=160,
    xlabel={$x$},
    ylabel={$y$},
    axis equal image
  ]
    \addplot[blue, very thick, domain=-2.1:2.1] {x^2};
    \draw[red, very thick] (0,0) circle (2);
    \fill[orange!30, opacity=0.7] (axis cs:-1.249,1.562) -- (axis cs:0,2) -- (axis cs:1.249,1.562) -- cycle;
    \node at (axis cs:0,2.25) {交点区域};
    \node[blue] at (axis cs:-1.7,3.2) {抛物线};
    \node[red] at (axis cs:1.65,-1.5) {圆};
  \end{axis}
\end{tikzpicture}`);
  }

  function parabolaCircleSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="460" viewBox="0 0 620 460">
  <style>.axis{stroke:#111827;stroke-width:1.5}.parabola{fill:none;stroke:#2563eb;stroke-width:3}.circle{fill:none;stroke:#dc2626;stroke-width:3}.label{font:15px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;fill:#111827}</style>
  <rect width="620" height="460" fill="#fff"/>
  <line x1="70" y1="290" x2="560" y2="290" class="axis"/>
  <line x1="310" y1="40" x2="310" y2="420" class="axis"/>
  <circle cx="310" cy="290" r="128" class="circle"/>
  <path d="M176 54 C230 214 266 270 310 290 C354 270 390 214 444 54" class="parabola"/>
  <polygon points="230,190 310,162 390,190" fill="#fed7aa" opacity=".75"/>
  <text x="286" y="148" class="label">交点区域</text>
  <text x="132" y="76" class="label" fill="#2563eb">抛物线</text>
  <text x="454" y="390" class="label" fill="#dc2626">圆</text>
</svg>`;
  }

  function circumcenterTriangleTemplate() {
    return coordinateAxisTemplate({
      xmin: -1,
      xmax: 5,
      ymin: -1,
      ymax: 4,
      body: String.raw`
    \coordinate (A) at (0,0);
    \coordinate (B) at (4,0);
    \coordinate (C) at (2,3);
    \coordinate (O) at (2,0.833);
    \draw[very thick, blue] (A) -- (B) -- (C) -- cycle;
    \draw[dashed, red] (2,-0.8) -- (2,3.6) node[above] {中垂线};
    \draw[dashed, red] (-0.4,2.067) -- (4.4,-1.133) node[right] {中垂线};
    \draw[dashed, red] (-0.4,-1.133) -- (4.4,2.067) node[right] {中垂线};
    \fill (A) circle (1.6pt) node[below left] {$A(0,0)$};
    \fill (B) circle (1.6pt) node[below right] {$B(4,0)$};
    \fill (C) circle (1.6pt) node[above] {$C(2,3)$};
    \fill[red] (O) circle (2pt) node[above right] {外心 $O$};`,
    });
  }

  function circumcenterTriangleSvg() {
    return coordinateSvg({
      xmin: -1,
      xmax: 5,
      ymin: -1,
      ymax: 4,
      content: ({ xToSvg, yToSvg }) => {
        const p = (x, y) => `${xToSvg(x).toFixed(1)},${yToSvg(y).toFixed(1)}`;
        return `<polygon points="${p(0, 0)} ${p(4, 0)} ${p(2, 3)}" class="shape"/>
  <line x1="${xToSvg(2).toFixed(1)}" y1="${yToSvg(-0.8).toFixed(1)}" x2="${xToSvg(2).toFixed(1)}" y2="${yToSvg(3.6).toFixed(1)}" class="helper"/>
  <line x1="${xToSvg(-0.4).toFixed(1)}" y1="${yToSvg(2.067).toFixed(1)}" x2="${xToSvg(4.4).toFixed(1)}" y2="${yToSvg(-1.133).toFixed(1)}" class="helper"/>
  <line x1="${xToSvg(-0.4).toFixed(1)}" y1="${yToSvg(-1.133).toFixed(1)}" x2="${xToSvg(4.4).toFixed(1)}" y2="${yToSvg(2.067).toFixed(1)}" class="helper"/>
  <circle cx="${xToSvg(0).toFixed(1)}" cy="${yToSvg(0).toFixed(1)}" r="4" fill="#111827"/><text x="${(xToSvg(0) - 54).toFixed(1)}" y="${(yToSvg(0) + 18).toFixed(1)}" class="point-label">A(0,0)</text>
  <circle cx="${xToSvg(4).toFixed(1)}" cy="${yToSvg(0).toFixed(1)}" r="4" fill="#111827"/><text x="${(xToSvg(4) + 8).toFixed(1)}" y="${(yToSvg(0) + 18).toFixed(1)}" class="point-label">B(4,0)</text>
  <circle cx="${xToSvg(2).toFixed(1)}" cy="${yToSvg(3).toFixed(1)}" r="4" fill="#111827"/><text x="${(xToSvg(2) + 8).toFixed(1)}" y="${(yToSvg(3) - 10).toFixed(1)}" class="point-label">C(2,3)</text>
  <circle cx="${xToSvg(2).toFixed(1)}" cy="${yToSvg(0.833).toFixed(1)}" r="5" fill="#dc2626"/><text x="${(xToSvg(2) + 8).toFixed(1)}" y="${(yToSvg(0.833) - 10).toFixed(1)}" class="point-label">外心 O</text>
  <text x="${(xToSvg(4.15)).toFixed(1)}" y="${(yToSvg(2.2)).toFixed(1)}" class="point-label">中垂线</text>`;
      },
    });
  }

  function reflectionTemplate() {
    return coordinateAxisTemplate({
      xmin: 0,
      xmax: 5,
      ymin: 0,
      ymax: 5,
      body: String.raw`
    \coordinate (A) at (2,3);
    \coordinate (Aprime) at (3,2);
    \draw[very thick, gray] (0,0) -- (5,5) node[above] {$y=x$};
    \draw[dashed, red] (A) -- (Aprime);
    \fill (A) circle (1.8pt) node[above left] {$A(2,3)$};
    \fill (Aprime) circle (1.8pt) node[below right] {$A'(3,2)$};
    \node[red] at (2.5,2.7) {对称};
`,
    });
  }

  function reflectionSvg() {
    return coordinateSvg({
      xmin: 0,
      xmax: 5,
      ymin: 0,
      ymax: 5,
      content: ({ xToSvg, yToSvg }) => `<line x1="${xToSvg(0).toFixed(1)}" y1="${yToSvg(0).toFixed(1)}" x2="${xToSvg(5).toFixed(1)}" y2="${yToSvg(5).toFixed(1)}" class="helper"/>
  <line x1="${xToSvg(2).toFixed(1)}" y1="${yToSvg(3).toFixed(1)}" x2="${xToSvg(3).toFixed(1)}" y2="${yToSvg(2).toFixed(1)}" stroke="#dc2626" stroke-width="2" stroke-dasharray="7 5"/>
  <circle cx="${xToSvg(2).toFixed(1)}" cy="${yToSvg(3).toFixed(1)}" r="5" fill="#111827"/><text x="${(xToSvg(2) - 64).toFixed(1)}" y="${(yToSvg(3) - 10).toFixed(1)}" class="point-label">A(2,3)</text>
  <circle cx="${xToSvg(3).toFixed(1)}" cy="${yToSvg(2).toFixed(1)}" r="5" fill="#dc2626"/><text x="${(xToSvg(3) + 8).toFixed(1)}" y="${(yToSvg(2) + 20).toFixed(1)}" class="point-label">A'(3,2)</text>
  <text x="${(xToSvg(4.15)).toFixed(1)}" y="${(yToSvg(4.35)).toFixed(1)}" class="point-label">y=x</text>`,
    });
  }

  function removeSideLabelsAndAddAltitude(source) {
    let next = source
      .replace(/\s*node\[below\]\s*\{-?\d+(?:\.\d+)?\}/g, '')
      .replace(/\s*node\[left\]\s*\{-?\d+(?:\.\d+)?\}/g, '')
      .replace(/\s*node\[midway, above right\]\s*\{-?\d+(?:\.\d+)?\}/g, '');

    if (!/斜边上的高/.test(next)) {
      next = next.replace(
        /(\s*\\draw\[thick\] (?:\(0\.35,0\) -- \(0\.35,0\.35\) -- \(0,0\.35\)|\(-0\.35,0\) -- \(-0\.35,-0\.35\) -- \(0,-0\.35\));\n)/,
        `$1  \\draw[dashed, gray] (A) -- (1.44,1.92) node[midway, left] {斜边上的高};\n  \\draw[gray] (1.32,1.83) -- (1.41,1.71) -- (1.53,1.80);\n`,
      );
    }

    return next;
  }

  function moveRightAngleMarkerOutside(source) {
    let next = source.replace(
      /\\draw\[thick\] \(0\.35,0\) -- \(0\.35,0\.35\) -- \(0,0\.35\);/,
      '\\draw[thick] (-0.35,0) -- (-0.35,-0.35) -- (0,-0.35);',
    );

    next = next.replace(
      /\\node\[below left\] at \(A\) \{直角\};/,
      '\\node[below left] at (-0.35,-0.35) {直角};',
    );

    return next;
  }

  function addAuxiliaryLine(source) {
    if (/辅助线/.test(source)) return source;
    return source.replace(
      /(\\draw\[thick\] (?:\(0\.35,0\) -- \(0\.35,0\.35\) -- \(0,0\.35\)|\(-0\.35,0\) -- \(-0\.35,-0\.35\) -- \(0,-0\.35\));\n)/,
      '$1  \\draw[gray] (B) -- (C) node[midway, above right] {辅助线};\n',
    );
  }

  function dashAuxiliaryLine(source) {
    if (!/辅助线/.test(source)) {
      return addAuxiliaryLine(source).replace(
        /\\draw\[gray\] \(B\) -- \(C\) node\[midway, above right\] \{辅助线\};/,
        '\\draw[dashed, gray] (B) -- (C) node[midway, above right] {辅助线};',
      );
    }
    return source.replace(
      /\\draw\[gray\] \(B\) -- \(C\) node\[midway, above right\] \{辅助线\};/,
      '\\draw[dashed, gray] (B) -- (C) node[midway, above right] {辅助线};',
    );
  }

  function extractTriangleLegsFromSource(source) {
    const raw = String(source || '');
    const horizontalMatch = raw.match(/\\coordinate \(B\) at \((-?\d+(?:\.\d+)?),0\);/);
    const verticalMatch = raw.match(/\\coordinate \(C\) at \(0,(-?\d+(?:\.\d+)?)\);/);
    if (!horizontalMatch || !verticalMatch) return { horizontal: 4, vertical: 3 };
    const horizontal = Number(horizontalMatch[1]);
    const vertical = Number(verticalMatch[1]);
    if (!(horizontal > 0 && vertical > 0)) return { horizontal: 4, vertical: 3 };
    return { horizontal, vertical };
  }

  function triangleSvgStateFromSource(source) {
    const raw = String(source || '');
    return {
      ...extractTriangleLegsFromSource(raw),
      labels: !/斜边上的高/.test(raw) && !/\\draw\[dashed, gray\] \(A\) --/.test(raw),
      altitude: /斜边上的高/.test(raw),
      outsideMarker: /\\draw\[thick\] \(-0\.35,0\) --/.test(raw),
      auxiliary: /辅助线/.test(raw),
      dashedAuxiliary: /\\draw\[dashed, gray\] \(B\) -- \(C\)/.test(raw),
      angleA: /标记角A/.test(raw),
      angleB: /标记角B/.test(raw) || /\\node\[above left, red\].*\\\(\\theta\\\)/.test(raw),
      angleC: /标记角C/.test(raw) || /\\node\[below right, red\].*\\\(\\theta\\\)/.test(raw),
    };
  }

  function isRightTriangleSource(source) {
    const raw = String(source || '');
    return /\\coordinate \(A\) at \(0,0\);/.test(raw)
      && /\\coordinate \(B\) at \(-?\d+(?:\.\d+)?,0\);/.test(raw)
      && /\\coordinate \(C\) at \(0,-?\d+(?:\.\d+)?\);/.test(raw)
      && (/\\node\[below left\] at \(A\) \{直角\};/.test(raw)
        || /\\node\[below left\] at \(-0\.35,-0\.35\) \{直角\};/.test(raw));
  }

  function markAngleA(source) {
    const marker = [
      `  % 标记角A`,
      `  \\node[above right, red] at (0.55,0.55) {$90^\\circ$};`,
    ].join('\n');

    if (/标记角A/.test(source)) return source;
    return source.replace('\\end{tikzpicture}', `${marker}\n\\end{tikzpicture}`);
  }

  function markAngleB(source) {
    const { horizontal, vertical } = extractTriangleLegsFromSource(source);
    const radius = 0.75;
    const angle = (Math.atan2(vertical, horizontal) * 180) / Math.PI;
    const endAngle = formatNumber(180 - angle);
    const startX = formatNumber(horizontal - radius);
    const labelX = formatNumber(horizontal - 0.82);
    const labelY = formatNumber(0.32);
    const marker = [
      `  \\draw[thick, red] (${startX},0) arc[start angle=180,end angle=${endAngle},radius=${radius}];`,
      `  \\node[above left, red] at (${labelX},${labelY}) {\\(\\theta\\)};`,
    ].join('\n');

    if (/\\\(\\theta\\\)/.test(source)) return source;
    return source.replace('\\end{tikzpicture}', `${marker}\n\\end{tikzpicture}`);
  }

  function markAngleC(source) {
    const { horizontal, vertical } = extractTriangleLegsFromSource(source);
    const radius = 0.75;
    const edgeAngle = formatNumber(-((Math.atan2(vertical, horizontal) * 180) / Math.PI));
    const startY = formatNumber(vertical - radius);
    const labelX = formatNumber(0.38);
    const labelY = formatNumber(vertical - 0.88);
    const marker = [
      `  % 标记角C`,
      `  \\draw[thick, red] (0,${startY}) arc[start angle=-90,end angle=${edgeAngle},radius=${radius}];`,
      `  \\node[below right, red] at (${labelX},${labelY}) {\\(\\theta\\)};`,
    ].join('\n');

    if (/标记角C/.test(source)) return source;
    return source.replace('\\end{tikzpicture}', `${marker}\n\\end{tikzpicture}`);
  }

  function changeAxisRange(source, min, max) {
    let next = source
      .replace(/xmin=[^,\n]+/, `xmin=${min}`)
      .replace(/xmax=[^,\n]+/, `xmax=${max}`)
      .replace(/ymin=[^,\n]+/, `ymin=${min}`)
      .replace(/ymax=[^,\n]+/, `ymax=${max}`);

    next = next.replace(/domain=[^:\]]+:[^\]]+/g, `domain=${min}:${max}`);
    return next;
  }

  function extractAxisRangeFromSource(source, fallback = { min: -3, max: 3, minExpr: '-3', maxExpr: '3' }) {
    const raw = String(source || '');
    const minMatch = raw.match(/xmin=([^,\n]+)/);
    const maxMatch = raw.match(/xmax=([^,\n]+)/);
    if (!minMatch || !maxMatch) return fallback;
    const min = parseRangeBoundary(minMatch[1].trim());
    const max = parseRangeBoundary(maxMatch[1].trim());
    if (!min || !max) return fallback;
    return {
      min: min.value,
      max: max.value,
      minExpr: min.expr,
      maxExpr: max.expr,
      minSvgLabel: min.svgLabel,
      maxSvgLabel: max.svgLabel,
    };
  }

  function isQuadraticLinearSource(source) {
    const raw = String(source || '');
    return /\{x\^2\}/.test(raw) && /\{2\*x\+1\}/.test(raw);
  }

  function isSingleSineSource(source) {
    const raw = String(source || '');
    return /\{sin\(deg\(x\)\)\}/.test(raw) && !/\{cos\(deg\(x\)\)\}/.test(raw);
  }

  function extractIsoscelesGeometryFromSource(source) {
    const raw = String(source || '');
    const aMatch = raw.match(/\\coordinate \(A\) at \(-(\d+(?:\.\d+)?),0\);/);
    const bMatch = raw.match(/\\coordinate \(B\) at \((\d+(?:\.\d+)?),0\);/);
    const cMatch = raw.match(/\\coordinate \(C\) at \(0,(\d+(?:\.\d+)?)\);/);
    if (!aMatch || !bMatch || !cMatch) return null;
    const leftHalf = Number(aMatch[1]);
    const rightHalf = Number(bMatch[1]);
    const height = Number(cMatch[1]);
    if (!(leftHalf > 0 && rightHalf > 0 && Math.abs(leftHalf - rightHalf) < 0.01 && height > 0)) return null;
    const base = leftHalf + rightHalf;
    const waist = Math.sqrt(leftHalf * leftHalf + height * height);
    return { base, waist };
  }

  function isIsoscelesSidesSource(source) {
    return Boolean(extractIsoscelesGeometryFromSource(source)) && /底边 .*cm|腰长 .*cm/.test(String(source || ''));
  }

  function parseRangeBoundary(value) {
    const token = String(value || '').trim();
    const piMatch = token.match(/^(-?)(?:(\d+(?:\.\d+)?)\*?)?(π|pi)$/);
    if (piMatch) {
      const sign = piMatch[1] === '-' ? -1 : 1;
      const coefficient = piMatch[2] ? Number(piMatch[2]) : 1;
      const signedCoefficient = sign * coefficient;
      const exprPrefix = sign < 0 ? '-' : '';
      const exprCoefficient = coefficient === 1 ? '' : `${formatNumber(coefficient)}*`;
      const labelPrefix = sign < 0 ? '-' : '';
      const labelCoefficient = coefficient === 1 ? '' : formatNumber(coefficient);
      return {
        value: signedCoefficient * Math.PI,
        expr: `${exprPrefix}${exprCoefficient}pi`,
        tickLabel: `$${labelPrefix}${labelCoefficient}\\pi$`,
        svgLabel: `${labelPrefix}${labelCoefficient}π`,
        symbolic: true,
      };
    }

    const numeric = Number(token);
    if (!Number.isFinite(numeric)) return null;
    const label = formatNumber(numeric);
    return {
      value: numeric,
      expr: label,
      tickLabel: label,
      svgLabel: label,
      symbolic: false,
    };
  }

  function extractRange(prompt) {
    const normalized = normalizePrompt(prompt);
    const boundary = '-?(?:\\d+(?:\\.\\d+)?\\*?(?:π|pi)?|π|pi)';
    const match = normalized.match(new RegExp(`(${boundary})(?:到|至)(${boundary})`))
      || normalized.match(new RegExp(`[\\[【(（](${boundary}),(${boundary})[\\]】)）]`));
    if (!match) return null;
    const min = parseRangeBoundary(match[1]);
    const max = parseRangeBoundary(match[2]);
    if (!min || !max) return null;
    return {
      min: min.value,
      max: max.value,
      minExpr: min.expr,
      maxExpr: max.expr,
      minTickLabel: min.tickLabel,
      maxTickLabel: max.tickLabel,
      minSvgLabel: min.svgLabel,
      maxSvgLabel: max.svgLabel,
      symbolic: min.symbolic || max.symbolic,
    };
  }

  function extractRightTriangleLegs(prompt) {
    const normalized = normalizePrompt(prompt);
    const match = normalized.match(/直角边(?:长)?(?:分别)?(?:是|为)?(-?\d+(?:\.\d+)?)(?:cm|厘米)?(?:和|,|，|、)(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    if (match) {
      const vertical = Number(match[1]);
      const horizontal = Number(match[2]);
      if (!(vertical > 0 && horizontal > 0)) return null;
      return { vertical, horizontal };
    }

    const abMatch = normalized.match(/ab(?:=|是|为|长)(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    const acMatch = normalized.match(/ac(?:=|是|为|长)(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    const rightAngleAtA = /(?:∠a|角a)(?:=|是|为)?90(?:°|度)?/.test(normalized);
    if (!(abMatch && acMatch && rightAngleAtA)) return null;
    const horizontal = Number(abMatch[1]);
    const vertical = Number(acMatch[1]);
    if (!(vertical > 0 && horizontal > 0)) return null;
    return { vertical, horizontal };
  }

  function extractRightTriangleDiameterCircleOptions(prompt) {
    const normalized = normalizePrompt(prompt);
    if (!/直角三角形/.test(normalized)) return null;
    if (!/(?:c为直角顶点|c是直角顶点|∠c(?:=|是|为)?90(?:°|度)?|角c(?:=|是|为)?90(?:°|度)?)/.test(normalized)) return null;
    if (!/ac为直径|以ac.*直径/.test(normalized)) return null;
    if (!/圆.*(?:斜边ab|ab).*相交.*d|圆.*交.*(?:斜边ab|ab).*d/.test(normalized)) return null;

    const acMatch = normalized.match(/ac(?:=|是|为|长)(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    const bcMatch = normalized.match(/bc(?:=|是|为|长)(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    if (!(acMatch && bcMatch)) return null;
    const ac = Number(acMatch[1]);
    const bc = Number(bcMatch[1]);
    if (!(ac > 0 && bc > 0)) return null;
    return { ac, bc };
  }

  function extractRadius(prompt) {
    const normalized = normalizePrompt(prompt);
    const match = normalized.match(/半径(?:是|为)?(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    if (!match) return null;
    const radius = Number(match[1]);
    return radius > 0 ? radius : null;
  }

  function extractSideLength(prompt) {
    const normalized = normalizePrompt(prompt);
    const match = normalized.match(/边长(?:是|为)?(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    if (!match) return null;
    const side = Number(match[1]);
    return side > 0 ? side : null;
  }

  function extractIsoscelesBaseAngle(prompt) {
    const normalized = normalizePrompt(prompt);
    const angleMatch = normalized.match(/底角(?:是|为)?(-?\d+(?:\.\d+)?)(?:°|度)?/);
    const waistMatch = normalized.match(/腰长(?:是|为)?(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    if (!angleMatch || !waistMatch) return null;
    const baseAngle = Number(angleMatch[1]);
    const waist = Number(waistMatch[1]);
    if (!(baseAngle > 0 && baseAngle < 90 && waist > 0)) return null;
    return { baseAngle, waist };
  }

  function extractIsoscelesSides(prompt) {
    const normalized = normalizePrompt(prompt);
    const baseMatch = normalized.match(/底边?长?(?:是|为)?(-?\d+(?:\.\d+)?)(?:cm|厘米)?/)
      || normalized.match(/底(?:是|为)?(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    const waistMatch = normalized.match(/腰长(?:是|为)?(-?\d+(?:\.\d+)?)(?:cm|厘米)?/)
      || normalized.match(/腰(?:是|为)?(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    if (!baseMatch || !waistMatch) return null;
    const base = Number(baseMatch[1]);
    const waist = Number(waistMatch[1]);
    if (!(base > 0 && waist > 0 && base < waist * 2)) return null;
    return { base, waist };
  }

  function extractRegularPolygonSides(prompt) {
    const normalized = normalizePrompt(prompt);
    const digitMatch = normalized.match(/(?:正)?(\d+)边形/);
    if (digitMatch) {
      const sides = Number(digitMatch[1]);
      return sides >= 3 && sides <= 12 ? sides : null;
    }

    const chineseDigits = {
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      七: 7,
      八: 8,
      九: 9,
      十: 10,
      十一: 11,
      十二: 12,
    };
    const chineseMatch = normalized.match(/(?:正)?(十二|十一|十|三|四|五|六|七|八|九)边形/);
    return chineseMatch ? chineseDigits[chineseMatch[1]] : null;
  }

  function regularPolygonSideName(sides) {
    const sideNames = {
      3: '三',
      4: '四',
      5: '五',
      6: '六',
      7: '七',
      8: '八',
      9: '九',
      10: '十',
      11: '十一',
      12: '十二',
    };
    return sideNames[sides] || formatNumber(sides);
  }

  function extractBarChartData(prompt) {
    const normalized = normalizePrompt(prompt);
    const categories = ['优秀', '良好', '及格', '待提高'];
    const data = categories.map((label) => {
      const match = normalized.match(new RegExp(`${label}(?:[:：])?(-?\\d+(?:\\.\\d+)?)(?:人)?`));
      if (!match) return null;
      const value = Number(match[1]);
      if (!(value >= 0)) return null;
      return { label, value };
    });

    return data.every(Boolean) ? data : DEFAULT_BAR_CHART_DATA;
  }

  function extractGenericBarChartData(prompt) {
    const normalized = normalizePrompt(prompt);
    const matches = [...normalized.matchAll(/([\u4e00-\u9fa5a-zA-Z0-9]+?)(-?\d+(?:\.\d+)?)(?:分|人)?/g)];
    const data = matches
      .map((match) => {
        const label = match[1].replace(/^(画一个|画|柱状图|条形统计图|统计图|数据为|:|：)+/g, '');
        const value = Number(match[2]);
        if (!label || !(value >= 0)) return null;
        return { label, value };
      })
      .filter(Boolean);

    return data.length >= 2 ? data.slice(0, 6) : null;
  }

  function extractCoordinatePoints(prompt) {
    const raw = String(prompt || '').replace(/，/g, ',');
    const matches = [...raw.matchAll(/([A-Z])\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/gi)];
    const seen = new Set();
    return matches
      .map((match) => ({
        label: match[1].toUpperCase(),
        x: Number(match[2]),
        y: Number(match[3]),
      }))
      .filter((point) => {
        if (seen.has(point.label)) return false;
        seen.add(point.label);
        return Number.isFinite(point.x) && Number.isFinite(point.y);
      });
  }

  function extractPieChartData(prompt) {
    const normalized = normalizePrompt(prompt);
    const categories = ['优秀', '良好', '及格', '不及格'];
    const data = categories.map((label) => {
      const match = normalized.match(new RegExp(`${label}(-?\\d+(?:\\.\\d+)?)%`));
      if (!match) return null;
      const value = Number(match[1]);
      if (!(value >= 0)) return null;
      return { label, value };
    });
    if (!data.every(Boolean)) return null;
    const total = data.reduce((sum, item) => sum + item.value, 0);
    return Math.abs(total - 100) < 0.001 ? data : null;
  }

  function extractHistogramData(prompt) {
    const normalized = normalizePrompt(prompt);
    const matches = [...normalized.matchAll(/\[(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\):(-?\d+(?:\.\d+)?)/g)];
    const data = matches.map((match) => {
      const start = Number(match[1]);
      const end = Number(match[2]);
      const count = Number(match[3]);
      if (!(end > start && count >= 0)) return null;
      return { start, end, count };
    });
    return data.length >= 2 && data.every(Boolean) ? data : null;
  }

  function extractParallelogramOptions(prompt) {
    const normalized = normalizePrompt(prompt);
    const sideMatch = normalized.match(/相邻两边(?:分别)?(?:为|是)?(-?\d+(?:\.\d+)?)(?:cm|厘米)?(?:和|,|、)(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    const angleMatch = normalized.match(/夹角(?:为|是)?(-?\d+(?:\.\d+)?)(?:°|度)?/);
    if (!sideMatch || !angleMatch) return null;
    const sideA = Number(sideMatch[1]);
    const sideB = Number(sideMatch[2]);
    const angle = Number(angleMatch[1]);
    if (!(sideA > 0 && sideB > 0 && angle > 0 && angle < 180)) return null;
    return { sideA, sideB, angle };
  }

  function extractRightTrapezoidOptions(prompt) {
    const normalized = normalizePrompt(prompt);
    const topMatch = normalized.match(/上底(?:为|是)?(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    const bottomMatch = normalized.match(/下底(?:为|是)?(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    const heightMatch = normalized.match(/高(?:为|是)?(-?\d+(?:\.\d+)?)(?:cm|厘米)?/);
    if (!topMatch || !bottomMatch || !heightMatch) return null;
    const topBase = Number(topMatch[1]);
    const bottomBase = Number(bottomMatch[1]);
    const height = Number(heightMatch[1]);
    if (!(topBase > 0 && bottomBase > 0 && height > 0)) return null;
    return { topBase, bottomBase, height };
  }

  function extractTriangleSideOptions(prompt) {
    const normalized = normalizePrompt(prompt);
    const abMatch = normalized.match(/ab(?:=|为|是)(-?\d+(?:\.\d+)?)/);
    const bcMatch = normalized.match(/bc(?:=|为|是)(-?\d+(?:\.\d+)?)/);
    const acMatch = normalized.match(/ac(?:=|为|是)(-?\d+(?:\.\d+)?)/);
    if (!abMatch || !bcMatch || !acMatch) return null;
    const ab = Number(abMatch[1]);
    const bc = Number(bcMatch[1]);
    const ac = Number(acMatch[1]);
    if (!(ab > 0 && bc > 0 && ac > 0 && ab + ac > bc && ab + bc > ac && ac + bc > ab)) return null;
    return { ab, bc, ac };
  }

  function mentionsSingleSine(normalized) {
    return /(sin|正弦)/.test(normalized) && !/(cos|余弦)/.test(normalized);
  }

  function mentionsSineAndCosine(normalized) {
    return /(sin|正弦)/.test(normalized) && /(cos|余弦)/.test(normalized);
  }

  function mentionsIsoscelesPointPProblem(normalized) {
    return /ab=ac/.test(normalized)
      && /点p/.test(normalized)
      && /直线bc/.test(normalized)
      && /异侧/.test(normalized)
      && /pbc/.test(normalized)
      && /(zbac|∠bac|角bac|bac)/.test(normalized)
      && /apb/.test(normalized)
      && /pab/.test(normalized)
      && /90/.test(normalized);
  }

  function tryModify(prompt, currentTikzSource) {
    if (!currentTikzSource) return null;
    const normalized = normalizePrompt(prompt);
    const hasRightTriangleSource = isRightTriangleSource(currentTikzSource);

    if (isQuadraticLinearSource(currentTikzSource) && /x(?:²|\^2|平方).*红色/.test(normalized) && /2x\+1.*(?:虚线.*蓝色|蓝色.*虚线)/.test(normalized)) {
      const range = extractAxisRangeFromSource(currentTikzSource);
      return {
        kind: 'modifier',
        tikzSource: quadraticLinearTemplate({
          range,
          quadraticStyle: 'red, very thick',
          linearStyle: 'blue, dashed, very thick',
        }),
        svg: quadraticLinearSvg({
          min: range.min,
          max: range.max,
          quadraticColor: '#dc2626',
          linearColor: '#2563eb',
          linearDashed: true,
        }),
        message: '已将二次函数改为红色，并将一次函数改为蓝色虚线。',
      };
    }

    if (isIsoscelesSidesSource(currentTikzSource) && /(不标|去掉|删除).*边长/.test(normalized) && /角.*度数/.test(normalized)) {
      const options = extractIsoscelesGeometryFromSource(currentTikzSource);
      return {
        kind: 'modifier',
        tikzSource: isoscelesAngleTemplate(options),
        svg: isoscelesAngleSvg(options),
        message: '已去掉边长标注，并改为标出三个角的度数。',
      };
    }

    if (/边形.*改成.*边形/.test(normalized) && /\\draw\[thick\] \(O\) circle \(2\);/.test(currentTikzSource)) {
      const targetPrompt = String(prompt || '').split(/改成|改为|变成/).pop();
      const sides = extractRegularPolygonSides(targetPrompt);
      if (sides) {
        return {
          kind: 'modifier',
          tikzSource: circlePolygonTemplate(sides),
          svg: circlePolygonSvg(sides),
          message: `已将内接多边形改为正${sides}边形，并保留原圆。`,
        };
      }
    }

    if (isSingleSineSource(currentTikzSource) && (/第一象限/.test(normalized) || /0到π\/?2/.test(normalized))) {
      const range = {
        min: 0,
        max: Math.PI / 2,
        minExpr: '0',
        maxExpr: 'pi/2',
        minSvgLabel: '0',
        maxSvgLabel: 'π/2',
      };
      return {
        kind: 'modifier',
        tikzSource: singleFunctionTemplate({
          expression: 'sin(deg(x))',
          label: 'y=\\sin(x)',
          range,
          yMin: 0,
          yMax: 1,
        }),
        svg: singleFunctionSvg({
          label: 'y=sin(x)',
          fn: Math.sin,
          min: range.min,
          max: range.max,
          yMin: 0,
          yMax: 1,
          minSvgLabel: range.minSvgLabel,
          maxSvgLabel: range.maxSvgLabel,
        }),
        message: '已只保留正弦函数第一象限的部分。',
      };
    }

    if (hasRightTriangleSource && /(去掉.*边长|边长.*去掉)(?:.*标注)?/.test(normalized) && /斜边.*高/.test(normalized)) {
      const tikzSource = removeSideLabelsAndAddAltitude(currentTikzSource);
      return {
        kind: 'modifier',
        tikzSource,
        svg: triangleSvg(triangleSvgStateFromSource(tikzSource)),
        message: '已去掉边长标注，并添加斜边上的高。',
      };
    }

    if (hasRightTriangleSource && (/直角标记.*(?:外侧|外面)/.test(normalized) || /直角.*移到.*(?:外侧|外面)/.test(normalized))) {
      const tikzSource = moveRightAngleMarkerOutside(currentTikzSource);
      return {
        kind: 'modifier',
        tikzSource,
        svg: triangleSvg(triangleSvgStateFromSource(tikzSource)),
        message: '已将直角标记移到外侧。',
      };
    }

    if (hasRightTriangleSource && /(加|画|作).*辅助线/.test(normalized)) {
      const tikzSource = addAuxiliaryLine(currentTikzSource);
      return {
        kind: 'modifier',
        tikzSource,
        svg: triangleSvg(triangleSvgStateFromSource(tikzSource)),
        message: '已添加辅助线。',
      };
    }

    if (hasRightTriangleSource && /辅助线.*虚线/.test(normalized)) {
      const tikzSource = dashAuxiliaryLine(currentTikzSource);
      return {
        kind: 'modifier',
        tikzSource,
        svg: triangleSvg(triangleSvgStateFromSource(tikzSource)),
        message: '已将辅助线改为虚线。',
      };
    }

    if (hasRightTriangleSource && /(角a|a角|∠a)/.test(normalized)) {
      const tikzSource = markAngleA(currentTikzSource);
      return {
        kind: 'modifier',
        tikzSource,
        svg: triangleSvg(triangleSvgStateFromSource(tikzSource)),
        message: '已标出角 A 为 90°。',
      };
    }

    if (hasRightTriangleSource && /(角c|c角|∠c)/.test(normalized)) {
      const tikzSource = markAngleC(currentTikzSource);
      return {
        kind: 'modifier',
        tikzSource,
        svg: triangleSvg(triangleSvgStateFromSource(tikzSource)),
        message: '已标出角 C。',
      };
    }

    if (hasRightTriangleSource && /(角b|b角|∠b|这个角|标.*角)/.test(normalized)) {
      const tikzSource = markAngleB(currentTikzSource);
      return {
        kind: 'modifier',
        tikzSource,
        svg: triangleSvg(triangleSvgStateFromSource(tikzSource)),
        message: '已标出角 B。',
      };
    }

    if (/范围/.test(normalized)) {
      const range = extractRange(prompt);
      if (range) {
        const options = { ...range, yMin: range.min, yMax: range.max };
        return {
          kind: 'modifier',
          tikzSource: changeAxisRange(currentTikzSource, range.minExpr, range.maxExpr),
          svg: sineCosineSvg(options),
          message: `已将坐标系范围改为 ${range.min} 到 ${range.max}。`,
        };
      }
    }

    return null;
  }

  function tryTemplate(prompt) {
    const normalized = normalizePrompt(prompt);

    if (/两个相交的圆/.test(normalized) || (/相交/.test(normalized) && /圆心距/.test(normalized))) {
      return {
        kind: 'template',
        tikzSource: intersectingCirclesTemplate(),
        svg: intersectingCirclesSvg(),
        message: '已生成两个相交圆，并标注圆心与两个交点。',
      };
    }

    if (/log₂|log2|log_2|对数/.test(normalized)) {
      return {
        kind: 'template',
        tikzSource: logBaseTwoTemplate(),
        svg: logBaseTwoSvg(),
        message: '已生成 y=log₂(x) 图像并标注关键点。',
      };
    }

    if (/(x³|x\^3)/.test(normalized) && /3x/.test(normalized)) {
      return {
        kind: 'template',
        tikzSource: cubicTemplate(),
        svg: cubicSvg(),
        message: '已生成三次函数图像，并标注极值点和零点。',
      };
    }

    if (/分段函数/.test(normalized) && /(x²|x\^2|x(?:的)?平方)/.test(normalized) && /2x/.test(normalized)) {
      return {
        kind: 'template',
        tikzSource: piecewiseTemplate(),
        svg: piecewiseSvg(),
        message: '已生成分段函数图像，并用不同颜色标注两段。',
      };
    }

    if (/(抛物线|x²|x\^2|x(?:的)?平方)/.test(normalized) && /(x²\+y²=4|x\^2\+y\^2=4|圆)/.test(normalized) && /交点/.test(normalized)) {
      return {
        kind: 'template',
        tikzSource: parabolaCircleTemplate(),
        svg: parabolaCircleSvg(),
        message: '已生成抛物线与圆的交点区域图。',
      };
    }

    if (/中垂线/.test(normalized) && /外心/.test(normalized)) {
      return {
        kind: 'template',
        tikzSource: circumcenterTriangleTemplate(),
        svg: circumcenterTriangleSvg(),
        message: '已生成三角形三边中垂线并标出外心。',
      };
    }

    if (/关于直线y=x/.test(normalized) && /对称/.test(normalized)) {
      return {
        kind: 'template',
        tikzSource: reflectionTemplate(),
        svg: reflectionSvg(),
        message: "已生成点 A 关于直线 y=x 的对称点 A'。",
      };
    }

    if (/平行四边形/.test(normalized)) {
      const options = extractParallelogramOptions(prompt);
      if (options) {
        return {
          kind: 'template',
          tikzSource: parallelogramTemplate(options),
          svg: parallelogramSvg(options),
          message: `已生成相邻边 ${formatNumber(options.sideA)}cm、${formatNumber(options.sideB)}cm，夹角 ${formatNumber(options.angle)}° 的平行四边形。`,
        };
      }
    }

    if (/直角梯形/.test(normalized)) {
      const options = extractRightTrapezoidOptions(prompt);
      if (options) {
        return {
          kind: 'template',
          tikzSource: rightTrapezoidTemplate(options),
          svg: rightTrapezoidSvg(options),
          message: `已生成上底 ${formatNumber(options.topBase)}cm、下底 ${formatNumber(options.bottomBase)}cm、高 ${formatNumber(options.height)}cm 的直角梯形。`,
        };
      }
    }

    if (/三角形abc/.test(normalized) && /中点d/.test(normalized) && /中线/.test(normalized)) {
      return {
        kind: 'template',
        tikzSource: medianTriangleTemplate(),
        svg: medianTriangleSvg(),
        message: '已生成三角形 ABC，并在 AB 中点 D 连接中线 CD。',
      };
    }

    if (/三角形/.test(normalized) && /ab/.test(normalized) && /bc/.test(normalized) && /ac/.test(normalized) && /边长|各边/.test(normalized)) {
      const options = extractTriangleSideOptions(prompt);
      if (options) {
        return {
          kind: 'template',
          tikzSource: triangleFromSidesTemplate(options),
          svg: triangleFromSidesSvg(options),
          message: `已生成 AB=${formatNumber(options.ab)}、BC=${formatNumber(options.bc)}、AC=${formatNumber(options.ac)} 的三角形。`,
        };
      }
    }

    if (/正/.test(normalized) && /边形/.test(normalized) && !/圆/.test(normalized)) {
      const sides = extractRegularPolygonSides(prompt);
      const side = extractSideLength(prompt) || 3;
      if (sides) {
        return {
          kind: 'template',
          tikzSource: regularPolygonTemplate({ sides, side }),
          svg: regularPolygonSvg({ sides, side }),
          message: `已生成边长 ${formatNumber(side)}cm 的正${regularPolygonSideName(sides)}边形。`,
        };
      }
    }

    if (/坐标系/.test(normalized) && /圆/.test(normalized) && /原点/.test(normalized) && /坐标轴/.test(normalized)) {
      const radius = extractRadius(prompt) || 5;
      return {
        kind: 'template',
        tikzSource: coordinateCircleTemplate(radius),
        svg: coordinateCircleSvg(radius),
        message: `已生成以原点为圆心、半径为 ${formatNumber(radius)} 的坐标圆，并标出四个坐标轴交点。`,
      };
    }

    if (/坐标系/.test(normalized) && /三角形/.test(normalized)) {
      const points = extractCoordinatePoints(prompt);
      const labels = points.map((point) => point.label).join('');
      if (points.length >= 3 && /A/.test(labels) && /B/.test(labels) && /C/.test(labels)) {
        const trianglePoints = ['A', 'B', 'C'].map((label) => points.find((point) => point.label === label));
        return {
          kind: 'template',
          tikzSource: coordinateTriangleTemplate(trianglePoints),
          svg: coordinateTriangleSvg(trianglePoints),
          message: '已在坐标系中生成三点连成的三角形。',
        };
      }
    }

    if (/中点/.test(normalized) && /连接ab|线段ab|ab/.test(normalized)) {
      const points = extractCoordinatePoints(prompt);
      const a = points.find((point) => point.label === 'A');
      const b = points.find((point) => point.label === 'B');
      if (a && b) {
        return {
          kind: 'template',
          tikzSource: coordinateSegmentMidpointTemplate([a, b]),
          svg: coordinateSegmentMidpointSvg([a, b]),
          message: '已生成线段 AB 并标出中点坐标。',
        };
      }
    }

    if (/直角三角形/.test(normalized) && /内切圆/.test(normalized)) {
      const legs = extractRightTriangleLegs(prompt) || { vertical: 3, horizontal: 4 };
      return {
        kind: 'template',
        tikzSource: rightTriangleIncircleTemplate(legs),
        svg: rightTriangleIncircleSvg(legs),
        message: `已生成 ${formatNumber(legs.vertical)}-${formatNumber(legs.horizontal)}-${hypotenuseLabel(legs.vertical, legs.horizontal)} 直角三角形的内切圆。`,
      };
    }

    const diameterCircleOptions = extractRightTriangleDiameterCircleOptions(prompt);
    if (diameterCircleOptions) {
      return {
        kind: 'template',
        tikzSource: rightTriangleDiameterCircleTemplate(diameterCircleOptions),
        svg: rightTriangleDiameterCircleSvg(diameterCircleOptions),
        message: '已生成直角三角形、以 AC 为直径的圆，并标出圆与斜边 AB 的交点 D。',
      };
    }

    if (/直角三角形/.test(normalized)) {
      const extractedLegs = extractRightTriangleLegs(prompt);
      if (!(/直角边/.test(normalized) || extractedLegs)) return null;
      const legs = extractedLegs || { vertical: 3, horizontal: 4 };
      return {
        kind: 'template',
        tikzSource: triangleTemplate(legs),
        svg: triangleSvg(legs),
        message: `已生成 ${formatNumber(legs.vertical)}-${formatNumber(legs.horizontal)}-${hypotenuseLabel(legs.vertical, legs.horizontal)} 直角三角形。`,
      };
    }

    if (/等边三角形/.test(normalized)) {
      const side = extractSideLength(prompt) || 5;
      return {
        kind: 'template',
        tikzSource: equilateralTriangleTemplate(side),
        svg: equilateralTriangleSvg(side),
        message: `已生成边长 ${formatNumber(side)}cm 的等边三角形。`,
      };
    }

    if (/正方形/.test(normalized)) {
      const side = extractSideLength(prompt) || 4;
      return {
        kind: 'template',
        tikzSource: squareTemplate(side),
        svg: squareSvg(side),
        message: `已生成边长 ${formatNumber(side)}cm 的正方形。`,
      };
    }

    if (/圆/.test(normalized)
      && /半径/.test(normalized)
      && !/(两个|相交|圆心距|交点|坐标系|坐标轴|原点|x²|x\^2|y²|y\^2)/.test(normalized)
      && !/内接/.test(normalized)
      && !/内切圆/.test(normalized)) {
      const radius = extractRadius(prompt) || 3;
      return {
        kind: 'template',
        tikzSource: circleRadiusTemplate(radius),
        svg: circleRadiusSvg(radius),
        message: `已生成半径 ${formatNumber(radius)}cm 并标注圆心的圆。`,
      };
    }

    if (/参数方程|椭圆/.test(normalized) && /cos/.test(normalized) && /sin/.test(normalized)) {
      return {
        kind: 'template',
        tikzSource: parametricEllipseTemplate(),
        svg: parametricEllipseSvg(),
        message: '已生成参数方程椭圆图像。',
      };
    }

    if (mentionsSineAndCosine(normalized)) {
      const range = extractRange(prompt);
      const options = range && !range.symbolic ? { ...range, yMin: range.min, yMax: range.max } : (range || {});
      return {
        kind: 'template',
        tikzSource: sineCosineTemplate(options),
        svg: sineCosineSvg(options),
        message: '已生成正弦和余弦函数图像。',
      };
    }

    if (mentionsSingleSine(normalized)) {
      const range = extractRange(prompt) || {
        min: -2 * Math.PI,
        max: 2 * Math.PI,
        minExpr: '-2*pi',
        maxExpr: '2*pi',
        minSvgLabel: '-2π',
        maxSvgLabel: '2π',
      };
      return {
        kind: 'template',
        tikzSource: singleFunctionTemplate({
          expression: 'sin(deg(x))',
          label: 'y=\\sin(x)',
          range,
          yMin: -1.5,
          yMax: 1.5,
        }),
        svg: singleFunctionSvg({
          label: 'y=sin(x)',
          fn: Math.sin,
          min: range.min,
          max: range.max,
          yMin: -1.5,
          yMax: 1.5,
          minSvgLabel: range.minSvgLabel,
          maxSvgLabel: range.maxSvgLabel,
        }),
        message: '已生成正弦函数图像。',
      };
    }

    if (/(x²|x\^2|x\*x|x(?:的)?平方)/.test(normalized)
      && /(2x\+1|2\*x\+1)/.test(normalized)
      && !/(交点区域|阴影|围成.*区域|交点|区域)/.test(normalized)) {
      const range = extractRange(prompt) || { min: -3, max: 3, minExpr: '-3', maxExpr: '3' };
      return {
        kind: 'template',
        tikzSource: quadraticLinearTemplate({ range }),
        svg: quadraticLinearSvg({
          min: range.min,
          max: range.max,
        }),
        message: '已在同一坐标系中生成二次函数和一次函数图像。',
      };
    }

    if (/(y=)?2x\+1|2\*x\+1/.test(normalized) && !/(x²|x\^2|x\*x|x(?:的)?平方)/.test(normalized)) {
      const range = extractRange(prompt) || { min: -5, max: 5, minExpr: '-5', maxExpr: '5' };
      return {
        kind: 'template',
        tikzSource: singleFunctionTemplate({
          expression: '2*x+1',
          label: 'y=2x+1',
          range,
          yMin: range.min,
          yMax: range.max,
        }),
        svg: singleFunctionSvg({
          label: 'y=2x+1',
          fn: (x) => 2 * x + 1,
          min: range.min,
          max: range.max,
          yMin: range.min,
          yMax: range.max,
          minSvgLabel: range.minSvgLabel,
          maxSvgLabel: range.maxSvgLabel,
        }),
        message: '已生成一次函数图像。',
      };
    }

    if (/(y=)?(x²|x\^2|x\*x|x(?:的)?平方)/.test(normalized)
      && !/(2x\+1|2\*x\+1)/.test(normalized)
      && !/(分段|圆|交点区域|交点|区域)/.test(normalized)) {
      const range = extractRange(prompt) || { min: -3, max: 3, minExpr: '-3', maxExpr: '3' };
      const yMax = Math.max(Math.abs(range.min), Math.abs(range.max)) ** 2;
      return {
        kind: 'template',
        tikzSource: singleFunctionTemplate({
          expression: 'x^2',
          label: 'y=x^2',
          range,
          yMin: 0,
          yMax,
        }),
        svg: singleFunctionSvg({
          label: 'y=x²',
          fn: (x) => x * x,
          min: range.min,
          max: range.max,
          yMin: 0,
          yMax,
          minSvgLabel: range.minSvgLabel,
          maxSvgLabel: range.maxSvgLabel,
        }),
        message: '已生成二次函数图像。',
      };
    }

    if (/圆/.test(normalized) && /边形/.test(normalized)) {
      const sides = extractRegularPolygonSides(prompt);
      if (!sides) return null;
      return {
        kind: 'template',
        tikzSource: circlePolygonTemplate(sides),
        svg: circlePolygonSvg(sides),
        message: `已生成圆内接正${sides}边形。`,
      };
    }

    if (/等腰三角形/.test(normalized) && !/底角/.test(normalized) && /(底边|底\d|底长|底)/.test(normalized) && /腰/.test(normalized)) {
      const options = extractIsoscelesSides(prompt);
      if (!options) return null;
      return {
        kind: 'template',
        tikzSource: isoscelesSidesTemplate(options),
        svg: isoscelesSidesSvg(options),
        message: `已生成底边 ${formatNumber(options.base)}cm、腰长 ${formatNumber(options.waist)}cm 的等腰三角形。`,
      };
    }

    if (/等腰三角形/.test(normalized) && /底角/.test(normalized) && /腰长/.test(normalized)) {
      const options = extractIsoscelesBaseAngle(prompt);
      if (!options) return null;
      return {
        kind: 'template',
        tikzSource: isoscelesBaseAngleTemplate(options),
        svg: isoscelesBaseAngleSvg(options),
        message: `已生成底角 ${formatNumber(options.baseAngle)}°、腰长 ${formatNumber(options.waist)}cm 的等腰三角形。`,
      };
    }

    if (/等腰三角形/.test(normalized) && /内切圆/.test(normalized) && /半径/.test(normalized)) {
      const radius = extractRadius(prompt) || 3;
      return {
        kind: 'template',
        tikzSource: incircleIsoscelesTemplate(radius),
        svg: incircleIsoscelesSvg(radius),
        message: `已生成内切圆半径为 ${formatNumber(radius)} 的等腰三角形。`,
      };
    }

    if (mentionsIsoscelesPointPProblem(normalized)) {
      return {
        kind: 'template',
        tikzSource: isoscelesPointPProblemTemplate(),
        svg: isoscelesPointPProblemSvg(),
        message: '已生成等腰三角形 ABC 与异侧点 P 的题图。',
      };
    }

    if (/(x²|x\^2|x\*x|x(?:的)?平方)/.test(normalized) && /(2x\+1|2\*x\+1)/.test(normalized) && /(交点区域|阴影|围成.*区域)/.test(normalized)) {
      return {
        kind: 'template',
        tikzSource: intersectionRegionTemplate(),
        svg: intersectionRegionSvg(),
        message: '已生成函数交点区域并用阴影标出。',
      };
    }

    if (/长方体/.test(normalized) && /(截面|斜截面|平面截)/.test(normalized)) {
      return {
        kind: 'template',
        tikzSource: cuboidSectionTemplate(),
        svg: cuboidSectionSvg(),
        message: '已生成长方体斜截面图。',
      };
    }

    if (/饼图/.test(normalized)) {
      const data = extractPieChartData(prompt);
      if (data) {
        return {
          kind: 'template',
          tikzSource: pieChartTemplate(data),
          svg: pieChartSvg(data),
          message: '已生成百分比饼图。',
        };
      }
    }

    if (/直方图|频率分布/.test(normalized)) {
      const data = extractHistogramData(prompt);
      if (data) {
        return {
          kind: 'template',
          tikzSource: histogramTemplate(data),
          svg: histogramSvg(data),
          message: '已生成频率分布直方图。',
        };
      }
    }

    if (/(条形统计图|柱状图|统计图)/.test(normalized) && /优秀/.test(normalized) && /良好/.test(normalized) && /及格/.test(normalized)) {
      const data = extractBarChartData(prompt);
      return {
        kind: 'template',
        tikzSource: barChartTemplate(data),
        svg: barChartSvg(data),
        message: '已生成班级成绩条形统计图。',
      };
    }

    if (/(条形统计图|柱状图|统计图)/.test(normalized)) {
      const data = extractGenericBarChartData(prompt);
      if (data) {
        return {
          kind: 'template',
          tikzSource: barChartTemplate(data),
          svg: barChartSvg(data),
          message: '已生成柱状图。',
        };
      }
    }

    return null;
  }

  function generateGraph({ prompt, currentTikzSource = '' }) {
    const modifier = tryModify(prompt, currentTikzSource);
    if (modifier) return modifier;

    const template = tryTemplate(prompt);
    if (template) return template;

    return {
      kind: 'unmatched',
      tikzSource: '',
      message: '这个图形暂时超出内置模板范围，需要配置服务端模型后生成。',
    };
  }

  function extractTikz(text) {
    const raw = String(text || '');
    const fenced = [...raw.matchAll(/```(?:latex|tex|tikz)?\s*([\s\S]*?)```/g)];
    if (fenced.length > 0) return fenced[fenced.length - 1][1].trim();

    const document = raw.match(/(\\documentclass[\s\S]*?\\end\{document\})/);
    if (document) return document[1].trim();

    return raw.trim();
  }

  return {
    generateGraph,
    extractTikz,
  };
}));
