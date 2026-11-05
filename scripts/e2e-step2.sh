#!/bin/bash
cd /home/z/my-project
source scripts/ensure-server.sh
AB="agent-browser"

echo "== reload + register flow in one session =="
$AB open http://localhost:3000
$AB wait --load networkidle
$AB find text "ساخت حساب" click
sleep 0.5

$AB find label "نام و نام خانوادگی" fill "کاربر تستی واقعی"
$AB find label "ایمیل سازمانی" fill "uitest@rasaweb.ir"
$AB find label "گذرواژه" fill "uitest123"
$AB find label "تکرار گذرواژه" fill "uitest123"
$AB snapshot -i -c | grep -E "checkbox|ساخت حساب و ورود" | head -4
$AB find role checkbox check
$AB find role button click --name "ساخت حساب و ورود"
sleep 4
$AB screenshot scripts/verify/02-onboarding.png
echo "== after register =="
$AB snapshot -c | head -40
echo "== workspace keys =="
$AB storage local 2>/dev/null | grep -o 'rasaweb-ws:[a-zA-Z@.]*' | sort -u
