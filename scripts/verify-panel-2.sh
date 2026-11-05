#!/bin/bash
# راستی‌آزمایی نهایی: تیکت + افزونه 1.2.6 + تم با کاربر تستی uitest2
cd /home/z/my-project
AB="agent-browser"

$AB close 2>/dev/null; sleep 1
$AB open http://localhost:3000
$AB wait --load networkidle
sleep 4

echo "== لاگین =="
$AB find label "ایمیل سازمانی" fill "uitest2@rasaweb.ir"
$AB find label "گذرواژه" fill "uitest123"
$AB find role button click --name "ورود به پنل"
sleep 4
SNAP=$($AB snapshot 2>&1)
if echo "$SNAP" | grep -qE "دو مرحله|کد"; then
  CODE=$(echo "$SNAP" | grep -oE "\b[0-9]{6}\b" | head -1)
  echo "OTP: $CODE"
  if [ -n "$CODE" ]; then
    $AB find role textbox fill "$CODE" 2>/dev/null || $AB find input fill "$CODE"
    sleep 1
    $AB find role button click --name "ورود" 2>/dev/null
    sleep 4
  fi
fi
SNAP=$($AB snapshot 2>&1)
$AB screenshot scripts/verify/25-dashboard.png

echo "== ۱) تیکت پشتیبانی در سایدبار =="
echo "$SNAP" | grep -c "تیکت پشتیبانی"
echo "== ۲) بخش افزونه =="
echo "$SNAP" | grep -oE "افزونه کروم" | head -1
