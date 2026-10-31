# ♟️ Board Coach

Overlay saran langkah untuk **chess.com** — engine catur jalan **sepenuhnya di browser**
(Stockfish asm.js di dalam Web Worker), tanpa server, tanpa request keluar, tanpa akun.

![Versi](https://img.shields.io/badge/versi-1.3.0-22c55e?style=flat-square)
![Manifest](https://img.shields.io/badge/manifest-MV2%20(MV3%20opsional)-f59e0b?style=flat-square)
![Engine](https://img.shields.io/badge/engine-Stockfish%20asm.js-0ea5e9?style=flat-square)
![Offline](https://img.shields.io/badge/offline-100%25-94a3b8?style=flat-square)
![Browser](https://img.shields.io/badge/browser-Chrome%20%E2%80%A2%20Edge%20%E2%80%A2%20Brave%20%E2%80%A2%20Kiwi-e2e8f0?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Android%20%2B%20Desktop-ef4444?style=flat-square)

---

## ✨ Fitur

- 🎯 **Saran langkah real-time** — panah SVG di atas papan, hanya saat giliranmu
- 🧠 **Engine lokal** — Stockfish jalan di Web Worker, nol traffic keluar
- 🎚️ **ELO 600–2800** — 6 preset cepat (Beginner → Max) + slider custom
- 📊 **Klasifikasi otomatis** — setiap langkah dinilai (Brilliant → Blunder) + akurasi
- 🤖 **Auto-move opsional** — engine memainkan langkahmu (dengan jeda manusiawi)
- ⌨️ **Hotkey lengkap** — engine on/off, sembunyikan GUI, hitung ulang, copy FEN, ELO naik/turun
- 📱 **Responsif** — di layar HP panel otomatis selebar layar
- 🔍 **Log aktivitas** — tab KEYS untuk debugging (bestmove, error, perubahan config)

---

## 🚀 Pasang

### Android — Kiwi Browser

1. Install **[Kiwi Browser](https://play.google.com/store/apps/details?id=com.kiwibrowser.browser)** dari Play Store
2. Download `board-coach-kiwi.zip` → biarkan di folder Download (jangan di-unzip)
3. Di Kiwi: menu **⋮** → **Extensions** → nyalakan **Developer mode**
4. **Load unpacked** → pilih file `board-coach-kiwi.zip` (tanpa di-unzip)
5. Buka `chess.com` → tombol **♞** muncul di kanan bawah

### Desktop — Chrome / Edge / Brave

1. Buka `chrome://extensions` (Edge: `edge://extensions`, Brave: `brave://extensions`)
2. Nyalakan **Developer mode** (pojok kanan atas)
3. **Load unpacked** → pilih folder yang berisi file extension (yang ada `manifest.json`)
4. Buka `chess.com` → main atau tonton game

> ⚠️ Setiap kali extension di-update, reload dulu halaman chess.com-nya.

---

## 🎮 Pakai

Tombol **♞** di kanan bawah = cheat menu. **—** di bar menu (atau `Alt+H`) = tutup jadi
tombol lagi. Menu bisa digeser lewat bar atas supaya nggak nutupin papan.

| Tab | Isi |
|---|---|
| **ENGINE** | langkah terbaik + bar evaluasi · depth / nodes / eval / think hidup · slider ELO · 6 preset · tombol HITUNG + COPY FEN |
| **PLAY** | switch panah · auto-move · engine aktif · slider jeda auto-move 200–3000 ms |
| **STATS** | jumlah tiap kategori + akurasi (muncul setelah 3 langkah) |
| **KEYS** | log 60 baris terakhir + daftar hotkey |

Titik di bar: ⚪ abu idle · 🟢 hijau siap · 🟡 kuning menghitung · 🔴 merah error.

### Hotkey

| Aksi | Hotkey |
|---|---|
| Engine on / off | `Alt+Z` |
| Sembunyikan / tampilkan GUI | `Alt+H` |
| Hitung ulang | `Alt+X` |
| Copy FEN | `Alt+C` |
| ELO naik / turun 100 | `Alt+↑` / `Alt+↓` |

---

## 📊 Klasifikasi langkah

| Label | Arti | Warna |
|---|---|---|
| **Brilliant** | korban material, tetap terbaik | teal |
| **Great** | satu-satunya langkah yang bagus | biru |
| **Best** | langkah terbaik mesin | hijau |
| **Excellent** | rugi ≤ 0.20 pawn | hijau |
| **Good** | rugi ≤ 0.50 pawn | hijau muda |
| **Book** | masih teori pembukaan | coklat |
| **Forced** | cuma satu langkah legal | coklat |
| **Inaccuracy** | rugi 0.5–1.0 pawn | kuning |
| **Mistake** | rugi 1.0–2.5 pawn | oranye |
| **Miss** | buang mate / keunggulan besar | merah muda |
| **Blunder** | rugi > 2.5 pawn | merah |

---

## 🧱 Struktur proyek

| File | Fungsi |
|---|---|
| `manifest.json` | manifest MV2 (Kiwi/Android) |
| `fen.js` | baca DOM papan → FEN (fungsi murni, ada unit test) |
| `classify.js` | klasifikasi langkah + opening book + akurasi (fungsi murni) |
| `elo.js` | peta ELO → skill / movetime / depth / blunder (fungsi murni) |
| `ui.js` | panel cheat menu (ENGINE / PLAY / STATS / KEYS) |
| `content.js` | orkestrasi: baca papan → kategori engine → gambar panah → hotkey → auto-move |
| `bridge.js` | jembatan antara Web Worker dan halaman (blob worker) |
| `overlay.css` | gaya panah + panel |
| `popup.html` / `popup.js` | setelan toolbar: aktif, panah, auto-move, depth |
| `stockfish.js` | engine (asm.js, ±1,5 MB, single file) |
| `preview.html` | preview GUI statis untuk pengembangan |

---

## 🔧 Untuk yang mau fork / develop

### Aliran data

```
chess.com DOM → fen.js → FEN
                        ↓
              content.js → worker(stockfish.js via bridge.js) → bestmove
                        ↓
              classify.js (bandingkan sebelum/sesudah) → kategori
                        ↓
              overlay SVG: panah + label → ui.js (panel)
```

### Aturan emas

- **`fen.js` = satu-satunya tempat yang menyentuh DOM papan.** Kalau chess.com mengubah
  struktur kelas (`piece` / `square-NN`), cukup perbaiki di sini.
- Engine jalan di **Web Worker** lewat blob — Worker langsung dari `chrome-extension://`
  diblok halaman. Jangan pindahkan itu tanpa tes.
- Semua JS inti (fen/classify/elo) adalah **fungsi murni** — mudah di-test tanpa browser.

### Menjalankan tes

```bash
# unit test fen.js (posisi awal, parsing kelas, castling)
node test/fen_test.js

# klasifikasi + ELO
node test/classify_test.js
node test/elo_test.js
```

### Membangun zip distribusi

```bash
zip -r board-coach-kiwi.zip \
  manifest.json fen.js classify.js elo.js ui.js content.js bridge.js \
  overlay.css popup.html popup.js stockfish.js \
  README.md README-ANDROID.md preview.html
```

### Checklist fork

- [ ] Ganti nama extension di `manifest.json` (`name`, `description`)
- [ ] Kalau mau MV3 (Chrome store): pakai `manifest_version: 3` + `action` + `host_permissions`
- [ ] Update versi di `manifest.json` + badge README
- [ ] Tes end-to-end di chess.com sungguhan sebelum rilis

---

## ⚠️ Batas & kejujuran teknis

- **Castling** dibaca heuristik dari posisi raja + benteng di petak asal — bukan dari
  riwayat. Kalau raja/benteng sempat gerak lalu balik, hak castling bisa salah.
- **En passant** selalu `-`. Jarang berpengaruh ke pilihan langkah.
- **Promosi**: engine menyarankan `e7e8q`; auto-move belum memilih bidak promosi di dialog.
- **Auto-move** paling kelihatan: langkah instan tanpa jeda mikir. Kalau dipakai, kasih
  jeda manusiawi (slider) dan jangan tiap langkah.
- **Deteksi perilaku** tidak bisa dijamin kode apa pun: akurasi engine-like, waktu mikir
  konsisten, dan rating melonjak cepat itu yang ketahuan — bukan extension-nya.

## 📜 Catatan legal

- chess.com **ToS** melarang bantuan engine di game rated. Konsekuensi akun ditanggung pemakai.
- Saran praktis: depth 12–16, pakai panah saja tanpa auto-move, dan jangan dipakai di semua langkah.
- Proyek ini untuk pembelajaran / penggunaan pribadi. Gunakan dengan bijak.
