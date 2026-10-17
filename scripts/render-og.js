// Renders scripts/og.src.html to og.jpg (1200x630), the social share image.
// Usage: node scripts/render-og.js   (needs the playwright devDependency and a Chromium build)
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const opts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
  const browser = await chromium.launch(opts);
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'og.src.html'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(__dirname, '..', 'og.jpg'), type: 'jpeg', quality: 90 });
  await browser.close();
  console.log('og.jpg written');
})();
