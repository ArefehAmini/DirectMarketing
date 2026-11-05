#!/bin/bash
# راستی‌آزمایی چشمی پنل: بخش تیکت + نسخهٔ افزونه 1.2.6 + انتخابگر تم
cd /home/z/my-project
AB="agent-browser"
mkdir -p scripts/verify

$AB close 2>/dev/null; sleep 1
$AB open http://localhost:3000
$AB wait --load networkidle
sleep 4
SNAP=$($AB snapshot 2>&1)

echo "== ۱) وضعیت صفحهٔ اول =="
if echo "$SNAP" | grep -q "ورود به پنل"; then
  echo "صفحهٔ ورود است — لاگین با uitest@rasaweb.ir"
  $AB find label "ایمیل سازمانی" fill "uitest@rasaweb.ir"
  $AB find label "گذرواژه" fill "uitest123"
  $AB find role button click --name "ورود به پنل"
  sleep 4
  SNAP=$($AB snapshot 2>&1)
  # OTP — کد در صفحه نمایش داده می‌شود (حالت dev)
  if echo "$SNAP" | grep -q "دو مرحله"; then
    CODE=$(echo "$SNAP" | grep -oE "\b[0-9]{6}\b" | head -1)
    echo "OTP code: $CODE"
    $AB find role textbox fill "$CODE" 2>/dev/null || $AB find input fill "$CODE"
    sleep 1
    $AB find role button click --name "تأیید" 2>/dev/null || $AB find role button click --name "بررسی"
    sleep 4
  fi
fi
sleep 2
$AB screenshot scripts/verify/20-after-login.png

echo "== ۲) جستجوی «تیکت پشتیبانی» در سایدبار =="
SNAP=$($AB snapshot 2>&1)
echo "$SNAP" | grep -n "تیکت پشتیبانی" && echo "✓ بخش تیکت در سایدبار هست" || echo "✗ بخش تیکت در سایدبار نیست!"
echo "$SNAP" | grep -n "پشتیبانی" | head -3

echo "== ۳) رفتن به بخش افزونه کروم =="
$AB find text "افزونه" click 2>/dev/null || $AB find text "افزونه کروم" click 2>/dev/null
sleep 3
SNAP=$($AB snapshot 2>&1)
echo "$SNAP" | grep -oE "v?1\.2\.6" | head -3 && echo "✓ نسخهٔ 1.2.6 در UI هست" || echo "✗ نسخهٔ 1.2.6 دیده نشد"
echo "$SNAP" | grep -n "دانلود افزونه" | head -2
$AB screenshot scripts/verify/21-extension-view.png

echo "== ۴) انتخابگر تم در تاپ‌بار =="
SNAP=$($AB snapshot 2>&1)
echo "$SNAP" | grep -n "تم\|ظاهر" | head -5
$AB screenshot scripts/verify/22-topbar-theme.png

echo "== ۵) رفتن به تیکت پشتیبانی =="
$AB find text "تیکت پشتیبانی" click 2>/dev/null
sleep 3
SNAP=$($AB snapshot 2>&1)
echo "$SNAP" | grep -n "تیکت" | head -5
$AB screenshot scripts/verify/23-tickets-view.png

echo "== ۶) رفتن به تنظیمات برای کارت تم =="
$AB find text "تنظیمات" click 2>/dev/null
sleep 3
$AB screenshot scripts/verify/24-settings-theme.png

echo "== پایان =="
