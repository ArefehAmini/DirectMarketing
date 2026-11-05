#!/bin/bash
# تست نهایی: خروج → خطای گذرواژه غلط → ورود با 2FA → پیام ورودی زنده Inbox
cd /home/z/my-project
setsid bash -c 'exec bunx next dev -p 3000 >> dev.log 2>&1' < /dev/null > /dev/null 2>&1 &
for i in $(seq 1 30); do sleep 2; c=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5); [ "$c" = "200" ] && break; done
echo "server: $c"
AB="agent-browser"

$AB open http://localhost:3000
$AB wait --load networkidle
sleep 4

echo "== 1) logout =="
$AB find role button click --name "خروج"
sleep 2
$AB snapshot -c 2>&1 | grep -E "ورود به پنل" | head -1

echo "== 2) wrong password error =="
$AB find label "ایمیل سازمانی" fill "uitest@rasaweb.ir"
$AB find label "گذرواژه" fill "wrongpass99"
$AB find role button click --name "ورود به پنل"
sleep 3
$AB snapshot -c 2>&1 | grep -E "ایمیل یا گذرواژه اشتباه" | head -1
$AB screenshot scripts/verify/16-login-error.png

echo "== 3) correct password → 2FA step =="
$AB find label "گذرواژه" fill "uitest123"
$AB find role button click --name "ورود به پنل"
sleep 3
$AB snapshot -c 2>&1 | grep -E "تأیید دو مرحله‌ای" | head -1
CODE=$($AB snapshot -c 2>&1 | grep -oE "[۰-۹]{6}" | head -1)
echo "2FA code shown: $CODE"

echo "== 4) wrong OTP then correct OTP =="
$AB snapshot -i -c 2>&1 | grep "کد یک‌بارمصرف" | head -1
OTPREF=$($AB snapshot -i -c 2>&1 | grep "کد یکبارمصرف\|کد یک‌بارمصرف" | grep -oE "e[0-9]+" | tail -1)
$AB fill @$OTPREF "000000"
$AB find role button click --name "تأیید و ورود به پنل"
sleep 2
$AB snapshot -c 2>&1 | grep -E "کد واردشده صحیح نیست" | head -1
$AB fill @$OTPREF "$CODE"
$AB find role button click --name "تأیید و ورود به پنل"
sleep 4
$AB snapshot -c 2>&1 | grep -E "پروژه فعال" | head -1
$AB screenshot scripts/verify/17-2fa-success.png

echo "== 5) live inbox message check =="
$AB find role button click --name "صندوق ورودی"
sleep 16
$AB screenshot scripts/verify/18-inbox.png
$AB snapshot -c 2>&1 | grep -E "خوانده‌نشده|دقیقه پیش" | head -3
