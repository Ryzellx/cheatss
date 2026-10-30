# Board Coach — Offline ♞

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node.js](https://img.shields.io/badge/Node.js-no%20dependencies-green.svg)
![Post-game only](https://img.shields.io/badge/Post--game%20only-no%20live%20assistance-blue.svg)

**Peninjau game catur yang sudah selesai — offline, tanpa server, tanpa bantuan live.**

Board Coach Offline menilai langkah-langkah dari game yang **sudah selesai**
dari data evaluasinya: klasifikasi tiap langkah (Brilliant sampai Blunder),
akurasi per pemain, dan profil level Elo untuk mode latihan. Semua logika
berupa fungsi murni JavaScript — ringan, tanpa dependensi, dan bisa jalan di
Node.js maupun browser.

> **Bukan alat bantuan live.** Repo ini sengaja TIDAK berisi pembaca papan
> situs catur, overlay saran saat game berjalan, atau auto-move. Kalau kamu
> mencari analisis game yang sudah selesai dan latihan lawan engine lokal,
> kamu di tempat yang benar.

## Demo cepat

```bash
node review-demo.js
```

Output (terverifikasi jalan):

```
e4   -> Book (loss 0 cp, book: true)
a4   -> Best (loss 0 cp, book: false)
Qh5  -> Blunder (loss 330 cp, book: false)
Nf3  -> Excellent (loss 20 cp, book: false)
Stats: {"brilliant":0,"great":0,"best":1,"excellent":1,"good":0,"book":1,"forced":0,"inaccuracy":0,"mistake":0,"miss":0,"blunder":1,"moves":4,"lossSum":350}
Profil Elo 1400: {"elo":1400,"skill":7,"movetime":650,"depth":7,"blunder":0.15}
```

Demo memakai contoh sintetis. Peninjau penuh nantinya menerima eval per
langkah dari analisis game yang sudah selesai.

## Klasifikasi langkah

| Label | Arti |
|---|---|
| **Brilliant** | Korban material, tetap langkah terbaik |
| **Great** | Satu-satunya langkah yang bagus |
| **Best** | Langkah terbaik mesin |
| **Excellent** | Rugi ≤ 0.20 pawn |
| **Good** | Rugi ≤ 0.50 pawn |
| **Book** | Masih teori pembukaan |
| **Forced** | Hanya satu langkah legal |
| **Inaccuracy** | Rugi 0.5–1.0 pawn |
| **Mistake** | Rugi 1.0–2.5 pawn |
| **Miss** | Membuang mate / keunggulan besar |
| **Blunder** | Rugi > 2.5 pawn |

## Struktur

| File | Fungsi |
|---|---|
| `classify.js` | Klasifikasi langkah + opening book + akurasi (fungsi murni) |
| `elo.js` | Peta Elo → skill / movetime / depth / blunder untuk mode latihan |
| `review-demo.js` | Demo klasifikasi + profil Elo dari contoh sintetis |

## Roadmap

1. **Peninjau PGN penuh** — kirim satu PGN game yang sudah selesai, dapatkan
   klasifikasi tiap langkah + akurasi per pemain dari eval game selesai.
2. **Mode latihan** — lawan Stockfish lokal di level Elo pilihan, di luar
   game live situs catur mana pun.

## Lisensi

MIT — lihat [LICENSE](LICENSE). Catatan: repo ini tidak menyertakan
Stockfish. Kalau suatu saat Stockfish ditambahkan, lisensinya wajib
disesuaikan (Stockfish berlisensi GPL).
