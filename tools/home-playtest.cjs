// LAG-96 (PI-3 Sprint 12): 3D home play-test. For every archetype on a phone (390×844), and once on desktop (1280×800):
// the room canvas renders and the phone starts put away; every hotspot is reachable from the "Room actions" list and its
// action card shows the spot and its actions; Bed → Sleep 8h (then Skip to done), TV → +12 Spark, Desk → Make a beat,
// Ring Light → prep (or its soon line), Fridge / Shower / Table → "(coming soon)", Front Door → Merge; travelling away
// shows the Street card ("Open phone", "Head home") and coming home brings the room back; HUD cash → Balance, the speed
// group, the unread label on the phone button; day vs night pixels; room framing at phone width; no console errors, no
// horizontal overflow, the save survives a reload. Then the no-WebGL fallback list, and a frame-time sample with CPU ×4.
// Stat set-ups (Spark, cash) use the dev-only window.__game handle; every room interaction goes through the UI.
// Usage: npm run dev, then: node tools/home-playtest.cjs <screenshot-dir> [url]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const OUT = process.argv[2] || '.';
const URL = process.argv[3] || 'http://localhost:5173/';
const NAMES = { nepo: 'The Nepo Baby', midwest: 'The Midwest Transplant', indie: 'The Indie Hustler', producer: 'The Bedroom Producer' };
const PLACES = { noho: 'North Hollywood', burbank: 'Burbank', hollywood: 'Hollywood', weho: 'West Hollywood', silverlake: 'Silver Lake', santamonica: 'Santa Monica' };
const SPOTS = ['Bed', 'Desk', 'Ring Light', 'TV', 'Fridge', 'Shower', 'Table', 'Front Door'];
const GL_ARGS = ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'];
const results = [];
const info = [];
const fail = (m) => { results.push('FAIL ' + m); console.log('  ✗', m); };
const ok = (m) => { results.push('OK   ' + m); console.log('  ✓', m); };
const check = (cond, m, why = '') => (cond ? ok(m) : fail(why ? `${m} (${why})` : m));
const note = (m) => { info.push(m); console.log('  ·', m); };

const RUNS = [
  ['nepo', 'mobile'],
  ['midwest', 'mobile'],
  ['indie', 'mobile'],
  ['producer', 'mobile'],
  ['indie', 'desktop'],
];

function helpers(page) {
  const S = () => page.evaluate(() => window.__game.getState().state);
  const d = (cmd) => page.evaluate((c) => window.__game.getState().dispatch(c), cmd);
  const patch = (f) => page.evaluate((src) => { const g = window.__game; const st = structuredClone(g.getState().state); new Function('s', src)(st); g.setState({ state: st }); }, f);
  const hud = () => page.locator('header[aria-label="Status"]');
  const phoneBtn = () => hud().getByRole('button', { name: /^(Open phone|Put away phone)/ });
  const phoneIsOpen = async () => (await phoneBtn().getAttribute('aria-expanded')) === 'true';
  const phoneInert = () => page.evaluate(() => !!document.querySelector('[role=group][aria-label="Phone"]')?.closest('[inert]'));
  const openPhone = async () => {
    if (!(await phoneIsOpen())) await phoneBtn().click();
    await page.waitForFunction(() => { const g = document.querySelector('[role=group][aria-label="Phone"]'); return !!g && !g.closest('[inert]'); });
  };
  const closePhone = async () => {
    if (await phoneIsOpen()) await phoneBtn().click();
    await page.waitForFunction(() => !!document.querySelector('[role=group][aria-label="Phone"]')?.closest('[inert]'));
    await page.waitForTimeout(450); // the sheet's slide-down
  };
  const card = () => page.getByRole('region', { name: 'Action card', exact: true });
  const street = () => page.getByRole('region', { name: 'Street', exact: true });
  const region = (name) => page.getByRole('region', { name, exact: true });
  const clearNotices = () => page.evaluate(() => window.__game.setState({ notices: [] }));
  /** The live "Skip to done" (action card when the phone is away, the phone's when it's out). */
  const skipUI = async () => {
    const bs = page.getByRole('button', { name: 'Skip to done', exact: true });
    for (let i = 0; i < (await bs.count()); i++) {
      const b = bs.nth(i);
      if (await b.evaluate((el) => !el.closest('[inert]') && el.getClientRects().length > 0)) return b.click();
    }
  };
  /** Pick a spot through the Room actions list (the keyboard / screen-reader path). */
  const pickSpot = async (name, fallback = false) => {
    if (!fallback) {
      const toggle = page.getByRole('button', { name: 'Room actions', exact: true });
      if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
    }
    await page.getByRole('navigation', { name: 'Room actions' }).getByRole('button', { name, exact: true }).click();
    await card().getByRole('heading', { name: new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).waitFor({ timeout: 3000 });
  };
  const waitActivity = (kind, timeout = 15000) =>
    page.waitForFunction((k) => window.__game.getState().state.activity?.kind === k, kind, { timeout }).then(() => true, () => false);
  /** Average RGB of the room canvas as screenshotted (decoded in the page, no image libs needed). */
  const canvasStats = async () => {
    const png = await page.locator('canvas.home-canvas').screenshot();
    return page.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const { data } = g.getImageData(0, 0, c.width, c.height);
      let r = 0, gg = 0, b = 0, n = 0, sq = 0;
      for (let i = 0; i < data.length; i += 16) {
        const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
        r += data[i]; gg += data[i + 1]; b += data[i + 2]; sq += l * l; n++;
      }
      const mean = (r + gg + b) / 3 / n;
      return { r: r / n, g: gg / n, b: b / n, lum: mean, sd: Math.sqrt(Math.max(0, sq / n - mean * mean)) };
    }, png.toString('base64'));
  };
  return { S, d, patch, hud, phoneBtn, phoneIsOpen, phoneInert, openPhone, closePhone, card, street, region, clearNotices, skipUI, pickSpot, waitActivity, canvasStats };
}

async function startRun(page, arch) {
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: new RegExp(`Start as ${NAMES[arch]}`) }).click();
  await page.locator('header[aria-label="Status"]').waitFor();
}

(async () => {
  const browser = await chromium.launch({ args: GL_ARGS });
  for (const [arch, device] of RUNS) {
    const mobile = device === 'mobile';
    const who = `${arch}@${mobile ? '390' : '1280'}`;
    console.log(`\n== ${who}`);
    const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const h = helpers(page);
    const { S, d, patch, hud, phoneBtn, card, street, region } = h;
    const rested = () => patch('s.player.energy = 100; s.player.spark = 100; s.player.burnout = 0;');

    await startRun(page, arch);
    await hud().getByRole('group', { name: 'Game speed' }).getByRole('button', { name: 'Pause' }).click();
    const start = await S();

    // 1. The room renders, the phone is put away.
    const canvas = page.locator('canvas.home-canvas');
    await canvas.waitFor({ timeout: 15000 }).catch(() => {});
    await page.getByText('Unlocking your apartment…').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(600);
    const st0 = (await canvas.count()) ? await h.canvasStats() : null;
    check(st0 && st0.sd > 8, `${who}: room canvas renders (pixel spread ${st0 ? st0.sd.toFixed(1) : 'n/a'})`);
    check(!(await h.phoneIsOpen()) && (await h.phoneInert()) && /^Open phone/.test(await phoneBtn().getAttribute('aria-label')), `${who}: phone closed (inert) by default; the room is the main screen`);
    check(await card().isVisible(), `${who}: action card shows the idle line`);
    await page.screenshot({ path: `${OUT}/home-${who}-0-room.png` });

    // 2. Framing: every corner of the room lands inside the canvas width (NDC x −1…1), so no wall is clipped at the
    // sides. (Vertically, desktop's close-up lets the near knee wall dip under the action card: noted, not checked.)
    const frame = await page.evaluate(() => {
      const dbg = window.__homeDebug;
      if (!dbg) return null;
      const V = dbg.cam.position.constructor;
      const pts = [];
      for (const x of [-6, 6]) for (const z of [-4.5, 4.5]) for (const y of [0, z < 0 ? 2.6 : 0.7]) pts.push(new V(x, y, z).project(dbg.cam));
      return { minX: Math.min(...pts.map((p) => p.x)), maxX: Math.max(...pts.map((p) => p.x)), minY: Math.min(...pts.map((p) => p.y)), maxY: Math.max(...pts.map((p) => p.y)) };
    });
    if (frame) {
      const fits = frame.minX >= -1 && frame.maxX <= 1;
      check(fits, `${who}: whole room fits the width (x ${frame.minX.toFixed(2)}…${frame.maxX.toFixed(2)}, y ${frame.minY.toFixed(2)}…${frame.maxY.toFixed(2)})`);
    } else fail(`${who}: no __homeDebug camera handle`);

    // 3. Every spot through the Room actions list: the card shows the spot's name and its actions (or why not).
    const expected = {
      Bed: /Sleep 8h/,
      Desk: /Make a beat/,
      'Ring Light': /Prep for "|No auditions to prep for/,
      TV: /Prestige TV binge/,
      Fridge: /\(coming soon\)/,
      Shower: /\(coming soon\)/,
      Table: /\(coming soon\)/,
      'Front Door': /Open Merge/,
    };
    const shown = [];
    for (const name of SPOTS) {
      await h.pickSpot(name);
      const text = (await card().innerText()).replace(/\s+/g, ' ');
      if (text.includes(name) && expected[name].test(text)) shown.push(name);
      else fail(`${who}: ${name} card reads "${text.slice(0, 120)}"`);
      if (['Fridge', 'Shower', 'Table'].includes(name)) check((await card().getByRole('list').count()) === 0, `${who}: ${name} has no actions, only "(coming soon)"`);
    }
    check(shown.length === SPOTS.length, `${who}: all 8 spots open their action card from Room actions`, `ok: ${shown.join(', ')}`);

    // 4. Bed → Sleep 8h → the sim sleeps (after the walk); Skip to done finishes it.
    await rested();
    await h.pickSpot('Bed');
    await card().getByRole('button', { name: 'Sleep 8h', exact: true }).click();
    const slept = await h.waitActivity('sleep');
    check(slept && (await S()).activity.endMinute - (await S()).activity.startMinute === 480, `${who}: Bed → Sleep 8h starts an 8h sleep`);
    await page.screenshot({ path: `${OUT}/home-${who}-1-sleep.png` });
    await card().getByRole('button', { name: 'Skip to done', exact: true }).click();
    check((await S()).activity === null, `${who}: Skip to done on the card finishes the sleep`);

    // 5. TV → Prestige TV binge: +12 Spark.
    await patch('s.player.spark = 50; s.player.energy = 100;');
    await h.pickSpot('TV');
    await card().getByRole('button', { name: 'Prestige TV binge', exact: true }).click();
    const watching = await h.waitActivity('leisure');
    await card().getByRole('button', { name: 'Skip to done', exact: true }).click().catch(() => {});
    check(watching && (await S()).player.spark === 62, `${who}: TV binge gives +12 Spark (50 → ${(await S()).player.spark})`);

    // 6. Desk → Make a beat adds a beat.
    await rested();
    const beats0 = (await S()).beats.length;
    await h.pickSpot('Desk');
    await card().getByRole('button', { name: 'Make a beat', exact: true }).click();
    const beating = await h.waitActivity('beat');
    await card().getByRole('button', { name: 'Skip to done', exact: true }).click().catch(() => {});
    check(beating && (await S()).beats.length === beats0 + 1, `${who}: Make a beat adds a beat (${beats0} → ${(await S()).beats.length})`);

    // 7. Ring Light → Prep for "…" adds an hour of prep (or shows its soon line when nothing is open).
    await rested();
    await h.pickSpot('Ring Light');
    const prepBtn = card().getByRole('button', { name: /^Prep for "/ });
    if (await prepBtn.count()) {
      const s0 = await S();
      const title = (await prepBtn.innerText()).match(/^Prep for "(.*)"$/)?.[1];
      const before = s0.board.find((o) => o.title === title)?.prepHours ?? -1;
      await prepBtn.click();
      const prepping = await h.waitActivity('prep');
      await card().getByRole('button', { name: 'Skip to done', exact: true }).click().catch(() => {});
      const after = (await S()).board.find((o) => o.title === title)?.prepHours ?? -1;
      check(prepping && after === before + 1, `${who}: Ring Light prep for "${title}" adds 1h (${before} → ${after})`);
    } else {
      check(/No auditions to prep for/.test(await card().innerText()), `${who}: Ring Light shows its soon line (no open auditions)`);
    }

    // 8. Front Door → Open Merge opens the phone at Merge; travel away → Street; travel home → the room is back.
    await rested();
    await h.pickSpot('Front Door');
    await card().getByRole('button', { name: 'Open Merge', exact: true }).click();
    await region('Merge').waitFor({ timeout: 3000 }).catch(() => {});
    check((await h.phoneIsOpen()) && (await region('Merge').isVisible()), `${who}: Front Door → Open Merge raises the phone at Merge`);
    const away = 'hollywood';
    await region('Merge').getByRole('button', { name: new RegExp(`^Travel to ${PLACES[away]}:`) }).last().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Go' }).click();
    await h.skipUI();
    await h.closePhone();
    check((await S()).player.location === away && (await street().isVisible()), `${who}: away from home the Street card replaces the room`);
    check(
      (await street().getByRole('button', { name: 'Open phone', exact: true }).isVisible()) && (await street().getByRole('button', { name: 'Head home', exact: true }).isVisible()),
      `${who}: Street card offers "Open phone" and "Head home"`,
    );
    check(!(await canvas.isVisible()), `${who}: the room is hidden while away`);
    await page.screenshot({ path: `${OUT}/home-${who}-2-street.png` });
    await street().getByRole('button', { name: 'Open phone', exact: true }).click();
    await page.getByRole('navigation', { name: 'Apps' }).waitFor({ timeout: 3000 }).catch(() => {});
    check((await h.phoneIsOpen()) && (await page.getByRole('navigation', { name: 'Apps' }).isVisible()), `${who}: Street "Open phone" raises the phone at its home screen`);
    await h.closePhone();
    await street().getByRole('button', { name: 'Head home', exact: true }).click();
    await region('Merge').waitFor({ timeout: 3000 });
    await region('Merge').getByRole('button', { name: new RegExp(`^Travel to ${PLACES[start.player.home]}:`) }).last().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Go' }).click();
    await h.skipUI();
    await h.closePhone();
    check((await S()).player.location === start.player.home && (await card().isVisible()) && (await canvas.isVisible()) && !(await street().count()), `${who}: travelling home brings the room back`);

    // 9. HUD: cash → Balance; the speed group; the unread label on the phone button.
    await hud().getByRole('button', { name: /^Cash / }).click();
    await region('Balance').waitFor({ timeout: 3000 }).catch(() => {});
    check((await h.phoneIsOpen()) && (await region('Balance').isVisible()), `${who}: HUD cash opens Balance`);
    await h.closePhone();
    const speed = hud().getByRole('group', { name: 'Game speed' });
    const m0 = (await S()).minute;
    await speed.getByRole('button', { name: 'Normal speed' }).click();
    await page.waitForTimeout(1500);
    const m1 = (await S()).minute;
    const pressed = await speed.getByRole('button', { name: 'Normal speed' }).getAttribute('aria-pressed');
    await speed.getByRole('button', { name: 'Pause' }).click();
    const m2 = (await S()).minute;
    await page.waitForTimeout(600);
    check(m1 > m0 && pressed === 'true' && (await S()).minute === m2, `${who}: HUD speed group plays (${m0} → ${m1}) and pauses`);
    await h.clearNotices();
    await patch('s.player.cash = -1;');
    await d({ type: 'ADVANCE', minutes: 1 });
    const unread = (await S()).inbox.reduce((n, x) => n + x.unread, 0);
    const label = await phoneBtn().getAttribute('aria-label');
    check(unread > 0 && label === `Open phone, ${unread} unread message${unread === 1 ? '' : 's'}`, `${who}: HUD phone button announces unread texts ("${label}")`);
    await patch('s.player.cash = 500;');
    await d({ type: 'ADVANCE', minutes: 1 });
    await h.clearNotices();

    // 10. Day / night: the room's sky differs between 08:00 and 22:00.
    const toHour = async (hr) => { const s = await S(); let t = Math.floor(s.minute / 1440) * 1440 + hr * 60; if (t <= s.minute) t += 1440; await d({ type: 'ADVANCE', minutes: t - s.minute }); await page.waitForTimeout(500); };
    await toHour(8);
    const day = await h.canvasStats();
    await page.screenshot({ path: `${OUT}/home-${who}-3-0800.png` });
    await toHour(22);
    const night = await h.canvasStats();
    await page.screenshot({ path: `${OUT}/home-${who}-4-2200.png` });
    check(day.lum - night.lum > 15, `${who}: day is brighter than night (lum ${day.lum.toFixed(0)} vs ${night.lum.toFixed(0)})`);

    // 11. Hygiene.
    const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check(!over, `${who}: no horizontal overflow`);
    await page.evaluate(() => window.__game.getState().save());
    const before = JSON.stringify(await S());
    await page.reload();
    await hud().waitFor();
    check(JSON.stringify(await S()) === before, `${who}: reload restores identical state`);
    await canvas.waitFor({ timeout: 15000 }).catch(() => {});
    check((await canvas.isVisible()) && !(await h.phoneIsOpen()), `${who}: after reload the room is back with the phone put away`);
    check(!errors.length, `${who}: no console errors`, errors.join(' | ').slice(0, 400));
    await ctx.close();
  }

  // 12. No WebGL: the room actions become an on-screen list, and actions run without the walk.
  {
    const who = 'no-webgl@390';
    console.log(`\n== ${who}`);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return /webgl/i.test(type) ? null : orig.call(this, type, ...rest);
      };
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    const h = helpers(page);
    await startRun(page, 'midwest');
    await page.evaluate(() => window.__game.getState().setSpeed(0));
    const nav = page.getByRole('navigation', { name: 'Room actions' });
    await nav.waitFor();
    check((await page.locator('canvas.home-canvas').count()) === 0, `${who}: no canvas without WebGL`);
    check((await nav.isVisible()) && /3D isn’t available/.test(await nav.innerText()) && (await nav.getByRole('button').count()) === 8, `${who}: fallback shows all 8 room actions on screen`);
    check((await page.getByRole('button', { name: 'Room actions', exact: true }).count()) === 0, `${who}: no toggle needed in the fallback`);
    await page.screenshot({ path: `${OUT}/home-${who}.png` });
    await h.pickSpot('Bed', true);
    await h.card().getByRole('button', { name: 'Sleep 8h', exact: true }).click();
    check(await h.waitActivity('sleep', 3000), `${who}: Bed → Sleep 8h runs straight away`);
    await h.card().getByRole('button', { name: 'Skip to done', exact: true }).click();
    check((await h.S()).activity === null, `${who}: Skip to done works`);
    const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    check(!over, `${who}: no horizontal overflow`);
    check(!errors.length, `${who}: no console errors`, errors.join(' | ').slice(0, 400));
    await ctx.close();
  }

  // 13. Performance: average frame time in the room over ~5s, 390×844, CPU throttled ×4 (SwiftShader: software GL,
  // so this is a pessimistic number for real phones).
  if (!process.env.SKIP_PERF) {
    for (const dpr of [1, 2]) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: dpr });
      const page = await ctx.newPage();
      await startRun(page, 'indie');
      await page.locator('canvas.home-canvas').waitFor({ timeout: 15000 });
      await page.getByText('Unlocking your apartment…').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1000);
      const cdp = await ctx.newCDPSession(page);
      await cdp.send('Performance.enable');
      const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
      const sample = async () => {
        const m0 = await metric();
        const r = await page.evaluate(
          () =>
            new Promise((res) => {
              const times = [];
              let last = performance.now();
              const t0 = last;
              const f = (now) => {
                times.push(now - last);
                last = now;
                if (now - t0 < 5000) requestAnimationFrame(f);
                else {
                  times.sort((a, b) => a - b);
                  res({ frames: times.length, avg: times.reduce((a, b) => a + b, 0) / times.length, p95: times[Math.floor(times.length * 0.95)] });
                }
              };
              requestAnimationFrame(f);
            }),
        );
        const m1 = await metric();
        // Main-thread JS per frame (three's scene update + render submission + React/sim), separate from GL raster.
        return { ...r, script: ((m1.ScriptDuration - m0.ScriptDuration) * 1000) / r.frames };
      };
      const fmt = (x) => `avg ${x.avg.toFixed(1)} ms (p95 ${x.p95.toFixed(1)}, ~${(1000 / x.avg).toFixed(0)} fps), main-thread JS ${x.script.toFixed(1)} ms/frame`;
      const base = await sample();
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      const slow = await sample();
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      note(`perf 390×844 DPR${dpr} (SwiftShader software GL): unthrottled ${fmt(base)}; CPU ×4 ${fmt(slow)}`);
      await ctx.close();
    }
  }

  await browser.close();
  const failed = results.filter((r) => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  for (const i of info) console.log('INFO ' + i);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(1); });
