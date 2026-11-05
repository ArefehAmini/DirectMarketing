#!/bin/bash
cd /home/z/my-project
source scripts/ensure-server.sh
AB="agent-browser"

echo "== load sample data from onboarding =="
$AB find text "بارگذاری داده نمونه برای تست" click
sleep 2
$AB screenshot scripts/verify/03-dashboard-sample.png

echo "== go to campaigns =="
$AB find role button click --name "کمپینها"
sleep 1.5
$AB snapshot -i -c | grep -E "شروع ارسال|بازبینی|توقف|ادامه" | head -8

echo "== campaign counters before =="
$AB snapshot -c | grep -E "ارسال‌شده|در حال اجرا|زمان‌بندی" | head -6
