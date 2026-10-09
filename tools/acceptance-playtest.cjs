// LAG-31: "Done means" acceptance play-test, driven through the real UI where it matters.
// LAG-92 (PI-3 Sprint 11): the bottom tabs are gone; every screen is now an app on the in-game phone.
// Usage: npm run dev, then: node tools/acceptance-playtest.cjs <screenshot-dir> [url]
// Needs Playwright with Chromium (npx playwright install chromium). Uses the dev-only window.__game handle.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:5173/';
const NAMES = { noho: 'North Hollywood', burbank: 'Burbank', hollywood: 'Hollywood', weho: 'West Hollywood', silverlake: 'Silver Lake', santamonica: 'Santa Monica' };
const results = [];
const fail = (m) => { results.push('FAIL ' + m); console.log('  ✗', m); };
const ok = (m) => { results.push('OK   ' + m); console.log('  ✓', m); };

(async () => {
  const browser = await chromium.launch();
  for (const arch of ['nepo', 'midwest', 'indie', 'producer']) {
    console.log(`\n== ${arch}`);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const S = () => page.evaluate(() => window.__game.getState().state);
    const d = (cmd) => page.evaluate((c) => window.__game.getState().dispatch(c), cmd);
    // Phone navigation: the old tabs map onto phone apps (Gigs → CastBoard, Hustle → Hustlr, Map → Merge, Trades → Scrollr).
    const APPS = { Projects: 'StudioDesk', Hustle: 'Hustlr', Gigs: 'CastBoard', Map: 'Merge', Trades: 'Scrollr', Guilds: 'UnionCard', Bank: 'Balance', Messages: 'Textr', Settings: 'Settings' };
    let current = null;
    const tab = async (n) => {
      const name = APPS[n] || n;
      current = name;
      // Banners sit over the top of the app; clear them so they never cover a button (phone-playtest checks banners).
      await page.evaluate(() => window.__game.setState({ notices: [] }));
      const raise = page.getByRole('button', { name: 'Open phone' });
      if (await raise.count()) await raise.click();
      if (await page.getByRole('region', { name, exact: true }).count()) return;
      const back = page.getByRole('button', { name: 'Back to home' });
      if (await back.count()) await back.click();
      await page.getByRole('navigation', { name: 'Apps' }).getByRole('button', { name, exact: true }).click();
      await page.getByRole('region', { name, exact: true }).waitFor();
    };
    const main = () => page.getByRole('region', { name: current, exact: true });
    const hour = async () => ((await S()).minute % 1440) / 60;
    const advanceTo = async (h) => { const s = await S(); const day = Math.floor(s.minute / 1440); let t = day * 1440 + h * 60; if (t <= s.minute) t += 1440; await d({ type: 'ADVANCE', minutes: t - s.minute }); };
    const skip = async () => { const b = page.getByRole('group', { name: 'Phone' }).getByRole('button', { name: 'Skip to done' }); if (await b.count()) await b.first().click(); };
    const travel = async (to) => {
      if ((await S()).player.location === to) return;
      await tab('Map');
      await main().getByRole('button', { name: new RegExp(`^Travel to ${NAMES[to]}:`) }).last().click();
      await page.getByRole('dialog').getByRole('button', { name: 'Go' }).click();
      await skip();
      if ((await S()).player.location !== to) fail(`${arch}: travel to ${to}`);
    };
    const startCard = async (title, app = 'Hustle') => {
      await tab(app);
      const card = main().locator('div.rounded-2xl', { hasText: title }).last();
      const btn = card.getByRole('button', { name: /^Start/ }).first();
      if (await btn.isDisabled()) { fail(`${arch}: "${title}" disabled: ${(await card.innerText()).split('\n').slice(-1)[0]}`); return false; }
      await btn.click(); await skip(); return true;
    };
    const submit = async (opp) => {
      if (opp.tier >= 2 && !(await S()).player.hasHeadshots) { await travel('hollywood'); await startCard('Headshots'); }
      await travel(opp.location);
      const h = await hour();
      if (h < opp.windowStart || h >= opp.windowEnd - 1) await advanceTo(opp.windowStart);
      await tab('Gigs');
      const card = main().locator(`article[aria-label="${opp.title.replace(/"/g, '\\"')}"]`);
      const send = card.getByRole('button', { name: /^Send/ }).first();
      const label = await send.innerText();
      if (!/\d+(\.\d)?%/.test(label)) fail(`${arch}: odds not shown on Send ("${label}")`);
      if (await send.isDisabled()) { fail(`${arch}: Send disabled for ${opp.title}: ${(await card.innerText()).split('\n').slice(-2).join(' ')}`); return null; }
      await send.click(); await skip();
      const s = await S(); const o = s.board.find((x) => x.id === opp.id);
      return o.status;
    };

    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: new RegExp(`Start as ${{ nepo: 'The Nepo Baby', midwest: 'The Midwest Transplant', indie: 'The Indie Hustler', producer: 'The Bedroom Producer' }[arch]}`) }).click();
    await page.evaluate(() => window.__game.getState().setSpeed(0));
    const start = await S();

    // 405 at 08:00 from NoHo costs triple (check from any start by quoting via the map list when at NoHo)
    if (start.player.location === 'noho') {
      await tab('Map');
      const row = await main().getByRole('button', { name: /^Travel to Santa Monica:/ }).last().getAttribute('aria-label');
      /120 min|2h/.test(row) ? ok(`${arch}: NoHo→Santa Monica 08:00 = "${row}"`) : fail(`${arch}: 405 quote "${row}"`);
    }

    // Day 1: rideshare 2h (driving lives in Merge now), barista, a music gig, then home to sleep.
    await tab('Map');
    await main().getByRole('group', { name: 'Hours to drive' }).getByRole('button', { name: '2h', exact: true }).click().catch(() => {});
    if (await startCard('Rideshare', 'Map')) ok(`${arch}: rideshare worked`);
    await travel('weho');
    if (await startCard('Barista')) ok(`${arch}: barista worked`);
    const dayEnergy = [];
    let s = await S();
    const music = s.board.find((o) => o.medium === 'music' && o.status === 'open');
    if (music) { const r = await submit(music); r && ok(`${arch}: music gig "${music.title}" → ${r}`); }
    await travel((await S()).player.home);
    await advanceTo(22);
    await d({ type: 'SLEEP', hours: 6 }); await skip();

    // Day 2: PA in Burbank.
    s = await S();
    if ((await hour()) > 7) await advanceTo(5);
    await travel('burbank');
    if ((await hour()) < 5) await advanceTo(5);
    if (await startCard('Production Assistant')) ok(`${arch}: PA worked`);
    await travel((await S()).player.home);
    await d({ type: 'SLEEP', hours: 8 }); await skip();

    // Day 3: a film AND a TV audition by day, a music gig at night → energy cost visible.
    if ((await hour()) < 6 || (await hour()) >= 9) await advanceTo(7); // pick from today's board (refreshes 06:00)
    s = await S();
    const e0 = s.player.energy;
    for (const medium of ['film', 'tv']) {
      s = await S();
      const opp = s.board.find((o) => o.medium === medium && o.status === 'open');
      if (!opp) { fail(`${arch}: no ${medium} on board`); continue; }
      const r = await submit(opp);
      r && ok(`${arch}: ${medium} "${opp.title}" → ${r}`);
    }
    s = await S();
    const night = s.board.find((o) => o.medium === 'music' && o.status === 'open');
    if (night) { const r = await submit(night); r && ok(`${arch}: night music gig → ${r}`); }
    s = await S();
    ok(`${arch}: day ${Math.floor(s.minute / 1440)} ${String(Math.floor((s.minute % 1440) / 60)).padStart(2, '0')}:00 energy ${Math.round(s.player.energy)} (woke at ${Math.round(e0)}), burnout ${Math.round(s.player.burnout)}`);
    await tab('Hustle');
    await page.screenshot({ path: `${OUT}/${arch}-after-double-shift.png` });
    // Day 4: rested, then the night bar-back shift.
    await travel((await S()).player.home);
    await d({ type: 'SLEEP', hours: 10 }); await skip();
    await advanceTo(17);
    await travel('weho');
    if ((await hour()) < 18) await advanceTo(18);
    if (await startCard('Bar back')) ok(`${arch}: bar back worked`);
    const days = Math.floor(s.minute / 1440) - Math.floor(start.minute / 1440);
    days >= 2 ? ok(`${arch}: played into day ${Math.floor(s.minute / 1440)}`) : fail(`${arch}: only ${days} days`);

    // The Trades (Scrollr feed) shows own results, badged "About you"
    await tab('Trades');
    const own = (await S()).trades.filter((t) => t.own).length;
    const youBadges = await main().locator('[aria-label^="About you:"]').count();
    own > 0 && youBadges > 0 ? ok(`${arch}: ${own} own headlines in The Trades (${youBadges} "About you" posts visible)`) : fail(`${arch}: no own headlines`);

    // Save/restore exactness
    const before = JSON.stringify(await S());
    await page.evaluate(() => window.__game.getState().save());
    await page.reload(); await page.getByRole('navigation', { name: 'Apps' }).waitFor();
    JSON.stringify(await S()) === before ? ok(`${arch}: reload restores identical state`) : fail(`${arch}: reload changed state`);

    // Go broke → summary → restart
    if (arch === 'midwest') {
      await page.evaluate(() => { const g = window.__game; const st = structuredClone(g.getState().state); st.player.cash = -1; g.setState({ state: st, speed: 0 }); });
      await d({ type: 'ADVANCE', minutes: 1 });
      await tab('Bank');
      (await main().getByRole('alert', { name: 'Overdraft' }).count()) && (await page.getByRole('button', { name: /^Cash .*, overdraft\. Open Balance$/ }).count())
        ? ok('midwest: overdraft shown (Balance alert + status bar)') : fail('overdraft banner missing');
      await d({ type: 'ADVANCE', minutes: 3 * 1440 });
      await page.waitForSelector('text=Moved Back Home');
      await page.screenshot({ path: `${OUT}/moved-home.png` });
      await page.getByRole('button', { name: /The Indie Hustler/ }).first().click();
      await page.getByRole('navigation', { name: 'Apps' }).waitFor();
      (await S()).player.archetype === 'indie' ? ok('midwest: summary → new run started') : fail('new run');
    }
    errors.length ? fail(`${arch}: console errors ${errors.join(' | ')}`) : ok(`${arch}: no console errors`);
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${results.filter((r) => r.startsWith('OK')).length} OK, ${results.filter((r) => r.startsWith('FAIL')).length} FAIL`);
})().catch((e) => { console.error('CRASH', e); process.exit(1); });
