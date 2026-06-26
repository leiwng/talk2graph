#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const { generateGraph } = require('../src/graph-engine');

const repoRoot = path.resolve(__dirname, '..');
const datasetPath = path.join(repoRoot, 'docs', '测试数据集.md');

function splitMarkdownRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

function parseDataset(markdown) {
  const singleTurnCases = [];
  const multiTurnCases = [];
  let inMultiTurnSection = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^##\s+五、/.test(line)) {
      inMultiTurnSection = true;
      continue;
    }

    const row = splitMarkdownRow(line);
    if (!row || row.length !== 4) continue;
    if (!/^\d+$/.test(row[0])) continue;

    const id = Number(row[0]);
    if (inMultiTurnSection) {
      multiTurnCases.push({
        id,
        firstPrompt: row[1],
        secondPrompt: row[2],
        checkPoints: row[3],
      });
    } else {
      singleTurnCases.push({
        id,
        prompt: row[1],
        type: row[2],
        checkPoints: row[3],
      });
    }
  }

  return { singleTurnCases, multiTurnCases };
}

function statusFromKind(kind) {
  return kind === 'template' ? 'matched' : 'unmatched';
}

function semanticMismatch(testCase, result) {
  const type = testCase.type || '';
  const combinedOutput = [
    result.message,
    result.tikzSource,
    result.svg,
  ].join('\n');

  if (/内切圆/.test(type) && !/(内切圆|相切|圆心|circle)/.test(combinedOutput)) {
    return 'matched a plain shape, but the requested incircle is absent';
  }

  if (/参数方程/.test(type) && !/(椭圆|ellipse|参数)/.test(combinedOutput)) {
    return 'matched a trigonometric plot, but the requested parametric ellipse is absent';
  }

  return '';
}

function evaluateSingleTurn(testCase) {
  const result = generateGraph({ prompt: testCase.prompt });
  const mismatch = result.kind === 'template' ? semanticMismatch(testCase, result) : '';
  return {
    id: testCase.id,
    prompt: testCase.prompt,
    type: testCase.type,
    status: mismatch ? 'mismatch' : statusFromKind(result.kind),
    kind: result.kind,
    message: mismatch || result.message,
  };
}

function evaluateMultiTurn(testCase) {
  const first = generateGraph({ prompt: testCase.firstPrompt });
  if (first.kind !== 'template') {
    return {
      id: testCase.id,
      firstPrompt: testCase.firstPrompt,
      secondPrompt: testCase.secondPrompt,
      status: 'first-unmatched',
      firstKind: first.kind,
      secondKind: 'not-run',
      message: first.message,
    };
  }

  const second = generateGraph({
    prompt: testCase.secondPrompt,
    currentTikzSource: first.tikzSource,
  });

  return {
    id: testCase.id,
    firstPrompt: testCase.firstPrompt,
    secondPrompt: testCase.secondPrompt,
    status: second.kind === 'template' || second.kind === 'modifier' ? 'both-matched' : 'second-unmatched',
    firstKind: first.kind,
    secondKind: second.kind,
    message: second.message,
  };
}

function printSection(title, rows) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
  for (const row of rows) {
    const label = String(row.id).padStart(2, '0');
    const prompt = row.prompt || `${row.firstPrompt} -> ${row.secondPrompt}`;
    console.log(`#${label} ${row.status.padEnd(16)} ${prompt}`);
    console.log(`    ${row.message}`);
  }
}

function printSummary(singleResults, multiResults) {
  const singleMatched = singleResults.filter((row) => row.status === 'matched').length;
  const multiMatched = multiResults.filter((row) => row.status === 'both-matched').length;
  const mismatched = singleResults.filter((row) => row.status === 'mismatch').length;
  const allMatched = singleMatched + multiMatched;
  const allCases = singleResults.length + multiResults.length;

  console.log('\nSummary');
  console.log('-------');
  console.log(`Single-turn template coverage: ${singleMatched}/${singleResults.length}`);
  console.log(`Multi-turn full coverage:      ${multiMatched}/${multiResults.length}`);
  console.log(`Semantic mismatches:           ${mismatched}`);
  console.log(`Overall exact coverage:        ${allMatched}/${allCases}`);

  const unsupported = [
    ...singleResults.filter((row) => row.status !== 'matched').map((row) => `#${row.id}`),
    ...multiResults.filter((row) => row.status !== 'both-matched').map((row) => `#${row.id}`),
  ];

  if (unsupported.length > 0) {
    console.log(`Unsupported or partial cases:  ${unsupported.join(', ')}`);
  }
}

function main() {
  const markdown = fs.readFileSync(datasetPath, 'utf8');
  const { singleTurnCases, multiTurnCases } = parseDataset(markdown);
  const singleResults = singleTurnCases.map(evaluateSingleTurn);
  const multiResults = multiTurnCases.map(evaluateMultiTurn);

  console.log(`Dataset: ${path.relative(repoRoot, datasetPath)}`);
  console.log(`Cases: ${singleTurnCases.length} single-turn, ${multiTurnCases.length} multi-turn`);
  printSection('Single-turn cases', singleResults);
  printSection('Multi-turn cases', multiResults);
  printSummary(singleResults, multiResults);
}

main();
