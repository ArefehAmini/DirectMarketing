#!/bin/bash
# Smoke test واقعی برای API احراز هویت — سرور داخل همین اسکریپت بالا می‌آید
cd /home/z/my-project
setsid bash -c 'exec bunx next dev -p 3000 >> dev.log 2>&1' < /dev/null > /dev/null 2>&1 &
SRV=$!
trap "kill -- -$SRV 2>/dev/null; pkill -f 'next dev' 2>/dev/null" EXIT

for i in $(seq 1 30); do
  sleep 2
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5)
  [ "$code" = "200" ] && break
done
echo "server: $code"

B="http://localhost:3000/api/auth"
J='-H Content-Type:application/json'
E="smoke$(date +%s)@rasaweb.ir"

echo "== register (weak password) =="
curl -s $J -X POST $B/register -d "{\"name\":\"تست اسموک\",\"email\":\"$E\",\"password\":\"123\"}" | head -c 200; echo

echo "== register (valid) =="
curl -s $J -X POST $B/register -d "{\"name\":\"تست اسموک\",\"email\":\"$E\",\"password\":\"test1234\"}" -c /tmp/rw-cookies.txt | head -c 300; echo

echo "== duplicate register =="
curl -s $J -X POST $B/register -d "{\"name\":\"تست اسموک\",\"email\":\"$E\",\"password\":\"test1234\"}" | head -c 200; echo

echo "== me (with session) =="
curl -s $B/me -b /tmp/rw-cookies.txt | head -c 300; echo

echo "== logout =="
curl -s $J -X POST $B/logout -b /tmp/rw-cookies.txt -c /tmp/rw-cookies.txt | head -c 100; echo

echo "== me (after logout, expect 401) =="
curl -s -o /dev/null -w "%{http_code}" $B/me -b /tmp/rw-cookies.txt; echo

echo "== login wrong password (expect 401) =="
curl -s -o /dev/null -w "%{http_code}" $J -X POST $B/login -d "{\"email\":\"$E\",\"password\":\"wrong999\"}"; echo

echo "== login correct =="
curl -s $J -X POST $B/login -d "{\"email\":\"$E\",\"password\":\"test1234\"}" -c /tmp/rw-cookies2.txt | head -c 300; echo

echo "== forgot =="
R=$(curl -s $J -X POST $B/forgot -d "{\"email\":\"$E\"}")
echo "$R" | head -c 200; echo
CODE=$(echo "$R" | sed -n 's/.*"devCode":"\([0-9]*\)".*/\1/p')
echo "devCode: $CODE"

echo "== reset with code =="
curl -s $J -X POST $B/reset -d "{\"email\":\"$E\",\"code\":\"$CODE\",\"password\":\"newpass99\"}" | head -c 200; echo

echo "== login with NEW password =="
curl -s $J -X POST $B/login -d "{\"email\":\"$E\",\"password\":\"newpass99\"}" | head -c 300; echo

echo "== login with OLD password (expect 401) =="
curl -s -o /dev/null -w "%{http_code}" $J -X POST $B/login -d "{\"email\":\"$E\",\"password\":\"test1234\"}"; echo
