#!/usr/bin/env node
/* Smoke test for lowenberg.com.
   Usage: node scripts/check.js [baseUrl] [outDir]
   Serve the repo first, e.g.  python3 -m http.server 8123 --bind 127.0.0.1
   Renders four viewport/theme combinations, saves screenshots to outDir, and
   reports console errors, failed requests, horizontal overflow, invalid JSON-LD,
   and any wrapped row in the hero "Now" list. Exits 1 if anything is wrong. */

const fs = require('fs');
const path = require('path');

const base = process.argv[2] || 'http://127.0.0.1:8123/';
const out = process.argv[3] || 'out';

function loadPlaywright() {
  try { return require('playwright'); } catch (e) { /* fall through */ }
  try { return require('/opt/node-tools/node_modules/playwright'); } catch (e) { /* fall through */ }
  console.error('Playwright not found. npm i -D playwright, or run inside a Claude cloud session.');
  process.exit(2);
}

(async () => {
  const { chromium } = loadPlaywright();
  fs.mkdirSync(out, { recursive: true });
  const launch = { args: ['--no-sandbox'] };
  if (fs.existsSync('/opt/pw-browsers/chromium')) launch.executablePath = '/opt/pw-browsers/chromium';
  const browser = await chromium.launch(launch);
  const issues = [];

  async function run(name, viewport, colorScheme) {
    const ctx = await browser.newContext({ viewport, colorScheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => issues.push(`${name}: pageerror ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') issues.push(`${name}: console ${m.text()}`); });
    page.on('requestfailed', (r) => issues.push(`${name}: request failed ${r.url()}`));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('in')));
    await page.waitForTimeout(800);

    const m = await page.evaluate(() => {
      const d = document.documentElement;
      const li = document.querySelector('.hero__now li');
      const spans = li ? li.querySelectorAll('span') : [];
      let ld = 'missing';
      const s = document.querySelector('script[type="application/ld+json"]');
      if (s) { try { JSON.parse(s.textContent); ld = 'valid'; } catch (e) { ld = 'INVALID ' + e.message; } }
      return {
        overflow: d.scrollWidth > d.clientWidth ? `${d.scrollWidth} > ${d.clientWidth}` : null,
        heroRowWrapped: spans.length === 2 && spans[0].getBoundingClientRect().height > 26,
        ld,
        nowWidths: Array.from(document.querySelectorAll('.now > li')).map((el) => Math.round(el.getBoundingClientRect().width)),
      };
    });
    if (m.overflow) issues.push(`${name}: horizontal overflow ${m.overflow}`);
    if (m.heroRowWrapped) issues.push(`${name}: first hero Now row wraps`);
    if (m.ld !== 'valid') issues.push(`${name}: JSON-LD ${m.ld}`);
    console.log(`${name}: now card widths ${m.nowWidths.join(',')}`);

    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
    await ctx.close();
  }

  await run('desktop-dark', { width: 1440, height: 900 }, 'dark');
  await run('desktop-light', { width: 1440, height: 900 }, 'light');
  await run('tablet-dark', { width: 820, height: 1180 }, 'dark');
  await run('phone-light', { width: 390, height: 844 }, 'light');
  await browser.close();

  if (issues.length) {
    console.error('ISSUES:\n' + issues.join('\n'));
    process.exit(1);
  }
  console.log('no issues; screenshots in', out);
})();
