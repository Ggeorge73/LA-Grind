// LAG-50: film acceptance play-test. Takes a short film from script to release for every archetype,
// pressing the real Projects-tab buttons. Travel, sleep and waiting use the dev-only window.__game handle.
// Usage: npm run dev, then: node tools/film-playtest.cjs <screenshot-dir> [url]
// Needs Playwright with Chromium (set PLAYWRIGHT_PATH if it is installed globally).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:5173/';
const results = [];
const fail = (m) => { results.push('FAIL ' + m); console.log('  ✗', m); };
const ok = (m) => { results.push('OK   ' + m); console.log('  ✓', m); };

(async () => {
  const browser = await chromium.launch();
  for (const [i, arch] of ['nepo', 'midwest', 'indie', 'producer'].entries()) {
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
      if (s.player.energy >= min) return;
      await travel(s.player.home);
      await d({ type: 'SLEEP', hours: 9 });
      await skip();
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
    void i;
    await page.getByRole('button', { name: new RegExp(`Start as ${{ nepo: 'The Nepo Baby', midwest: 'The Midwest Transplant', indie: 'The Indie Hustler', producer: 'The Bedroom Producer' }[arch]}`) }).click();
    await page.evaluate(() => window.__game.getState().setSpeed(0));
    await tab('Projects');

    // 1. Start a short film
    if (!(await press(/^Start Short film/))) { fail(`${arch}: could not start a short film`); await ctx.close(); continue; }
    const title = (await S()).project.title;
    ok(`${arch}: started "${title}"`);

    // 2. Develop: write until the script is done
    for (let n = 0; n < 6 && (await stage()) === 'develop'; n++) { await rest(); await tab('Projects'); await press(/^Write/); }
    (await stage()) === 'finance' ? ok(`${arch}: script done`) : fail(`${arch}: stuck in develop`);

    // 3. Finance: like a real player — barista shift in the morning, pitch the easiest investor after,
    // then put in whatever savings can spare (keeping a bills buffer). "All remaining" when cash covers it.
    for (let day = 0; day < 25 && (await stage()) === 'finance'; day++) {
      await tab('Projects');
      const all = main().getByRole('button', { name: /^Self-fund All remaining/ });
      if ((await all.count()) && !(await all.isDisabled()) && (await S()).player.cash - (await S()).project.budget > 2000) { await all.click(); break; }
      await rest(70);
      await advanceTo(7);
      await travel('weho');
      await d({ type: 'START_JOB', jobId: 'barista' });
      await skip();
      await travel('santamonica');
      await tab('Projects');
      await press(/^Pitch Brentwood Dentists Film Fund/);
      const s = await S();
      if (s.project?.stage === 'finance') {
        const room = s.project.budget - s.project.raised;
        const spare = Math.floor(Math.min(room, s.player.cash - 400));
        if (spare > 0) await d({ type: 'SELF_FUND', amount: spare });
      }
      if ((await stage()) === 'finance') await advanceTo(5);
    }
    (await stage()) === 'crew' ? ok(`${arch}: fully financed`) : fail(`${arch}: stuck in finance`);

    // 4. Crew: hire the first affordable candidates
    for (let n = 0; n < 8 && (await stage()) === 'crew'; n++) { await rest(); await tab('Projects'); if (!(await press(/^Hire /))) break; }
    (await stage()) === 'shoot' ? ok(`${arch}: crew assembled`) : fail(`${arch}: stuck in crew`);

    // 5. Shoot: rest, go to set, wait for call time, press "Shoot a day"
    for (let n = 0; n < 6 && (await stage()) === 'shoot'; n++) {
      await rest(80);
      await travel((await S()).project.location);
      const h = ((await S()).minute % 1440) / 60;
      if (h < 5 || h > 10) await advanceTo(6);
      await tab('Projects');
      if (n === 0) await page.screenshot({ path: `${OUT}/${arch}-1-shoot.png` });
      if (!(await press(/^Shoot a day/))) { fail(`${arch}: Shoot disabled`); break; }
    }
    (await stage()) === 'post' ? ok(`${arch}: picture wrap`) : fail(`${arch}: stuck in shoot`);

    // 6. Post
    for (let n = 0; n < 4 && (await stage()) === 'post'; n++) { await rest(); await tab('Projects'); await press(/^Edit/); }
    (await stage()) === 'festival' ? ok(`${arch}: locked cut`) : fail(`${arch}: stuck in post`);

    // 7. Festivals: submit to every eligible festival, wait for results
    await tab('Projects');
    let submitted = 0;
    for (let n = 0; n < 5; n++) if (await press(/^Submit to /)) submitted++;
    submitted > 0 ? ok(`${arch}: submitted to ${submitted} festival(s)`) : fail(`${arch}: no festival submission possible`);
    await page.screenshot({ path: `${OUT}/${arch}-2-festival.png`, fullPage: true });
    for (let n = 0; n < 8 && (await S()).project?.submissions.some((x) => x.status === 'pending'); n++) await advanceTo(7);
    const p = (await S()).project;
    const accepted = p.submissions.filter((x) => x.status === 'accepted').length;
    ok(`${arch}: results in: ${accepted}/${p.submissions.length} accepted, ${p.offers.length} offer(s)`);
    const trades = (await S()).trades.map((h) => h.text).join('\n');
    trades.includes(title) ? ok(`${arch}: film is in The Trades`) : fail(`${arch}: no Trades headline for the film`);

    // 8. Release: accept the best offer, or self-release
    await tab('Projects');
    const cashBefore = (await S()).player.cash;
    if (p.offers.length > 0) {
      const best = [...p.offers].sort((a, b) => b.amount - a.amount)[0];
      await main().getByRole('button', { name: new RegExp(`^Accept ${best.distributor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Accept & release' }).click();
      const s = await S();
      s.player.cash === cashBefore + best.amount ? ok(`${arch}: offer accepted, +$${best.amount}`) : fail(`${arch}: cash after release ${s.player.cash}, expected ${cashBefore + best.amount}`);
    } else {
      await main().getByRole('button', { name: /^Self-release online/ }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Release it' }).click();
    }
    const end = await S();
    end.project === null && /^(Released by|Self-released)/.test(end.credits[0]?.outcome ?? '')
      ? ok(`${arch}: released — credit "${end.credits[0].title}" (${end.credits[0].outcome}, quality ${end.credits[0].quality})`)
      : fail(`${arch}: release did not finish the project`);
    end.player.cash >= 0 && end.overdraft ? fail(`${arch}: overdraft still showing with cash $${end.player.cash}`) : ok(`${arch}: overdraft state consistent after release`);
    (await page.locator('#release-banner-title').count()) ? ok(`${arch}: release banner shown`) : fail(`${arch}: no release banner`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    overflow ? fail(`${arch}: horizontal overflow`) : ok(`${arch}: no horizontal overflow`);
    await page.screenshot({ path: `${OUT}/${arch}-3-released.png` });
    ok(`${arch}: released on day ${Math.floor(end.minute / 1440)}, cash $${Math.round(end.player.cash)}, RP ${end.player.rp}`);

    // 9. Reload restores the same state
    await page.waitForTimeout(300);
    await d({ type: 'ADVANCE', minutes: 0 });
    const before = JSON.stringify((await S()).credits);
    await page.reload();
    JSON.stringify((await S()).credits) === before ? ok(`${arch}: credits survive reload`) : fail(`${arch}: credits lost on reload`);

    errors.length ? fail(`${arch}: console errors: ${errors.join(' | ')}`) : ok(`${arch}: no console errors`);
    await ctx.close();
  }
  await browser.close();
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
