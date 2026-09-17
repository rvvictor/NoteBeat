import { chromium } from 'playwright';

export const BASE = 'https://localhost:3000';
export const VW = 1440, VH = 900;

const CURSOR_JS = `
(() => {
  const install = () => {
  if (window.__nbCursor) return;
  const style = document.createElement('style');
  style.textContent = \`
    nextjs-portal { display: none !important; }
    * { scrollbar-width: none !important; }
    *::-webkit-scrollbar { display: none !important; }
    #nb-cursor {
      position: fixed; left: 0; top: 0; width: 26px; height: 26px; z-index: 2147483647;
      pointer-events: none; transform: translate(-50%, -50%);
      border-radius: 50%; background: rgba(108,99,255,0.22);
      border: 2px solid rgba(108,99,255,0.85);
      box-shadow: 0 6px 18px rgba(31,27,90,0.28);
      transition: width .12s ease, height .12s ease, background .12s ease;
      opacity: 0;
    }
    #nb-cursor.on { opacity: 1; }
    #nb-cursor.down { width: 18px; height: 18px; background: rgba(108,99,255,0.45); }
    .nb-ripple {
      position: fixed; z-index: 2147483646; pointer-events: none;
      width: 10px; height: 10px; border-radius: 50%; transform: translate(-50%,-50%);
      border: 2px solid rgba(108,99,255,0.7); animation: nbRip .55s ease-out forwards;
    }
    @keyframes nbRip { to { width: 68px; height: 68px; opacity: 0; } }
  \`;
  document.documentElement.appendChild(style);
  const c = document.createElement('div');
  c.id = 'nb-cursor';
  document.documentElement.appendChild(c);
  window.__nbCursor = c;
  addEventListener('mousemove', (e) => {
    c.classList.add('on');
    c.style.left = e.clientX + 'px';
    c.style.top = e.clientY + 'px';
  }, true);
  addEventListener('mousedown', (e) => {
    c.classList.add('down');
    const r = document.createElement('div');
    r.className = 'nb-ripple';
    r.style.left = e.clientX + 'px';
    r.style.top = e.clientY + 'px';
    document.documentElement.appendChild(r);
    setTimeout(() => r.remove(), 600);
  }, true);
  addEventListener('mouseup', () => c.classList.remove('down'), true);
  };
  if (document.documentElement) install();
  else addEventListener('DOMContentLoaded', install, { once: true });
})();
`;

export async function openScene(name, { storage = 'state.json' } = {}) {
  const browser = await chromium.launch({ args: ['--hide-scrollbars', '--force-device-scale-factor=2'] });
  const ctx = await browser.newContext({
    ignoreHTTPSErrors: true,
    ...(storage ? { storageState: storage } : {}),
    viewport: { width: VW, height: VH },
    deviceScaleFactor: 2,
    recordVideo: { dir: `clips/${name}`, size: { width: VW * 2, height: VH * 2 } },
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  });
  await ctx.addInitScript(CURSOR_JS);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = [];
  page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0, 120)));
  const d = makeDirector(page);
  d.mark = (label) => { const t = (Date.now() - t0) / 1000; marks.push({ label, t }); console.log(`    mark ${label} @ ${t.toFixed(2)}s`); };
  d.marks = marks;
  return { browser, ctx, page, d, marks, name };
}

export async function closeScene(name, { browser, ctx, marks }) {
  await ctx.close();
  await browser.close();
  if (marks) { const fs = await import("node:fs"); fs.writeFileSync(`clips/${name}/marks.json`, JSON.stringify(marks, null, 2)); }
  console.log(`clip ready: clips/${name}`);
}

export function makeDirector(page) {
  let cx = VW / 2, cy = VH - 60;
  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const moveTo = async (x, y, ms = 650) => {
    const steps = Math.max(8, Math.round(ms / 16));
    const sx = cx, sy = cy;
    for (let i = 1; i <= steps; i++) {
      const t = ease(i / steps);
      await page.mouse.move(sx + (x - sx) * t, sy + (y - sy) * t);
      await page.waitForTimeout(16);
    }
    cx = x; cy = y;
  };

  const center = async (target, { offsetY = 0 } = {}) => {
    const el = typeof target === 'string' ? page.locator(target).first() : target;
    await el.waitFor({ state: 'visible', timeout: 20000 });
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    const box = await el.boundingBox();
    if (!box) throw new Error('no box for target');
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 + offsetY, box };
  };

  const hover = async (target, ms = 650, opts = {}) => {
    const { x, y } = await center(target, opts);
    await moveTo(x, y, ms);
    return { x, y };
  };

  const click = async (target, { ms = 650, pause = 420, offsetY = 0 } = {}) => {
    const { x, y } = await hover(target, ms, { offsetY });
    // layout can shift while the cursor travels (debounced re-renders); re-aim before pressing
    const again = await center(target, { offsetY });
    if (Math.abs(again.x - x) > 3 || Math.abs(again.y - y) > 3) await moveTo(again.x, again.y, 200);
    await page.waitForTimeout(160);
    await page.mouse.down();
    await page.waitForTimeout(90);
    await page.mouse.up();
    await page.waitForTimeout(pause);
    return { x: cx, y: cy };
  };

  const type = async (target, text, { delay = 52, focusFirst = true } = {}) => {
    if (focusFirst) {
      await click(target, { pause: 260 });
      const focused = await page.evaluate(sel => document.activeElement === document.querySelector(sel),
        typeof target === 'string' ? target : null).catch(() => true);
      if (focused === false) {
        await page.locator(target).first().click();
        await page.waitForTimeout(200);
      }
    }
    await page.keyboard.type(text, { delay });
  };

  const smoothScroll = async (deltaY, ms = 1400, selector = null) => {
    await page.evaluate(({ deltaY, ms, selector }) => new Promise(res => {
      const el = selector ? document.querySelector(selector) : document.scrollingElement;
      if (!el) return res();
      const start = el.scrollTop, t0 = performance.now();
      const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const step = now => {
        const t = Math.min(1, (now - t0) / ms);
        el.scrollTop = start + deltaY * ease(t);
        t < 1 ? requestAnimationFrame(step) : res();
      };
      requestAnimationFrame(step);
    }), { deltaY, ms, selector });
  };

  const beat = (ms = 700) => page.waitForTimeout(ms);
  const settle = async () => { await page.waitForTimeout(400); };
  return { moveTo, hover, click, type, smoothScroll, beat, settle, center, page };
}
