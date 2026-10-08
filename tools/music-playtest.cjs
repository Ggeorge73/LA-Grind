// LAG-62: music acceptance play-test. Takes a single from songwriting to the end of release week for every
// archetype, pressing the real Projects-tab buttons. Travel, sleep, day jobs and waiting use the dev-only window.__game.
// Usage: npm run dev, then: node tools/music-playtest.cjs <screenshot-dir> [url]
// Needs Playwright with Chromium (set PLAYWRIGHT_PATH if it is installed globally).
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
    const tab = (n) => page.getByRole('navigation').getByRole('button', { name: n, exact: true }).click();
    const main = () => page.getByRole('main');
    const skip = async () => { if ((await S()).activity) await d({ type: 'SKIP_TO_DONE' }); };
    const advanceTo = async (h) => {
      const s = await S();
      let t = Math.floor(s.minute / 1440) * 1440 + h * 60;
      if (t <= s.minute) t += 1440;
      await d({ type: 'ADVANCE', minutes: t - s.minute });
    };
    const travel = async (to) => { if ((await S()).player.location !== to) { await d({ type: 'TRAVEL', to }); await skip(); } };
    const rest = async (min = 60) => {
      const s = await S();
      if (s.player.energy >= min && s.player.spark >= 20) return;
      await travel(s.player.home);
      await d({ type: 'SLEEP', hours: 9 });
      await skip();
      if ((await S()).player.spark < 20) { await travel('santamonica'); await d({ type: 'LEISURE', leisureId: 'beach' }); await skip(); }
    };
    const press = async (name) => {
      const b = main().getByRole('button', { name }).first();
      if (!(await b.count()) || (await b.isDisabled())) return false;
      await b.click();
      await skip();
      return true;
    };
    const stage = async () => (await S()).project?.stage ?? null;

    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: new RegExp(`Start as ${NAMES[arch]}`) }).click();
    await page.evaluate(() => window.__game.getState().setSpeed(0));
    const fans0 = (await S()).player.fans;
    (await page.getByText(/Fans/).count()) ? ok(`${arch}: Fans shown in the HUD`) : fail(`${arch}: no Fans in the HUD`);
    await tab('Projects');

    // 1. Start a single
    if (!(await press(/^Start Single/))) { fail(`${arch}: could not start a single`); await ctx.close(); continue; }
    const p0 = (await S()).project;
    p0.medium === 'music' && p0.studio ? ok(`${arch}: started "${p0.title}" at ${p0.studio}`) : fail(`${arch}: single not a music project`);

    // 2. Write the song
    for (let n = 0; n < 4 && (await stage()) === 'develop'; n++) { await rest(); await tab('Projects'); await press(/^Write a song/); }
    (await stage()) === 'finance' ? ok(`${arch}: song written`) : fail(`${arch}: stuck writing`);

    // 3. Book the studio: no investors for music; self-fund, working barista shifts until cash allows
    await tab('Projects');
    (await main().getByRole('button', { name: /^Pitch / }).count()) ? fail(`${arch}: investor pitches shown for music`) : ok(`${arch}: no investor pitches for music`);
    for (let day = 0; day < 15 && (await stage()) === 'finance'; day++) {
      await tab('Projects');
      const all = main().getByRole('button', { name: /^Self-fund All remaining/ });
      const s = await S();
      if ((await all.count()) && !(await all.isDisabled()) && s.player.cash - (s.project.budget - s.project.raised) > 300) { await all.click(); break; }
      await rest(70);
      await advanceTo(7);
      await travel('weho');
      await d({ type: 'START_JOB', jobId: 'barista' });
      await skip();
      const t = await S();
      const spare = Math.floor(Math.min(t.project.budget - t.project.raised, t.player.cash - 300));
      if (spare > 0) await d({ type: 'SELF_FUND', amount: spare });
      if ((await stage()) === 'finance') await advanceTo(5);
    }
    (await stage()) === 'crew' ? ok(`${arch}: studio booked`) : fail(`${arch}: stuck booking the studio`);

    // 4. Crew
    for (let n = 0; n < 5 && (await stage()) === 'crew'; n++) { await rest(); await tab('Projects'); if (!(await press(/^Hire /))) break; }
    (await stage()) === 'record' ? ok(`${arch}: studio crew hired`) : fail(`${arch}: stuck hiring`);

    // 5. Record at the studio
    for (let n = 0; n < 4 && (await stage()) === 'record'; n++) {
      await rest(60);
      await travel((await S()).project.location);
      await tab('Projects');
      if (n === 0) await page.screenshot({ path: `${OUT}/${arch}-1-record.png` });
      if (!(await press(/^Record/))) { fail(`${arch}: Record disabled`); break; }
    }
    (await stage()) === 'release' ? ok(`${arch}: record wrapped`) : fail(`${arch}: stuck recording`);

    // 6. Release + promo each day of release week
    await tab('Projects');
    await press(/^Release it now/);
    (await S()).project?.release ? ok(`${arch}: released`) : fail(`${arch}: release button did nothing`);
    let promos = 0;
    const title = (await S()).project?.title;
    for (let day = 0; day < 9 && (await S()).project; day++) {
      await rest(40);
      await tab('Projects');
      if (await press(/^Promo/)) promos++;
      if (day === 1) await page.screenshot({ path: `${OUT}/${arch}-2-release-week.png`, fullPage: true });
      await advanceTo(6);
    }
    promos > 0 ? ok(`${arch}: promoted ${promos} day(s) through the UI`) : fail(`${arch}: promo never available`);

    // 7. Week end
    const end = await S();
    const credit = end.credits[0];
    end.project === null && credit && credit.title === title && /^(Peaked at #\d+|Didn't chart)/.test(credit.outcome)
      ? ok(`${arch}: release week over — "${credit.title}" ${credit.outcome} (quality ${credit.quality})`)
      : fail(`${arch}: release week did not finish (${JSON.stringify(credit)})`);
    end.player.fans > fans0 ? ok(`${arch}: fans ${fans0} → ${end.player.fans}`) : fail(`${arch}: no fans gained`);
    const trades = end.trades.map((h) => h.text).join('\n');
    trades.includes(title) ? ok(`${arch}: record is in The Trades`) : fail(`${arch}: no Trades headline for the record`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    overflow ? fail(`${arch}: horizontal overflow`) : ok(`${arch}: no horizontal overflow`);
    await tab('Projects');
    await page.screenshot({ path: `${OUT}/${arch}-3-done.png` });

    // 8. Reload restores fans and credits
    const before = JSON.stringify([(await S()).player.fans, (await S()).credits]);
    await page.reload();
    JSON.stringify([(await S()).player.fans, (await S()).credits]) === before ? ok(`${arch}: fans and credits survive reload`) : fail(`${arch}: state lost on reload`);

    errors.length ? fail(`${arch}: console errors: ${errors.join(' | ')}`) : ok(`${arch}: no console errors`);
    await ctx.close();
  }
  await browser.close();
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
