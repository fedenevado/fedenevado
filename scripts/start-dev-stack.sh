#!/usr/bin/env bash
# Levanta backend + túnel de Cloudflare + Expo (túnel) en una sesión tmux
# llamada "cantixplora", para desarrollo en el VPS.
#
# Uso manual:   /root/fedenevado/scripts/start-dev-stack.sh
# Uso al boot:  vía systemd (cantixplora-dev.service), ver docs/progress.md
#
# Si la sesión ya existe, no hace nada (evita duplicar procesos si se
# relanza el script a mano estando todo ya levantado).

set -uo pipefail

SESSION="cantixplora"
REPO="/root/fedenevado"
MOBILE_ENV="$REPO/apps/mobile/.env"
CF_LOG="$REPO/.cf-tunnel.log"
BOOT_LOG="$REPO/.dev-stack-boot.log"

log() { echo "[$(date -Is)] $*" >> "$BOOT_LOG"; }

if tmux has-session -t "$SESSION" 2>/dev/null; then
  log "Sesión $SESSION ya existe, no se relanza nada."
  exit 0
fi

log "Arrancando stack de desarrollo..."

# 1) Backend NestJS, con reintento si falla al arrancar (p.ej. Postgres
#    todavía no está listo justo tras un reinicio del VPS).
tmux new-session -d -s "$SESSION" -n backend
tmux send-keys -t "$SESSION:backend" \
  "cd $REPO && while true; do pnpm --filter backend start:dev 2>&1 | tee $REPO/apps/backend/.backend.log; echo '[backend caído, reintentando en 5s]'; sleep 5; done" C-m

# 2) Túnel de Cloudflare hacia el backend (URL efímera, cambia cada arranque)
rm -f "$CF_LOG"
tmux new-window -t "$SESSION" -n cf-tunnel
tmux send-keys -t "$SESSION:cf-tunnel" \
  "while true; do cloudflared tunnel --url http://localhost:3000 2>&1 | tee $CF_LOG; echo '[cloudflared caído, reintentando en 5s]'; sleep 5; done" C-m

# 3) Esperar a que cloudflared publique la URL nueva (hasta ~60s) y
#    actualizar EXPO_PUBLIC_API_URL antes de arrancar Expo, para que
#    la app móvil no se quede apuntando a un túnel muerto.
CF_URL=""
for i in $(seq 1 30); do
  CF_URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' "$CF_LOG" 2>/dev/null | head -1 || true)
  [ -n "$CF_URL" ] && break
  sleep 2
done

if [ -n "$CF_URL" ]; then
  sed -i "s|^EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=$CF_URL|" "$MOBILE_ENV"
  log "EXPO_PUBLIC_API_URL actualizado a $CF_URL"
else
  log "AVISO: no se obtuvo URL de cloudflared tras 60s; EXPO_PUBLIC_API_URL puede haber quedado desactualizada. Revisar $CF_LOG"
fi

# 4) Expo con túnel, arrancado después para recoger el .env ya actualizado
tmux new-window -t "$SESSION" -n expo
tmux send-keys -t "$SESSION:expo" \
  "cd $REPO/apps/mobile && while true; do npx expo start --tunnel 2>&1 | tee $REPO/apps/mobile/.expo-tunnel.log; echo '[expo caído, reintentando en 5s]'; sleep 5; done" C-m

log "Stack lanzado. Ventanas tmux: backend, cf-tunnel, expo."
