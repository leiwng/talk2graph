const tex2svg = require('node-tikzjax').default;

function sourceForNodeTikzjax(tikzSource) {
  const source = String(tikzSource || '');
  const body = source.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (!body) return source;
  return `\\begin{document}\n${body[1].trim()}\n\\end{document}`;
}

async function renderTikzToSvg(tikzSource) {
  return tex2svg(sourceForNodeTikzjax(tikzSource), {
    texPackages: {
      pgfplots: '',
      amsmath: '',
    },
    disableOptimize: true,
  });
}

module.exports = {
  renderTikzToSvg,
  sourceForNodeTikzjax,
};
