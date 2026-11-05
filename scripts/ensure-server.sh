#!/bin/bash
# اطمینان از بالا بودن سرور dev — در هر اسکریپت فراخوانی شود
code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 4)
if [ "$code" != "200" ]; then
  cd /home/z/my-project
  setsid bash -c 'exec bunx next dev -p 3000 >> dev.log 2>&1' < /dev/null > /dev/null 2>&1 &
  for i in $(seq 1 30); do
    sleep 2
    code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5)
    [ "$code" = "200" ] && break
  done
fi
echo "server: $code"
