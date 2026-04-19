#!/bin/bash
set -e

cd /home/user

export NODE_OPTIONS="--max-old-space-size=512"

start_server() {
  npx next dev -H 0.0.0.0 > /tmp/next.log 2>&1 &
  NEXT_PID=$!
  echo "Started Next.js dev server (PID: $NEXT_PID)"

  echo "Waiting for Next.js dev server..."
  for i in $(seq 1 150); do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 || true)
    if [ "$code" = "200" ]; then
      echo "Next.js dev server is ready"
      break
    fi
    sleep 0.2
  done

  # aquece a rota /
  curl -s http://127.0.0.1:3000 > /dev/null || true
}

start_server

# Auto-restart loop: if the dev server crashes, restart it
while true; do
  if ! kill -0 "$NEXT_PID" 2>/dev/null; then
    echo "Next.js dev server crashed, restarting..."
    sleep 1
    start_server
  fi
  sleep 2
done