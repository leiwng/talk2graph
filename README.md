# talk2graph

用自然语言画数学图形。跟 AI 说「画一个内切圆半径为 3 的等腰三角形」，它就画出来。持续修改，精确控制。

## 技术栈

- **Node.js 服务** — 静态页面 + `/api/generate`，避免浏览器暴露 API Key
- **模板生成器** — 高频 K12 图形直接生成精确 TikZ
- **LLM** — 超出模板的描述走 OpenAI 兼容服务端回退
- **TikZ** — 数学图形渲染（LaTeX 生态）
- **node-tikzjax** — 服务端 TikZ → SVG 渲染兜底

## 核心理念

```
用户描述 → 模板/LLM 生成 TikZ 代码 → 浏览器渲染 → 精确数学图
用户修改 → 当前 TikZ 源码 + 修改指令 → 局部编辑 → 重新渲染
```

代码即状态，渲染是副作用。每轮修改只改被要求的部分，其余完全一致。

## 快速开始

本地或公网 Node 服务是当前完整 happy path：页面、内置模板、持续修改、SVG/TikZ 导出都走同一个服务入口。COS 静态页只能作为内置模板演示入口，且默认 COS website 域名可能被腾讯云强制下载；只有 `npm run verify:deployment` 通过的自定义域名或静态入口才能当作浏览器预览地址。

```bash
npm install
npm start
```

然后打开 `http://127.0.0.1:3000`。

验证本地或公网 Node 服务是否满足 happy path：

```bash
npm run verify:service
TALK2GRAPH_SERVICE_URL=https://your-node-service.example npm run verify:service
```

容器部署步骤见 [docs/Node服务部署.md](docs/Node服务部署.md)。

部署静态演示页后，可以复验线上资源是否已经更新到新版：

```bash
npm run deploy:cos -- --prompt-credentials
npm run verify:deployment
```

也可以验证任意公网 Node 服务或自定义域名：

```bash
TALK2GRAPH_DEPLOY_URL=https://your-domain.example npm run verify:deployment
```

数据集覆盖率评估：

```bash
npm run evaluate:dataset
```

当前内置模板对 `docs/测试数据集.md` 的精确覆盖为 38/38：单轮 33/33，多轮 5/5，语义误匹配 0。

首页提供一键示例按钮；老师可以直接点选常见图形，也可以在生成图形后继续点选斜边高、辅助线、角标注、虚线化等修改示例。

内置模板不需要模型配置，已覆盖产品需求中的示例：

- 任意两条直角边的直角三角形并标注边长（如 3-4-5、5-12-13）
- 等边三角形、正方形、单圆半径/圆心
- 底边和腰长确定的等腰三角形
- 直角三角形内切圆
- 一次函数、二次函数、单独正弦函数
- `sin(x)` 和 `cos(x)` 在 `-2π` 到 `2π` 的图像
- 对数函数、三次函数、分段函数
- 参数方程椭圆
- 单圆、相交圆、圆内接正多边形并标注圆心（如正五边形、正六边形）
- 内切圆半径可指定的等腰三角形（如半径为 3）
- 底角 30°、腰长 5cm 的等腰三角形
- 平行四边形、直角梯形、已知三边三角形、独立正多边形、三角形中线
- `y=x²` 和 `y=2x+1` 的交点阴影区域
- `y=x²` 和圆 `x²+y²=4` 的交点区域
- 坐标三角形、坐标线段中点、以原点为圆心的坐标圆四交点、三角形外心、关于 `y=x` 的对称点
- 长方体斜截面图
- 班级成绩条形统计图（从中文提示中解析优秀、良好、及格、待提高人数）
- 通用标签+数值柱状图（如一班、二班、三班、四班分数）
- 百分比饼图、频率分布直方图
- 把直角标记从内侧移到外侧
- 去掉边长标注并添加斜边上的高
- 把坐标系范围改成 `-5` 到 `5`
- 加一条辅助线，并把辅助线改成虚线
- 标出三角形中的角 A、B、C

需要生成模板外图形时，在服务端设置 OpenAI 兼容环境变量：

```bash
OPENAI_BASE_URL=https://api.openai.com/v1 \
OPENAI_API_KEY=sk-... \
OPENAI_MODEL=gpt-4o \
npm start
```

## 示例

> 画一个直角三角形，直角边分别是 3cm 和 4cm，标出边长

> 把直角标记从内侧移到外侧

> 去掉边长的标注，加一条斜边上的高

## license

MIT
