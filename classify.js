/* classify.js — klasifikasi langkah ala chess.com + opening book.
 * Fungsi murni, tanpa DOM, bisa dites di node.
 *
 * Kategori: brilliant, great, best, excellent, good, book, forced,
 *           inaccuracy, mistake, miss, blunder
 */
(function (root) {
  'use strict';

  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  const CATS = {
    brilliant:  { key: 'brilliant',  label: 'Brilliant',  short: 'Brill',  color: '#26c2a3', glyph: '!!' },
    great:      { key: 'great',      label: 'Great',      short: 'Great',  color: '#749bbf', glyph: '!'  },
    best:       { key: 'best',       label: 'Best',       short: 'Best',   color: '#81b64c', glyph: '★'  },
    excellent:  { key: 'excellent',  label: 'Excellent',  short: 'Excel',  color: '#81b64c', glyph: '✓'  },
    good:       { key: 'good',       label: 'Good',       short: 'Good',   color: '#96af8b', glyph: '✓'  },
    book:       { key: 'book',       label: 'Book',       short: 'Book',   color: '#a88865', glyph: '▤'  },
    forced:     { key: 'forced',     label: 'Forced',     short: 'Forced', color: '#a88865', glyph: '→'  },
    inaccuracy: { key: 'inaccuracy', label: 'Inaccuracy', short: 'Inacc',  color: '#f7c631', glyph: '?!' },
    mistake:    { key: 'mistake',    label: 'Mistake',    short: 'Mist',   color: '#ffa459', glyph: '?'  },
    miss:       { key: 'miss',       label: 'Miss',       short: 'Miss',   color: '#ff7769', glyph: '✗'  },
    blunder:    { key: 'blunder',    label: 'Blunder',    short: 'Blund',  color: '#fa412d', glyph: '??' },
  };

  const ORDER = [
    'brilliant', 'great', 'best', 'excellent', 'good', 'book',
    'forced', 'inaccuracy', 'mistake', 'miss', 'blunder',
  ];

  /* ---------------- material ---------------- */

  function materialOf(fen) {
    const board = String(fen || '').split(' ')[0];
    let w = 0, b = 0;
    for (const ch of board) {
      const l = ch.toLowerCase();
      if (!VAL[l]) continue;
      if (ch === ch.toUpperCase()) w += VAL[l];
      else b += VAL[l];
    }
    return { w, b };
  }

  // selisih material dari sudut pandang `color` ('w'|'b'), dalam pawn
  function materialDiff(fen, color) {
    const m = materialOf(fen);
    return color === 'w' ? m.w - m.b : m.b - m.w;
  }

  /* ---------------- opening book ---------------- */

  // Garis SAN (tanpa nomor langkah). Book = langkah masih prefix salah satu garis.
  const BOOK_RAW = [
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Be7 Re1 b5 Bb3 d6 c3 O-O h3',
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 Nf6 O-O Nxe4 d4 b5 Bb3 d5 dxe5 Be6',
    'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Nf6 d3 d6 O-O O-O Re1 a6 Bb3',
    'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 d5 exd5 Na5 Bb5+ c6 dxc6 bxc6 Be2',
    'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Nf6 Nxc6 bxc6 e5 Qe7 Qe2',
    'e4 e5 Nf3 Nc6 Nc3 Nf6 Bb5 Bb4 O-O O-O d3 d6 Bg5',
    'e4 e5 Nf3 Nf6 Nxe5 d6 Nf3 Nxe4 d4 d5 Bd3 Nc6 O-O',
    'e4 e5 Nf3 d6 d4 Nf6 Nc3 Nbd7 Bc4 Be7 O-O O-O',
    'e4 e5 Nc3 Nf6 f4 d5 fxe5 Nxe4 Nf3 Be7 d4 O-O',
    'e4 e5 f4 exf4 Nf3 g5 h4 g4 Ne5 Nf6 d4 d6',
    'e4 e5 Bc4 Nf6 d3 c6 Nf3 d5 Bb3 Bd6 Nc3',
    'e4 e5 d4 exd4 Qxd4 Nc6 Qe3 Nf6 Nc3 Bb4 Bd2 O-O',
    'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be3 e5 Nb3 Be6',
    'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6 Be3 Bg7 f3 O-O Qd2 Nc6',
    'e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6 c4 Bg7 Be3 Nf6 Nc3 O-O',
    'e4 c5 Nf3 e6 d4 cxd4 Nxd4 Nc6 Nc3 Qc7 Be3 a6 Be2 Nf6',
    'e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 Be3 e5',
    'e4 c5 c3 Nf6 e5 Nd5 d4 cxd4 Nf3 Nc6 cxd4 d6',
    'e4 c5 Nf3 d6 Bb5+ Bd7 Bxd7+ Qxd7 O-O Nc6 c3 Nf6',
    'e4 e6 d4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6 Be3',
    'e4 e6 d4 d5 Nd2 Nf6 e5 Nfd7 Bd3 c5 c3 Nc6 Ne2',
    'e4 e6 d4 d5 exd5 exd5 Nf3 Nf6 Bd3 Bd6 O-O O-O',
    'e4 c6 d4 d5 Nc3 dxe4 Nxe4 Bf5 Ng3 Bg6 h4 h6 Nf3 Nd7',
    'e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 Be3 Qb6',
    'e4 d5 exd5 Qxd5 Nc3 Qa5 d4 Nf6 Nf3 c6 Bc4 Bf5',
    'e4 d5 exd5 Nf6 d4 Nxd5 Nf3 g6 c4 Nb6 Nc3 Bg7',
    'e4 d6 d4 Nf6 Nc3 g6 Nf3 Bg7 Be2 O-O O-O c6',
    'e4 Nf6 e5 Nd5 d4 d6 Nf3 g6 Bc4 Nb6 Bb3 Bg7',
    'e4 g6 d4 Bg7 Nc3 d6 f4 Nf6 Nf3 O-O Bd3',
    'e4 d6 d4 g6 Nc3 Bg7 f4 Nf6 Nf3 O-O Bd3 Na6',
    'e4 Nc6 d4 d5 Nc3 dxe4 d5 Ne5 Qd4 Ng6',
    'd4 d5 c4 e6 Nc3 Nf6 Bg5 Be7 e3 O-O Nf3 h6 Bh4 b6',
    'd4 d5 c4 e6 Nc3 Nf6 cxd5 exd5 Bg5 Be7 e3 c6 Bd3 Nbd7',
    'd4 d5 c4 c6 Nf3 Nf6 Nc3 dxc4 a4 Bf5 e3 e6 Bxc4 Bb4',
    'd4 d5 c4 c6 Nc3 Nf6 Nf3 e6 Bg5 h6 Bh4 dxc4 e4 g5',
    'd4 d5 c4 e6 Nc3 c5 cxd5 exd5 Nf3 Nc6 g3 Nf6 Bg2 Be7',
    'd4 d5 c4 c6 Nc3 Nf6 e3 e6 Nf3 Nbd7 Bd3 dxc4 Bxc4 b5',
    'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6 Nf3 O-O Be2 e5 O-O Nc6 d5',
    'd4 Nf6 c4 g6 Nc3 d5 cxd5 Nxd5 e4 Nxc3 bxc3 Bg7 Nf3 c5',
    'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O Bd3 d5 Nf3 c5 O-O Nc6',
    'd4 Nf6 c4 e6 Nf3 b6 g3 Bb7 Bg2 Be7 O-O O-O Nc3 Ne4',
    'd4 Nf6 c4 e6 g3 d5 Bg2 Be7 Nf3 O-O O-O dxc4 Qc2 a6',
    'd4 Nf6 c4 c5 d5 b5 cxb5 a6 bxa6 Bxa6 Nc3 d6 e4',
    'd4 Nf6 c4 e5 dxe5 Ng4 Nf3 Nc6 Bf4 Bb4+ Nbd2 Qe7',
    'd4 f5 g3 Nf6 Bg2 e6 Nf3 Be7 O-O O-O c4 d6 Nc3 Qe8',
    'd4 d5 Nf3 Nf6 c4 e6 Nc3 Be7 Bg5 O-O e3 h6 Bh4 b6',
    'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nbd2 Bd6 Bg3 O-O',
    'd4 d5 Bf4 Nf6 e3 e6 Nf3 c5 c3 Nc6 Nbd2 Bd6 Bg3',
    'd4 Nf6 Bg5 e6 e4 h6 Bxf6 Qxf6 Nc3 d6 Qd2 g6',
    'd4 e6 e4 d5 Nc3 Nf6 e5 Nfd7 f4 c5 Nf3 Nc6',
    'c4 e5 Nc3 Nf6 Nf3 Nc6 g3 d5 cxd5 Nxd5 Bg2 Nb6 O-O Be7',
    'c4 c5 Nf3 Nf6 Nc3 Nc6 g3 g6 Bg2 Bg7 O-O O-O',
    'c4 Nf6 Nc3 e6 Nf3 d5 d4 Be7 Bf4 O-O e3 c5',
    'c4 e6 Nc3 d5 d4 Nf6 Nf3 Be7 Bg5 O-O e3 h6',
    'Nf3 Nf6 c4 e6 Nc3 d5 d4 Be7 Bf4 O-O e3 c5',
    'Nf3 d5 g3 Nf6 Bg2 e6 O-O Be7 d3 O-O Nbd2 c5',
    'g3 d5 Bg2 e5 d3 Nf6 Nf3 Nc6 O-O Be7 c4 O-O',
    'b3 e5 Bb2 Nc6 e3 Nf6 Bb5 Bd6 Na3 O-O Nf3',
    'f4 d5 Nf3 g6 e3 Bg7 Be2 Nf6 O-O O-O d3 c5',
    'e3 e5 d4 exd4 exd4 d5 Nf3 Nf6 Bd3 Bd6 O-O O-O',
    'd4 d5 c4 Nf6 Nc3 e6 Nf3 c5 cxd5 exd5 Bg5 Be7',
    'd4 d5 c4 dxc4 Nf3 Nf6 e3 e6 Bxc4 c5 O-O a6',
    'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O',
    'e4 e5 Nf3 Nc6 Bc4 Bc5 Ng5 Nh6 Nxf7 Kxf7 Bxf7+',
    'e4 e5 Nf3 Nc6 d4 exd4 Bc4 Nf6 O-O Nxe4 Re1 d5',
    'e4 e5 Nf3 Nc6 Bb5 Nf6 O-O Nxe4 d4 Nd6 Bxc6 dxc6 dxe5',
    'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6 dxc6 O-O f6 d4 exd4',
    'e4 e5 Nf3 Nc6 Bb5 Bc5 O-O Nd4 Nxd4 Bxd4 c3 Bb6 d4',
    'e4 e5 Nf3 Nc6 Bc4 Nf6 d3 Be7 O-O O-O Re1 d6 c3',
    'e4 e5 Nf3 Nc6 Bc4 Bc5 c3 Qe7 d4 Bb6 O-O Nf6',
    'e4 e5 Nf3 Nc6 Bb5 a6 Ba4 b5 Bb3 Nf6 O-O Be7 d3 d6',
    'e4 e5 Nf3 Nc6 Nc3 Bb4 Nd5 Ba5 Bc4 Nf6',
    'e4 e5 Nf3 Nc6 d4 exd4 Nxd4 Qf6 Be3 Bb4+ c3 Ba5',
    'e4 e5 Nf3 Nc6 Bc4 Nf6 Ng5 Bc5 Bxf7+ Ke7 Bb3',
    'e4 e5 Nf3 Nc6 Bb5 Nd4 Nxd4 exd4 O-O Bc5 d3 c6',
    'e4 e5 Nf3 Nc6 Bc4 Nf6 d4 exd4 O-O Nxe4 Re1 d5',
  ];

  const BOOK = BOOK_RAW.map((l) => l.trim().split(/\s+/));

  function normSan(s) {
    return String(s || '').replace(/[+#!?]+$/, '').replace(/^0-0-0$/, 'O-O-O').replace(/^0-0$/, 'O-O');
  }

  // sans = daftar SAN yang sudah dimainkan sampai langkah ini (termasuk langkah ini)
  function isBook(sans) {
    if (!sans || !sans.length) return false;
    const n = sans.map(normSan);
    for (const line of BOOK) {
      if (line.length < n.length) continue;
      let ok = true;
      for (let i = 0; i < n.length; i++) {
        if (line[i] !== n[i]) { ok = false; break; }
      }
      if (ok) return true;
    }
    return false;
  }

  /* ---------------- eval helpers ---------------- */

  const MATE = 100000;

  function toCp(cp, mate) {
    if (mate === null || mate === undefined) return Number(cp) || 0;
    const m = Number(mate);
    return m > 0 ? MATE - m * 1000 : -MATE - m * 1000;
  }

  function isMate(cp) {
    return Math.abs(cp) >= MATE - 100000; // >= 0 untuk mate
  }

  function isMateScore(v) {
    return Math.abs(v) > MATE - 10000;
  }

  /* ---------------- klasifikasi ---------------- */

  /**
   * o = {
   *   cpBefore, mateBefore,      // eval posisi sebelum langkah, dari sudut pemain yang melangkah
   *   cpAfter,  mateAfter,       // eval posisi sesudah langkah, dari sudut pemain yang melangkah
   *   playedUci, bestUci,
   *   secondGap,                 // cp selisih kandidat #1 vs #2 (dari posisi sebelum)
   *   legalCount,                // jumlah langkah legal di posisi sebelum
   *   sans,                      // riwayat SAN sampai langkah ini
   *   matBefore, matAfter,       // material diff pemain (pawn) sebelum/sesudah
   * }
   */
  function classify(o) {
    const before = toCp(o.cpBefore, o.mateBefore);
    const after = toCp(o.cpAfter, o.mateAfter);
    const loss = Math.max(0, before - after);

    // 1. hanya satu langkah legal
    if (o.legalCount === 1) return CATS.forced;

    // 2. masih di dalam teori pembukaan
    if (isBook(o.sans || [])) return CATS.book;

    const isBest = !!o.playedUci && o.playedUci === o.bestUci;

    // 3. melewatkan mate yang sudah ada di tangan
    const hadMate = isMateScore(before) && before > 0;
    const stillMate = isMateScore(after) && after > 0;
    if (hadMate && !stillMate) return CATS.miss;

    // 4. brilliant: korbankan material, tetap terbaik, tetap bagus
    const sac = (o.matBefore != null && o.matAfter != null) ? (o.matAfter - o.matBefore) : 0;
    if (isBest && sac <= -1 && loss <= 40 && after >= 40 && !isMateScore(after)) {
      return CATS.brilliant;
    }

    // 5. great: satu-satunya langkah yang mempertahankan posisi
    if (isBest && Number(o.secondGap) >= 120) return CATS.great;

    // 6. best
    if (isBest) return CATS.best;

    // 7. sisanya berdasarkan kehilangan centipawn
    if (loss <= 20) return CATS.excellent;
    if (loss <= 50) return CATS.good;
    if (loss <= 100) return CATS.inaccuracy;

    // miss: dari menang besar jadi tidak menang
    if (before >= 250 && after < 100) return CATS.miss;

    if (loss <= 250) return CATS.mistake;
    return CATS.blunder;
  }

  /* ---------------- akurasi ---------------- */

  // Aproksimasi dari average centipawn loss (ACPL), clamp 0..100
  function accuracy(avgLoss) {
    const l = Math.max(0, Number(avgLoss) || 0);
    const a = 103.1668 * Math.exp(-0.04354 * l) - 3.1669;
    return Math.max(0, Math.min(100, a));
  }

  function emptyStats() {
    const s = {};
    for (const k of ORDER) s[k] = 0;
    s.moves = 0;
    s.lossSum = 0;
    return s;
  }

  function addToStats(stats, cat, loss) {
    if (cat && cat.key && stats[cat.key] != null) stats[cat.key] += 1;
    stats.moves = (stats.moves || 0) + 1;
    stats.lossSum = (stats.lossSum || 0) + Math.max(0, Number(loss) || 0);
    return stats;
  }

  function statsAccuracy(stats) {
    if (!stats || !stats.moves) return 100;
    return accuracy(stats.lossSum / stats.moves);
  }

  root.BCClassify = {
    CATS, ORDER, MATE,
    materialOf, materialDiff, isBook, normSan,
    toCp, isMateScore, classify, accuracy,
    emptyStats, addToStats, statsAccuracy,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = root.BCClassify;
})(typeof globalThis !== 'undefined' ? globalThis : this);