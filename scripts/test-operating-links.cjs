'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const {AxeBuilder} = require('@axe-core/playwright');

const base = process.argv[2] || 'http://127.0.0.1:8000/';
const colors = {paper: 'rgb(121, 81, 47)', forest: 'rgb(217, 174, 131)'};
const observations = [];
const failures = [];

async function inspectLinks(page, width, view, targets = 'a[href]') {
  const sample = await page.locator(targets).evaluateAll((links, palette) => {
    const styles = {};
    const mismatches = [];
    for (const link of links) {
      const style = getComputedStyle(link);
      const key = [style.color, style.textDecorationLine, style.textUnderlineOffset].join(' / ');
      styles[key] = (styles[key] || 0) + 1;
      const expected = link.closest('.workspace-links, .portfolio-foot') ? palette.forest : palette.paper;
      // Graphic map doors have an explicitly painted underline on their text plate.
      const svg = link instanceof SVGElement;
      const htmlUnderline = style.textDecorationLine.includes('underline') && style.textUnderlineOffset === '4px';
      if (style.color !== expected || (!svg && !htmlUnderline)) {
        mismatches.push({label: (link.getAttribute('aria-label') || link.textContent).trim().slice(0, 68), style: key});
      }
    }
    return {links: links.length, styles, mismatchCount: mismatches.length, examples: mismatches.slice(0, 4)};
  }, colors);
  assert.ok(sample.links > 0, view+' must exercise real links');
  observations.push({width, view, ...sample});
  if (sample.mismatchCount) failures.push(width+' '+view+': '+sample.mismatchCount+' incorrect computed styles');
}

async function inspectContrast(page, width, view) {
  const audit = await new AxeBuilder({page}).include('a[href]').withRules(['color-contrast']).analyze();
  const samples = audit.passes.flatMap(rule => rule.nodes.flatMap(node => node.any
    .map(check => check.data).filter(data => data && Number.isFinite(data.contrastRatio))));
  const palette = [...new Map(samples.map(sample =>
    [sample.fgColor+'/'+sample.bgColor, {ink:sample.fgColor, ground:sample.bgColor, ratio:sample.contrastRatio}]
  )).values()];
  // Both NASHA surfaces must actually be measured in the rendered page.
  assert.ok(palette.some(s => s.ink==='#79512f' && s.ratio>=4.5), view+' paper links');
  assert.ok(palette.some(s => s.ink==='#d9ae83' && s.ground==='#172c26' && s.ratio>=4.5), view+' forest links');
  const violations = audit.violations.flatMap(rule => rule.nodes.map(node =>
    ({target:node.target, contrast:node.any.map(check => check.data)})));
  observations.push({width, view:view+' rendered contrast', palette, measured:samples.length, violations});
  if (violations.length) failures.push(width+' '+view+': '+violations.length+' link contrast violations');
}

async function inspectFocus(page, width, selector, view) {
  const link = page.locator(selector).first();
  await page.keyboard.press('Tab');
  await link.focus();
  assert.ok(await link.evaluate(a => a.matches(':focus-visible') &&
    getComputedStyle(a).outlineStyle !== 'none'), view+' keyboard focus must be visible');
  await inspectLinks(page, width, view+' keyboard focus', selector+':focus');
  await page.mouse.move(0, 0);
  await link.hover();
  await inspectLinks(page, width, view+' hover', selector+':hover');
}

async function runViewport(browser, width) {
  const context = await browser.newContext({viewport: {width, height: width === 390 ? 844 : 900}, reducedMotion: 'reduce'});
  const page = await context.newPage();
  try {
    await page.goto(new URL('pavilion/district.html', base).href);
    await page.locator('[data-door=stadium] small').first().waitFor();
    await inspectLinks(page, width, 'District');
    const labels = await page.locator('.district-labels a').evaluateAll((links, bronze) =>
      links.filter(link => link.getBoundingClientRect().width > 0).map(link => {
        const label = link.querySelector('.lot-name');
        const line = link.querySelector('.lot-link-underline');
        const transform = label.getScreenCTM();
        const gap = line && (line.y1.baseVal.value - label.y.baseVal[0].value) * transform.d;
        return {name:label.textContent, gapPx:gap, bronzeUnderline:!!line && getComputedStyle(line).stroke===bronze,
          bronzeType:getComputedStyle(label).fill===bronze};
      }), colors.paper);
    assert.ok(labels.length >= 7 && labels.every(label => label.bronzeType && label.bronzeUnderline && label.gapPx>=1),
      'Every visible district name needs bronze type and a separately painted underline with a measurable offset');
    observations.push({width, view:'Visible district map label ink and underline distance', labels});
    const crumb = page.locator('.crumb a');
    await page.evaluate(() => document.fonts.ready);
    const beforeVisit = await crumb.screenshot();
    await crumb.click();
    await page.waitForURL('**/pavilion/index.html');
    await page.goBack();
    await page.locator('[data-door=stadium] small').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(0, 0);
    await crumb.blur();
    // Computed styles intentionally conceal browser history. Also compare the actual painted link.
    const sameAfterVisit = beforeVisit.equals(await crumb.screenshot());
    observations.push({width, view: 'District breadcrumb after a real same-tab visit and return', sameAfterVisit});
    if (!sameAfterVisit) failures.push(width+' breadcrumb changed its painted style after visiting');
    await inspectFocus(page, width, '.crumb a', 'District breadcrumb');
    await inspectContrast(page, width, 'District');

    await page.goto(new URL('pavilion/stadium.html?day=3', base).href);
    await page.locator('#vendor-results tbody tr').first().waitFor();
    await inspectLinks(page, width, 'Stadium');
    await page.locator('#ask-open').click();
    await page.locator('.question-examples button').first().click();
    await page.locator('#ask-floor .citations summary').click();
    await inspectLinks(page, width, 'Stadium ledger answer citations', '#ask-floor .citations a[data-record]');
    await inspectFocus(page, width, '#ask-floor .citations a', 'Stadium citation');
    await page.locator('#ask-floor .dismiss').click();
    const tieOut = page.locator('#venue-close a');
    await tieOut.click();
    await page.locator('#venue-record h2').waitFor();
    await inspectLinks(page, width, 'Venue settlement');
    await inspectFocus(page, width, '#venue-close a', 'Daily settlement');
    await page.locator('#hide-record').click();
    await page.locator('#print-report > summary').click();
    await page.locator('#venue-report .print-section').last().waitFor();
    assert.equal(await page.locator('#venue-report .print-section').count(), 7);
    await inspectLinks(page, width, 'Six vendor reports and operator report', '#venue-report a[href]');
    await inspectFocus(page, width, '#venue-report a', 'Vendor report');
    await inspectContrast(page, width, 'Stadium and settlement reports');

    await page.goto(new URL('pavilion/simulator.html?template=brewery', base).href);
    await page.locator('#confirm button:not([type=button])').click();
    await page.locator('#report').click();
    await page.locator('.report-sheet').first().waitFor();
    assert.equal(await page.locator('.report-sheet').count(), 7);
    await inspectLinks(page, width, 'Launch readiness report');
    await inspectFocus(page, width, '.report-sheet a', 'Readiness report');
    await inspectFocus(page, width, '.workspace-links a', 'Report workspace navigation');
    await inspectContrast(page, width, 'Launch readiness report');
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium'});
  try {
    for (const width of [1440, 390]) await runViewport(browser, width);
  } finally {
    await browser.close();
    const receipt = {observations, failures};
    if (process.env.CYCLE13_EVIDENCE) {
      fs.writeFileSync(path.join(process.env.CYCLE13_EVIDENCE, 'checks', 'operating-links.json'), JSON.stringify(receipt, null, 2)+'\n');
    }
    console.log(JSON.stringify({views: observations.length, linksExamined: observations.reduce((n, v) => n+(v.links || 0), 0), failures}));
  }
  assert.deepEqual(failures, []);
})().catch(error => {console.error(error);process.exitCode=1;});
