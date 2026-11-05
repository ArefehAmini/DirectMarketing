#!/bin/bash
# مرحله ۴: رفرش → بازیابی نشست و فضای کاری از سرور → بارگذاری داده نمونه → ذخیره سرور
cd /home/z/my-project
source scripts/ensure-server.sh
AB="agent-browser"

echo "== reload with new bundle =="
$AB open http://localhost:3000
$AB wait --load networkidle
sleep 3
echo "== session restored? =="
$AB snapshot -c 2>&1 | grep -E "خوش آمدید|ورود به پنل" | head -2

echo "== load sample data (onboarding) =="
$AB snapshot -i -c 2>&1 | grep "بارگذاری داده نمونه" | head -2
$AB find text "بارگذاری داده نمونه برای تست" click
sleep 5
$AB screenshot scripts/verify/09-sample-loaded.png

echo "== verify server has workspace (row in sqlite) =="
bunx prisma studio --help > /dev/null 2>&1
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.workspace.findMany({ select: { userId: true, updatedAt: true } }).then(rows => { console.log('workspace rows:', rows.length, JSON.stringify(rows.map(r=>r.updatedAt))); return p.\$disconnect(); }).catch(e => { console.error(e.message); process.exit(1); });
"
