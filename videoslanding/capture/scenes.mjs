import { openScene, closeScene, BASE } from './director.mjs';

const dash = async (page) => {
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' });
  await page.waitForSelector('.home-quick-textarea', { timeout: 40000 });
  await page.waitForTimeout(2200);
};

const scenes = {
  async signin() {
    const s = await openScene('signin', { storage: null });
    const { page, d } = s;
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    d.mark('landing');
    await d.click('header a:has-text("Start writing")', { ms: 900, pause: 1200 });
    await page.waitForURL('**/login');
    await page.waitForTimeout(1300);
    d.mark('loginform');
    await d.type('#login-email', 'hello@notebeat.app', { delay: 60 });
    await d.beat(350);
    await d.type('#login-password', 'notebeat2026', { delay: 60 });
    await d.beat(600);
    d.mark('presubmit');
    await d.click('button[type=submit]', { ms: 600, pause: 400 });
    d.mark('submitted');
    await page.waitForTimeout(3200);
    d.mark('end');
    await closeScene('signin', s);
  },

  async quicknote() {
    const s = await openScene('quicknote');
    const { page, d } = s;
    await dash(page);
    d.mark('start');
    await d.type('.home-quick-textarea',
      'Rain all afternoon and I did not mind it once. Some days the weather just agrees with you.',
      { delay: 44 });
    d.mark('typed');
    await d.beat(700);
    await d.type('#quick-song-search', 'my love mine all mine', { delay: 54 });
    await page.waitForSelector('.home-quick-recs-title:has-text("Search results")', { timeout: 30000 });
    await page.waitForTimeout(1100);
    d.mark('results');
    await d.click('.home-quick-track', { ms: 700, pause: 700 });
    await page.waitForSelector('.home-quick-selected', { timeout: 15000 });
    d.mark('picked');
    await d.beat(900);
    await d.click('.home-quick-form button[type=submit]', { ms: 700, pause: 2400 });
    d.mark('posted');
    await d.beat(900);
    await d.click('.home-profile-trigger', { ms: 800, pause: 2400 });
    d.mark('profile');
    await d.beat(1800);
    d.mark('end');
    await closeScene('quicknote', s);
  },

  async thread() {
    const s = await openScene('thread');
    const { page, d } = s;
    await dash(page);
    d.mark('start');
    const card = page.locator('.home-note-card').first();
    await d.hover(card, 700);
    await d.beat(600);
    d.mark('hover');
    await d.click(card.locator('.home-note-thread-button'), { ms: 500, pause: 1300 });
    await page.waitForSelector('.home-thread-modal-card', { timeout: 15000 });
    d.mark('modal');
    await d.beat(1500);
    await d.click('#thread-content', { pause: 300 });
    await page.keyboard.press('End');
    await page.keyboard.type('\n\nWriting it down was the whole point.', { delay: 46 });
    d.mark('edited');
    await d.beat(900);
    await d.click('.home-thread-form button[type=submit]', { ms: 700, pause: 3000 });
    d.mark('published');
    await d.beat(2400);
    d.mark('end');
    await closeScene('thread', s);
  },

  async feed() {
    const s = await openScene('feed');
    const { page, d } = s;
    await dash(page);
    d.mark('start');
    await d.smoothScroll(520, 1500, '.home-center-panel');
    await d.beat(800);
    d.mark('scrolled');
    await d.click('[aria-label="Like post"]', { ms: 700, pause: 700 });
    d.mark('liked');
    await d.click('[aria-label="Repost"]', { ms: 500, pause: 700 });
    await d.click('[aria-label="Save post"]', { ms: 500, pause: 1100 });
    d.mark('saved');
    await d.smoothScroll(620, 1600, '.home-center-panel');
    await d.beat(900);
    d.mark('scrolled2');
    await d.click('.home-feed-tab:has-text("Threads")', { ms: 700, pause: 1600 });
    d.mark('threadstab');
    await d.smoothScroll(420, 1400, '.home-center-panel');
    await d.beat(800);
    await d.click('.home-feed-tab:has-text("Discover")', { ms: 700, pause: 1600 });
    d.mark('discovertab');
    await d.smoothScroll(420, 1400, '.home-center-panel');
    await d.beat(1200);
    d.mark('end');
    await closeScene('feed', s);
  },

  async emotions() {
    const s = await openScene('emotions');
    const { page, d } = s;
    await page.goto(BASE + '/dashboard/emotions', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4500);
    d.mark('loaded');
    await d.beat(1600);
    await d.smoothScroll(360, 1600);
    d.mark('scroll1');
    await d.beat(1400);
    await d.smoothScroll(480, 1600);
    d.mark('scroll2');
    await d.beat(1600);
    d.mark('end');
    await closeScene('emotions', s);
  },

  async chat() {
    const s = await openScene('chat');
    const { page, d } = s;
    await page.goto(BASE + '/dashboard/chat', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800);
    d.mark('start');
    await d.type('textarea', 'What changed in my week, and which songs were playing?', { delay: 46 });
    await d.beat(600);
    d.mark('typed');
    await d.click('button:has-text("Send")', { ms: 700, pause: 400 });
    await page.waitForSelector('text=Thinking', { timeout: 20000 }).catch(() => {});
    d.mark('sent');
    await page.waitForFunction(() => {
      const t = document.body.innerText;
      return !t.includes('Thinking') && t.includes('AI');
    }, null, { timeout: 240000 });
    d.mark('answered');
    await d.beat(2500);
    await d.smoothScroll(300, 1500);
    await d.beat(2200);
    d.mark('end');
    await closeScene('chat', s);
  },

  async recap() {
    const s = await openScene('recap');
    const { page, d } = s;
    await dash(page);
    d.mark('start');
    await d.click('button:has-text("View")', { ms: 800, pause: 2400 });
    d.mark('modal');
    await d.beat(1300);
    await d.click('button:has-text("Year")', { ms: 700, pause: 3000 });
    d.mark('year');
    await d.beat(1500);
    await d.smoothScroll(340, 1600, '.home-modal-card');
    await d.beat(1300);
    d.mark('scroll1');
    await d.smoothScroll(420, 1600, '.home-modal-card');
    await d.beat(1600);
    d.mark('end');
    await closeScene('recap', s);
  },

  async privatenote() {
    const s = await openScene('privatenote');
    const { page, d } = s;
    await dash(page);
    d.mark('start');
    await d.click('.home-note-card .home-note-card-main', { ms: 800, pause: 2200 });
    d.mark('open');
    await d.beat(2400);
    d.mark('end');
    await closeScene('privatenote', s);
  },
};

const name = process.argv[2];
if (name === 'all') {
  for (const k of Object.keys(scenes)) { console.log('--- scene', k); await scenes[k](); }
} else if (scenes[name]) {
  await scenes[name]();
} else {
  console.error('unknown scene:', name, '| available:', Object.keys(scenes).join(', '), '| or "all"');
  process.exit(1);
}
