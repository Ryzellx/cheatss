/* fen.js — fungsi murni: baca kelas DOM → FEN. Bisa dites di node. */
(function (root) {
  const FILES = 'abcdefgh';

  function squareFromClasses(list) {
    for (const c of list) {
      const m = /^square-(\d)(\d)$/.exec(c);
      if (m) {
        // chess.com: square-{file}{rank} → file a=1..h=8, rank 1..8 (rank asli, bukan baris dari atas)
        const file = Number(m[1]) - 1;
        const rank = Number(m[2]);
        if (file >= 0 && file < 8 && rank >= 1 && rank <= 8) {
          return { file, rank, name: FILES[file] + rank };
        }
      }
    }
    return null;
  }

  function pieceFromClasses(list) {
    for (const c of list) {
      const m = /^([wb])([pnbrqk])$/i.exec(c);
      if (m) return { color: m[1].toLowerCase(), type: m[2].toLowerCase() };
    }
    return null;
  }

  function castlingRights(pieces) {
    const at = (f, r) => pieces.find((p) => p.file === f && p.rank === r);
    let rights = '';
    const wK = at(4, 1);
    if (wK && wK.type === 'k' && wK.color === 'w') {
      const kR = at(7, 1);
      const qR = at(0, 1);
      if (kR && kR.type === 'r' && kR.color === 'w') rights += 'K';
      if (qR && qR.type === 'r' && qR.color === 'w') rights += 'Q';
    }
    const bK = at(4, 8);
    if (bK && bK.type === 'k' && bK.color === 'b') {
      const kR = at(7, 8);
      const qR = at(0, 8);
      if (kR && kR.type === 'r' && kR.color === 'b') rights += 'k';
      if (qR && qR.type === 'r' && qR.color === 'b') rights += 'q';
    }
    return rights || '-';
  }

  function toFen(pieces, turn) {
    const grid = Array.from({ length: 8 }, () => Array(8).fill(null));
    for (const p of pieces) {
      const row = 8 - p.rank;
      if (row < 0 || row > 7 || p.file < 0 || p.file > 7) continue;
      grid[row][p.file] = p.color === 'w' ? p.type.toUpperCase() : p.type;
    }
    const rows = grid.map((row) => {
      let s = '';
      let empty = 0;
      for (const cell of row) {
        if (cell) {
          if (empty) { s += empty; empty = 0; }
          s += cell;
        } else empty++;
      }
      if (empty) s += empty;
      return s;
    });
    const castling = castlingRights(pieces);
    return `${rows.join('/')} ${turn} ${castling} - 0 1`;
  }

  root.BCFen = { FILES, squareFromClasses, pieceFromClasses, castlingRights, toFen };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.BCFen;
})(typeof globalThis !== 'undefined' ? globalThis : this);