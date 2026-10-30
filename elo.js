/* elo.js — peta ELO → kekuatan engine. Fungsi murni, bisa dites.
 * Catatan: engine yang dibundel = Stockfish 10 asm.js (tanpa UCI_Elo), jadi kekuatan
 * diatur lewat Skill Level (0–20) + batas waktu (movetime) + peluang blunder.
 * movetime dipakai (bukan depth) supaya respons predictable di HP.
 */
(function (root) {
  const TABLE = [
    { elo: 600,  skill: 0,  movetime: 450,  depth: 3,  blunder: 0.45 },
    { elo: 800,  skill: 1,  movetime: 500,  depth: 4,  blunder: 0.38 },
    { elo: 1000, skill: 3,  movetime: 550,  depth: 5,  blunder: 0.30 },
    { elo: 1200, skill: 5,  movetime: 550,  depth: 6,  blunder: 0.22 },
    { elo: 1400, skill: 7,  movetime: 650,  depth: 7,  blunder: 0.15 },
    { elo: 1600, skill: 9,  movetime: 750,  depth: 8,  blunder: 0.10 },
    { elo: 1800, skill: 11, movetime: 850,  depth: 9,  blunder: 0.06 },
    { elo: 2000, skill: 13, movetime: 1000, depth: 10, blunder: 0.03 },
    { elo: 2200, skill: 16, movetime: 1200, depth: 11, blunder: 0.01 },
    { elo: 2500, skill: 18, movetime: 1500, depth: 12, blunder: 0 },
    { elo: 2800, skill: 20, movetime: 2000, depth: 14, blunder: 0 },
  ];

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  /** Interpolasi linear antar titik acuan. */
  function forElo(elo) {
    const e = clamp(Number(elo) || 1600, TABLE[0].elo, TABLE[TABLE.length - 1].elo);
    for (let i = 0; i < TABLE.length - 1; i++) {
      const a = TABLE[i], b = TABLE[i + 1];
      if (e >= a.elo && e <= b.elo) {
        const t = (e - a.elo) / (b.elo - a.elo);
        return {
          elo: Math.round(e),
          skill: Math.round(a.skill + (b.skill - a.skill) * t),
          movetime: Math.round(a.movetime + (b.movetime - a.movetime) * t),
          depth: Math.round(a.depth + (b.depth - a.depth) * t),
          blunder: Number((a.blunder + (b.blunder - a.blunder) * t).toFixed(3)),
        };
      }
    }
    const last = TABLE[TABLE.length - 1];
    return { elo: last.elo, skill: last.skill, movetime: last.movetime, depth: last.depth, blunder: last.blunder };
  }

  /** Perintah UCI untuk menerapkan profil. */
  function uciSetup(profile) {
    return [
      `setoption name Skill Level value ${clamp(profile.skill, 0, 20)}`,
    ];
  }

  /** Perintah UCI untuk mulai berpikir. */
  function goCommand(profile) {
    return `go movetime ${clamp(profile.movetime, 100, 10000)} depth ${clamp(profile.depth, 1, 30)}`;
  }

  /** Pilih langkah: kadang ambil kandidat ke-2/3 untuk mensimulasikan blunder. */
  function pickMove(candidates, profile, rand) {
    const r = typeof rand === 'function' ? rand() : Math.random();
    if (!candidates || !candidates.length) return null;
    if (candidates.length === 1 || profile.blunder <= 0) return candidates[0];
    if (r < profile.blunder) {
      const idx = 1 + Math.floor((r / Math.max(profile.blunder, 1e-6)) * (candidates.length - 1));
      return candidates[Math.min(idx, candidates.length - 1)];
    }
    return candidates[0];
  }

  root.BCElo = { TABLE, forElo, uciSetup, goCommand, pickMove, clamp };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BCElo;
})(typeof globalThis !== 'undefined' ? globalThis : this);