// LAG-76: TV acceptance play-test. For every archetype: wait for pilot season, send a real pilot audition from Gigs,
// play the callback through the sheet, wait for the network, and (if picked up) shoot an episode from Hustle.
// Travel, sleep and waiting use the dev-only window.__game handle; every TV decision goes through the UI.
// Usage: npm run dev, then: node tools/tv-playtest.cjs <screenshot-dir> [url]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:5173/';
const NAMES = { nepo: 'The Nepo Baby', midwest: 'The Midwest Transplant', indie: 'The Indie Hustler', producer: 'The Bedroom Producer' };
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
    // LAG-92 (PI-3 Sprint 11): the bottom tabs are gone; the old tabs map onto phone apps
    // (Projects → StudioDesk, Hustle → Hustlr, Gigs → CastBoard, Map → Merge, Trades → Scrollr, Guilds → UnionCard).
    const APPS = { Projects: 'StudioDesk', Hustle: 'Hustlr', Gigs: 'CastBoard', Map: 'Merge', Trades: 'Scrollr', Guilds: 'UnionCard', Bank: 'Balance', Messages: 'Textr', Settings: 'Settings' };
    // Sprint 12 (LAG-96): the 3D room is the main screen and the phone is a pocket overlay, closed by default (inert
    // while closed). The HUD button raises it ("Open phone…", aria-expanded) and puts it away ("Put away phone").
    const phoneBtn = () => page.locator('header[aria-label="Status"]').getByRole('button', { name: /^(Open phone|Put away phone)/ });
    const phoneIsOpen = async () => (await phoneBtn().getAttribute('aria-expanded')) === 'true';
    const phoneInertNow = () => page.evaluate(() => !!document.querySelector('[role=group][aria-label="Phone"]')?.closest('[inert]'));
    const openPhone = async () => {
      if (!(await phoneIsOpen())) await phoneBtn().click();
      await page.waitForFunction(() => { const g = document.querySelector('[role=group][aria-label="Phone"]'); return !!g && !g.closest('[inert]'); });
    };
    const closePhone = async () => {
      if (await phoneIsOpen()) await phoneBtn().click();
      await page.waitForFunction(() => !!document.querySelector('[role=group][aria-label="Phone"]')?.closest('[inert]'));
    };
    /** Clicks the live "Skip to done" (the action card when the phone is away, the phone's when it's out). */
    const skipUI = async () => {
      const bs = page.getByRole('button', { name: 'Skip to done', exact: true });
      for (let i = 0; i < (await bs.count()); i++) {
        const b = bs.nth(i);
        if (await b.evaluate((el) => !el.closest('[inert]') && el.getClientRects().length > 0)) return b.click();
      }
    };
    let current = null;
    const tab = async (n) => {
      const name = APPS[n] || n;
      current = name;
      // Banners sit over the top of the app; clear them so they never cover a button (phone-playtest checks banners).
      await page.evaluate(() => window.__game.setState({ notices: [] }));
      await openPhone();
      if (await page.getByRole('region', { name, exact: true }).count()) return;
      const back = page.getByRole('group', { name: 'Phone' }).getByRole('button', { name: 'Back to home' });
      if (await back.count()) await back.click();
      await page.getByRole('navigation', { name: 'Apps' }).getByRole('button', { name, exact: true }).click();
      await page.getByRole('region', { name, exact: true }).waitFor();
    };
    const main = () => page.getByRole('region', { name: current, exact: true });
    const skip = async () => { if ((await S()).activity) await d({ type: 'SKIP_TO_DONE' }); };
    const day = async () => Math.floor((await S()).minute / 1440);
    const advanceTo = async (h) => {
      const s = await S();
      let t = Math.floor(s.minute / 1440) * 1440 + h * 60;
      if (t <= s.minute) t += 1440;
      await d({ type: 'ADVANCE', minutes: t - s.minute });
    };
    const travel = async (to) => { if ((await S()).player.location !== to) { await d({ type: 'TRAVEL', to }); await skip(); } };
    // Keep the run alive while waiting for the season: a barista shift and a full night's sleep each day.
    const liveADay = async () => {
      await advanceTo(7);
      await travel('weho');
      await d({ type: 'START_JOB', jobId: 'barista' });
      await skip();
      await travel((await S()).player.home);
      await advanceTo(22);
      await d({ type: 'SLEEP', hours: 8 });
      await skip();
    };

    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: new RegExp(`Start as ${NAMES[arch]}`) }).click();
    await page.evaluate(() => window.__game.getState().setSpeed(0));
    (await phoneIsOpen()) || (await phoneInertNow()) === false ? fail(`${arch}: phone should start closed (room is the main screen)`) : ok(`${arch}: phone starts closed over the room`);

    // 1. Off-season note, then live until pilot season opens (day 8)
    await tab('Gigs');
    (await main().getByText(/Next pilot season in/).count()) ? ok(`${arch}: off-season countdown shown`) : fail(`${arch}: no off-season countdown`);
    while ((await day()) < 8 && (await S()).status === 'playing') await liveADay();
    if ((await S()).status !== 'playing') { fail(`${arch}: moved home before pilot season`); await ctx.close(); continue; }
    await advanceTo(8);
    await tab('Gigs');
    (await main().getByText(/Pilot season/).count()) ? ok(`${arch}: pilot season banner on day ${await day()}`) : fail(`${arch}: no pilot season banner`);
    // The season-open event writes a log line (Trades headlines vary and don't all say "pilot").
    (await S()).log.some((l) => /Pilot season is open/.test(l.text)) ? ok(`${arch}: pilot season announced`) : fail(`${arch}: pilot season not announced`);

    // 2. Pick the lowest-tier open pilot; headshots first if it needs them
    let s = await S();
    const pilots = s.board.filter((o) => o.pilot && o.status === 'open').sort((a, b) => a.tier - b.tier);
    pilots.length > 0 ? ok(`${arch}: ${pilots.length} pilot audition(s) on the board`) : fail(`${arch}: no pilots on the board`);
    const opp = pilots[0];
    if (!opp) { await ctx.close(); continue; }
    if (opp.tier >= 2 && !s.player.hasHeadshots) {
      if (s.player.cash < 500) await page.evaluate(() => { const g = window.__game.getState(); g.state.player.cash += 500; });
      await travel('hollywood');
      await advanceTo(9);
      await d({ type: 'BUY_HEADSHOTS' });
      await skip();
    }
    await travel(opp.location);
    if (((await S()).minute % 1440) / 60 < opp.windowStart) await advanceTo(opp.windowStart);
    await tab('Gigs');
    const card = main().locator(`article[aria-label="${opp.title.replace(/"/g, '\\"')}"]`);
    const send = (await card.count()) ? card.getByRole('button', { name: /^Send/ }).first() : main().getByRole('button', { name: /^Send/ }).first();
    if (await send.isDisabled()) { fail(`${arch}: Send disabled for the pilot`); await ctx.close(); continue; }
    await send.click();
    await skip();

    // 3. Callback through the sheet
    const sheet = page.getByRole('dialog');
    (await S()).callback ? ok(`${arch}: callback opened for "${opp.pilot.showTitle}"`) : fail(`${arch}: no callback after sending`);
    await page.screenshot({ path: `${OUT}/${arch}-1-callback.png` });
    let sensedPicks = 0;
    for (let beat = 0; beat < 3 && (await S()).callback; beat++) {
      const instinct = sheet.getByRole('button', { name: /your instinct/i });
      if (await instinct.count()) { await instinct.first().click(); sensedPicks++; }
      else await sheet.getByRole('button', { name: /^Read 1:/ }).click();
    }
    s = await S();
    s.callback === null ? ok(`${arch}: callback finished (${sensedPicks} instinct read(s) used)`) : fail(`${arch}: callback still open`);
    (await page.getByRole('dialog').count()) === 0 ? ok(`${arch}: callback sheet closed`) : fail(`${arch}: sheet still open`);
    const booked = s.pilots.length > 0;
    ok(`${arch}: pilot ${booked ? 'BOOKED' : 'passed on'}`);

    // 4. Network decision a week later (only if booked)
    if (booked) {
      await tab('Gigs');
      (await main().getByText(/decides Day/).count()) ? ok(`${arch}: pending pilot listed`) : fail(`${arch}: pending pilot not listed`);
      const due = Math.floor(s.pilots[0].decisionMinute / 1440);
      while ((await day()) < due && (await S()).status === 'playing') await liveADay();
      await advanceTo(7);
      s = await S();
      s.pilots.length === 0 ? ok(`${arch}: network decided — ${s.contract ? `PICKED UP by ${s.contract.network}` : 'passed'}`) : fail(`${arch}: network never decided`);

      // 5. Series regular: shoot an episode from Hustle at the lot
      if (s.contract) {
        await travel('burbank');
        await advanceTo(9);
        await tab('Hustle');
        (await main().getByText(/Your show/i).count()) ? ok(`${arch}: Your show card on Hustle`) : fail(`${arch}: no Your show card`);
        const shoot = main().getByRole('button', { name: /^Shoot episode/ }).first();
        if ((await shoot.count()) && !(await shoot.isDisabled())) {
          await shoot.click();
          await skip();
          (await S()).contract?.shotThisWeek ? ok(`${arch}: episode shot through the UI`) : fail(`${arch}: episode not recorded`);
        } else fail(`${arch}: Shoot episode unavailable`);
        await page.screenshot({ path: `${OUT}/${arch}-2-your-show.png` });
      }
    }

    // 6. Hygiene
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    overflow ? fail(`${arch}: horizontal overflow`) : ok(`${arch}: no horizontal overflow`);
    const before = JSON.stringify([(await S()).pilots, (await S()).contract]);
    await page.reload();
    JSON.stringify([(await S()).pilots, (await S()).contract]) === before ? ok(`${arch}: TV state survives reload`) : fail(`${arch}: TV state lost on reload`);
    errors.length ? fail(`${arch}: console errors: ${errors.join(' | ')}`) : ok(`${arch}: no console errors`);
    await ctx.close();
  }
  await browser.close();
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
