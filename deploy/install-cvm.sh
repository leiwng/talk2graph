#!/usr/bin/env bash
set -euo pipefail

ARCHIVE="${1:-/tmp/talk2graph-service.tar.gz}"
APP_DIR="${APP_DIR:-/opt/talk2graph-service}"
SERVICE_NAME="${SERVICE_NAME:-talk2graph}"
SERVICE_USER="${SERVICE_USER:-talk2graph}"
LOCAL_URL="${LOCAL_URL:-http://127.0.0.1:3000}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run as root: sudo bash deploy/install-cvm.sh ${ARCHIVE}" >&2
  exit 1
fi

if [[ ! -f "${ARCHIVE}" ]]; then
  echo "Archive not found: ${ARCHIVE}" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node.js first." >&2
  exit 1
fi

if ! id "${SERVICE_USER}" >/dev/null 2>&1; then
  useradd --system --home "${APP_DIR}" --shell /usr/sbin/nologin "${SERVICE_USER}"
fi

install -d -m 0755 "${APP_DIR}"
tar -xzf "${ARCHIVE}" -C "${APP_DIR}" --strip-components=1
cd "${APP_DIR}"

EXPECTED_COMMIT="$(node -e "const fs=require('fs'); const info=JSON.parse(fs.readFileSync('build-info.json','utf8')); process.stdout.write(info.commit || 'unknown');")"

npm ci --omit=dev
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${APP_DIR}"

install -m 0644 deploy/systemd/talk2graph.service "/etc/systemd/system/${SERVICE_NAME}.service"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"

echo "Waiting for ${SERVICE_NAME} to become healthy..."
for _ in $(seq 1 20); do
  if curl -fsS "${LOCAL_URL}/healthz" >/tmp/talk2graph-health.json; then
    break
  fi
  sleep 1
done

echo "Health:"
cat /tmp/talk2graph-health.json
echo
node -e "const fs=require('fs'); const health=JSON.parse(fs.readFileSync('/tmp/talk2graph-health.json','utf8')); const expectedCommit=process.argv[1]; if(!/^\\d+\\.\\d+\\.\\d+/.test(health.version||'')) { console.error('health metadata check failed: invalid version'); process.exit(1); } if(health.commit!==expectedCommit) { console.error('health metadata check failed: expected commit '+expectedCommit+', got '+health.commit); process.exit(1); } console.log('health metadata check passed: commit='+health.commit); " "${EXPECTED_COMMIT}"

echo "Checking diameter circle template..."
curl -fsS \
  -H 'content-type: application/json' \
  -d '{"prompt":"画直角三角形 ABC，C 为直角顶点，AC=3，BC=4；以 AC 为直径画圆，圆与斜边 AB 相交于点 D"}' \
  "${LOCAL_URL}/api/generate" \
  | node -e "let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>{const r=JSON.parse(s); if(r.kind!=='template') { console.error('diameter circle template check failed: kind='+r.kind); process.exit(1); } console.log('diameter circle template check passed'); });"

systemctl --no-pager --full status "${SERVICE_NAME}"
