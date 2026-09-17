import { chromium } from 'playwright';
import { BASE } from './director.mjs';

// Saves a logged-in browser state to state.json so the scene scripts can record
// straight into the dashboard. Credentials come from the environment, never
// from this file.
const email = process.env.NOTEBEAT_EMAIL;
const password = process.env.NOTEBEAT_PASSWORD;

if (!email || !password) {
  console.error('Set NOTEBEAT_EMAIL and NOTEBEAT_PASSWORD before running this.');
  process.exit(1);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  ignoreHTTPSErrors: true,
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
await page.fill('#login-email', email);
await page.fill('#login-password', password);
await page.click('button[type=submit]');
await page.waitForURL('**/dashboard', { timeout: 30000 });
await page.waitForTimeout(4000);
await ctx.storageState({ path: 'state.json' });

console.log('state.json written for', email);
await browser.close();
