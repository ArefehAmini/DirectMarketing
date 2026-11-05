#!/bin/bash
# مرحله ۵ نهایی: رفرش → داده نمونه → اجرای کمپین → موتور → رفرش → ماندگاری
cd /home/z/my-project
source scripts/ensure-server.sh
AB="agent-browser"

$AB open http://localhost:3000
$AB wait --load networkidle
sleep 3

echo "== load sample data =="
REF=$($AB snapshot -i -c 2>&1 | grep "بارگذاری داده نمونه" | grep -o "@e[0-9]*" | head -1)
echo "button ref: $REF"
$AB click $REF
sleep 5

echo "== db check (workspace rows) =="
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.workspace.findMany().then(rows => {
  rows.forEach(r => { const d = JSON.parse(r.data); console.log('row: contacts=' + (d.contacts?.length||0), 'queue=' + (d.queue?.length||0), 'v=' + d.v, 'size=' + Math.round(r.data.length/1024) + 'KB', 'onboarded=' + d.onboarded); });
  console.log('total rows:', rows.length);
  return p.\$disconnect();
}).catch(e => { console.error(e.message); process.exit(1); });
"

echo "== open campaigns =="
$AB find role button click --name "کمپینها"
sleep 2
$AB screenshot scripts/verify/10-campaigns.png
CREF=$($AB snapshot -i -c 2>&1 | grep "شروع ارسال" | grep -o "@e[0-9]*" | head -1)
echo "start button ref: $CREF"
$AB click $CREF
sleep 3
$AB screenshot scripts/verify/11-campaign-running.png

echo "== queue t0 =="
$AB find role button click --name "صف ارسال"
sleep 2
$AB snapshot -c 2>&1 | grep -E "در صف ·|ارسال موفق ·|در حال ارسال ·" | head -4
