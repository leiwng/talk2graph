# talk2graph Node 服务部署

目标：提供一个浏览器可直接打开的公网 Node 服务 URL，用于满足 `docs/产品需求.md` 中“开箱即用、国内网络可正常访问、模板外图形走服务端模型”的真实验收。

## 本地容器验证

```bash
docker build -t talk2graph:local .
docker run --rm -p 3000:3000 talk2graph:local
```

另开终端验证：

```bash
TALK2GRAPH_SERVICE_URL=http://127.0.0.1:3000 npm run verify:service
```

## 非 Docker 发布包

如果部署机器拉取 Docker 基础镜像不稳定，可以先在本地生成 Node 服务发布包：

```bash
npm run package:service
```

产物为 `dist/talk2graph-service.tar.gz`，只包含运行必需文件：

- `package.json`
- `package-lock.json`
- `index.html`
- `server.js`
- `build-info.json`
- `src/browser-app.js`
- `src/graph-engine.js`
- `src/llm-client.js`
- `src/tikz-renderer.js`
- `deploy/systemd/talk2graph.service`
- `deploy/nginx/talk2graph.conf`

上传到 CVM、Lighthouse 或其他 Node 运行环境后：

```bash
tar -xzf talk2graph-service.tar.gz
cd talk2graph-service
npm ci --omit=dev
HOST=0.0.0.0 PORT=3000 npm start
```

如果使用 systemd、宝塔、PM2 或云厂商进程管理器，保持同样的环境变量即可：`HOST=0.0.0.0`、`PORT=3000`，模型配置见下一节。

发布包会包含 `build-info.json`。部署后 `/healthz` 会返回 `version` 和 `commit`，用于确认公网服务实际加载的是哪一次打包产物。

### systemd + nginx 示例

以下示例把 Node 服务只监听本机 `127.0.0.1:3000`，由 nginx 对外提供 HTTP 入口：

```bash
sudo useradd --system --home /opt/talk2graph-service --shell /usr/sbin/nologin talk2graph
sudo mkdir -p /opt/talk2graph-service
sudo tar -xzf talk2graph-service.tar.gz -C /opt
cd /opt/talk2graph-service
sudo npm ci --omit=dev
sudo chown -R talk2graph:talk2graph /opt/talk2graph-service
sudo cp deploy/systemd/talk2graph.service /etc/systemd/system/talk2graph.service
sudo systemctl daemon-reload
sudo systemctl enable --now talk2graph
```

配置 nginx：

```bash
sudo cp deploy/nginx/talk2graph.conf /etc/nginx/conf.d/talk2graph.conf
sudo sed -i 's/your-domain.example/你的域名/g' /etc/nginx/conf.d/talk2graph.conf
sudo nginx -t
sudo systemctl reload nginx
```

如果暂时没有域名，也可以先用服务器公网 IP 访问；最终验收仍以 `TALK2GRAPH_SERVICE_URL=... npm run verify:service` 为准。

## 配置服务端模型

模板内图形不需要模型配置。模板外图形需要在服务端设置 OpenAI 兼容环境变量：

```bash
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
```

容器运行示例：

```bash
docker run --rm -p 3000:3000 \
  -e OPENAI_BASE_URL=https://api.openai.com/v1 \
  -e OPENAI_API_KEY=sk-... \
  -e OPENAI_MODEL=gpt-4o \
  talk2graph:local
```

不要把模型密钥写入 `index.html`、`src/browser-app.js` 或任何前端可访问文件。

## 公网验收

部署到任意支持 Node/Docker 的公网环境后，必须执行：

```bash
TALK2GRAPH_SERVICE_URL=https://your-node-service.example npm run verify:service
```

验收项包括：

- 首页可访问
- `/healthz` 返回服务状态、版本、提交号，且不暴露密钥
- `/api/generate` 可生成内置模板
- 直角三角形 AC 直径圆题图返回确定性模板，而不是落到 LLM 兜底
- API 响应包含 SVG 预览
- API 响应包含完整 TikZ 导出

## 与 COS 静态页的关系

COS 静态页只能演示内置模板，不能隐藏模型密钥，也不能保证默认域名能浏览器直接打开。真实产品验收优先使用 Node 服务 URL；COS URL 只能在 `npm run verify:deployment` 通过后作为静态演示入口使用。

`npm run deploy:cos` 上传静态资源时会给 HTML/JS 对象设置 `Content-Disposition: inline` 和 `Cache-Control: no-cache, no-store, must-revalidate`。这能避免对象元数据和缓存继续放大“下载页面/旧首页”的问题，但腾讯云默认 website 域名是否仍强制下载必须以 `npm run verify:deployment` 的实际响应头为准。
