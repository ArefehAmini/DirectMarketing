// Verify RasaWeb Agent extension installs cleanly (MV3 service worker registers)
const path = require('path');
const fs = require('fs');

async function main() {
  const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright');
  const extPath = '/home/z/my-project/public/extension';
  const userDataDir = '/tmp/ext-verify-profile';

  fs.rmSync(userDataDir, { recursive: true, force: true });

  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${extPath}`,
      `--load-extension=${extPath}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  // Wait for the extension service worker to appear (only succeeds if install passed)
  let sw = ctx.serviceWorkers().find(w => w.url().includes('chrome-extension'));
  const deadline = Date.now() + 15000;
  while (!sw && Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 500));
    sw = ctx.serviceWorkers().find(w => w.url().includes('chrome-extension'));
  }

  if (sw) {
    console.log('✅ INSTALL OK — Service Worker registered:', sw.url());
  } else {
    console.log('❌ No extension service worker found');
    console.log('   backgroundPages:', ctx.backgroundPages().length);
    // Inspect the profile preferences for install state / errors
    const prefPath = path.join(userDataDir, 'Default', 'Secure Preferences');
    const altPath = path.join(userDataDir, 'Default', 'Preferences');
    for (const p of [prefPath, altPath]) {
      if (fs.existsSync(p)) {
        try {
          const prefs = JSON.parse(fs.readFileSync(p, 'utf8'));
          const settings = prefs?.extensions?.settings || {};
          for (const [id, meta] of Object.entries(settings)) {
            console.log(`   ext ${id}: state=${meta.state} path=${meta.path || '?'} disable_reasons=${JSON.stringify(meta.disable_reasons || [])}`);
          }
        } catch (e) { console.log('   prefs read fail:', e.message); }
      }
    }
  }

  // Positive manifest check via the worker's target metadata
  await ctx.close();
  process.exit(sw ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
