// Demo: peninjau game SELESAI (offline) dari Board Coach v1.3.0.
// Hanya memakai modul murni classify.js + elo.js — TIDAK ada pembaca papan
// live (fen.js DOM), TIDAK ada panah live, TIDAK ada auto-move.
// Input di sini contoh sintetis; peninjau penuh nantinya menerima eval per
// langkah dari analisis game yang sudah selesai, bukan dari game live.
const BCClassify = require('./classify.js');
const BCElo = require('./elo.js');

const sampleMoves = [
  // sans = riwayat SAN sampai langkah ini; cp dari sudut pemain yang melangkah
  { san: 'e4',  sans: ['e4'], cpBefore: 20,  cpAfter: 25,  playedUci: 'e2e4', bestUci: 'e2e4', secondGap: 15, legalCount: 20 },
  { san: 'a4',  sans: ['a4'], cpBefore: 0,   cpAfter: 0,   playedUci: 'a2a4', bestUci: 'a2a4', secondGap: 10, legalCount: 20 },
  { san: 'Qh5', sans: ['a4', 'Qh5'], cpBefore: 30, cpAfter: -300, playedUci: 'd1h5', bestUci: 'd1f3', secondGap: 40, legalCount: 30 },
  { san: 'Nf3', sans: ['a4', 'Qh5', 'Nf3'], cpBefore: 200, cpAfter: 180, playedUci: 'g1f3', bestUci: 'b1c3', secondGap: 20, legalCount: 28 },
];

const stats = BCClassify.emptyStats();
for (const m of sampleMoves) {
  const cat = BCClassify.classify(m);
  const loss = Math.max(0, m.cpBefore - m.cpAfter);
  BCClassify.addToStats(stats, cat, loss);
  console.log(`${m.san.padEnd(4)} -> ${cat.label} (loss ${loss} cp, book: ${BCClassify.isBook(m.sans)})`);
}
console.log('Stats:', JSON.stringify(stats));
console.log('Akurasi sampel:', BCClassify.statsAccuracy(stats).toFixed(1) + '%');
console.log('Profil Elo 1400:', JSON.stringify(BCElo.forElo(1400)));
console.log('Profil Elo 800:', JSON.stringify(BCElo.forElo(800)));
