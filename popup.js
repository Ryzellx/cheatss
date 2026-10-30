const ids = ['enabled', 'arrow', 'autoMove', 'elo', 'moveDelay'];

function push(cfg) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs && tabs[0];
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { type: 'bc-config', cfg }, () => void chrome.runtime.lastError);
  });
}

function label(elo) {
  if (elo >= 2600) return 'kekuatan penuh';
  if (elo >= 2200) return 'master';
  if (elo >= 1900) return 'expert';
  if (elo >= 1600) return 'advanced';
  if (elo >= 1300) return 'intermediate';
  if (elo >= 1000) return 'beginner+';
  return 'beginner';
}

function paint(elo) {
  const p = BCElo.forElo(elo);
  document.getElementById('eloVal').textContent = String(p.elo);
  document.getElementById('eloHint').textContent =
    `${label(p.elo)} · skill ${p.skill}/20 · depth ${p.depth} · blunder ${Math.round(p.blunder * 100)}%`;
}

chrome.storage.local.get(ids, (v) => {
  if (typeof v.enabled === 'boolean') document.getElementById('enabled').checked = v.enabled;
  if (typeof v.arrow === 'boolean') document.getElementById('arrow').checked = v.arrow;
  if (typeof v.autoMove === 'boolean') document.getElementById('autoMove').checked = v.autoMove;
  const elo = typeof v.elo === 'number' ? v.elo : 2800;
  document.getElementById('elo').value = elo;
  paint(elo);
  const delay = typeof v.moveDelay === 'number' ? v.moveDelay : 900;
  document.getElementById('moveDelay').value = delay;
  document.getElementById('delayVal').textContent = delay + ' ms';
});

document.getElementById('enabled').addEventListener('change', (e) => {
  chrome.storage.local.set({ enabled: e.target.checked });
  push({ enabled: e.target.checked });
});
document.getElementById('arrow').addEventListener('change', (e) => {
  chrome.storage.local.set({ arrow: e.target.checked });
  push({ arrow: e.target.checked });
});
document.getElementById('autoMove').addEventListener('change', (e) => {
  chrome.storage.local.set({ autoMove: e.target.checked });
  push({ autoMove: e.target.checked });
});
document.getElementById('elo').addEventListener('input', (e) => {
  const elo = Number(e.target.value);
  paint(elo);
  chrome.storage.local.set({ elo });
  push({ elo });
});
document.getElementById('moveDelay').addEventListener('input', (e) => {
  const d = Number(e.target.value);
  document.getElementById('delayVal').textContent = d + ' ms';
  chrome.storage.local.set({ moveDelay: d });
  push({ moveDelay: d });
});