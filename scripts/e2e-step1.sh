#!/bin/bash
# تست مرورگری end-to-end — ثبت‌نام → خوش‌آمد → داده نمونه → اجرای کمپین → موتور زنده → رفرش
cd /home/z/my-project
mkdir -p scripts/verify

setsid bash -c 'exec bunx next dev -p 3000 >> dev.log 2>&1' < /dev/null > /dev/null 2>&1 &
SRV=$!
trap "kill -- -$SRV 2>/dev/null; pkill -f 'next dev' 2>/dev/null" EXIT

for i in $(seq 1 30); do sleep 2; c=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5); [ "$c" = "200" ] && break; done
echo "== server ready: $c =="

AB="agent-browser"
$AB close 2>/dev/null

echo "== 1) open login =="
$AB open http://localhost:3000
$AB wait --load networkidle
$AB screenshot scripts/verify/01-login.png

echo "== 2) switch to register tab =="
$AB find text "ساخت حساب" click
sleep 1
$AB snapshot -i -c | head -40

echo "== 3) fill register form =="
$AB find label "نام و نام خانوادگی" fill "کاربر تستی واقعی"
$AB find label "ایمیل سازمانی" fill "uitest@rasaweb.ir"
$AB find label "گذرواژه" fill "uitest123"
$AB snapshot -i -c | grep -i "تکرار" | head -3
