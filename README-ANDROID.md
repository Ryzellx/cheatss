# Android (Kiwi Browser) — pasang & set ELO

Kiwi Browser itu Chromium Android yang bisa pasang extension. Extension ini jalan di Kiwi,
**engine tetap lokal di HP** — nol server, nol request keluar.

## 1. Pasang Kiwi + extension

1. Install **Kiwi Browser** dari Play Store.
2. Download `board-coach-kiwi.zip` ke HP, biarkan di folder Download (jangan di-unzip manual,
   Kiwi yang meng-unzip).
3. Buka Kiwi → menu **⋮** → **Extensions**.
4. Nyalakan **Developer mode**.
5. Tap **+ (from .zip / .crx / .user.js)** → pilih `board-coach-kiwi.zip`.
6. Extension **Board Coach** muncul di daftar.

> Pakai `board-coach-kiwi.zip` (manifest V2). Kiwi paling stabil dengan MV2. Kalau pakai
> Chrome/Edge di PC, pakai `board-coach-chrome.zip` (MV3) lewat Load unpacked.

## 2. Wajib: aktifkan Desktop site

chess.com versi mobile punya struktur halaman berbeda. Extension membaca papan desktop
(`wc-chess-board`). Jadi:

1. Buka `chess.com` di Kiwi.
2. Menu **⋮** → centang **Desktop site**.
3. Reload halaman.

Tanpa ini, panel extension tidak menemukan papan.

## 3. Set ELO

Tap ikon **Board Coach** di menu Kiwi → popup:

| Kontrol | Fungsi |
|---|---|
| aktif | on/off overlay |
| panah | tampilkan panah langkah |
| auto-move | ekstensi yang memainkan langkah (default mati) |
| **ELO** | 600 – 2800, slider |
| jeda auto-move | 200 – 3000 ms (biar tidak terlihat instan) |

Di bawah slider ada keterangan langsung: level, `skill x/20`, `depth`, `blunder %`.

Hotkey di halaman: `Alt+Z` on/off · `Alt+X` hitung · `Alt+C` copy FEN ·
`Alt+↑` / `Alt+↓` naik-turun ELO 100.

## Peta ELO → kekuatan engine

Engine yang dibundel = Stockfish 10 asm.js. Dia **tidak punya** opsi `UCI_Elo`, jadi kekuatan
diatur tiga lapis sekaligus:

| ELO | Skill Level | movetime | depth | peluang blunder |
|---|---|---|---|---|
| 600 | 0/20 | 450 ms | 3 | 45% |
| 800 | 1/20 | 500 ms | 4 | 38% |
| 1000 | 3/20 | 550 ms | 5 | 30% |
| 1200 | 5/20 | 550 ms | 6 | 22% |
| 1400 | 7/20 | 650 ms | 7 | 15% |
| 1600 | 9/20 | 750 ms | 8 | 10% |
| 1800 | 11/20 | 850 ms | 9 | 6% |
| 2000 | 13/20 | 1000 ms | 10 | 3% |
| 2200 | 16/20 | 1200 ms | 11 | 1% |
| 2500 | 18/20 | 1500 ms | 12 | 0% |
| 2800 | 20/20 | 2000 ms | 14 | 0% |

Tiga lapis itu:

1. **Skill Level** — Stockfish sendiri melemahkan evaluasi + memilih dari beberapa kandidat.
2. **movetime + depth** — makin rendah, makin dangkal, makin sering salah hitung.
3. **blunder injection** — kalau MultiPV mengembalikan beberapa kandidat, sesekali ambil
   kandidat ke-2/ke-3 sesuai persentase di tabel.

Catatan jujur: di ELO sangat rendah (600–800) Stockfish sering membalas sangat cepat sebelum
`info multipv` sempat terkirim, jadi blunder injection kadang tidak aktif. Skill Level-nya
sendiri sudah cukup melemahkan, jadi efeknya tetap terasa.

## Hasil uji nyata (bukan klaim)

| Uji | Hasil |
|---|---|
| Unit test `elo.js` (interpolasi, clamp, monoton, format UCI, blunder) | **11/11 pass** |
| Opsi engine yang tersedia | 16 opsi, ada `Skill Level` 0–20, **tidak ada** `UCI_Elo` |
| Ladder ELO di papan mock (32 bidak → FEN → engine) | 600→`d2d3`, 1200→`d2d4`, 2000→`d2d4`, 2800→`f1c4` |
| Blunder injection | pada ELO 800, pilihan bergeser dari `a1a8` (mate) ke `h2h4` |
| Waktu per langkah (1-core, asm.js) | depth 8 ≈ 2,3 s · depth 12 ≈ 4,8 s · depth 14 ≈ 11 s |
| Waktu end-to-end dengan movetime | 1,9 – 3,9 s per langkah |

Karena asm.js lebih lambat dari WASM, tabel ELO sengaja dibatasi `movetime ≤ 2000 ms` dan
`depth ≤ 14` supaya tetap responsif di HP kelas menengah.

## Batas yang perlu diketahui

- **Desktop site wajib.** Tanpa itu papan tidak terdeteksi.
- **Castling** dibaca heuristik dari posisi raja + benteng; bisa salah kalau keduanya sempat
  bergerak lalu kembali.
- **En passant** selalu `-`.
- **Promosi** belum memilih bidak di dialog auto-move.
- **Baterai**: engine asm.js cukup berat. Main 10 menit wajar; jangan dibiarkan menyala
  berjam-jam.
- **ToS chess.com** melarang bantuan engine di game rated. Yang paling ketahuan bukan
  extension-nya, tapi pola mainnya (akurasi engine-like, waktu mikir konsisten, rating
  melonjak). Pakai ELO yang masuk akal untuk akunnya, jangan auto-move tiap langkah.