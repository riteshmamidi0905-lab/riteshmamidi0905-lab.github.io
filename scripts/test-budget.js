/* Performance budgets, measured on a real first visit (gzip sizes, as GitHub Pages serves them). Fails if a budget is exceeded.
   Also asserts the heavy things are lazy: lab code, videos and project visuals must not load before they are needed. */
'use strict';
const { chromium } = require('playwright'); const zlib = require('zlib'); const assert = require('node:assert/strict');
const { serveLocal, base } = require('./local-preview');
const KB = 1024;
const BUDGET = { html: 48 * KB, css: 26 * KB, js: 40 * KB, fonts: 100 * KB, images: 260 * KB, total: 440 * KB, requests: 24, cls: 0.1 };
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const out = {};
  for (const [label, viewport, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['mobile', { width: 390, height: 844 }, true]]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1 }); await ctx.addInitScript(() => { try { localStorage.setItem('rm-intro-seen', '1'); } catch (e) { } window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
    const page = await ctx.newPage(); const sizes = { html: 0, css: 0, js: 0, fonts: 0, images: 0, other: 0 }; const urls = [];
    page.on('response', async (r) => { try { const u = r.url(); if (!u.startsWith(base)) return; const b = await r.body(); const gz = /\.(woff2|webp|png|jpg|mp4)$/.test(u) ? b.length : zlib.gzipSync(b).length; urls.push(u.replace(base, '')); const t = /\.css/.test(u) ? 'css' : /\.js/.test(u) ? 'js' : /\.woff2/.test(u) ? 'fonts' : /\.(webp|png|jpg|svg)/.test(u) ? 'images' : /\.html|\/$/.test(u) || u === base ? 'html' : 'other'; sizes[t] += gz; } catch (e) { /* aborted */ } });
    await serveLocal(page); await page.goto(base, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
    const cls = await page.evaluate(() => window.__cls); const total = Object.values(sizes).reduce((a, b) => a + b, 0);
    out[label] = { ...Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, Math.round(v / KB * 10) / 10 + ' KB'])), total: Math.round(total / KB) + ' KB', requests: urls.length, cls: Math.round(cls * 1000) / 1000 };
    for (const k of ['html', 'css', 'js', 'fonts', 'images']) assert.ok(sizes[k] <= BUDGET[k], `${label}: ${k} ${Math.round(sizes[k] / KB)} KB > budget ${BUDGET[k] / KB} KB`);
    assert.ok(total <= BUDGET.total, `${label}: total ${Math.round(total / KB)} KB > ${BUDGET.total / KB} KB`); assert.ok(urls.length <= BUDGET.requests, `${label}: ${urls.length} requests > ${BUDGET.requests}`); assert.ok(cls <= BUDGET.cls, `${label}: CLS ${cls}`);
    for (const lazy of [/lab\/(eval|rag|stats)-core/, /lab-ui\.js/, /\.mp4/, /project-visuals\//]) assert.ok(!urls.some((u) => lazy.test(u)), `${label}: ${lazy} loaded before it was needed`);
    await ctx.close();
  }
  console.log(JSON.stringify({ budgets: Object.fromEntries(Object.entries(BUDGET).map(([k, v]) => [k, k === 'cls' || k === 'requests' ? v : v / KB + ' KB'])), measured: out }, null, 1));
  await browser.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
