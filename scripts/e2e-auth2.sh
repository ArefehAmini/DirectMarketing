#!/bin/bash
# تست تمیز ورود + 2FA بدون قطعه HMR
cd /home/z/my-project
setsid bash -c 'exec bunx next dev -p 3000 >> dev.log 2>&1' < /dev/null > /dev/null 2>&1 &
for i in $(seq 1 30); do sleep 2; c=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 5); [ "$c" = "200" ] && break; done
echo "server: $c"
AB="agent-browser"

$AB open http://localhost:3000
$AB wait --load networkidle
sleep 4

echo "== logout if needed =="
$AB eval "(() => { try { const b=[...document.querySelectorAll('button')].find(x=>x.textContent.includes('خروج')); if(b){b.click(); return 'logged out';} } catch{}; return 'already out'; })()"
sleep 2

echo "== login with wrong password =="
$AB eval "(() => { const em=document.getElementById('email'); const pw=document.getElementById('pass'); if(!em) return 'no form'; const setV=(el,v)=>{const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true}));}; setV(em,'uitest@rasaweb.ir'); setV(pw,'wrong9999'); return 'filled'; })()"
$AB eval "document.querySelector('form').requestSubmit()"
sleep 3
echo "-- error message: --"
$AB eval "document.querySelector('[role=alert]')?.textContent || 'NO ERROR SHOWN'"

echo "== correct password =="
$AB eval "(() => { const pw=document.getElementById('pass'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(pw,'uitest123'); pw.dispatchEvent(new Event('input',{bubbles:true})); return 'ok'; })()"
$AB eval "document.querySelector('form').requestSubmit()"
sleep 3
echo "-- 2FA step: --"
$AB eval "document.body.innerText.includes('تأیید دو مرحله') ? '2FA SHOWN' : 'NOT SHOWN'"
CODE=$($AB eval "((document.body.innerText.match(/(\d{6})/)||[])[1]) || 'none'")
echo "-- code displayed: $CODE --"

echo "== enter code =="
$AB eval "(() => { const el=document.getElementById('otp'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el,'$CODE'); el.dispatchEvent(new Event('input',{bubbles:true})); return 'ok'; })()"
$AB eval "document.querySelector('form').requestSubmit()"
sleep 5
echo "-- landed on dashboard? --"
$AB eval "document.body.innerText.includes('پروژه فعال') ? 'YES — logged in' : 'NO'"
$AB screenshot scripts/verify/17-2fa-success.png
