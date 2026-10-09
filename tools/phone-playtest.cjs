// LAG-92 (PI-3 Sprint 11): phone OS play-test. For every archetype on a phone (390×844), and once on desktop (1280×800):
// open all nine apps; a text message lights the Textr badge and the status-bar dot, and opening the thread clears them;
// notification banners appear and tapping one opens the right app; Balance shows the barista shift's ledger row;
// Lower phone / Open phone (mobile); no console errors, no horizontal overflow, state survives a reload.
// Money states that are slow to reach for real (overdraft) are set with the dev-only window.__game handle;
// every phone interaction goes through the UI.
// Usage: npm run dev, then: node tools/phone-playtest.cjs <screenshot-dir> [url]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:5173/';
const NAMES = { nepo: 'The Nepo Baby', midwest: 'The Midwest Transplant', indie: 'The Indie Hustler', producer: 'The Bedroom Producer' };
const APPS = ['CastBoard', 'StudioDesk', 'Balance', 'Scrollr', 'Textr', 'Merge', 'Hustlr', 'UnionCard', 'Settings'];
const LANDLORD = 'Mr. Ostrowski';
const results = [];
const fail = (m) => { results.push('FAIL ' + m); console.log('  ✗', m); };
const ok = (m) => { results.push('OK   ' + m); console.log('  ✓', m); };
const check = (cond, m, why = '') => (cond ? ok(m) : fail(why ? `${m} (${why})` : m));

const RUNS = [
  ['nepo', 'mobile'],
  ['midwest', 'mobile'],
  ['indie', 'mobile'],
  ['producer', 'mobile'],
  ['indie', 'desktop'],
];

(async () => {
  const browser = await chromium.launch();
  for (const [arch, device] of RUNS) {
    const mobile = device === 'mobile';
    const who = `${arch}@${mobile ? '390' : '1280'}`;
    console.log(`\n== ${who}`);
    const ctx = await browser.newContext(
      mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } },
    );
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const S = () => page.evaluate(() => window.__game.getState().state);
    const d = (cmd) => page.evaluate((c) => window.__game.getState().dispatch(c), cmd);
    const setCash = (cash) => page.evaluate((c) => { const g = window.__game; const st = structuredClone(g.getState().state); st.player.cash = c; g.setState({ state: st }); }, cash);
    const clearNotices = () => page.evaluate(() => window.__game.setState({ notices: [] }));
    const phone = () => page.getByRole('group', { name: 'Phone' });
    const phoneInert = () => page.locator('[role=group][aria-label="Phone"]').evaluate((el) => el.inert);
    const region = (name) => page.getByRole('region', { name, exact: true });
    const apps = () => page.getByRole('navigation', { name: 'Apps' });
    const home = async () => {
      const back = page.getByRole('button', { name: 'Back to home' });
      if (await back.count()) await back.click();
      await apps().waitFor();
    };
    const open = async (name) => {
      await home();
      await apps().getByRole('button', { name, exact: true }).click();
      await region(name).waitFor();
    };
    const banner = () => page.getByRole('status', { name: 'Notifications' }).getByRole('button', { name: /\. Open / });
    const unreadDot = () => page.getByRole('button', { name: /^(\d+ unread messages|No unread messages)$/ }).first();
    const textrBadge = async () => {
      const id = await apps().getByRole('button', { name: 'Textr', exact: true }).getAttribute('aria-describedby');
      return id ? (await page.locator(`#${id}`).innerText()).replace(/\s+/g, ' ').trim() : null;
    };

    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: new RegExp(`Start as ${NAMES[arch]}`) }).click();
    await page.getByRole('group', { name: 'Game speed' }).first().getByRole('button', { name: 'Pause' }).click();
    check((await S()) && (await page.evaluate(() => window.__game.getState().speed)) === 0, `${who}: paused from the status bar`);

    // 1. Home screen: nine tiles; every app opens to its own region, and Back returns home.
    check((await apps().getByRole('button').count()) === 9, `${who}: home screen shows 9 app tiles`);
    await page.screenshot({ path: `${OUT}/${who}-0-home.png` });
    const opened = [];
    for (const name of APPS) {
      await open(name);
      if ((await region(name).isVisible()) && (await region(name).getByRole('heading', { name, exact: true }).count())) opened.push(name);
      if (name === 'Balance' || name === 'Textr') await page.screenshot({ path: `${OUT}/${who}-1-${name}.png` });
    }
    await home();
    check(opened.length === APPS.length, `${who}: all 9 apps open to their region`, `missing ${APPS.filter((a) => !opened.includes(a)).join(', ')}`);

    // 2. Barista shift through the UI (Merge → West Hollywood, Hustlr → Start Barista), then the Balance ledger row.
    if ((await S()).player.location !== 'weho') {
      await open('Merge');
      await region('Merge').getByRole('button', { name: /^Travel to West Hollywood:/ }).last().click();
      await page.getByRole('dialog').getByRole('button', { name: 'Go' }).click();
      await phone().getByRole('button', { name: 'Skip to done' }).first().click();
    }
    check((await S()).player.location === 'weho', `${who}: drove to West Hollywood through Merge`);
    let t = await S();
    if ((t.minute % 1440) / 60 > 11) await d({ type: 'ADVANCE', minutes: 1440 - (t.minute % 1440) + 7 * 60 });
    await clearNotices();
    await open('Hustlr');
    const cash0 = (await S()).player.cash;
    const barista = region('Hustlr').getByRole('button', { name: /^Start Barista/ }).first();
    if ((await barista.count()) && !(await barista.isDisabled())) {
      await barista.click();
      await phone().getByRole('button', { name: 'Skip to done' }).first().click();
    }
    t = await S();
    const pay = t.player.cash - cash0;
    check(pay === 130 && t.ledger[0]?.kind === 'job' && t.ledger[0].amount === 130, `${who}: barista shift paid +$130 into the ledger`, `cash +${pay}`);
    await clearNotices();
    await open('Balance');
    const today = region('Balance').getByRole('list', { name: 'Transactions, Today' });
    const row = today.getByRole('listitem').filter({ hasText: /Barista/ }).first();
    const rowText = (await row.count()) ? (await row.innerText()).replace(/\s+/g, ' ') : '';
    check(/\+\$130\b/.test(rowText), `${who}: Balance shows the barista row under Today ("${rowText}")`);
    await page.screenshot({ path: `${OUT}/${who}-2-ledger.png` });

    // 3. Overdraft: the bank banner appears, tapping it opens Balance with the overdraft alert; the landlord texts.
    await home();
    await clearNotices();
    check(/^No unread messages$/.test(await unreadDot().getAttribute('aria-label')) || (await S()).inbox.length > 0, `${who}: status-bar dot starts clear`);
    const unread0 = (await S()).inbox.reduce((n, x) => n + x.unread, 0);
    await setCash(-1);
    await d({ type: 'ADVANCE', minutes: 1 });
    const bankBanner = banner().filter({ hasText: /Overdraft/ }).first();
    await bankBanner.waitFor({ timeout: 3000 }).catch(() => {});
    const bankLabel = (await bankBanner.count()) ? await bankBanner.getAttribute('aria-label') : '';
    check(/Open Balance$/.test(bankLabel), `${who}: overdraft banner appears ("${bankLabel}")`);
    await page.screenshot({ path: `${OUT}/${who}-3-banner.png` });
    if (await bankBanner.count()) await bankBanner.click();
    check((await region('Balance').count()) && (await region('Balance').getByRole('alert', { name: 'Overdraft' }).count()), `${who}: tapping the banner opens Balance with the overdraft alert`);

    // 4. The landlord's text: Textr badge and status-bar dot light up.
    await home();
    const unread1 = (await S()).inbox.reduce((n, x) => n + x.unread, 0);
    check(unread1 === unread0 + 1, `${who}: landlord text arrived (unread ${unread0} → ${unread1})`);
    check((await textrBadge()) === `${unread1} ${unread1} unread`, `${who}: Textr tile badge reads ${unread1} unread`, `badge "${await textrBadge()}"`);
    check((await unreadDot().getAttribute('aria-label')) === `${unread1} unread messages`, `${who}: status-bar dot says ${unread1} unread messages`);

    // 5. Back above $0: the landlord texts again; that banner opens Textr straight into his thread, which reads it.
    await clearNotices();
    await setCash(500);
    await d({ type: 'ADVANCE', minutes: 1 });
    const msgBanner = banner().filter({ hasText: LANDLORD }).first();
    await msgBanner.waitFor({ timeout: 3000 }).catch(() => {});
    const msgLabel = (await msgBanner.count()) ? await msgBanner.getAttribute('aria-label') : '';
    check(msgLabel.startsWith(`${LANDLORD}:`) && /Open Textr$/.test(msgLabel), `${who}: text banner from the landlord ("${msgLabel.slice(0, 60)}…")`);
    if (await msgBanner.count()) await msgBanner.click();
    const thread = region('Textr').getByRole('list', { name: `Messages from ${LANDLORD}` });
    await thread.waitFor({ timeout: 3000 }).catch(() => {});
    check((await thread.count()) && (await thread.getByRole('listitem').count()) >= 2, `${who}: tapping the banner opens the landlord thread in Textr`);
    await page.screenshot({ path: `${OUT}/${who}-4-thread.png` });
    t = await S();
    check(t.inbox.find((x) => x.contact === 'landlord')?.unread === 0, `${who}: opening the thread marks it read`);
    check((await unreadDot().getAttribute('aria-label')) === (t.inbox.some((x) => x.unread) ? `${t.inbox.reduce((n, x) => n + x.unread, 0)} unread messages` : 'No unread messages'), `${who}: status-bar dot updated after reading`);

    // 6. The list path: back on Conversations (an open thread reads new texts as they land), another text shows
    // "<Name>, 1 unread"; opening it clears the Textr badge.
    await region('Textr').getByRole('button', { name: 'Back to conversations' }).click();
    await setCash(-1);
    await d({ type: 'ADVANCE', minutes: 1 });
    await clearNotices();
    const convo = region('Textr').getByRole('list', { name: 'Conversations' }).getByRole('button', { name: `${LANDLORD}, 1 unread` });
    check((await convo.count()) === 1, `${who}: Conversations lists "${LANDLORD}, 1 unread"`);
    if (await convo.count()) await convo.click();
    await home();
    t = await S();
    const left = t.inbox.reduce((n, x) => n + x.unread, 0);
    check(left === 0 ? (await textrBadge()) === null : (await textrBadge()) === `${left} ${left} unread`, `${who}: Textr badge cleared after opening the thread`, `badge "${await textrBadge()}", unread ${left}`);
    await setCash(500);
    await d({ type: 'ADVANCE', minutes: 1 });
    await clearNotices();

    // 7. Lower phone / Open phone (mobile sheet). Desktop has the phone pinned: no Lower button.
    if (mobile) {
      await page.getByRole('button', { name: 'Lower phone' }).click();
      const raise = page.getByRole('button', { name: 'Open phone' });
      await raise.waitFor({ timeout: 3000 }).catch(() => {});
      check((await raise.isVisible()) && (await phoneInert()), `${who}: Lower phone shows the world and an Open phone button (phone inert)`);
      await page.waitForTimeout(100);
      check(await raise.evaluate((el) => el === document.activeElement), `${who}: focus moves to Open phone (not lost to <body>)`);
      await page.screenshot({ path: `${OUT}/${who}-5-lowered.png` });
      await page.keyboard.press('Enter');
      await apps().waitFor({ timeout: 3000 }).catch(() => {});
      check((await apps().isVisible()) && (await raise.count()) === 0 && !(await phoneInert()), `${who}: Open phone (keyboard) brings the phone back`);
      await page.waitForTimeout(100);
      check((await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Lower phone', `${who}: focus lands on Lower phone after raising`);
    } else {
      check((await page.getByRole('button', { name: 'Lower phone' }).count()) === 0 && (await phone().isVisible()), `${who}: desktop keeps the phone pinned (no Lower phone)`);
    }

    // 8. Hygiene: overflow at this width, state survives a reload.
    for (const name of APPS) {
      await open(name);
      const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (over) { fail(`${who}: horizontal overflow in ${name}`); break; }
      if (name === APPS[APPS.length - 1]) ok(`${who}: no horizontal overflow in any app`);
    }
    await page.evaluate(() => window.__game.getState().save());
    const before = JSON.stringify(await S());
    await page.reload();
    await apps().waitFor();
    check(JSON.stringify(await S()) === before, `${who}: reload restores identical state (ledger and inbox included)`);
    check(!errors.length, `${who}: no console errors`, errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(1); });
