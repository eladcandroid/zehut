#!/usr/bin/env node
// CDP driver against the user's existing Chrome at CDP_URL (default http://127.0.0.1:9222).
// Uses browser.targets() instead of browser.pages() to dodge a Chrome 148 iframe-enumeration hang.
//
// Usage:
//   cdp-driver.mjs open <url>            # new tab, navigate, bring-to-front
//   cdp-driver.mjs goto <url>            # navigate the most-recently-opened cdp tab
//   cdp-driver.mjs tabs                  # list page targets
//   cdp-driver.mjs url                   # active tab url
//   cdp-driver.mjs title                 # active tab title
//   cdp-driver.mjs text [selector]       # innerText of selector (default body)
//   cdp-driver.mjs click <selector>      # click element
//   cdp-driver.mjs fill <selector> <val> # set value + dispatch input/change
//   cdp-driver.mjs press <key>           # press a key on the focused element
//   cdp-driver.mjs eval <js>             # evaluate JS, print JSON result
//   cdp-driver.mjs wait-url <substring> [timeoutMs]
//   cdp-driver.mjs screenshot <path>
//
// CDP_TAB env var pins the active tab to a known targetId across calls.
import puppeteer from 'puppeteer-core';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const CDP_URL = process.env.CDP_URL || 'http://127.0.0.1:9222';
const TAB_FILE = '/tmp/cdp-active-tab';

async function getWs() {
  const r = await fetch(`${CDP_URL}/json/version`);
  if (!r.ok) throw new Error(`/json/version returned ${r.status}`);
  return (await r.json()).webSocketDebuggerUrl;
}

async function connect() {
  const ws = await getWs();
  return await puppeteer.connect({ browserWSEndpoint: ws, defaultViewport: null });
}

function saveTab(id) { writeFileSync(TAB_FILE, id, 'utf8'); }
function loadTab() {
  if (!existsSync(TAB_FILE)) return null;
  try { return readFileSync(TAB_FILE, 'utf8').trim() || null; } catch { return null; }
}

async function getActivePage(browser) {
  const targets = await browser.targets();
  const pages = targets.filter((t) => t.type() === 'page');
  if (pages.length === 0) return null;
  const id = loadTab();
  if (id) {
    const m = pages.find((t) => t._targetId === id);
    if (m) return await m.page();
  }
  return await pages[pages.length - 1].page();
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd) {
    console.error('usage: cdp-driver.mjs <open|goto|tabs|url|title|text|click|fill|press|eval|wait-url|screenshot> ...');
    process.exit(2);
  }

  const browser = await connect();
  try {
    if (cmd === 'tabs') {
      const targets = await browser.targets();
      for (const t of targets.filter((x) => x.type() === 'page')) {
        const id = t._targetId || '';
        console.log(`${id}\t${t.url()}`);
      }
      return;
    }

    if (cmd === 'open') {
      const url = args[0];
      if (!url) { console.error('open needs <url>'); process.exit(2); }
      const page = await browser.newPage();
      const targetId = page.target()._targetId;
      if (targetId) saveTab(targetId);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.bringToFront();
      console.log(page.url());
      return;
    }

    const page = await getActivePage(browser);
    if (!page) { console.error('no active page'); process.exit(1); }

    if (cmd === 'goto') {
      await page.goto(args[0], { waitUntil: 'domcontentloaded', timeout: 30000 });
      console.log(page.url());
    } else if (cmd === 'url') {
      console.log(page.url());
    } else if (cmd === 'title') {
      console.log(await page.title());
    } else if (cmd === 'text') {
      const sel = args[0] || 'body';
      try {
        const t = await page.$eval(sel, (el) => el.innerText);
        console.log(t.slice(0, 8000));
      } catch (e) {
        console.error('not found:', sel);
        process.exit(1);
      }
    } else if (cmd === 'click') {
      await page.click(args[0]);
      console.log('clicked', args[0]);
    } else if (cmd === 'fill') {
      const [sel, ...rest] = args;
      const val = rest.join(' ');
      await page.$eval(sel, (el, v) => {
        const proto = Object.getPrototypeOf(el);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, v); else el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, val);
      console.log('filled', sel);
    } else if (cmd === 'press') {
      await page.keyboard.press(args[0]);
      console.log('pressed', args[0]);
    } else if (cmd === 'type') {
      await page.keyboard.type(args.join(' '));
      console.log('typed');
    } else if (cmd === 'eval') {
      const js = args.join(' ');
      const result = await page.evaluate(js);
      console.log(JSON.stringify(result, null, 2));
    } else if (cmd === 'wait-url') {
      const needle = args[0];
      const timeout = parseInt(args[1] || '60000', 10);
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (page.url().includes(needle)) { console.log(page.url()); return; }
        await new Promise((r) => setTimeout(r, 1000));
      }
      console.error('timed out, url is:', page.url());
      process.exit(1);
    } else if (cmd === 'screenshot') {
      const path = args[0] || '/tmp/cdp-shot.png';
      await page.screenshot({ path, fullPage: false });
      console.log(path);
    } else {
      console.error('unknown command:', cmd);
      process.exit(2);
    }
  } finally {
    browser.disconnect();
  }
}

main().catch((e) => { console.error(e?.message || e); process.exit(1); });
