// LAG-82: writers' room + guilds acceptance play-test. For every archetype: start a spec pilot, write it, build the
// deck and meet an agency from the Projects tab; wait out staffing season; if staffed, do a room day from Hustle and
// answer the politics sheet; then join a guild from the Guilds section.
// Travel, sleep and waiting use the dev-only window.__game handle; every writer and guild decision goes through the UI.
// Usage: npm run dev, then: node tools/writers-playtest.cjs <screenshot-dir> [url]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:5173/';
const NAMES = { nepo: 'The Nepo Baby', midwest: 'The Midwest Transplant', indie: 'The Indie Hustler', producer: 'The Bedroom Producer' };
const AGENCIES = [
  ['Lantern & Lark Talent', 'silverlake'],
  ['Envelope & Sons Agency', 'noho'],
];
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
    const day = async () => Math.floor((await S()).minute / 1440);
    const stage = async () => (await S()).project?.stage ?? null;
    const advanceTo = async (h) => {
      const s = await S();
      let t = Math.floor(s.minute / 1440) * 1440 + h * 60;
      if (t <= s.minute) t += 1440;
      await d({ type: 'ADVANCE', minutes: t - s.minute });
    };
    const travel = async (to) => { if ((await S()).player.location !== to) { await d({ type: 'TRAVEL', to }); await skip(); } };
    const rest = async (min = 60) => {
      const s = await S();
      if (s.player.energy >= min && s.player.spark >= 25) return;
      await travel(s.player.home);
      await d({ type: 'SLEEP', hours: 9 });
      await skip();
      if ((await S()).player.spark < 25) { await travel('santamonica'); await d({ type: 'LEISURE', leisureId: 'beach' }); await skip(); }
    };
    // Keep the run alive while waiting: a barista shift and a full night's sleep each day.
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
    const press = async (name, scope = main()) => {
      const b = scope.getByRole('button', { name }).first();
      if (!(await b.count()) || (await b.isDisabled())) return false;
      await b.click();
      await skip();
      return true;
    };

    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('button', { name: new RegExp(`Start as ${NAMES[arch]}`) }).click();
    await page.evaluate(() => window.__game.getState().setSpeed(0));

    // 1. Start a spec pilot
    await tab('Projects');
    if (!(await press(/^Start Spec pilot/))) { fail(`${arch}: could not start a spec pilot`); await ctx.close(); continue; }
    const p0 = (await S()).project;
    p0.medium === 'tv' && p0.scale === 'spec' ? ok(`${arch}: started spec pilot "${p0.title}"`) : fail(`${arch}: not a spec pilot`);
    (await main().getByText(/self-fund/i).count()) ? fail(`${arch}: film/music funding shown for TV`) : ok(`${arch}: no funding UI for TV`);

    // 2. Write the spec, 3. build the deck
    for (let n = 0; n < 5 && (await stage()) === 'develop'; n++) { await rest(); await tab('Projects'); await press(/^Write a draft/); }
    (await stage()) === 'deck' ? ok(`${arch}: spec pilot written`) : fail(`${arch}: stuck writing the spec`);
    for (let n = 0; n < 4 && (await stage()) === 'deck'; n++) { await rest(); await tab('Projects'); await press(/^Build deck/); }
    (await stage()) === 'agent' ? ok(`${arch}: pitch deck built`) : fail(`${arch}: stuck on the deck`);
    await page.screenshot({ path: `${OUT}/${arch}-1-agents.png`, fullPage: true });

    // 4. Meet the easiest agencies, one meeting a day, until one signs
    let meetings = 0;
    for (let n = 0; n < 8 && (await stage()) === 'agent'; n++) {
      const [name, where] = AGENCIES[n % AGENCIES.length];
      await rest(60);
      await advanceTo(11);
      await travel(where);
      await tab('Projects');
      if (await press(new RegExp(`^Meet ${name.replace(/&/g, '&')}`))) meetings++;
      if ((await stage()) === 'agent') await liveADay();
    }
    const agent = (await S()).project?.agent;
    agent ? ok(`${arch}: signed by ${agent.name} after ${meetings} meeting(s)`) : fail(`${arch}: no agent after ${meetings} meeting(s)`);

    // 5. Staffing season: tries every 5 days at 06:00
    if (agent) {
      await tab('Projects');
      (await main().getByText(/Tries/).count()) ? ok(`${arch}: staffing season shown`) : fail(`${arch}: no staffing info`);
      for (let n = 0; n < 20 && (await S()).project && (await S()).status === 'playing'; n++) await liveADay();
      const s = await S();
      const credit = s.credits[0];
      s.project === null && credit && /^(Staffed on|Didn't get staffed)/.test(credit.outcome)
        ? ok(`${arch}: staffing over — ${credit.outcome}`)
        : fail(`${arch}: staffing did not finish (${JSON.stringify(credit)})`);

      // 6. Writers' room: a room day from Hustle, then answer the politics sheet
      if (s.contract?.kind === 'writer') {
        await rest(70);
        await travel('burbank');
        await advanceTo(9);
        await tab('Hustle');
        (await main().getByText(/Staff writer/).count()) ? ok(`${arch}: staff-writer show card on Hustle`) : fail(`${arch}: no staff-writer card`);
        const favor0 = (await S()).contract.favor;
        const room = main().getByRole('button', { name: /^Room day/ }).first();
        if ((await room.count()) && !(await room.isDisabled())) {
          await room.click();
          await skip();
          const sheet = page.getByRole('dialog');
          (await S()).roomEvent && (await sheet.count()) ? ok(`${arch}: room politics sheet opened`) : fail(`${arch}: no politics sheet`);
          await page.screenshot({ path: `${OUT}/${arch}-2-room.png` });
          await sheet.getByRole('button', { name: /^Answer 1:/ }).click();
          const t = await S();
          t.roomEvent === null && t.contract.shotThisWeek ? ok(`${arch}: answered — favor ${favor0} → ${t.contract.favor}`) : fail(`${arch}: room answer not applied`);
          (await page.getByRole('dialog').count()) === 0 ? ok(`${arch}: politics sheet closed`) : fail(`${arch}: sheet still open`);
        } else fail(`${arch}: Room day unavailable`);
      } else ok(`${arch}: not staffed this run (room checks skipped)`);
    }

    // 7. Guilds: three Acting vouchers (state tweak), then join TEA at its HQ through the UI
    await page.evaluate(() => {
      const g = window.__game.getState();
      g.state.player.guilds.acting.vouchers = 3;
      g.state.player.cash += 1500;
    });
    await rest(40);
    await travel('hollywood');
    await advanceTo(10);
    await tab('Hustle');
    const guilds = main().getByRole('region', { name: 'Guilds' });
    (await guilds.count()) ? ok(`${arch}: Guilds section shown`) : fail(`${arch}: no Guilds section`);
    const cash0 = (await S()).player.cash;
    if (await press(/^Join TEA/, guilds)) {
      const t = await S();
      t.player.guilds.acting.member && t.player.cash === cash0 - 1000 ? ok(`${arch}: joined TEA (−$1,000)`) : fail(`${arch}: join had no effect`);
      await tab('Hustle');
      (await main().getByRole('region', { name: 'Guilds' }).getByText(/Member/).count()) ? ok(`${arch}: Member badge shown`) : fail(`${arch}: no Member badge`);
    } else fail(`${arch}: Join TEA disabled`);
    await page.screenshot({ path: `${OUT}/${arch}-3-guilds.png`, fullPage: true });

    // 8. Hygiene
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    overflow ? fail(`${arch}: horizontal overflow`) : ok(`${arch}: no horizontal overflow`);
    const before = JSON.stringify([(await S()).player.guilds, (await S()).credits, (await S()).contract]);
    await page.reload();
    JSON.stringify([(await S()).player.guilds, (await S()).credits, (await S()).contract]) === before ? ok(`${arch}: writer + guild state survives reload`) : fail(`${arch}: state lost on reload`);
    errors.length ? fail(`${arch}: console errors: ${errors.join(' | ')}`) : ok(`${arch}: no console errors`);
    await ctx.close();
  }
  await browser.close();
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
})();
