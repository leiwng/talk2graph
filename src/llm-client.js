const { extractTikz } = require('./graph-engine');

const SYSTEM_PROMPT = `你是数学图形生成器。用户描述一个数学图形，你只输出完整 TikZ/PGFPlots LaTeX 文档。

要求：
1. 必须包含 \\documentclass[tikz,border=10pt]{standalone} 到 \\end{document} 的完整文档。
2. 中文标注直接写在 TikZ 节点中。
3. 几何长度、角度、坐标轴刻度必须按用户要求精确设定。
4. 函数图像使用 pgfplots 的 \\addplot。
5. 修改已有图形时，只改用户要求的部分，其余代码保持原样。`;

function hasLlmConfig(env = process.env) {
  return Boolean(env.OPENAI_API_KEY && env.OPENAI_BASE_URL && env.OPENAI_MODEL);
}

function buildMessages({ prompt, currentTikzSource = '' }) {
  if (currentTikzSource) {
    return [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `上一版 TikZ 源码如下：\n\n${currentTikzSource}\n\n修改要求：${prompt}`,
      },
    ];
  }

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];
}

async function callLlm({ prompt, currentTikzSource = '', env = process.env, fetchImpl = fetch }) {
  if (!hasLlmConfig(env)) {
    const error = new Error('需要配置服务端模型后才能生成这个图形。');
    error.code = 'LLM_NOT_CONFIGURED';
    throw error;
  }

  const baseUrl = env.OPENAI_BASE_URL.replace(/\/+$/, '');
  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      messages: buildMessages({ prompt, currentTikzSource }),
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.error?.message || `模型服务返回 HTTP ${response.status}`;
    const error = new Error(message);
    error.code = 'LLM_REQUEST_FAILED';
    throw error;
  }

  const payload = await response.json();
  const text = payload.choices?.[0]?.message?.content || '';
  const tikzSource = extractTikz(text);

  if (!tikzSource.includes('\\end{document}')) {
    const error = new Error('模型没有返回完整 TikZ 文档。');
    error.code = 'LLM_BAD_OUTPUT';
    throw error;
  }

  return {
    kind: 'llm',
    tikzSource,
    message: '已由服务端模型生成图形。',
  };
}

module.exports = {
  SYSTEM_PROMPT,
  buildMessages,
  callLlm,
  hasLlmConfig,
};
