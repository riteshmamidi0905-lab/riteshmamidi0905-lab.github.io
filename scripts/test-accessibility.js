'use strict';
const {chromium}=require('playwright'),AxeBuilder=require('@axe-core/playwright').default,assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});const {serveLocal,base}=require('./local-preview');
for(const width of [1440,390]){const context=await browser.newContext({reducedMotion:'reduce',viewport:{width,height:1000}});const page=await context.newPage();await serveLocal(page);await page.goto(base);const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();console.log(JSON.stringify({width,violations:result.violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))}));assert.deepEqual(result.violations,[]);await context.close();}
await browser.close();})().catch(e=>{console.error(e.message);process.exit(1)});
