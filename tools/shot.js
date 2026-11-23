#!/usr/bin/env node
// ================================================================
// File: tools/shot.js
// Description: Takes a screenshot of the running CARE Garden (or the
//   sprite viewer) in headless Chromium with a fake webcam, so changes
//   can be checked without a TV and a camera.
//
// Usage:
//   python3 server.py 8000 &
//   node tools/shot.js "<url>" out.png [options]
//
//   --wait 4000          ms to let the scene run before the shot
//   --keys r,ArrowUp     keys to press after load (see README controls)
//   --clip x,y,w,h       crop to a screen-pixel rectangle
//   --zoom 3             enlarge the (cropped) shot with crisp pixels
//   --size 1920x1080     viewport size
//   --frames 4 --every 500   take several shots: out-0.png, out-1.png ...
//
// The page takes debug parameters, e.g.
//   http://localhost:8000/?t=0.9&weather=rainy&flowers=30&spawn=kids&seed=4
// (see "Debug URL parameters" in sketch.js).
// Requires Playwright (npm i -D playwright, or a global install).
// ================================================================
const { chromium } = require('playwright');

(async () => {
  const args = process.argv.slice(2);
  const pos = [], opt = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
    else pos.push(args[i]);
  }
  const [url, out] = pos;
  if (!url || !out) { console.error('usage: node tools/shot.js <url> <out.png> [options]'); process.exit(1); }
  const [vw, vh] = (opt.size || '1920x1080').split('x').map(Number);
  const browser = await chromium.launch({
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
           '--autoplay-policy=no-user-gesture-required'],
  });
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, permissions: ['camera'] });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', e => problems.push('ERROR ' + e.message));
  page.on('console', m => {
    const text = m.text();
    if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource|ERR_TUNNEL|ERR_INTERNET|backend was already registered|Platform browser has already/.test(text)) {
      problems.push(m.type().toUpperCase() + ' ' + text.slice(0, 300));
    }
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  for (const k of (opt.keys || '').split(',').filter(Boolean)) {
    await page.keyboard.press(k);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(parseInt(opt.wait || '3000'));

  const frames = parseInt(opt.frames || '1');
  for (let i = 0; i < frames; i++) {
    const path = frames > 1 ? out.replace(/\.png$/, `-${i}.png`) : out;
    const shotOpts = { path };
    if (opt.clip) {
      const [x, y, width, height] = opt.clip.split(',').map(Number);
      shotOpts.clip = { x, y, width, height };
    }
    await page.screenshot(shotOpts);
    if (opt.zoom) await enlarge(browser, path, parseInt(opt.zoom));
    if (i < frames - 1) await page.waitForTimeout(parseInt(opt.every || '500'));
  }
  // Known noise from the vendored ML library when there is no network
  const real = problems.filter(p => !/makeTensor/.test(p));
  console.log(real.length ? [...new Set(real)].slice(0, 20).join('\n') : 'no page errors');
  await browser.close();
})();

// Re-saves a PNG enlarged k times with nearest-neighbour scaling.
async function enlarge(browser, path, k) {
  const fs = require('fs');
  const b64 = fs.readFileSync(path).toString('base64');
  const page = await browser.newPage();
  const size = await page.evaluate(async ({ b64, k }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.width * k; cv.height = img.height * k;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(img, 0, 0, cv.width, cv.height);
    document.body.style.margin = '0';
    document.body.appendChild(cv);
    return { width: cv.width, height: cv.height };
  }, { b64, k });
  await page.setViewportSize(size);
  await page.screenshot({ path });
  await page.close();
}
