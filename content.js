/**
 * content.js — pembaca papan + overlay engine lokal + klasifikasi langkah.
 * Semua proses lokal: tidak ada request keluar, tidak menyuntik script ke halaman.
 */
(() => {
  'use strict';

  // chess.com itu SPA — content script bisa disuntik ulang saat navigasi.
  // Tanpa guard ini, dua instance = dua engine + dua panel + hotkey dobel.
  if (window.__bcLoaded) return;
  window.__bcLoaded = true;

  const CFG = {
    elo: 2800,        // 2800 = kekuatan penuh
    enabled: true,
    autoMove: false,
    arrow: true,
    labels: true,     // label kategori di ujung panah
    moveDelay: 900,   // jeda sebelum auto-move (ms)
  };

  const FILES = BCFen.FILES;
  const CLS = typeof BCClassify !== 'undefined' ? BCClassify : null;
  const MULTIPV = 5;

  let worker = null;
  let ready = false;
  let lastFen = '';
  let lastBest = null;
  let busy = false;
  let busyAt = 0;
  let candidates = [];          // [{uci, cp, mate}] per multipv
  let lastScore = { cp: 0, mate: null };

  // penjaga balapan: 'stop' memicu bestmove basi dari pencarian sebelumnya
  let searchSeq = 0;
  let infoCount = 0;
  let staleStop = false;
  let searchFen = '';

  let evalCache = new Map();    // fen -> {cp, mate, best, gap, legal}
  let stats = CLS ? CLS.emptyStats() : { moves: 0, lossSum: 0 };
  let playerSide = null;        // 'w' | 'b' | null
  let pendingClass = null;      // {oldFen, newFen, played}
  let ratingTimer = null;

  let mode = 'main';            // 'main' | 'aux'
  let auxResolve = null;
  let auxScore = { cp: 0, mate: null };
  let auxBest = null;

  const profile = () => BCElo.forElo(CFG.elo);

  /* ---------------- jembatan ke dunia halaman ---------------- */

  // content script hidup di isolated world → tidak bisa baca board.game milik
  // chess.com. bridge.js disuntik ke dunia halaman dan mengirim state lewat event.
  let pageState = null;

  document.addEventListener('bc-state', (e) => {
    try {
      const s = JSON.parse(e.detail);
      if (s && s.t) pageState = s;
    } catch (_) {}
  });

  function injectBridge() {
    try {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('bridge.js');
      s.async = false;
      s.onload = () => s.remove();
      (document.head || document.documentElement).appendChild(s);
    } catch (_) {}
  }

  const stateFresh = () => pageState && Date.now() - pageState.t < 4000;

  /* ---------------- baca papan ---------------- */

  function findBoard() {
    return (
      document.querySelector('wc-chess-board#board-single') ||
      document.querySelector('wc-chess-board') ||
      document.querySelector('.board') ||
      null
    );
  }

  function readPieces(board) {
    const nodes = board.querySelectorAll('.piece, [class*="square-"]');
    const out = [];
    for (const el of nodes) {
      const p = BCFen.pieceFromClasses(el.classList);
      const sq = BCFen.squareFromClasses(el.classList);
      if (p && sq) out.push({ ...p, ...sq });
    }
    return out;
  }

  // Sumber utama: state dari bridge.js (FEN lengkap, castling, en passant, SAN).
  // Cadangan: scraping DOM (kalau bridge belum siap / diblok CSP).
  function readFen(board) {
    if (stateFresh() && pageState.fen && pageState.fen.split(' ').length >= 4) return pageState.fen;
    try {
      const g = board.game;
      if (g && typeof g.getFEN === 'function') {
        const f = g.getFEN();
        if (typeof f === 'string' && f.split(' ').length >= 4) return f;
      }
    } catch (_) {}
    const pieces = readPieces(board);
    if (pieces.length < 4) return null;
    return BCFen.toFen(pieces, sideToMove());
  }

  function gameApi(board) {
    try { return (board && board.game) || null; } catch (_) { return null; }
  }

  function sideToMove() {
    const turn = document.querySelector('.clock-player-turn');
    if (turn) {
      if (turn.classList.contains('clock-white')) return 'w';
      if (turn.classList.contains('clock-black')) return 'b';
    }
    const moves = document.querySelectorAll(
      '.move-list .node:not(.initial), .vertical-move-list .node, wc-move-list .node'
    );
    if (moves.length) return moves.length % 2 === 0 ? 'w' : 'b';
    return 'w';
  }

  function playerColor(board) {
    if (stateFresh() && pageState.playingAs != null) {
      const v = pageState.playingAs;
      if (v === 1 || v === 'w' || v === 'white') return 'w';
      if (v === 2 || v === 'b' || v === 'black') return 'b';
    }
    const g = gameApi(board);
    if (g && typeof g.getPlayingAs === 'function') {
      try {
        const v = g.getPlayingAs();
        if (v === 1 || v === 'w' || v === 'white') return 'w';
        if (v === 2 || v === 'b' || v === 'black') return 'b';
      } catch (_) {}
    }
    // fallback: papan menghadap siapa (tidak flipped = putih di bawah)
    try {
      if (board.classList.contains('flipped') || board.getAttribute('flipped') !== null) return 'b';
    } catch (_) {}
    return 'w';
  }

  const turnOf = (fen) => (fen || '').split(' ')[1] || 'w';

  function isMyTurn(board, fen) {
    if (!playerSide) return true;          // tidak tahu warna → tampilkan saja
    return turnOf(fen) === playerSide;
  }

  /* ---------------- riwayat ---------------- */

  function historySans(board) {
    if (stateFresh() && Array.isArray(pageState.sans)) return pageState.sans;
    const g = gameApi(board);
    if (g && typeof g.getHistorySANs === 'function') {
      try {
        const s = g.getHistorySANs();
        if (Array.isArray(s) && s.length) return s;
      } catch (_) {}
    }
    // cadangan terakhir: baca daftar langkah dari DOM
    try {
      const nodes = document.querySelectorAll('.move-list .node, wc-move-list .node, .vertical-move-list .node');
      const out = [];
      for (const n of nodes) {
        const t = (n.textContent || '').trim();
        if (t) out.push(t);
      }
      return out;
    } catch (_) {
      return [];
    }
  }

  function legalCount() {
    if (stateFresh() && typeof pageState.legal === 'number') return pageState.legal;
    return 0;
  }

  function lastMoveUci(board, oldFen, newFen) {
    if (stateFresh() && pageState.last && pageState.last.from && pageState.last.to) {
      return String(pageState.last.from) + String(pageState.last.to);
    }
    const g = gameApi(board);
    if (g && typeof g.getLastMove === 'function') {
      try {
        const m = g.getLastMove();
        if (m && m.from && m.to) return String(m.from) + String(m.to);
      } catch (_) {}
    }
    return diffUci(oldFen, newFen);
  }

  // Cari from/to dengan membandingkan dua FEN (cadangan kalau API tidak ada)
  function boardMap(fen) {
    const rows = String(fen || '').split(' ')[0].split('/');
    const map = {};
    for (let r = 0; r < 8; r++) {
      let file = 0;
      for (const ch of rows[r] || '') {
        if (/\d/.test(ch)) { file += Number(ch); continue; }
        map[FILES[file] + (8 - r)] = ch;
        file++;
      }
    }
    return map;
  }

  function diffUci(oldFen, newFen) {
    if (!oldFen || !newFen) return null;
    const a = boardMap(oldFen);
    const b = boardMap(newFen);
    const gone = [];
    const came = [];
    for (const sq of Object.keys(a)) if (a[sq] !== b[sq]) gone.push(sq);
    for (const sq of Object.keys(b)) if (a[sq] !== b[sq]) came.push(sq);
    if (!gone.length || !came.length) return null;
    // from = kotak yang kosong sekarang; to = kotak yang terisi sekarang
    let from = null, to = null;
    for (const sq of gone) if (!b[sq]) from = sq;
    for (const sq of came) if (b[sq]) to = sq;
    if (!from || !to) {
      from = gone[0];
      to = came[0];
    }
    return from + to;
  }

  /* ---------------- engine ---------------- */

  function applyStrength() {
    if (!worker) return;
    for (const cmd of BCElo.uciSetup(profile())) worker.postMessage(cmd);
    worker.postMessage(`setoption name MultiPV value ${MULTIPV}`);
  }

  function startEngine() {
    if (worker) return;
    const url = chrome.runtime.getURL('stockfish.js');
    let attempt = 0;

    function boot(w) {
      const myAttempt = ++attempt;
      worker = w;
      let ok = false;

      worker.onerror = (e) => {
        if (!ok) { tryNext(myAttempt, 'worker error: ' + ((e && e.message) || '?')); return; }
        setStatus('engine error', 'err');
        if (ui) ui.addLog('worker error: ' + ((e && e.message) || '?'), 'err');
      };
      worker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : e.data && e.data.data;
        if (line && String(line).includes('uciok')) ok = true;
        onEngineMessage(e);
      };
      worker.postMessage('uci');

      setTimeout(() => {
        if (!ok && myAttempt === attempt) tryNext(myAttempt, 'tidak ada uciok dalam 15s');
      }, 15000);
    }

    function tryNext(failedAttempt, why) {
      if (failedAttempt !== attempt) return;
      if (ui) ui.addLog('engine gagal (' + why + ') — coba jalur ' + (attempt + 1), 'warn');
      if (attempt < 2) {
        try { boot(new Worker(url)); } catch (e) {
          if (ui) ui.addLog('worker langsung ditolak: ' + e.message, 'err');
          setStatus('engine gagal', 'err');
        }
      } else {
        setStatus('engine gagal', 'err');
        if (ui) ui.addLog('semua jalur engine gagal', 'err');
      }
    }

    // Jalur 1: ambil teks engine → blob worker (Worker dari chrome-extension:// diblok halaman)
    fetch(url)
      .then((r) => r.text())
      .then((code) => {
        const blobUrl = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
        boot(new Worker(blobUrl));
      })
      .catch((err) => {
        if (ui) ui.addLog('fetch engine gagal: ' + err.message, 'err');
        tryNext(0, 'fetch gagal');
      });
  }

  function parseScore(s) {
    const c = /\bscore cp (-?\d+)/.exec(s);
    if (c) return { cp: Number(c[1]), mate: null };
    const m = /\bscore mate (-?\d+)/.exec(s);
    if (m) return { cp: 0, mate: Number(m[1]) };
    return null;
  }

  function onEngineMessage(e) {
    const line = typeof e.data === 'string' ? e.data : e.data && e.data.data;
    if (!line) return;
    const s = String(line);

    if (s.includes('uciok')) {
      ready = true;
      applyStrength();
      setStatus('engine siap', 'ok');
      if (ui) ui.addLog('engine siap · ' + profile().skill + '/20', 'ok');
      requestMove();
      return;
    }

    if (s.startsWith('info ') && s.includes(' pv ')) {
      const mp = /multipv (\d+)/.exec(s);
      const pv = /\bpv (\S+)/.exec(s);
      const sc = parseScore(s);

      if (mode === 'aux') {
        if (sc) auxScore = sc;
        if (pv) auxBest = pv[1];
      } else {
        infoCount++;
        if (mp && pv && sc) {
          candidates[Number(mp[1]) - 1] = { uci: pv[1], cp: sc.cp, mate: sc.mate };
        }
        if (sc && (!mp || Number(mp[1]) === 1)) lastScore = sc;

        const d = /\bdepth (\d+)/.exec(s);
        const n = /\bnodes (\d+)/.exec(s);
        const t = /\btime (\d+)/.exec(s);
        const info = {};
        if (d) info.depth = Number(d[1]);
        if (n) info.nodes = Number(n[1]);
        if (t) info.ms = Number(t[1]);
        if (sc && sc.mate == null) info.evalCp = sc.cp;
        else if (sc && sc.mate != null) info.evalCp = sc.mate > 0 ? 9999 : -9999;
        if (ui && Object.keys(info).length) ui.setInfo(info);
      }
      return;
    }

    const bm = /^bestmove\s+(\S+)/.exec(s);
    if (!bm) return;

    if (mode === 'aux') {
      mode = 'main';
      const done = auxResolve;
      auxResolve = null;
      busy = false;
      if (done) done({ cp: auxScore.cp, mate: auxScore.mate, best: auxBest || bm[1] });
      return;
    }

    // bestmove basi dari pencarian yang sudah di-'stop'
    if (staleStop && infoCount === 0) {
      staleStop = false;
      return;
    }
    staleStop = false;

    busy = false;
    const chosen = BCElo.pickMove(candidates.filter(Boolean).map((c) => c.uci), profile()) || bm[1];
    lastBest = chosen;

    // simpan evaluasi posisi ini
    const top = candidates.filter(Boolean);
    const gap = top.length > 1
      ? (CLS.toCp(top[0].cp, top[0].mate) - CLS.toCp(top[1].cp, top[1].mate))
      : 999;
    const legal = legalCount();

    evalCache.set(searchFen || lastFen, {
      cp: lastScore.cp, mate: lastScore.mate, best: chosen, gap, legal,
      map: candidates.filter(Boolean).reduce((acc, c) => {
        if (c && c.uci && !(c.uci in acc)) acc[c.uci] = { cp: c.cp, mate: c.mate };
        return acc;
      }, {}),
    });
    if (evalCache.size > 200) {
      const first = evalCache.keys().next().value;
      evalCache.delete(first);
    }

    renderBest(chosen);
    finishClassification();
  }

  // evaluasi cepat satu posisi (dipakai kalau cache kosong)
  function quickEval(fen) {
    return new Promise((resolve) => {
      if (!ready || !worker) return resolve(null);
      mode = 'aux';
      auxScore = { cp: 0, mate: null };
      auxBest = null;
      auxResolve = resolve;
      worker.postMessage('stop');
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage('go movetime 400 depth 10');
      setTimeout(() => {
        if (mode === 'aux') {
          mode = 'main';
          const done = auxResolve;
          auxResolve = null;
          busy = false;
          if (done) done(null);
        }
      }, 9000);
    });
  }

  function requestMove() {
    if (!ready) return;
    if (mode === 'aux') return;
    if (busy) {
      if (Date.now() - busyAt > 20000) {
        busy = false;
        if (ui) ui.addLog('engine diam 20s — paksa hitung ulang', 'warn');
      } else return;
    }
    const board = findBoard();
    if (!board) return;
    const fen = readFen(board);
    if (!fen) { setStatus('papan belum kebaca', 'err'); return; }
    if (fen === lastFen && lastBest) return;

    if (lastFen && fen !== lastFen) {
      playerSide = playerSide || playerColor(board);
      pendingClass = {
        oldFen: lastFen,
        newFen: fen,
        played: lastMoveUci(board, lastFen, fen),
        sans: historySans(board),
        mover: turnOf(lastFen),
      };
    }

    lastFen = fen;
    searchFen = fen;
    busy = true;
    busyAt = Date.now();
    candidates = [];
    lastScore = { cp: 0, mate: null };
    searchSeq++;
    infoCount = 0;
    staleStop = true;   // 'stop' di bawah bisa memicu bestmove basi
    applyStrength();
    worker.postMessage('stop');
    worker.postMessage(`position fen ${fen}`);
    worker.postMessage(BCElo.goCommand(profile()));
  }

  /* ---------------- klasifikasi ---------------- */

  function finishClassification() {
    const p = pendingClass;
    if (!p || !p.played) return;
    pendingClass = null;

    const before = evalCache.get(p.oldFen);
    if (!before) {
      // belum sempat dinilai — nilai cepat dulu, lalu klasifikasi
      quickEval(p.oldFen).then((ev) => {
        if (!ev) return;
        evalCache.set(p.oldFen, { cp: ev.cp, mate: ev.mate, best: ev.best, gap: 999, legal: 0 });
        doClassify(p);
      });
      return;
    }
    doClassify(p);
  }

  function doClassify(p) {
    if (!CLS) return;
    const before = evalCache.get(p.oldFen);
    const after = evalCache.get(p.newFen);
    if (!before || !after) return;

    // riwayat SAN kadang belum ter-update saat requestMove; ambil ulang di sini
    if (!p.sans || !p.sans.length) {
      const b = findBoard();
      if (b) p.sans = historySans(b);
    }

    // Cara 1 (utama): eval langkah yang dimainkan dari pencarian posisi SEBELUM,
    // sehingga tidak ada bias tempo antar-posisi.
    // Cara 2 (cadangan): negasi eval posisi sesudah (bias untuk langkah di luar top-5).
    let cpAfter, mateAfter, method;
    const mvSeen = before.map && before.map[p.played];
    if (mvSeen) {
      cpAfter = CLS.toCp(mvSeen.cp, mvSeen.mate);
      mateAfter = mvSeen.mate == null ? null : mvSeen.mate;
      method = 'map';
    } else {
      cpAfter = -CLS.toCp(after.cp, after.mate);
      mateAfter = after.mate == null ? null : -after.mate;
      method = 'xpos';
    }

    const cat = CLS.classify({
      cpBefore: before.cp,
      mateBefore: before.mate,
      cpAfter,
      mateAfter,
      playedUci: p.played,
      bestUci: before.best,
      secondGap: before.gap,
      legalCount: before.legal,
      sans: p.sans,
      matBefore: CLS.materialDiff(p.oldFen, p.mover),
      matAfter: CLS.materialDiff(p.newFen, p.mover),
    });

    const loss = Math.max(0, CLS.toCp(before.cp, before.mate) - cpAfter);

    // stats hanya untuk langkah pemain sendiri
    const mine = !playerSide || p.mover === playerSide;
    if (mine) {
      CLS.addToStats(stats, cat, loss);
      if (ui) {
        ui.setStats(stats, CLS.statsAccuracy(stats));
        ui.setRating(cat);
      }
      showRating(p.played, cat);
    }
    if (ui) {
      const bCp = CLS.toCp(before.cp, before.mate);
      const aCp = Math.round(cpAfter);
      ui.addLog(`${cat.label} ${p.played} (${bCp}→${aCp}${mine ? '' : ' lwn'}) s${(p.sans || []).length}`,
        cat.key === 'blunder' || cat.key === 'miss' ? 'err' : cat.key === 'mistake' || cat.key === 'inaccuracy' ? 'warn' : 'ok');
    }
    window.__bcLastClass = { cat: cat.key, played: p.played, before: CLS.toCp(before.cp, before.mate), after: Math.round(cpAfter), loss: Math.round(loss), mine, method };
  }

  /* ---------------- overlay ---------------- */

  function ensureLayer(board) {
    let layer = board.querySelector('#bc-arrow-layer');
    if (!layer) {
      layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      layer.id = 'bc-arrow-layer';
      layer.setAttribute('pointer-events', 'none');
      layer.style.position = 'absolute';
      layer.style.inset = '0';
      layer.style.zIndex = '20';
      board.appendChild(layer);
    }
    const r = board.getBoundingClientRect();
    layer.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
    layer.setAttribute('width', r.width);
    layer.setAttribute('height', r.height);
    layer.style.width = r.width + 'px';
    layer.style.height = r.height + 'px';
    return layer;
  }

  function sqCenter(board, name) {
    const r = board.getBoundingClientRect();
    const w = r.width / 8;
    const h = r.height / 8;
    const file = FILES.indexOf(name[0]);
    const rank = Number(name[1]);
    const flipped = boardFlipped(board);
    const x = flipped ? (7 - file + 0.5) * w : (file + 0.5) * w;
    const y = flipped ? (rank - 1 + 0.5) * h : (8 - rank + 0.5) * h;
    return { x, y, w, h };
  }

  function boardFlipped(board) {
    return board.classList.contains('flipped') || board.getAttribute('flipped') !== null;
  }

  function clearLayer(layer) {
    while (layer.firstChild) layer.removeChild(layer.firstChild);
  }

  const SVGNS = 'http://www.w3.org/2000/svg';

  function drawArrow(layer, from, to, color, widthFactor) {
    const board = layer.parentElement;
    const a = sqCenter(board, from);
    const b = sqCenter(board, to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const cell = Math.min(a.w, a.h);
    const head = Math.min(cell * 0.42, len * 0.42);
    const stroke = Math.max(4, cell * (widthFactor || 0.16));
    const startPad = cell * 0.30;
    const endPad = cell * 0.34;

    const sx = a.x + ux * startPad;
    const sy = a.y + uy * startPad;
    const ex = b.x - ux * endPad;
    const ey = b.y - uy * endPad;

    const line = document.createElementNS(SVGNS, 'line');
    line.setAttribute('x1', sx);
    line.setAttribute('y1', sy);
    line.setAttribute('x2', ex - ux * head * 0.62);
    line.setAttribute('y2', ey - uy * head * 0.62);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', String(stroke));
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', '0.86');
    layer.appendChild(line);

    const p1 = `${ex},${ey}`;
    const p2 = `${ex - ux * head - uy * head * 0.62},${ey - uy * head + ux * head * 0.62}`;
    const p3 = `${ex - ux * head + uy * head * 0.62},${ey - uy * head - ux * head * 0.62}`;
    const poly = document.createElementNS(SVGNS, 'polygon');
    poly.setAttribute('points', `${p1} ${p2} ${p3}`);
    poly.setAttribute('fill', color);
    poly.setAttribute('opacity', '0.9');
    layer.appendChild(poly);
  }

  // Label kategori di atas kotak tujuan (gaya chess.com)
  function drawBadge(layer, sq, text, color) {
    const board = layer.parentElement;
    const c = sqCenter(board, sq);
    const cell = Math.min(c.w, c.h);
    const fs = Math.max(9, cell * 0.26);
    const padX = fs * 0.55;
    const h = fs * 1.7;
    const w = text.length * fs * 0.62 + padX * 2;

    let x = c.x - w / 2;
    let y = c.y - c.h / 2 - h * 0.9;
    if (y < 2) y = c.y + c.h / 2 - h * 0.1;
    x = Math.max(2, Math.min(x, c.w * 8 - w - 2));

    const g = document.createElementNS(SVGNS, 'g');
    const rect = document.createElementNS(SVGNS, 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('rx', h / 2);
    rect.setAttribute('fill', color);
    rect.setAttribute('opacity', '0.95');
    g.appendChild(rect);

    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', x + w / 2);
    t.setAttribute('y', y + h * 0.72);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-family', 'ui-monospace, Menlo, monospace');
    t.setAttribute('font-size', String(fs));
    t.setAttribute('font-weight', '700');
    t.setAttribute('fill', '#0b1016');
    t.textContent = text;
    g.appendChild(t);
    layer.appendChild(g);
  }

  function showRating(uci, cat) {
    const board = findBoard();
    if (!board || !uci || uci.length < 4) return;
    if (!CFG.arrow || !CFG.enabled) return;
    const layer = ensureLayer(board);
    clearLayer(layer);
    drawArrow(layer, uci.slice(0, 2), uci.slice(2, 4), cat.color, 0.18);
    if (CFG.labels) drawBadge(layer, uci.slice(2, 4), cat.label.toUpperCase(), cat.color);

    if (ratingTimer) clearTimeout(ratingTimer);
    ratingTimer = setTimeout(() => {
      ratingTimer = null;
      refreshArrows();
    }, 2600);
  }

  let ui = null;
  let bootAt = Date.now();
  let warnedNoBoard = false;
  let warnedEngine = false;

  function ensureUI() {
    if (ui) return ui;
    ui = BCUI.mount({
      elo: CFG.elo,
      arrow: CFG.arrow,
      autoMove: CFG.autoMove,
      enabled: CFG.enabled,
      onElo: (v) => {
        CFG.elo = v;
        chrome.storage.local.set({ elo: v });
        ui.setElo(profile());
        lastFen = '';
        requestMove();
      },
      onArrow: (v) => {
        CFG.arrow = v;
        chrome.storage.local.set({ arrow: v });
        refreshArrows();
      },
      onAutoMove: (v) => {
        CFG.autoMove = v;
        chrome.storage.local.set({ autoMove: v });
        ui.addLog(v ? 'auto-move ON' : 'auto-move OFF', v ? 'warn' : 'ok');
      },
      onMoveDelay: (v) => {
        CFG.moveDelay = v;
        chrome.storage.local.set({ moveDelay: v });
      },
      onEnabled: (v) => {
        CFG.enabled = v;
        chrome.storage.local.set({ enabled: v });
        ui.setEnabled(v);
        ui.addLog(v ? 'engine ON' : 'engine OFF', v ? 'ok' : 'warn');
        if (!v) clearArrows();
      },
      onRecalc: () => {
        lastFen = '';
        ui.addLog('recalc', 'warn');
        requestMove();
      },
      onCopyFen: () => {
        navigator.clipboard.writeText(lastFen).then(() => {
          setStatus('FEN disalin', 'ok');
          ui.addLog('FEN disalin', 'ok');
        });
      },
      onResetStats: () => {
        if (CLS) stats = CLS.emptyStats();
        ui.setStats(stats, 100);
        ui.setRating(null);
        ui.addLog('stats direset', 'warn');
      },
      onOpen: () => requestMove(),
    });
    ui.setElo(profile());
    ui.setStats(stats, 100);
    return ui;
  }

  function setStatus(t, kind) {
    if (ui) ui.setStatus(t, kind);
  }

  function clearArrows() {
    const board = findBoard();
    const layer = board && board.querySelector('#bc-arrow-layer');
    if (layer) clearLayer(layer);
  }

  function refreshPanel() {
    if (ui) ui.setElo(profile());
  }

  // panah saran: hanya saat giliran sendiri
  function refreshArrows() {
    const board = findBoard();
    if (!board) return;
    const layer = ensureLayer(board);
    clearLayer(layer);
    if (!CFG.arrow || !CFG.enabled || !lastBest) return;

    const fen = lastFen || readFen(board);
    if (!isMyTurn(board, fen)) return;   // giliran lawan → jangan gambar panah

    drawArrow(layer, lastBest.slice(0, 2), lastBest.slice(2, 4), '#81b64c', 0.16);
    if (CFG.labels) drawBadge(layer, lastBest.slice(2, 4), 'BEST', '#81b64c');
  }

  function renderBest(uci) {
    const board = findBoard();
    if (!board) return;
    ensureUI().setBest(uci);
    refreshPanel();
    setStatus('ok', 'ok');
    refreshArrows();
    if (CFG.autoMove && CFG.enabled && isMyTurn(board, lastFen)) {
      autoPlay(board, uci.slice(0, 2), uci.slice(2, 4));
    }
  }

  /* ---------------- auto play (opsional) ---------------- */

  function clickSquare(board, name) {
    const c = sqCenter(board, name);
    const r = board.getBoundingClientRect();
    const x = r.left + c.x;
    const y = r.top + c.y;
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
      const ev = new MouseEvent(type, {
        bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, view: window,
      });
      (document.elementFromPoint(x, y) || board).dispatchEvent(ev);
    }
  }

  function autoPlay(board, from, to) {
    const key = from + to;
    if (board.dataset.bcPlayed === key) return;
    board.dataset.bcPlayed = key;
    setTimeout(() => {
      clickSquare(board, from);
      setTimeout(() => clickSquare(board, to), 140);
    }, CFG.moveDelay);
  }

  /* ---------------- loop & hotkey ---------------- */

  function tick() {
    if (!CFG.enabled) return;
    const board = findBoard();
    if (!board) {
      if (!warnedNoBoard && ui && Date.now() - bootAt > 4000) {
        warnedNoBoard = true;
        ui.addLog('papan tidak ketemu — buka game dulu', 'warn');
        setStatus('papan tidak ketemu', 'err');
      }
      return;
    }
    warnedNoBoard = false;
    ensureUI();
    ensureLayer(board);
    if (!playerSide) playerSide = playerColor(board);
    if (!ready && !warnedEngine && Date.now() - bootAt > 12000) {
      warnedEngine = true;
      ui.addLog('engine belum siap (12s) — cek tab KEYS', 'err');
      setStatus('engine lambat', 'err');
    }
    requestMove();
  }

  function toggle() {
    CFG.enabled = !CFG.enabled;
    chrome.storage.local.set({ enabled: CFG.enabled });
    const u = ensureUI();
    u.setEnabled(CFG.enabled);
    u.setToggles({ enabled: CFG.enabled });
    setStatus(CFG.enabled ? 'on' : 'off', CFG.enabled ? 'ok' : null);
    if (!CFG.enabled) clearArrows();
    else refreshArrows();
  }

  function toggleGUI() {
    ensureUI().toggle();
  }

  function bumpElo(delta) {
    CFG.elo = BCElo.clamp(CFG.elo + delta, 600, 2800);
    chrome.storage.local.set({ elo: CFG.elo });
    ensureUI().setElo(profile());
    setStatus('elo ' + CFG.elo, 'ok');
    lastFen = '';
    requestMove();
  }

  document.addEventListener('keydown', (e) => {
    if (!e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'z') { e.preventDefault(); toggle(); }
    if (k === 'h') { e.preventDefault(); toggleGUI(); }
    if (k === 'x') { e.preventDefault(); lastFen = ''; requestMove(); }
    if (k === 'c') {
      e.preventDefault();
      navigator.clipboard.writeText(lastFen).then(() => setStatus('FEN disalin', 'ok'));
    }
    if (k === 'arrowup') { e.preventDefault(); bumpElo(100); }
    if (k === 'arrowdown') { e.preventDefault(); bumpElo(-100); }
  });

  chrome.storage.local.get(['elo', 'autoMove', 'enabled', 'arrow', 'moveDelay'], (v) => {
    if (typeof v.elo === 'number') CFG.elo = v.elo;
    if (typeof v.autoMove === 'boolean') CFG.autoMove = v.autoMove;
    if (typeof v.enabled === 'boolean') CFG.enabled = v.enabled;
    if (typeof v.arrow === 'boolean') CFG.arrow = v.arrow;
    if (typeof v.moveDelay === 'number') CFG.moveDelay = v.moveDelay;
    const u = ensureUI();
    u.setElo(profile());
    u.setToggles({
      arrow: CFG.arrow, autoMove: CFG.autoMove,
      enabled: CFG.enabled, moveDelay: CFG.moveDelay,
    });
    u.setEnabled(CFG.enabled);
    u.addLog('config dimuat · elo ' + CFG.elo, 'ok');
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'bc-config') {
      Object.assign(CFG, msg.cfg || {});
      lastFen = '';
      const u = ensureUI();
      u.setElo(profile());
      u.setToggles({
        arrow: CFG.arrow, autoMove: CFG.autoMove,
        enabled: CFG.enabled, moveDelay: CFG.moveDelay,
      });
      u.setEnabled(CFG.enabled);
      setStatus('cfg', 'ok');
      u.addLog('config dari popup', 'ok');
      requestMove();
    }
  });

  injectBridge();
  startEngine();
  setInterval(tick, 1200);
  setTimeout(tick, 800);
})();