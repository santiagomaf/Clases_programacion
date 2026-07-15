#!/usr/bin/env bash
# Levanta la web de ejercicios de Python en un servidor local.
# Uso:  ./iniciar.sh            (usa el puerto 8000)
#       ./iniciar.sh 8080       (usa otro puerto)

set -e
cd "$(dirname "$0")"

PORT="${1:-8000}"

# Si el puerto está ocupado, busca el siguiente libre.
while lsof -i ":$PORT" >/dev/null 2>&1 || ss -ltn 2>/dev/null | grep -q ":$PORT "; do
  echo "El puerto $PORT está ocupado, probando $((PORT+1))…"
  PORT=$((PORT+1))
done

URL="http://localhost:$PORT/index.html"
echo "======================================================"
echo "  🐍 Ejercicios de Python — servidor local"
echo "------------------------------------------------------"
echo "  Alumno : http://localhost:$PORT/index.html"
echo "  Admin  : http://localhost:$PORT/admin.html   (profe123)"
echo "  Repaso : http://localhost:$PORT/repaso.html"
echo "------------------------------------------------------"
echo "  Para detener: Ctrl+C"
echo "======================================================"

# Intenta abrir el navegador (funciona en WSL, Linux o Mac).
( sleep 1
  if command -v wslview >/dev/null 2>&1; then wslview "$URL"
  elif command -v explorer.exe >/dev/null 2>&1; then explorer.exe "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  elif command -v open >/dev/null 2>&1; then open "$URL"
  fi ) >/dev/null 2>&1 &

exec python3 -m http.server "$PORT" --bind 127.0.0.1
