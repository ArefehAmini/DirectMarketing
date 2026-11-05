#!/bin/bash
cd /home/z/my-project
setsid bash -c 'exec bunx next dev -p 3000 >> dev.log 2>&1' < /dev/null > /dev/null 2>&1 &
for i in $(seq 1 30); do sleep 2; c=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5); [ "$c" = "200" ] && break; done
echo "server: $c"
AB="agent-browser"

$AB open http://localhost:3000
$AB wait --load networkidle
sleep 4
$AB eval "(() => { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('خروج')); if(b){b.click(); return 'out';} return 'already'; })()"
sleep 2

echo "== A) wrong password =="
$AB find label "ایمیل سازمانی" fill "uitest@rasaweb.ir"
$AB find label "گذرواژه" fill "wrong9999"
$AB find role button click --name "ورود به پنل"
sleep 3
$AB snapshot 2>&1 | grep -A2 "alert" | head -4

echo "== B) correct password → 2FA =="
$AB find label "گذرواژه" fill "uitest123"
$AB find role button click --name "ورود به پنل"
sleep 3
SNAP=$($AB snapshot 2>&1)
echo "$SNAP" | grep -o "تأیید دو مرحله" | head -1
CODE=$(echo "$SNAP" | grep -oE "[0-9]{6}" | head -1)
echo "code: $CODE"

echo "== C) submit OTP =="
OTPREF=$(echo "$SNAP" | grep "کد یکبارمصرف" | grep -oE "e[0-9]+" | tail -1)
$AB fill @$OTPREF "$CODE"
BTNREF=$($AB snapshot -i -c 2>&1 | grep "تأیید و ورود به پنل" | grep -oE "e[0-9]+" | tail -1)
$AB click @$BTNREF
sleep 5
$AB eval "document.body.innerText.includes('پروژه فعال') ? 'DASHBOARD REACHED' : 'FAILED'"
$AB screenshot scripts/verify/17-2fa-success.png
