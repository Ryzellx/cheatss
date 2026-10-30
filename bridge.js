/* bridge.js — jalan di dunia halaman (bukan isolated world).
 * Content script tidak bisa membaca objek `board.game` milik chess.com karena
 * beda JS world. Jembatan ini yang membacanya, lalu mengirim lewat CustomEvent.
 */
(function () {
  'use strict';
  if (window.__bcBridgeLoaded) return;
  window.__bcBridgeLoaded = true;

  function boardEl() {
    return (
      document.querySelector('wc-chess-board#board-single') ||
      document.querySelector('wc-chess-board') ||
      document.querySelector('.board') ||
      null
    );
  }

  function snapshot() {
    const b = boardEl();
    if (!b) return null;
    const g = b.game;
    if (!g) return null;
    const out = {};
    try {
      if (typeof g.getFEN === 'function') out.fen = g.getFEN();
      if (typeof g.getHistorySANs === 'function') out.sans = g.getHistorySANs();
      if (typeof g.getPlayingAs === 'function') out.playingAs = g.getPlayingAs();
      if (typeof g.getLegalMoves === 'function') {
        const l = g.getLegalMoves();
        out.legal = Array.isArray(l) ? l.length : null;
      }
      if (typeof g.getLastMove === 'function') {
        const m = g.getLastMove();
        if (m && m.from && m.to) out.last = { from: m.from, to: m.to, san: m.san || null };
      }
      if (typeof g.getTurn === 'function') out.turn = g.getTurn();
    } catch (_) {
      return null;
    }
    out.flipped = b.classList.contains('flipped') || b.getAttribute('flipped') !== null;
    out.t = Date.now();
    return out;
  }

  function push() {
    const s = snapshot();
    if (!s) return;
    try {
      document.dispatchEvent(new CustomEvent('bc-state', { detail: JSON.stringify(s) }));
    } catch (_) {}
  }

  push();
  setInterval(push, 700);
  window.addEventListener('load', push, { once: true });
})();