#!/bin/bash
# تست نهایی کامل: بازیابی → داده نمونه → ذخیره سرور → کمپین → موتور → رفرش → ماندگاری
cd /home/z/my-project
setsid bash -c 'exec bunx next dev -p 3000 >> dev.log 2>&1' < /dev/null > /dev/null 2>&1 &
for i in $(seq 1 30); do sleep 2; c=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5); [ "$c" = "200" ] && break; done
echo "server: $c"
AB="agent-browser"

$AB open http://localhost:3000
$AB wait --load networkidle
sleep 4

echo "== 1) dashboard + load sample =="
$AB find role button click --name "داشبورد"
sleep 2
REF=$($AB snapshot -i -c 2>&1 | grep "بارگذاری داده نمونه" | grep -oE "e[0-9]+" | tail -1)
$AB click @$REF
sleep 7
echo "== 2) DB after save =="
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.workspace.findMany().then(rows => { rows.forEach(r => { let d={}; try{d=JSON.parse(r.data)}catch{}; console.log('contacts=' + (d.contacts?.length||0), 'accounts=' + (d.accounts?.length||0), 'size=' + Math.round(r.data.length/1024) + 'KB', 'onboarded=' + d.onboarded); }); return p.\$disconnect(); });
"

echo "== 3) start scheduled campaign =="
$AB find role button click --name "کمپینها"
sleep 2
REF2=$($AB snapshot -i -c 2>&1 | grep "شروع ارسال" | grep -oE "e[0-9]+" | tail -1)
$AB click @$REF2
sleep 3
$AB screenshot scripts/verify/13-campaign-running.png

echo "== 4) queue t0 =="
$AB find role button click --name "صف ارسال"
sleep 2
$AB snapshot -c 2>&1 | grep -E "در صف ·|ارسال موفق ·" | head -3

echo "== 5) wait 14s (engine) =="
sleep 14
$AB snapshot -c 2>&1 | grep -E "در صف ·|ارسال موفق ·" | head -3
$AB screenshot scripts/verify/14-queue-after-engine.png

echo "== 6) reload → persistence + resume =="
$AB reload
$AB wait --load networkidle
sleep 5
$AB find role button click --name "صف ارسال"
sleep 3
$AB snapshot -c 2>&1 | grep -E "در صف ·|ارسال موفق ·|ورود به پنل" | head -3
$AB screenshot scripts/verify/15-after-reload.png

echo "== 7) final DB check =="
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.workspace.findMany().then(rows => { rows.forEach(r => { let d={}; try{d=JSON.parse(r.data)}catch{}; console.log('contacts=' + (d.contacts?.length||0), 'queue=' + (d.queue?.length||0), 'onboarded=' + d.onboarded); }); return p.\$disconnect(); });
"
