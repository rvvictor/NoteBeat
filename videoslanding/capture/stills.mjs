import { chromium } from 'playwright';

const HIDE = () => {
  const s = document.createElement('style');
  s.textContent = 'nextjs-portal{display:none!important}*{scrollbar-width:none!important}*::-webkit-scrollbar{display:none!important}';
  const add = () => document.documentElement.appendChild(s);
  if (document.documentElement) add(); else addEventListener('DOMContentLoaded', add, { once: true });
};

const b = await chromium.launch();
const ctx = await b.newContext({
  ignoreHTTPSErrors: true, storageState: 'state.json',
  viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2,
});
await ctx.addInitScript(HIDE);
const p = await ctx.newPage();

const CENTER = { x: 360, y: 60, width: 738, height: 553 };      // 4:3 crop of the center panel
const FEED   = { x: 360, y: 300, width: 738, height: 553 };
const MODAL  = { x: 291, y: 128, width: 859, height: 644 };     // 4:3 around the thread modal
const RECAP  = { x: 333, y: 63, width: 774, height: 774 };      // square around the recap modal

const go = async () => {
  await p.goto('https://localhost:3000/dashboard', { waitUntil: 'networkidle' });
  await p.waitForSelector('.home-quick-textarea', { timeout: 40000 });
  await p.waitForTimeout(3500);
};

// 1 — create a note with music
await go();
await p.click('.home-quick-textarea');
await p.keyboard.type('Rain all afternoon and I did not mind it once. Some days the weather just agrees with you.', { delay: 4 });
await p.click('#quick-song-search');
await p.keyboard.type('my love mine all mine', { delay: 6 });
await p.waitForSelector('.home-quick-recs-title:has-text("Search results")', { timeout: 30000 });
await p.waitForTimeout(1500);
await p.locator('.home-quick-track').first().click();
await p.waitForSelector('.home-quick-selected', { timeout: 15000 });
await p.waitForTimeout(1200);
await p.screenshot({ path: 'still-create.png', clip: CENTER });
console.log('still-create');

// 2 — a private note becoming a public thread
await go();
await p.locator('.home-note-thread-button').first().click();
await p.waitForSelector('.home-thread-modal-card', { timeout: 15000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: 'still-share.png', clip: MODAL });
console.log('still-share');

// 3 — the feed
await go();
await p.evaluate(() => { const el = document.querySelector('.home-center-panel'); if (el) el.scrollTop = 430; });
await p.waitForTimeout(1600);
await p.screenshot({ path: 'still-feed.png', clip: FEED });
console.log('still-feed');

// 4 — the AI recap panel
await go();
await p.getByRole('button', { name: /^view$/i }).first().click();
await p.waitForTimeout(3000);
await p.getByRole('button', { name: /^year$/i }).first().click().catch(async () => {
  await p.getByText(/^year$/i).first().click();
});
await p.waitForTimeout(4000);
await p.screenshot({ path: 'still-ai.png', clip: RECAP });
console.log('still-ai');

await b.close();
