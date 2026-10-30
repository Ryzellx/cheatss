/* ui.js — cheat-menu style panel. Murni DOM, tanpa chrome.* API → bisa dites di browser biasa.
 * API: BCUI.mount(opts) -> { setBest, setStatus, setElo, setToggles, setEnabled,
 *                            setInfo, addLog, show, hide, toggle, isOpen, destroy, elements }
 */
(function (root) {
  'use strict';

  const CSS_ID = 'bc-ui-style';

  const STYLE = `
.bc-fab{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:54px;height:54px;
 border-radius:14px;border:1px solid #22c55e55;cursor:pointer;background:linear-gradient(160deg,#0f2a1a,#0a1a12);
 color:#22c55e;font:22px/54px ui-monospace,monospace;text-align:center;
 box-shadow:0 8px 24px rgba(0,0,0,.6),0 0 18px #22c55e22;
 transition:transform .14s ease,box-shadow .14s ease}
.bc-fab:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,0,0,.7),0 0 24px #22c55e44}
.bc-fab[data-off="1"]{color:#64748b;border-color:#33415555;background:linear-gradient(160deg,#141a22,#0b1016)}

.bc-win{position:fixed;right:18px;bottom:84px;z-index:2147483001;width:340px;max-width:calc(100vw - 24px);
 max-height:calc(100vh - 100px);display:flex;flex-direction:column;
 box-sizing:border-box;
 background:#0b1016;color:#cbd5e1;border:1px solid #1e293b;border-radius:12px;overflow:hidden;
 font:12.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;
 box-shadow:0 24px 60px rgba(0,0,0,.75);
 transform-origin:bottom right;transition:opacity .14s ease,transform .14s ease}
.bc-win.bc-hidden{opacity:0;visibility:hidden;pointer-events:none}

.bc-bar{display:flex;align-items:center;gap:8px;padding:8px 10px;cursor:grab;user-select:none;
 background:linear-gradient(180deg,#131c26,#0b1016);border-bottom:1px solid #1e293b}
.bc-bar:active{cursor:grabbing}
.bc-brand{font:700 10.5px/1 ui-monospace;letter-spacing:1.6px;color:#22c55e;flex:1}
.bc-brand small{color:#475569;letter-spacing:.6px;font-weight:400}
.bc-dot{width:7px;height:7px;border-radius:50%;background:#475569;flex:0 0 auto}
.bc-dot.ok{background:#22c55e;box-shadow:0 0 8px #22c55eaa}
.bc-dot.busy{background:#eab308;box-shadow:0 0 8px #eab308aa}
.bc-dot.err{background:#ef4444;box-shadow:0 0 8px #ef4444aa}
.bc-ico{width:20px;height:20px;border:none;border-radius:5px;background:#1e293b;color:#94a3b8;
 cursor:pointer;font:12px/20px ui-monospace;padding:0}
.bc-ico:hover{background:#334155;color:#e2e8f0}

.bc-tabs{display:flex;background:#0d141c;border-bottom:1px solid #1e293b}
.bc-tab{flex:1;border:none;background:transparent;color:#64748b;font:600 10px/1 ui-monospace;
 letter-spacing:1.2px;padding:9px 0;cursor:pointer;border-bottom:2px solid transparent}
.bc-tab:hover{color:#94a3b8}
.bc-tab.on{color:#22c55e;border-bottom-color:#22c55e;background:#0f1a14}

.bc-page{padding:12px;display:none}
.bc-page.on{display:block;max-height:min(62vh,540px);overflow-y:auto}

.bc-move{display:flex;align-items:center;justify-content:space-between;gap:10px;
 background:#060a0f;border:1px solid #1e293b;border-radius:8px;padding:9px 11px;margin-bottom:10px}
.bc-move small{display:block;font-size:9px;letter-spacing:1.4px;color:#475569;margin-bottom:2px}
.bc-mv{font:700 19px/1.15 ui-monospace;color:#22c55e;letter-spacing:.5px}
.bc-evalbar{width:6px;height:38px;border-radius:3px;background:#1e293b;position:relative;overflow:hidden;flex:0 0 auto}
.bc-evalbar i{position:absolute;left:0;right:0;bottom:0;height:50%;background:#22c55e;transition:height .2s ease}

.bc-kv{display:flex;justify-content:space-between;padding:3px 0;font-size:11.5px}
.bc-kv span:first-child{color:#64748b}
.bc-kv span:last-child{color:#e2e8f0;font-weight:600}

.bc-lbl{display:flex;justify-content:space-between;align-items:baseline;margin:12px 0 5px}
.bc-lbl b{font-size:9.5px;letter-spacing:1.3px;color:#475569;font-weight:700}
.bc-lbl em{font-style:normal;font:700 12px ui-monospace;color:#22c55e}

.bc-rng{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;outline:none;
 background:linear-gradient(90deg,#22c55e 0%,#22c55e var(--fill,50%),#1e293b var(--fill,50%),#1e293b 100%)}
.bc-rng::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:3px;
 background:#22c55e;border:none;cursor:pointer;box-shadow:0 0 10px #22c55e88}
.bc-rng::-moz-range-thumb{width:12px;height:12px;border-radius:3px;background:#22c55e;border:none;cursor:pointer}

.bc-presets{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}
.bc-preset{border:1px solid #1e293b;background:#0f1720;color:#94a3b8;border-radius:6px;
 padding:7px 6px;font:600 10px/1.35 ui-monospace;cursor:pointer;text-align:left;letter-spacing:.4px}
.bc-preset b{display:block;color:#e2e8f0;font-size:11.5px}
.bc-preset:hover{border-color:#22c55e55;color:#22c55e}
.bc-preset.on{border-color:#22c55e;background:#0f1a14;color:#22c55e}
.bc-preset.on b{color:#22c55e}

.bc-sw{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #16202b}
.bc-sw:last-child{border-bottom:none}
.bc-sw span{color:#cbd5e1;font-size:12px}
.bc-sw small{display:block;color:#475569;font-size:10px;letter-spacing:.3px}
.bc-tog{position:relative;width:40px;height:22px;flex:0 0 auto}
.bc-tog input{opacity:0;width:0;height:0;position:absolute}
.bc-tog i{position:absolute;inset:0;background:#1e293b;border-radius:4px;cursor:pointer;
 transition:background .15s ease}
.bc-tog i::before{content:"";position:absolute;width:16px;height:16px;left:3px;top:3px;
 background:#64748b;border-radius:2px;transition:transform .15s ease,background .15s ease}
.bc-tog input:checked + i{background:#14532d}
.bc-tog input:checked + i::before{transform:translateX(18px);background:#22c55e}

.bc-act{display:flex;gap:6px;margin-top:12px}
.bc-btn{flex:1;border:1px solid #1e293b;background:#111a23;color:#cbd5e1;border-radius:6px;
 padding:8px;font:700 10.5px/1 ui-monospace;letter-spacing:1px;cursor:pointer}
.bc-btn:hover{background:#1a2531;border-color:#334155}
.bc-btn.pri{background:#14532d;border-color:#22c55e66;color:#22c55e}
.bc-btn.pri:hover{background:#166534}

.bc-log{height:132px;overflow-y:auto;background:#060a0f;border:1px solid #1e293b;border-radius:6px;
 padding:7px 8px;font:11px/1.55 ui-monospace;color:#64748b}
.bc-log div{white-space:pre-wrap;word-break:break-word}
.bc-log b{color:#22c55e;font-weight:400}
.bc-log i{color:#eab308;font-style:normal}
.bc-log u{color:#ef4444;text-decoration:none}

.bc-keys{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:11px;margin-top:4px}
.bc-keys kbd{background:#111a23;border:1px solid #1e293b;border-bottom-width:2px;border-radius:4px;
 padding:2px 6px;font:600 10px ui-monospace;color:#94a3b8;text-align:center}
.bc-keys span{color:#64748b;align-self:center}
.bc-note{margin-top:10px;padding:7px 8px;border-left:2px solid #eab308;background:#1a1508;
 color:#a16207;font-size:10.5px;line-height:1.5;border-radius:0 4px 4px 0}

/* --- rating badge di kotak best move --- */
.bc-rate{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:5px;
 font:700 10px/1 ui-monospace;letter-spacing:.8px;text-transform:uppercase;margin-top:6px}
.bc-rate.empty{background:#111a23;color:#475569}

/* --- performance panel --- */
.bc-perf{display:grid;grid-template-columns:1fr 1fr;gap:5px 10px;margin-top:4px}
.bc-perf-row{display:flex;align-items:center;justify-content:space-between;gap:6px;
 background:#0b1219;border:1px solid #16202b;border-radius:5px;padding:5px 7px}
.bc-perf-row span{display:flex;align-items:center;gap:5px;font-size:10.5px;color:#94a3b8}
.bc-perf-dot{width:7px;height:7px;border-radius:2px;flex:0 0 auto}
.bc-perf-row b{font:700 11.5px ui-monospace;color:#e2e8f0}
.bc-perf-row.zero b{color:#334155}

.bc-acc{display:flex;align-items:baseline;justify-content:space-between;
 background:#060a0f;border:1px solid #1e293b;border-radius:8px;padding:9px 11px;margin:10px 0 12px}
.bc-acc small{font-size:9px;letter-spacing:1.4px;color:#475569}
.bc-acc b{font:700 22px/1 ui-monospace;color:#22c55e}
.bc-acc b.low{color:#f7c631}
.bc-acc b.bad{color:#fa412d}

.bc-legend{display:flex;flex-direction:column;gap:3px;margin-top:4px}
.bc-leg{display:flex;align-items:center;gap:7px;font-size:10.5px;color:#94a3b8;padding:2px 0}
.bc-leg i{width:9px;height:9px;border-radius:2px;flex:0 0 auto}
.bc-leg em{font-style:normal;color:#64748b;font-size:10px;margin-left:auto;text-align:right}

.bc-mini{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}
.bc-mini span{font:700 9.5px/1 ui-monospace;padding:3px 5px;border-radius:4px;color:#0b1016}

@media (max-width:420px){
 .bc-win{left:8px;right:8px;width:auto;max-width:none;bottom:76px;
  max-height:calc(100vh - 100px);overflow-y:auto}
 .bc-fab{right:10px;bottom:10px;width:48px;height:48px;font:20px/48px ui-monospace}
 .bc-log{height:110px}
}
`;

  function injectStyle(doc) {
    if (doc.getElementById(CSS_ID)) return;
    const el = doc.createElement('style');
    el.id = CSS_ID;
    el.textContent = STYLE;
    (doc.head || doc.documentElement).appendChild(el);
  }

  function mk(doc, tag, cls, text) {
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  const PRESETS = [
    { name: 'Beginner', elo: 800, desc: 'skill 1 · 38% blunder' },
    { name: 'Club', elo: 1400, desc: 'skill 7 · 15% blunder' },
    { name: 'Advanced', elo: 1800, desc: 'skill 11 · 6% blunder' },
    { name: 'Master', elo: 2200, desc: 'skill 16 · 1% blunder' },
    { name: 'Max', elo: 2800, desc: 'skill 20 · tanpa blunder' },
    { name: 'Custom', elo: null, desc: 'atur sendiri di slider' },
  ];

  function mount(opts) {
    const o = opts || {};
    const doc = o.document || root.document;
    injectStyle(doc);

    /* ---------- FAB ---------- */
    const fab = mk(doc, 'button', 'bc-fab', '♞');
    fab.title = 'Board Coach — Alt+H';

    /* ---------- window ---------- */
    const win = mk(doc, 'div', 'bc-win bc-hidden');

    const bar = mk(doc, 'div', 'bc-bar');
    const brand = mk(doc, 'div', 'bc-brand');
    brand.append(mk(doc, 'span', null, 'BOARD COACH '), mk(doc, 'small', null, 'v1.3'));
    const dot = mk(doc, 'div', 'bc-dot');
    const btnMin = mk(doc, 'button', 'bc-ico', '—');
    btnMin.title = 'sembunyikan (Alt+H)';
    bar.append(brand, dot, btnMin);

    const tabs = mk(doc, 'div', 'bc-tabs');
    const pageEngine = mk(doc, 'div', 'bc-page on');
    const pagePlay = mk(doc, 'div', 'bc-page');
    const pageStats = mk(doc, 'div', 'bc-page');
    const pageKeys = mk(doc, 'div', 'bc-page');

    const tabDefs = [
      { label: 'ENGINE', page: pageEngine },
      { label: 'PLAY', page: pagePlay },
      { label: 'STATS', page: pageStats },
      { label: 'KEYS', page: pageKeys },
    ];
    const tabBtns = tabDefs.map((t, i) => {
      const b = mk(doc, 'button', 'bc-tab' + (i === 0 ? ' on' : ''), t.label);
      b.addEventListener('click', () => {
        tabBtns.forEach((x, j) => {
          x.classList.toggle('on', j === i);
          tabDefs[j].page.classList.toggle('on', j === i);
        });
      });
      tabs.append(b);
      return b;
    });

    /* ---------- ENGINE page ---------- */
    const moveBox = mk(doc, 'div', 'bc-move');
    const mvLeft = mk(doc, 'div');
    mvLeft.append(mk(doc, 'small', null, 'BEST MOVE'), mk(doc, 'div', 'bc-mv', '—'));
    const rateBadge = mk(doc, 'div', 'bc-rate empty', '—');
    mvLeft.append(rateBadge);
    const evalBar = mk(doc, 'div', 'bc-evalbar');
    const evalFill = mk(doc, 'i');
    evalBar.append(evalFill);
    moveBox.append(mvLeft, evalBar);

    const kv = mk(doc, 'div');
    const kvDepth = mk(doc, 'div', 'bc-kv');
    kvDepth.append(mk(doc, 'span', null, 'depth'), mk(doc, 'span', null, '—'));
    const kvNodes = mk(doc, 'div', 'bc-kv');
    kvNodes.append(mk(doc, 'span', null, 'nodes'), mk(doc, 'span', null, '—'));
    const kvEval = mk(doc, 'div', 'bc-kv');
    kvEval.append(mk(doc, 'span', null, 'eval'), mk(doc, 'span', null, '—'));
    const kvTime = mk(doc, 'div', 'bc-kv');
    kvTime.append(mk(doc, 'span', null, 'think'), mk(doc, 'span', null, '—'));
    kv.append(kvDepth, kvNodes, kvEval, kvTime);

    const eloLbl = mk(doc, 'div', 'bc-lbl');
    const eloLblVal = mk(doc, 'em', null, '2800');
    eloLbl.append(mk(doc, 'b', null, 'ELO TARGET'), eloLblVal);

    const eloRange = mk(doc, 'input', 'bc-rng');
    eloRange.type = 'range';
    eloRange.min = '600';
    eloRange.max = '2800';
    eloRange.step = '50';
    eloRange.value = '2800';

    const presetGrid = mk(doc, 'div', 'bc-presets');
    const presetBtns = PRESETS.map((p) => {
      const b = mk(doc, 'button', 'bc-preset');
      b.append(mk(doc, 'b', null, p.name), mk(doc, 'span', null, p.desc));
      b.addEventListener('click', () => {
        if (p.elo == null) return;
        eloRange.value = String(p.elo);
        applyElo(p.elo, true);
      });
      presetGrid.append(b);
      return b;
    });

    const meta = mk(doc, 'div', 'bc-kv');
    const metaVal = mk(doc, 'span', null, '—');
    meta.append(mk(doc, 'span', null, 'profil'), metaVal);

    const act1 = mk(doc, 'div', 'bc-act');
    const btnCalc = mk(doc, 'button', 'bc-btn pri', 'HITUNG');
    const btnCopy = mk(doc, 'button', 'bc-btn', 'COPY FEN');
    act1.append(btnCalc, btnCopy);

    pageEngine.append(moveBox, kv, eloLbl, eloRange, presetGrid, meta, act1);

    /* ---------- PLAY page ---------- */
    function toggleRow(title, sub, checked, onChange) {
      const row = mk(doc, 'div', 'bc-sw');
      const left = mk(doc, 'div');
      left.append(mk(doc, 'span', null, title), mk(doc, 'small', null, sub));
      const tog = mk(doc, 'label', 'bc-tog');
      const cb = mk(doc, 'input');
      cb.type = 'checkbox';
      cb.checked = !!checked;
      tog.append(cb, mk(doc, 'i'));
      cb.addEventListener('change', () => onChange && onChange(cb.checked));
      row.append(left, tog);
      return { row, cb };
    }

    const tArrow = toggleRow('Panah langkah', 'gambar panah di papan', o.arrow !== false,
      (v) => o.onArrow && o.onArrow(v));
    const tAuto = toggleRow('Auto-move', 'ekstensi memainkan langkah', !!o.autoMove,
      (v) => o.onAutoMove && o.onAutoMove(v));
    const tEngine = toggleRow('Engine aktif', 'matikan untuk berhenti menghitung', o.enabled !== false,
      (v) => o.onEnabled && o.onEnabled(v));

    const delayLbl = mk(doc, 'div', 'bc-lbl');
    const delayVal = mk(doc, 'em', null, '900 ms');
    delayLbl.append(mk(doc, 'b', null, 'JEDA AUTO-MOVE'), delayVal);
    const delayRange = mk(doc, 'input', 'bc-rng');
    delayRange.type = 'range';
    delayRange.min = '200';
    delayRange.max = '3000';
    delayRange.step = '100';
    delayRange.value = String(o.moveDelay || 900);
    delayRange.addEventListener('input', () => {
      const v = Number(delayRange.value);
      delayVal.textContent = v + ' ms';
      paintFill(delayRange);
      o.onMoveDelay && o.onMoveDelay(v);
    });

    const note = mk(doc, 'div', 'bc-note',
      'Auto-move adalah sinyal paling kelihatan. Biarkan mati, atau pakai jeda panjang.');

    pagePlay.append(tArrow.row, tAuto.row, tEngine.row, delayLbl, delayRange, note);

    /* ---------- STATS page ---------- */
    const CAT = (root.BCClassify && root.BCClassify.CATS) || {
      brilliant: { label: 'Brilliant', color: '#26c2a3' },
      great: { label: 'Great', color: '#749bbf' },
      best: { label: 'Best', color: '#81b64c' },
      excellent: { label: 'Excellent', color: '#81b64c' },
      good: { label: 'Good', color: '#96af8b' },
      book: { label: 'Book', color: '#a88865' },
      forced: { label: 'Forced', color: '#a88865' },
      inaccuracy: { label: 'Inaccuracy', color: '#f7c631' },
      mistake: { label: 'Mistake', color: '#ffa459' },
      miss: { label: 'Miss', color: '#ff7769' },
      blunder: { label: 'Blunder', color: '#fa412d' },
    };
    const CAT_ORDER = (root.BCClassify && root.BCClassify.ORDER) || Object.keys(CAT);

    const accBox = mk(doc, 'div', 'bc-acc');
    const accNum = mk(doc, 'b', null, '—');
    accBox.append(mk(doc, 'small', null, 'AKURASI'), accNum);

    const perf = mk(doc, 'div', 'bc-perf');
    const perfVals = {};
    for (const key of CAT_ORDER) {
      const c = CAT[key];
      const row = mk(doc, 'div', 'bc-perf-row zero');
      const left = mk(doc, 'span');
      const dot = mk(doc, 'i', 'bc-perf-dot');
      dot.style.background = c.color;
      left.append(dot, mk(doc, 'span', null, c.label));
      const num = mk(doc, 'b', null, '0');
      row.append(left, num);
      perf.append(row);
      perfVals[key] = { row, num };
    }

    const legendLbl = mk(doc, 'div', 'bc-lbl');
    legendLbl.append(mk(doc, 'b', null, 'KETERANGAN'));
    const legend = mk(doc, 'div', 'bc-legend');
    const MEANING = {
      brilliant: 'korban material, tetap terbaik',
      great: 'satu-satunya langkah yang bagus',
      best: 'langkah terbaik mesin',
      excellent: 'rugi ≤ 0.20 pawn',
      good: 'rugi ≤ 0.50 pawn',
      book: 'masih teori pembukaan',
      forced: 'cuma satu langkah legal',
      inaccuracy: 'rugi 0.5–1.0 pawn',
      mistake: 'rugi 1.0–2.5 pawn',
      miss: 'buang mate / keunggulan besar',
      blunder: 'rugi > 2.5 pawn',
    };
    for (const key of CAT_ORDER) {
      const c = CAT[key];
      const row = mk(doc, 'div', 'bc-leg');
      const dot = mk(doc, 'i');
      dot.style.background = c.color;
      row.append(dot, mk(doc, 'span', null, c.label), mk(doc, 'em', null, MEANING[key] || ''));
      legend.append(row);
    }

    const btnReset = mk(doc, 'button', 'bc-btn', 'RESET STATS');
    btnReset.addEventListener('click', () => o.onResetStats && o.onResetStats());

    pageStats.append(accBox, perf, legendLbl, legend, btnReset);

    /* ---------- KEYS page ---------- */
    const logBox = mk(doc, 'div', 'bc-log');
    const keysLbl = mk(doc, 'div', 'bc-lbl');
    keysLbl.append(mk(doc, 'b', null, 'HOTKEY'));
    const keys = mk(doc, 'div', 'bc-keys');
    [
      ['Alt+H', 'sembunyikan / tampilkan menu'],
      ['Alt+Z', 'engine on / off'],
      ['Alt+X', 'hitung ulang'],
      ['Alt+C', 'copy FEN'],
      ['Alt+↑ / ↓', 'ELO +100 / -100'],
    ].forEach(([k, d]) => {
      keys.append(mk(doc, 'kbd', null, k), mk(doc, 'span', null, d));
    });
    pageKeys.append(logBox, keysLbl, keys);

    win.append(bar, tabs, pageEngine, pagePlay, pageStats, pageKeys);
    doc.body.append(fab, win);

    /* ---------- state ---------- */
    let open = false;

    function paintFill(input) {
      const min = Number(input.min), max = Number(input.max), v = Number(input.value);
      input.style.setProperty('--fill', (((v - min) / (max - min)) * 100).toFixed(1) + '%');
    }

    function applyElo(v, notify) {
      eloLblVal.textContent = String(v);
      paintFill(eloRange);
      presetBtns.forEach((b, i) => b.classList.toggle('on', PRESETS[i].elo === Number(v)));
      if (notify) o.onElo && o.onElo(Number(v));
    }

    function setOpen(v) {
      open = !!v;
      win.classList.toggle('bc-hidden', !open);
      fab.style.opacity = open ? '0' : '1';
      fab.style.pointerEvents = open ? 'none' : 'auto';
      if (open) o.onOpen && o.onOpen();
    }

    fab.addEventListener('click', () => setOpen(true));
    btnMin.addEventListener('click', () => setOpen(false));
    eloRange.addEventListener('input', () => applyElo(eloRange.value, true));
    btnCalc.addEventListener('click', () => o.onRecalc && o.onRecalc());
    btnCopy.addEventListener('click', () => o.onCopyFen && o.onCopyFen());

    /* drag by bar */
    let drag = null;
    bar.addEventListener('pointerdown', (e) => {
      if (e.target === btnMin) return;
      const r = win.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      try { bar.setPointerCapture(e.pointerId); } catch (_) {}
    });
    bar.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const w = win.offsetWidth, h = win.offsetHeight;
      const x = Math.min(Math.max(4, e.clientX - drag.dx), root.innerWidth - w - 4);
      const y = Math.min(Math.max(4, e.clientY - drag.dy), root.innerHeight - h - 4);
      win.style.left = x + 'px';
      win.style.top = y + 'px';
      win.style.right = 'auto';
      win.style.bottom = 'auto';
    });
    bar.addEventListener('pointerup', (e) => {
      drag = null;
      try { bar.releasePointerCapture(e.pointerId); } catch (_) {}
    });

    paintFill(eloRange);
    paintFill(delayRange);

    function addLog(text, kind) {
      const row = mk(doc, 'div');
      const t = new Date().toTimeString().slice(0, 8);
      row.append(mk(doc, 'span', null, t + ' '),
        mk(doc, kind === 'err' ? 'u' : kind === 'warn' ? 'i' : 'b', null, text));
      logBox.append(row);
      while (logBox.childNodes.length > 60) logBox.removeChild(logBox.firstChild);
      logBox.scrollTop = logBox.scrollHeight;
    }

    return {
      setBest(move) {
        mvLeft.querySelector('.bc-mv').textContent = move || '—';
        if (move && move.length >= 4) addLog('bestmove ' + move, 'ok');
      },
      setStatus(text, kind) {
        dot.className = 'bc-dot' + (kind ? ' ' + kind : '');
        fab.title = 'Board Coach' + (text ? ' — ' + text : '');
      },
      setElo(p) {
        eloRange.value = String(p.elo);
        eloLblVal.textContent = String(p.elo);
        paintFill(eloRange);
        presetBtns.forEach((b, i) => b.classList.toggle('on', PRESETS[i].elo === p.elo));
        metaVal.textContent =
          `skill ${p.skill}/20 · depth ${p.depth} · blunder ${Math.round((p.blunder || 0) * 100)}%`;
      },
      setToggles(cfg) {
        if ('arrow' in cfg) tArrow.cb.checked = !!cfg.arrow;
        if ('autoMove' in cfg) tAuto.cb.checked = !!cfg.autoMove;
        if ('enabled' in cfg) tEngine.cb.checked = !!cfg.enabled;
        if ('moveDelay' in cfg) {
          delayRange.value = String(cfg.moveDelay);
          delayVal.textContent = cfg.moveDelay + ' ms';
          paintFill(delayRange);
        }
        fab.dataset.off = cfg.enabled === false ? '1' : '0';
      },
      setEnabled(on) { fab.dataset.off = on ? '0' : '1'; },
      setRating(cat) {
        if (!cat) {
          rateBadge.className = 'bc-rate empty';
          rateBadge.textContent = '—';
          rateBadge.style.background = '';
          rateBadge.style.color = '';
          return;
        }
        rateBadge.className = 'bc-rate';
        rateBadge.style.background = cat.color;
        rateBadge.style.color = '#0b1016';
        rateBadge.textContent = (cat.glyph ? cat.glyph + ' ' : '') + cat.label;
      },
      setStats(stats, acc) {
        if (!stats) return;
        for (const key of CAT_ORDER) {
          const cell = perfVals[key];
          if (!cell) continue;
          const n = Number(stats[key] || 0);
          cell.num.textContent = String(n);
          cell.row.classList.toggle('zero', n === 0);
        }
        if (acc == null) {
          accNum.textContent = '—';
          accNum.className = '';
        } else if ((stats.moves || 0) < 3) {
          accNum.textContent = '—';
          accNum.className = '';
        } else {
          const v = Math.round(acc);
          accNum.textContent = v + '%';
          accNum.className = v >= 85 ? '' : v >= 70 ? 'low' : 'bad';
        }
      },
      setInfo(info) {
        const i = info || {};
        if (i.depth != null) kvDepth.lastChild.textContent = String(i.depth);
        if (i.nodes != null) {
          const n = Number(i.nodes);
          kvNodes.lastChild.textContent = n > 1e6 ? (n / 1e6).toFixed(1) + 'M'
            : n > 1e3 ? (n / 1e3).toFixed(0) + 'k' : String(n);
        }
        if (i.evalCp != null) {
          const cp = Number(i.evalCp);
          kvEval.lastChild.textContent = (cp > 0 ? '+' : '') + (cp / 100).toFixed(2);
          const pct = Math.max(4, Math.min(96, 50 + cp / 20));
          evalFill.style.height = pct + '%';
          evalFill.style.background = cp >= 0 ? '#22c55e' : '#ef4444';
        }
        if (i.ms != null) kvTime.lastChild.textContent = i.ms + ' ms';
      },
      addLog(text, kind) {
        addLog(text, kind);
      },
      show() { setOpen(true); },
      hide() { setOpen(false); },
      toggle() { setOpen(!open); },
      isOpen() { return open; },
      elements: { fab, win, dot, eloRange, delayRange, logBox, meta, evalFill },
      destroy() { fab.remove(); win.remove(); },
    };
  }

  root.BCUI = { mount, PRESETS };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BCUI;
})(typeof globalThis !== 'undefined' ? globalThis : this);