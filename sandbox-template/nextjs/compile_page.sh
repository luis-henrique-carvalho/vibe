#!/bin/bash
set -e

cd /home/user

npx next dev -H 0.0.0.0 > /tmp/next.log 2>&1 &
NEXT_PID=$!

echo "Waiting for Next.js dev server..."

for i in $(seq 1 150); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 || true)
  if [ "$code" = "200" ]; then
    break
  fi
  sleep 0.2
done

# aquece a rota /
curl -s http://127.0.0.1:3000 > /dev/null || true

wait $NEXT_PID