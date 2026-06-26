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

test('generates a precise right triangle from arbitrary leg lengths', () => {
  const result = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 5 和 12，标出边长',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(12,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(0,5\);/);
  assert.match(result.tikzSource, /\{12\}/);
  assert.match(result.tikzSource, /\{5\}/);
  assert.match(result.tikzSource, /\{13\}/);
  assert.match(result.svg, />12</);
  assert.match(result.svg, />5</);
  assert.match(result.svg, />13</);
});

test('accepts Chinese punctuation between right triangle leg lengths', () => {
  const result = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别为 6、8，标出边长',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(8,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(0,6\);/);
  assert.match(result.tikzSource, /\{10\}/);
  assert.match(result.svg, />8</);
  assert.match(result.svg, />6</);
  assert.match(result.svg, />10</);
});

test('accepts right triangle leg lengths when teacher omits fenbie', () => {
  const result = generateGraph({
    prompt: '画一个直角三角形，两条直角边为 7 和 24，标出边长',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(24,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(0,7\);/);
  assert.match(result.tikzSource, /\{25\}/);
  assert.match(result.svg, />24</);
  assert.match(result.svg, />7</);
  assert.match(result.svg, />25</);
});

test('accepts right triangle leg lengths when teacher says leg length', () => {
  const result = generateGraph({
    prompt: '画一个直角三角形，两条直角边长分别是 8 和 15，标出边长',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(15,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(0,8\);/);
  assert.match(result.tikzSource, /\{17\}/);
  assert.match(result.svg, />15</);
  assert.match(result.svg, />8</);
  assert.match(result.svg, />17</);
});

test('accepts right triangle side notation with a right angle marker', () => {
  const result = generateGraph({
    prompt: '画直角三角形ABC，AB=6，AC=8，∠A=90°，标出边长',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(6,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(0,8\);/);
  assert.match(result.tikzSource, /\{6\}/);
  assert.match(result.tikzSource, /\{8\}/);
  assert.match(result.tikzSource, /\{10\}/);
  assert.match(result.svg, />6</);
  assert.match(result.svg, />8</);
  assert.match(result.svg, />10</);
});

test('accepts right triangle side notation written with chang and degrees', () => {
  const result = generateGraph({
    prompt: '画直角三角形ABC，AB长6厘米，AC长8厘米，角A是90度，标出边长',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(6,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(0,8\);/);
  assert.match(result.tikzSource, /\{10\}/);
  assert.match(result.svg, />6</);
  assert.match(result.svg, />8</);
  assert.match(result.svg, />10</);
});

test('generates a right triangle with a diameter circle intersecting the hypotenuse', () => {
  const result = generateGraph({
    prompt: '画直角三角形 ABC，C 为直角顶点，AC=3，BC=4；以 AC 为直径画圆，圆与斜边 AB 相交于点 D',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(0,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(0,3\);/);
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(4,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(O\) at \(0,1\.5\);/);
  assert.match(result.tikzSource, /\\coordinate \(D\) at \(1\.44,1\.92\);/);
  assert.match(result.tikzSource, /\(O\) circle \(1\.5\)/);
  assert.match(result.tikzSource, /\\draw\[very thick\] \(A\) -- \(B\) -- \(C\) -- cycle;/);
  assert.match(result.tikzSource, /\$D\$/);
  assert.match(result.svg, />D</);
  assert.match(result.svg, />以 AC 为直径的圆</);
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
  assert.match(result.svg, />-2π</);
  assert.match(result.svg, />-π</);
  assert.match(result.svg, />0</);
  assert.match(result.svg, />π</);
  assert.match(result.svg, />2π</);
  assert.match(result.svg, />1</);
  assert.match(result.svg, />-1</);
});

test('generates sin and cos plots with the requested initial coordinate range', () => {
  const result = generateGraph({
    prompt: '画 y = sin(x) 和 y = cos(x) 在 -5 到 5 的图像，用不同颜色区分',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /xmin=-5/);
  assert.match(result.tikzSource, /xmax=5/);
  assert.match(result.tikzSource, /ymin=-5/);
  assert.match(result.tikzSource, /ymax=5/);
  assert.match(result.tikzSource, /domain=-5:5/);
  assert.match(result.svg, />-5</);
  assert.match(result.svg, />0</);
  assert.match(result.svg, />5</);
});

test('generates sin and cos plots when range uses a full-width minus sign', () => {
  const result = generateGraph({
    prompt: '画 y = sin(x) 和 y = cos(x) 在 －5 到 5 的图像，用不同颜色区分',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /xmin=-5/);
  assert.match(result.tikzSource, /xmax=5/);
  assert.match(result.tikzSource, /domain=-5:5/);
  assert.match(result.svg, />-5</);
  assert.match(result.svg, />5</);
});

test('generates sin and cos plots when range is written as an interval', () => {
  const result = generateGraph({
    prompt: '画 y = sin(x) 和 y = cos(x) 在 [-5, 5] 的图像，用不同颜色区分',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /xmin=-5/);
  assert.match(result.tikzSource, /xmax=5/);
  assert.match(result.tikzSource, /domain=-5:5/);
  assert.match(result.svg, />-5</);
  assert.match(result.svg, />5</);
});

test('generates sin and cos plots with a custom pi range', () => {
  const result = generateGraph({
    prompt: '画 y = sin(x) 和 y = cos(x) 在 -π 到 π 的图像，用不同颜色区分',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /xmin=-pi/);
  assert.match(result.tikzSource, /xmax=pi/);
  assert.match(result.tikzSource, /ymin=-1\.5/);
  assert.match(result.tikzSource, /ymax=1\.5/);
  assert.match(result.tikzSource, /domain=-pi:pi/);
  assert.match(result.tikzSource, /xticklabels=\{\$-\\pi\$,0,\$\\pi\$\}/);
  assert.match(result.svg, />-π</);
  assert.match(result.svg, />0</);
  assert.match(result.svg, />π</);
});

test('generates sine and cosine plots from Chinese function names', () => {
  const result = generateGraph({
    prompt: '画正弦函数和余弦函数在 -5 到 5 的图像，用不同颜色区分',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /xmin=-5/);
  assert.match(result.tikzSource, /xmax=5/);
  assert.match(result.tikzSource, /\{sin\(deg\(x\)\)\}/);
  assert.match(result.tikzSource, /\{cos\(deg\(x\)\)\}/);
  assert.match(result.svg, />-5</);
  assert.match(result.svg, />5</);
});

test('generates a single linear function plot', () => {
  const result = generateGraph({
    prompt: '画 y = 2x + 1 的图像，在 -5 到 5 范围内',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /xmin=-5/);
  assert.match(result.tikzSource, /xmax=5/);
  assert.match(result.tikzSource, /\{2\*x\+1\}/);
  assert.match(result.svg, />y=2x\+1</);
});

test('generates a single quadratic function plot', () => {
  const result = generateGraph({
    prompt: '画 y = x² 的图像，在 -3 到 3 范围内',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /xmin=-3/);
  assert.match(result.tikzSource, /xmax=3/);
  assert.match(result.tikzSource, /\{x\^2\}/);
  assert.match(result.svg, />y=x²</);
});

test('generates a piecewise quadratic-linear function with separate colors', () => {
  const result = generateGraph({
    prompt: '画分段函数：x<0 时 y=x²，x≥0 时 y=2x，用不同颜色标注两段',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /domain=-4:0/);
  assert.match(result.tikzSource, /\{x\^2\}/);
  assert.match(result.tikzSource, /domain=0:4/);
  assert.match(result.tikzSource, /\{2\*x\}/);
  assert.match(result.svg, /x&lt;0/);
  assert.match(result.svg, /x≥0/);
});

test('generates a parabola and circle intersection diagram instead of a single quadratic plot', () => {
  const result = generateGraph({
    prompt: '画抛物线 y=x² 和圆 x²+y²=4，标出交点区域',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\{x\^2\}/);
  assert.match(result.tikzSource, /\(0,0\) circle \(2\)/);
  assert.match(result.tikzSource, /交点区域/);
  assert.match(result.svg, /抛物线/);
  assert.match(result.svg, /圆/);
  assert.match(result.svg, /交点区域/);
});

test('generates a single sine function plot without requiring cosine', () => {
  const result = generateGraph({
    prompt: '画 y = sin(x) 的图像，在 -2π 到 2π 范围内',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\{sin\(deg\(x\)\)\}/);
  assert.doesNotMatch(result.tikzSource, /\{cos\(deg\(x\)\)\}/);
  assert.match(result.svg, />y=sin\(x\)</);
});

test('generates a log base 2 plot with key points', () => {
  const result = generateGraph({
    prompt: '画 y = log₂(x) 的图像，1/4 到 8 范围，标注关键点 (1,0) (2,1) (4,2)',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /ln\(x\)\/ln\(2\)/);
  assert.match(result.tikzSource, /\(axis cs:1,0\)/);
  assert.match(result.tikzSource, /\(axis cs:2,1\)/);
  assert.match(result.tikzSource, /\(axis cs:4,2\)/);
  assert.match(result.svg, /y=log₂\(x\)/);
  assert.match(result.svg, /\(4,2\)/);
});

test('generates a cubic function plot with extrema and zeros', () => {
  const result = generateGraph({
    prompt: '画 y = x³ - 3x，-3 到 3，标注极值点和零点',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\{x\^3-3\*x\}/);
  assert.match(result.tikzSource, /极大/);
  assert.match(result.tikzSource, /极小/);
  assert.match(result.tikzSource, /零点/);
  assert.match(result.svg, /极大点/);
  assert.match(result.svg, /极小点/);
  assert.match(result.svg, /零点/);
});

test('generates a parametric ellipse instead of treating it as a sine-cosine plot', () => {
  const result = generateGraph({
    prompt: '画参数方程绘制的椭圆：x=3cos(t), y=2sin(t)，t 从 0 到 2π',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /椭圆/);
  assert.match(result.tikzSource, /\(3\*cos\(t\),2\*sin\(t\)\)/);
  assert.doesNotMatch(result.tikzSource, /\\addlegendentry\{\$y=\\sin\(x\)\$\}/);
  assert.match(result.svg, />椭圆/);
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

test('generates a circle with an arbitrary inscribed regular polygon', () => {
  const result = generateGraph({
    prompt: '画一个圆，内接一个正五边形，标注圆心',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\foreach \\i in \{0,72,144,216,288\}/);
  assert.match(result.tikzSource, /\(P0\) -- \(P72\) -- \(P144\) -- \(P216\) -- \(P288\) -- cycle/);
  assert.match(result.tikzSource, /圆心/);
  assert.match(result.svg, /圆心 O/);
});

test('generates an inscribed regular polygon when teacher omits zheng', () => {
  const result = generateGraph({
    prompt: '画一个圆，内接一个六边形，标注圆心',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\foreach \\i in \{0,60,120,180,240,300\}/);
  assert.match(result.tikzSource, /\(P0\) -- \(P60\) -- \(P120\) -- \(P180\) -- \(P240\) -- \(P300\) -- cycle/);
  assert.match(result.tikzSource, /圆心/);
  assert.match(result.svg, /圆心 O/);
});

test('generates a circle with an inscribed regular hendecagon from Chinese side count', () => {
  const result = generateGraph({
    prompt: '画一个圆，内接一个正十一边形，标注圆心',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\foreach \\i in \{0,32\.727,65\.455/);
  assert.match(result.tikzSource, /\(P0\) -- \(P32\.727\) -- \(P65\.455\)/);
  assert.match(result.tikzSource, /圆心/);
  assert.match(result.svg, /圆心 O/);
});

test('generates an equilateral triangle with requested side length', () => {
  const result = generateGraph({
    prompt: '画一个等边三角形，边长 5cm',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /等边三角形/);
  assert.match(result.tikzSource, /边长 5cm/);
  assert.match(result.tikzSource, /60\^\\circ/);
  assert.match(result.svg, />边长 5cm</);
  assert.match(result.svg, />60°</);
});

test('generates a square with requested side length', () => {
  const result = generateGraph({
    prompt: '画一个正方形，边长 4cm',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /正方形/);
  assert.match(result.tikzSource, /\(4,0\)/);
  assert.match(result.tikzSource, /\(4,4\)/);
  assert.match(result.svg, />边长 4cm</);
  assert.match(result.svg, />直角</);
});

test('generates a circle with radius and center label', () => {
  const result = generateGraph({
    prompt: '画一个圆，半径 3cm，标注圆心',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\(O\) circle \(3\)/);
  assert.match(result.tikzSource, /圆心/);
  assert.match(result.tikzSource, /半径 3cm/);
  assert.match(result.svg, />圆心 O</);
  assert.match(result.svg, />半径 3cm</);
});

test('generates two intersecting circles with centers and intersection labels', () => {
  const result = generateGraph({
    prompt: '画两个相交的圆，半径分别为 3cm 和 4cm，圆心距 5cm，标注两个交点和圆心',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(O_1\) at \(0,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(O_2\) at \(5,0\);/);
  assert.match(result.tikzSource, /\(O_1\) circle \(3\)/);
  assert.match(result.tikzSource, /\(O_2\) circle \(4\)/);
  assert.match(result.tikzSource, /\\coordinate \(P\) at \(1\.8,2\.4\);/);
  assert.match(result.tikzSource, /\\coordinate \(Q\) at \(1\.8,-2\.4\);/);
  assert.match(result.svg, /O1/);
  assert.match(result.svg, /O2/);
  assert.match(result.svg, /P/);
  assert.match(result.svg, /Q/);
});

test('generates a coordinate-axis circle instead of a plain radius circle', () => {
  const result = generateGraph({
    prompt: '在坐标系中画以原点为圆心、半径为 5 的圆，标出与坐标轴的四个交点',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /axis lines=middle/);
  assert.match(result.tikzSource, /\(O\) circle \(5\)/);
  assert.match(result.tikzSource, /\(5,0\)/);
  assert.doesNotMatch(result.svg, /半径 5cm/);
});

test('generates a coordinate triangle from three labeled points', () => {
  const result = generateGraph({
    prompt: '在坐标系中画点 A(2,3), B(5,1), C(1,1)，连接成三角形',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(2,3\);/);
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(5,1\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(1,1\);/);
  assert.match(result.tikzSource, /\(A\) -- \(B\) -- \(C\) -- cycle/);
  assert.match(result.svg, /A\(2,3\)/);
  assert.match(result.svg, /B\(5,1\)/);
  assert.match(result.svg, /C\(1,1\)/);
});

test('generates a coordinate segment with its midpoint label', () => {
  const result = generateGraph({
    prompt: '画点 A(1,2), B(5,6)，连接 AB，标出线段中点坐标',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(1,2\);/);
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(5,6\);/);
  assert.match(result.tikzSource, /\\coordinate \(M\) at \(3,4\);/);
  assert.match(result.tikzSource, /中点/);
  assert.match(result.svg, /A\(1,2\)/);
  assert.match(result.svg, /B\(5,6\)/);
  assert.match(result.svg, /M\(3,4\)/);
});

test('generates a coordinate circle centered at the origin with four axis intersections', () => {
  const result = generateGraph({
    prompt: '在坐标系中画以原点为圆心、半径为 5 的圆，标出与坐标轴的四个交点',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\(O\) circle \(5\)/);
  assert.match(result.tikzSource, /\(5,0\)/);
  assert.match(result.tikzSource, /\(-5,0\)/);
  assert.match(result.tikzSource, /\(0,5\)/);
  assert.match(result.tikzSource, /\(0,-5\)/);
  assert.match(result.svg, /\(5,0\)/);
  assert.match(result.svg, /\(-5,0\)/);
  assert.match(result.svg, /\(0,5\)/);
  assert.match(result.svg, /\(0,-5\)/);
});

test('generates a parallelogram from adjacent sides and included angle', () => {
  const result = generateGraph({
    prompt: '画一个平行四边形，相邻两边分别为 4cm 和 3cm，夹角 60°',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(4,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(D\) at \(1\.500,2\.598\);/);
  assert.match(result.tikzSource, /4cm/);
  assert.match(result.tikzSource, /3cm/);
  assert.match(result.tikzSource, /60\^\\circ/);
  assert.match(result.svg, /平行四边形/);
  assert.match(result.svg, /60°/);
});

test('generates a right trapezoid with top base bottom base and height', () => {
  const result = generateGraph({
    prompt: '画直角梯形，上底 3cm，下底 5cm，高 4cm',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(5,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(3,4\);/);
  assert.match(result.tikzSource, /\\coordinate \(D\) at \(0,4\);/);
  assert.match(result.tikzSource, /上底 3cm/);
  assert.match(result.tikzSource, /下底 5cm/);
  assert.match(result.tikzSource, /高 4cm/);
  assert.match(result.svg, /直角梯形/);
});

test('generates a triangle from three side lengths', () => {
  const result = generateGraph({
    prompt: '画一个三角形，已知 AB=5，BC=6，AC=7，标出各边长度',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(5,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(3\.800,5\.879\);/);
  assert.match(result.tikzSource, /AB=5/);
  assert.match(result.tikzSource, /BC=6/);
  assert.match(result.tikzSource, /AC=7/);
  assert.match(result.svg, /AB=5/);
  assert.match(result.svg, /BC=6/);
  assert.match(result.svg, /AC=7/);
});

test('generates a standalone regular pentagon with vertex labels', () => {
  const result = generateGraph({
    prompt: '画一个正五边形，边长 3cm，标出所有顶点',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /正五边形/);
  assert.match(result.tikzSource, /边长 3cm/);
  assert.match(result.tikzSource, /\\node.*\$A\$/);
  assert.match(result.tikzSource, /\\node.*\$E\$/);
  assert.match(result.svg, /A/);
  assert.match(result.svg, /E/);
});

test('generates a triangle median from AB midpoint D to C', () => {
  const result = generateGraph({
    prompt: '画一个三角形 ABC，在 AB 边上取中点 D，连接 CD，标注 D 和中线',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(D\) at \(2,0\);/);
  assert.match(result.tikzSource, /\\draw\[dashed, blue\] \(C\) -- \(D\)/);
  assert.match(result.tikzSource, /中线/);
  assert.match(result.svg, /D/);
  assert.match(result.svg, /中线 CD/);
});

test('generates perpendicular bisectors and the circumcenter of a coordinate triangle', () => {
  const result = generateGraph({
    prompt: '画 △ABC，A(0,0), B(4,0), C(2,3)，给出三边中垂线，标出外心',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(4,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(2,3\);/);
  assert.match(result.tikzSource, /\\coordinate \(O\) at \(2,0\.833\);/);
  assert.match(result.tikzSource, /中垂线/);
  assert.match(result.tikzSource, /外心/);
  assert.match(result.svg, /外心 O/);
  assert.match(result.svg, /中垂线/);
});

test('generates a point reflected across y equals x', () => {
  const result = generateGraph({
    prompt: "画点 A(2,3) 关于直线 y=x 的对称点 A'，标出对称轴和两个点",
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(2,3\);/);
  assert.match(result.tikzSource, /\\coordinate \(Aprime\) at \(3,2\);/);
  assert.match(result.tikzSource, /y=x/);
  assert.match(result.svg, /A\(2,3\)/);
  assert.match(result.svg, /A'\(3,2\)/);
  assert.match(result.svg, /y=x/);
});

test('generates an isosceles triangle with 30 degree base angles and 5cm equal sides', () => {
  const result = generateGraph({
    prompt: '画一个底角 30° 的等腰三角形，腰长 5cm',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(-4\.330,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(4\.330,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(0,2\.500\);/);
  assert.match(result.tikzSource, /30\^\\circ/);
  assert.match(result.tikzSource, /腰长 5cm/);
  assert.match(result.svg, /30°/);
});

test('generates an isosceles triangle with arbitrary base angle and waist length', () => {
  const result = generateGraph({
    prompt: '画一个底角 45° 的等腰三角形，腰长 6cm',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(-4\.243,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(4\.243,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(0,4\.243\);/);
  assert.match(result.tikzSource, /45\^\\circ/);
  assert.match(result.tikzSource, /腰长 6cm/);
  assert.match(result.svg, /45°/);
  assert.match(result.svg, /腰长 6cm/);
});

test('generates an isosceles triangle from base and waist lengths', () => {
  const result = generateGraph({
    prompt: '画一个等腰三角形，底边长 6cm，腰长 5cm',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /底边 6cm/);
  assert.match(result.tikzSource, /腰长 5cm/);
  assert.match(result.tikzSource, /\(0,4(?:\.000)?\)/);
  assert.match(result.svg, />底边 6cm</);
  assert.match(result.svg, />腰长 5cm</);
});

test('uses isosceles angle labels instead of right-triangle angle modifiers for an isosceles source', () => {
  const first = generateGraph({
    prompt: '画等腰三角形，底 6cm，腰 5cm',
  });
  const second = generateGraph({
    prompt: '不标边长，改标三个角的度数',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(first.kind, 'template');
  assert.equal(second.kind, 'modifier');
  assert.doesNotMatch(second.tikzSource, /标记角A|90\^\\circ|\\\(\\theta\\\)/);
  assert.match(second.tikzSource, /53\.13\^\\circ/);
  assert.match(second.tikzSource, /73\.74\^\\circ/);
});

test('generates an isosceles triangle with incircle radius 3', () => {
  const result = generateGraph({
    prompt: '画一个内切圆半径为 3 的等腰三角形',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(O\) at \(0,3\);/);
  assert.match(result.tikzSource, /\\draw\[thick, blue\] \(O\) circle \(3\);/);
  assert.match(result.tikzSource, /内切圆/);
  assert.match(result.tikzSource, /r=3/);
  assert.match(result.svg, /内切圆/);
  assert.match(result.svg, /r=3/);
});

test('generates an isosceles triangle with arbitrary incircle radius', () => {
  const result = generateGraph({
    prompt: '画一个内切圆半径为 2 的等腰三角形',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(O\) at \(0,2\);/);
  assert.match(result.tikzSource, /\\draw\[thick, blue\] \(O\) circle \(2\);/);
  assert.match(result.tikzSource, /r=2/);
  assert.match(result.svg, /r=2/);
});

test('right triangle incircle request does not get swallowed by the plain triangle template', () => {
  const result = generateGraph({
    prompt: '画直角三角形的内切圆，直角边分别为 3 和 4，标出内切圆圆心和半径',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /内切圆/);
  assert.match(result.tikzSource, /\(O\) circle \(1\)/);
  assert.match(result.svg, />内切圆/);
  assert.match(result.svg, />r=1</);
});

test('generates an isosceles ABC problem diagram with point P across BC from OCR-style prompt', () => {
  const result = generateGraph({
    prompt: '在△ABC中，AB=AC，点P、A分别位于直线BC异侧，连接AP,∠PBC= ∠BAC, 角∠APB 加上 两倍的角∠PAB 等于 90度，且BC=8,PB=5',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(0,12\);/);
  assert.match(result.tikzSource, /\\coordinate \(B\) at \(-4,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(C\) at \(4,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(P\) at \(0,-3\);/);
  assert.match(result.tikzSource, /AB=AC/);
  assert.match(result.tikzSource, /BC=8/);
  assert.match(result.tikzSource, /PB=5/);
  assert.match(result.tikzSource, /\\angle PBC=\\angle BAC/);
  assert.match(result.tikzSource, /\\angle APB\+2\\angle PAB=90\^\\circ/);
  assert.match(result.svg, /AB=AC/);
  assert.match(result.svg, /BC=8/);
  assert.match(result.svg, /PB=5/);
  assert.match(result.svg, /∠PBC=∠BAC/);
  assert.match(result.svg, /∠APB\+2∠PAB=90°/);
  assert.match(result.svg, /P/);
});

test('generates a shaded intersection region for y=x^2 and y=2x+1', () => {
  const result = generateGraph({
    prompt: '画 y = x² 和 y = 2x + 1 的交点区域，用阴影标出来',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /x_1=1-\\sqrt\{2\}/);
  assert.match(result.tikzSource, /x_2=1\+\\sqrt\{2\}/);
  assert.match(result.tikzSource, /fill=gray!25/);
  assert.match(result.tikzSource, /\{x\^2\}/);
  assert.match(result.tikzSource, /\{2\*x\+1\}/);
  assert.match(result.svg, /交点区域/);
});

test('generates a shaded intersection region when the quadratic is described in Chinese', () => {
  const result = generateGraph({
    prompt: '画 y = x平方 和 y = 2x + 1 的交点区域，用阴影标出来',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /x_1=1-\\sqrt\{2\}/);
  assert.match(result.tikzSource, /fill=gray!25/);
  assert.match(result.tikzSource, /\{x\^2\}/);
  assert.match(result.tikzSource, /\{2\*x\+1\}/);
  assert.match(result.svg, /交点区域/);
});

test('generates a shaded intersection region when the quadratic uses de wording', () => {
  const result = generateGraph({
    prompt: '画 y = x 的平方 和 y = 2x + 1 的交点区域，用阴影标出来',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /x_1=1-\\sqrt\{2\}/);
  assert.match(result.tikzSource, /fill=gray!25/);
  assert.match(result.tikzSource, /\{x\^2\}/);
  assert.match(result.tikzSource, /\{2\*x\+1\}/);
  assert.match(result.svg, /交点区域/);
});

test('generates a shaded intersection region with full-width plus input', () => {
  const result = generateGraph({
    prompt: '画 y = x平方 和 y = 2x＋1 的交点区域，用阴影标出来',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /fill=gray!25/);
  assert.match(result.tikzSource, /\{x\^2\}/);
  assert.match(result.tikzSource, /\{2\*x\+1\}/);
  assert.match(result.svg, /交点区域/);
});

test('generates a shaded intersection region when teacher says enclosed region', () => {
  const result = generateGraph({
    prompt: '画 y = x平方 和 y = 2x + 1 围成的区域',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /fill=gray!25/);
  assert.match(result.tikzSource, /\{x\^2\}/);
  assert.match(result.tikzSource, /\{2\*x\+1\}/);
  assert.match(result.svg, /交点区域/);
});

test('generates a shaded intersection region when the line uses Chinese plus wording', () => {
  const result = generateGraph({
    prompt: '画 y = x平方 和 y = 2x加1 的交点区域',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /fill=gray!25/);
  assert.match(result.tikzSource, /\{x\^2\}/);
  assert.match(result.tikzSource, /\{2\*x\+1\}/);
  assert.match(result.svg, /交点区域/);
});

test('generates a cuboid with an oblique section plane', () => {
  const result = generateGraph({
    prompt: '画一个长方体，被一个平面截成斜截面，标出截面',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\\coordinate \(A\) at \(0,0,0\);/);
  assert.match(result.tikzSource, /\\coordinate \(H\) at \(4,2,2\.5\);/);
  assert.match(result.tikzSource, /fill=teal!25/);
  assert.match(result.tikzSource, /截面/);
  assert.match(result.svg, /截面/);
});

test('generates a bar chart for class score counts', () => {
  const result = generateGraph({
    prompt: '画一个班级成绩条形统计图，数据为优秀10人，良好18人，及格8人，待提高4人',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /symbolic x coords=\{优秀,良好,及格,待提高\}/);
  assert.match(result.tikzSource, /\(优秀,10\)/);
  assert.match(result.tikzSource, /\(良好,18\)/);
  assert.match(result.tikzSource, /\(及格,8\)/);
  assert.match(result.tikzSource, /\(待提高,4\)/);
  assert.match(result.svg, /良好/);
  assert.match(result.svg, /18人/);
});

test('generates a bar chart with the counts from the teacher prompt', () => {
  const result = generateGraph({
    prompt: '画一个班级成绩条形统计图，数据为优秀12人，良好16人，及格9人，待提高3人',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\(优秀,12\)/);
  assert.match(result.tikzSource, /\(良好,16\)/);
  assert.match(result.tikzSource, /\(及格,9\)/);
  assert.match(result.tikzSource, /\(待提高,3\)/);
  assert.match(result.svg, /优秀/);
  assert.match(result.svg, /12人/);
  assert.match(result.svg, /良好/);
  assert.match(result.svg, /16人/);
  assert.match(result.svg, /及格/);
  assert.match(result.svg, /9人/);
  assert.match(result.svg, /待提高/);
  assert.match(result.svg, /3人/);
});

test('generates a bar chart when count units are omitted', () => {
  const result = generateGraph({
    prompt: '画一个班级成绩条形统计图，数据为优秀11，良好17，及格9，待提高2',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\(优秀,11\)/);
  assert.match(result.tikzSource, /\(良好,17\)/);
  assert.match(result.tikzSource, /\(及格,9\)/);
  assert.match(result.tikzSource, /\(待提高,2\)/);
  assert.match(result.svg, /优秀/);
  assert.match(result.svg, /11人/);
  assert.match(result.svg, /待提高/);
  assert.match(result.svg, /2人/);
});

test('generates a bar chart when counts use Chinese colons', () => {
  const result = generateGraph({
    prompt: '画一个班级成绩条形统计图，数据为优秀：13人、良好：15人、及格：7人、待提高：1人',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\(优秀,13\)/);
  assert.match(result.tikzSource, /\(良好,15\)/);
  assert.match(result.tikzSource, /\(及格,7\)/);
  assert.match(result.tikzSource, /\(待提高,1\)/);
  assert.match(result.svg, /优秀/);
  assert.match(result.svg, /13人/);
  assert.match(result.svg, /待提高/);
  assert.match(result.svg, /1人/);
});

test('generates a generic class score bar chart from prompt data', () => {
  const result = generateGraph({
    prompt: '画一个柱状图：一班 85 分，二班 78 分，三班 92 分，四班 80 分',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /symbolic x coords=\{一班,二班,三班,四班\}/);
  assert.match(result.tikzSource, /\(一班,85\)/);
  assert.match(result.tikzSource, /\(三班,92\)/);
  assert.match(result.svg, />一班</);
  assert.match(result.svg, />92/);
});

test('generates a pie chart with percentage labels', () => {
  const result = generateGraph({
    prompt: '画一个饼图：优秀 30%，良好 45%，及格 20%，不及格 5%',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /优秀 30\\%/);
  assert.match(result.tikzSource, /良好 45\\%/);
  assert.match(result.tikzSource, /及格 20\\%/);
  assert.match(result.tikzSource, /不及格 5\\%/);
  assert.match(result.svg, /优秀 30%/);
  assert.match(result.svg, /良好 45%/);
  assert.match(result.svg, /不及格 5%/);
});

test('generates a frequency histogram from interval counts', () => {
  const result = generateGraph({
    prompt: '画频率分布直方图：区间 [0,10):5, [10,20):12, [20,30):20, [30,40):10, [40,50):3',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /\(0,0\) rectangle \(10,5\)/);
  assert.match(result.tikzSource, /\(10,0\) rectangle \(20,12\)/);
  assert.match(result.tikzSource, /\(20,0\) rectangle \(30,20\)/);
  assert.match(result.svg, /\[0,10\)/);
  assert.match(result.svg, /20/);
  assert.match(result.svg, /\[40,50\)/);
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

test('removes side labels and adds altitude when teacher omits the word label', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });

  const modified = generateGraph({
    prompt: '去掉边长，加一条斜边上的高',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(B\) at \(4,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(C\) at \(0,3\);/);
  assert.doesNotMatch(modified.tikzSource, /node\[below\]\s*\{4\}/);
  assert.doesNotMatch(modified.tikzSource, /node\[left\]\s*\{3\}/);
  assert.match(modified.tikzSource, /斜边上的高/);
  assert.match(modified.svg, /斜边上的高/);
});

test('removes side labels and adds altitude when teacher says side labels first', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });

  const modified = generateGraph({
    prompt: '把边长去掉，加一条斜边上的高',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(B\) at \(4,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(C\) at \(0,3\);/);
  assert.doesNotMatch(modified.tikzSource, /node\[below\]\s*\{4\}/);
  assert.doesNotMatch(modified.tikzSource, /node\[left\]\s*\{3\}/);
  assert.match(modified.tikzSource, /斜边上的高/);
  assert.match(modified.svg, /斜边上的高/);
});

test('removes side labels from arbitrary right triangles before adding altitude', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 5 和 12，标出边长',
  });

  const modified = generateGraph({
    prompt: '去掉边长的标注，加一条斜边上的高',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(B\) at \(12,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(C\) at \(0,5\);/);
  assert.doesNotMatch(modified.tikzSource, /node\[below\]\s*\{12\}/);
  assert.doesNotMatch(modified.tikzSource, /node\[left\]\s*\{5\}/);
  assert.doesNotMatch(modified.tikzSource, /node\[midway, above right\]\s*\{13\}/);
  assert.match(modified.tikzSource, /斜边上的高/);
  assert.doesNotMatch(modified.svg, />12</);
  assert.doesNotMatch(modified.svg, />5</);
  assert.doesNotMatch(modified.svg, />13</);
});

test('adds altitude after moving the right angle marker outside', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });
  const outside = generateGraph({
    prompt: '把直角标记从内侧移到外侧',
    currentTikzSource: first.tikzSource,
  });

  const modified = generateGraph({
    prompt: '去掉边长的标注，加一条斜边上的高',
    currentTikzSource: outside.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\draw\[thick\] \(-0\.35,0\) -- \(-0\.35,-0\.35\) -- \(0,-0\.35\);/);
  assert.match(modified.tikzSource, /斜边上的高/);
  assert.match(modified.svg, /斜边上的高/);
  assert.match(modified.svg, /直角/);
});

test('moves the right angle marker outside when teacher says outside in colloquial wording', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });

  const modified = generateGraph({
    prompt: '把直角标记移到外面',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(B\) at \(4,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(C\) at \(0,3\);/);
  assert.match(modified.tikzSource, /\\draw\[thick\] \(-0\.35,0\) -- \(-0\.35,-0\.35\) -- \(0,-0\.35\);/);
  assert.match(modified.svg, /直角/);
});

test('adds auxiliary line after moving the right angle marker outside', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });
  const outside = generateGraph({
    prompt: '把直角标记从内侧移到外侧',
    currentTikzSource: first.tikzSource,
  });

  const modified = generateGraph({
    prompt: '加一条辅助线',
    currentTikzSource: outside.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\draw\[thick\] \(-0\.35,0\) -- \(-0\.35,-0\.35\) -- \(0,-0\.35\);/);
  assert.match(modified.tikzSource, /\\draw\[gray\] \(B\) -- \(C\) node\[midway, above right\] \{辅助线\};/);
  assert.match(modified.svg, /辅助线/);
  assert.match(modified.svg, /直角/);
});

test('adds auxiliary line when teacher says draw an auxiliary line', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });

  const modified = generateGraph({
    prompt: '画一条辅助线',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(B\) at \(4,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(C\) at \(0,3\);/);
  assert.match(modified.tikzSource, /\\draw\[gray\] \(B\) -- \(C\) node\[midway, above right\] \{辅助线\};/);
  assert.match(modified.svg, /辅助线/);
});

test('changes pgfplots axis range while preserving plotted functions', () => {
  const first = generateGraph({
    prompt: '画 y = sin(x) 和 y = cos(x) 在 -2π 到 2π 的图像，用不同颜色区分',
  });

  const modified = generateGraph({
    prompt: '把坐标系的范围改成 -5 到 5',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /xmin=-5/);
  assert.match(modified.tikzSource, /xmax=5/);
  assert.match(modified.tikzSource, /ymin=-5/);
  assert.match(modified.tikzSource, /ymax=5/);
  assert.match(modified.tikzSource, /\{sin\(deg\(x\)\)\}/);
  assert.match(modified.tikzSource, /\{cos\(deg\(x\)\)\}/);
  assert.match(modified.svg, />-5</);
  assert.match(modified.svg, />0</);
  assert.match(modified.svg, />5</);
});

test('accepts zhi wording when changing pgfplots axis range', () => {
  const first = generateGraph({
    prompt: '画 y = sin(x) 和 y = cos(x) 在 -2π 到 2π 的图像，用不同颜色区分',
  });

  const modified = generateGraph({
    prompt: '把坐标系的范围改成 -6 至 6',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /xmin=-6/);
  assert.match(modified.tikzSource, /xmax=6/);
  assert.match(modified.tikzSource, /ymin=-6/);
  assert.match(modified.tikzSource, /ymax=6/);
  assert.match(modified.tikzSource, /\{sin\(deg\(x\)\)\}/);
  assert.match(modified.tikzSource, /\{cos\(deg\(x\)\)\}/);
  assert.match(modified.svg, />-6</);
  assert.match(modified.svg, />6</);
});

test('changes pgfplots axis range when teacher omits coordinate system wording', () => {
  const first = generateGraph({
    prompt: '画 y = sin(x) 和 y = cos(x) 在 -2π 到 2π 的图像，用不同颜色区分',
  });

  const modified = generateGraph({
    prompt: '把范围改成 -4 到 4',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /xmin=-4/);
  assert.match(modified.tikzSource, /xmax=4/);
  assert.match(modified.tikzSource, /ymin=-4/);
  assert.match(modified.tikzSource, /ymax=4/);
  assert.match(modified.tikzSource, /\{sin\(deg\(x\)\)\}/);
  assert.match(modified.tikzSource, /\{cos\(deg\(x\)\)\}/);
  assert.match(modified.svg, />-4</);
  assert.match(modified.svg, />4</);
});

test('changes pgfplots axis range when teacher uses interval notation', () => {
  const first = generateGraph({
    prompt: '画 y = sin(x) 和 y = cos(x) 在 -2π 到 2π 的图像，用不同颜色区分',
  });

  const modified = generateGraph({
    prompt: '把范围改成 [-4, 4]',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /xmin=-4/);
  assert.match(modified.tikzSource, /xmax=4/);
  assert.match(modified.tikzSource, /domain=-4:4/);
  assert.match(modified.svg, />-4</);
  assert.match(modified.svg, />4</);
});

test('generates quadratic and linear functions in one coordinate system without shading', () => {
  const result = generateGraph({
    prompt: '在同一个坐标系中画 y = x² 和 y = 2x + 1，-3 到 3 范围，用不同颜色区分',
  });

  assert.equal(result.kind, 'template');
  assert.match(result.tikzSource, /xmin=-3/);
  assert.match(result.tikzSource, /xmax=3/);
  assert.match(result.tikzSource, /\\addplot\[blue, very thick, domain=-3:3\] \{x\^2\};/);
  assert.match(result.tikzSource, /\\addplot\[red, very thick, domain=-3:3\] \{2\*x\+1\};/);
  assert.doesNotMatch(result.tikzSource, /fill=gray!25/);
  assert.match(result.svg, />y=x²</);
  assert.match(result.svg, />y=2x\+1</);
});

test('modifies quadratic and linear function styles while preserving the coordinate range', () => {
  const first = generateGraph({
    prompt: '画 y=x² 和 y=2x+1 在同一个坐标系',
  });

  const modified = generateGraph({
    prompt: '把 x² 改成红色，2x+1 改成虚线蓝色',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(first.kind, 'template');
  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /xmin=-3/);
  assert.match(modified.tikzSource, /xmax=3/);
  assert.match(modified.tikzSource, /\\addplot\[red, very thick, domain=-3:3\] \{x\^2\};/);
  assert.match(modified.tikzSource, /\\addplot\[blue, dashed, very thick, domain=-3:3\] \{2\*x\+1\};/);
  assert.match(modified.svg, /class="quadratic-red"/);
  assert.match(modified.svg, /class="linear-blue-dashed"/);
});

test('modifies an isosceles triangle from side labels to angle labels', () => {
  const first = generateGraph({
    prompt: '画等腰三角形，底 6cm，腰 5cm',
  });

  const modified = generateGraph({
    prompt: '不标边长，改标三个角的度数',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(first.kind, 'template');
  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\coordinate \(A\) at \(-3\.000,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(B\) at \(3\.000,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(C\) at \(0,4\.000\);/);
  assert.doesNotMatch(modified.tikzSource, /底边 6cm|腰长 5cm/);
  assert.match(modified.tikzSource, /53\.13\^\\circ/);
  assert.match(modified.tikzSource, /73\.74\^\\circ/);
  assert.match(modified.svg, />53\.13°</);
  assert.match(modified.svg, />73\.74°</);
});

test('modifies an inscribed polygon from hexagon to octagon while preserving the circle', () => {
  const first = generateGraph({
    prompt: '画一个圆，内接正六边形',
  });

  const modified = generateGraph({
    prompt: '把六边形改成正八边形，其他不变',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(first.kind, 'template');
  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\draw\[thick\] \(O\) circle \(2\);/);
  assert.match(modified.tikzSource, /\\foreach \\i in \{0,45,90,135,180,225,270,315\}/);
  assert.match(modified.tikzSource, /\(P0\) -- \(P45\) -- \(P90\) -- \(P135\) -- \(P180\) -- \(P225\) -- \(P270\) -- \(P315\) -- cycle/);
  assert.match(modified.svg, /圆心 O/);
});

test('keeps only the first-quadrant segment of an existing sine plot', () => {
  const first = generateGraph({
    prompt: '画 y=sin(x)，-2π 到 2π',
  });

  const modified = generateGraph({
    prompt: '只保留第一象限的部分（0 到 π/2），其他不要',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(first.kind, 'template');
  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /xmin=0/);
  assert.match(modified.tikzSource, /xmax=pi\/2/);
  assert.match(modified.tikzSource, /domain=0:pi\/2/);
  assert.match(modified.tikzSource, /\{sin\(deg\(x\)\)\}/);
  assert.match(modified.svg, />0</);
  assert.match(modified.svg, />π\/2</);
  assert.match(modified.svg, />y=sin\(x\)</);
});

test('adds an auxiliary line and then changes it to dashed while preserving triangle coordinates', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });

  const withAuxiliary = generateGraph({
    prompt: '加一条辅助线',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(withAuxiliary.kind, 'modifier');
  assert.match(withAuxiliary.tikzSource, /辅助线/);
  assert.match(withAuxiliary.tikzSource, /\\coordinate \(B\) at \(4,0\);/);
  assert.match(withAuxiliary.svg, /辅助线/);

  const dashed = generateGraph({
    prompt: '把辅助线改成虚线',
    currentTikzSource: withAuxiliary.tikzSource,
  });

  assert.equal(dashed.kind, 'modifier');
  assert.match(dashed.tikzSource, /\\draw\[dashed, gray\] \(B\) -- \(C\) node\[midway, above right\] \{辅助线\};/);
  assert.match(dashed.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(dashed.svg, /辅助线/);
  assert.match(dashed.svg, /stroke-dasharray/);
});

test('turns auxiliary line request into a dashed auxiliary line even when none exists yet', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });

  const dashed = generateGraph({
    prompt: '把辅助线改成虚线',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(dashed.kind, 'modifier');
  assert.match(dashed.tikzSource, /\\draw\[dashed, gray\] \(B\) -- \(C\) node\[midway, above right\] \{辅助线\};/);
  assert.match(dashed.svg, /辅助线/);
  assert.match(dashed.svg, /stroke-dasharray/);
});

test('marks an angle on an existing triangle while preserving coordinates', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });

  const modified = generateGraph({
    prompt: '把角B标出来',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(B\) at \(4,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(C\) at \(0,3\);/);
  assert.match(modified.tikzSource, /\\draw\[thick, red\] \(3\.25,0\) arc\[start angle=180,end angle=143\.13,radius=0\.75\];/);
  assert.ok(modified.tikzSource.includes('  \\node[above left, red] at (3.18,0.32) {\\(\\theta\\)};'));
  assert.match(modified.svg, /θ/);
});

test('marks angle B when teacher uses angle symbol notation', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });

  const modified = generateGraph({
    prompt: '标出∠B',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(B\) at \(4,0\);/);
  assert.match(modified.tikzSource, /\\coordinate \(C\) at \(0,3\);/);
  assert.match(modified.tikzSource, /\\\(\\theta\\\)/);
  assert.match(modified.svg, /θ/);
});

test('marks angle C when teacher uses angle symbol notation', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });

  const modified = generateGraph({
    prompt: '标出∠C',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\coordinate \(C\) at \(0,3\);/);
  assert.match(modified.tikzSource, /\\draw\[thick, red\] \(0,2\.25\) arc\[start angle=-90,end angle=-36\.87,radius=0\.75\];/);
  assert.ok(modified.tikzSource.includes('  \\node[below right, red] at (0.38,2.12) {\\(\\theta\\)};'));
  assert.match(modified.svg, /θ/);
});

test('marks angle A as the right angle when teacher uses angle symbol notation', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });

  const modified = generateGraph({
    prompt: '标出∠A',
    currentTikzSource: first.tikzSource,
  });

  assert.equal(modified.kind, 'modifier');
  assert.match(modified.tikzSource, /\\coordinate \(A\) at \(0,0\);/);
  assert.match(modified.tikzSource, /标记角A/);
  assert.ok(modified.tikzSource.includes('  \\node[above right, red] at (0.55,0.55) {$90^\\circ$};'));
  assert.match(modified.svg, /90°/);
});

test('keeps previous triangle modifications visible in SVG preview when marking an angle', () => {
  const first = generateGraph({
    prompt: '画一个直角三角形，两条直角边分别是 3 和 4，标出边长',
  });
  const withAuxiliary = generateGraph({
    prompt: '加一条辅助线',
    currentTikzSource: first.tikzSource,
  });

  const marked = generateGraph({
    prompt: '把角B标出来',
    currentTikzSource: withAuxiliary.tikzSource,
  });

  assert.equal(marked.kind, 'modifier');
  assert.match(marked.tikzSource, /辅助线/);
  assert.match(marked.tikzSource, /\\\(\\theta\\\)/);
  assert.match(marked.svg, /辅助线/);
  assert.match(marked.svg, /θ/);
});

test('extracts fenced TikZ from model output', () => {
  const source = extractTikz('说明\n```tex\n\\\\documentclass{standalone}\n\\\\begin{document}\nOK\n\\\\end{document}\n```');
  assert.equal(source, '\\\\documentclass{standalone}\n\\\\begin{document}\nOK\n\\\\end{document}');
});
