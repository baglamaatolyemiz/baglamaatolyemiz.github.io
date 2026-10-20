// V33 - Akort (left) and Metronom (right) inside the title bar. Each is a capsule like the Uzun Sap / Kitap buttons;
// opening it grows a thin strip of controls sideways inside the bar - nothing drops over the page.
// Web Audio only: nothing is uploaded, no key, no cost. Akort finds the pitch by autocorrelation.
(() => {
  const brand = document.querySelector('.brand'); if (!brand) return;
  const title = brand.querySelector('b');
  const NAMES = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];
  const STR = [['La', 9], ['Re', 2], ['Sol', 7]];   // bağlama düzeni: La - Re - Sol
  let ac = null; const ctx = () => (ac = ac || new (window.AudioContext || window.webkitAudioContext)());
  const $a = id => document.getElementById(id);
  const cap = (side, label, strip) => { const d = document.createElement('div'); d.className = 'tool ' + side;
    const tb = '<button type="button" class="tb">' + label + '</button>', tx = '<div class="tx">' + strip + '</div>';
    d.innerHTML = side === 'l' ? tb + tx : tx + tb;
    d.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); }); brand.append(d); return d; };

  // ---------- Akort ----------
  const tA = cap('l', 'Akort',
    '<button type="button" class="ic" id="aG" title="Sazı mikrofona yakın tut, tek bir teli çal ve sesi uzat. Nokta ortaya, yeşile gelince o tel akortludur. Ses pes ise tel sıkılır, tiz ise gevşetilir."><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/></svg></button>' +
    '<span class="nt" id="aN">–</span>' +
    '<span class="mt"><i class="z"></i><i class="c"></i><i class="d" id="aD"></i></span>' +
    '<span class="cs" id="aC">Mikrofon kapalı</span>' +
    '<span class="ts">' + STR.map(s => '<em data-p="' + s[1] + '">' + s[0] + '</em>').join('') + '</span>');
  let st = null, tmA = 0, buf = null, an = null, sm = null;
  const pitch = (b, sr) => {     // autocorrelation with a loudness gate
    let r = 0; for (const x of b) r += x * x; if (Math.sqrt(r / b.length) < 0.012) return 0;
    const n = b.length, mn = Math.floor(sr / 1000), mx = Math.floor(sr / 70); let best = 0, bl = 0;
    const c = new Float32Array(mx + 2);
    for (let l = mn; l <= mx + 1; l++) { let s = 0; for (let i = 0; i < n - l; i++) s += b[i] * b[i + l]; c[l] = s; }
    for (let l = mn + 1; l <= mx; l++) if (c[l] > c[l - 1] && c[l] >= c[l + 1] && c[l] > best) { best = c[l]; bl = l; }
    let c0 = 0; for (const x of b) c0 += x * x; if (!bl || best < c0 * 0.35) return 0;
    for (let l = mn + 1; l <= mx; l++) if (c[l] > c[l - 1] && c[l] >= c[l + 1] && c[l] > best * 0.9) { bl = l; break; }   // first strong peak: no octave slip
    const a = c[bl - 1], m = c[bl], z = c[bl + 1], d = a - 2 * m + z;
    return sr / (d ? bl + (a - z) / (2 * d) : bl);
  };
  const show = f => {
    const D = $a('aD');
    if (!f) { D.style.left = '50%'; D.className = 'd'; return; }
    const m = 69 + 12 * Math.log2(f / 440), r = Math.round(m), pc = ((r % 12) + 12) % 12;
    sm = sm == null ? m - r : sm * 0.7 + (m - r) * 0.3; const cents = Math.round(sm * 100);
    $a('aN').textContent = NAMES[pc];
    D.style.left = 50 + Math.max(-50, Math.min(50, cents)) + '%';
    const ok = Math.abs(cents) <= 5; D.className = 'd' + (ok ? ' ok' : '');
    tA.querySelectorAll('.ts em').forEach(s => s.classList.toggle('on', +s.dataset.p === pc));
    $a('aC').textContent = (cents > 0 ? '+' : '') + cents + ' sent · ' + (ok ? 'akortlu ✓' : cents < 0 ? 'pes – sık' : 'tiz – gevşet');
  };
  const loop = () => { an.getFloatTimeDomainData(buf); show(pitch(buf, ac.sampleRate)); };
  const micOn = async () => {
    try {
      st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const c = ctx(); await c.resume(); an = c.createAnalyser(); an.fftSize = 4096; buf = new Float32Array(an.fftSize);
      c.createMediaStreamSource(st).connect(an); $a('aG').classList.add('on'); $a('aC').textContent = 'Bir tel çal…'; sm = null; tmA = setInterval(loop, 60);
    } catch (e) { $a('aC').textContent = 'Mikrofon izni yok'; }
  };
  const micOff = () => { clearInterval(tmA); if (st) st.getTracks().forEach(t => t.stop()); st = null;
    $a('aG').classList.remove('on'); $a('aC').textContent = 'Mikrofon kapalı'; $a('aN').textContent = '–'; tA.querySelectorAll('.ts em').forEach(s => s.classList.remove('on')); show(0); };
  $a('aG').onclick = () => (st ? micOff() : micOn());

  // ---------- Metronom ----------
  const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10.5-6.5z"/></svg>', STOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1"/></svg>';
  const tM = cap('r', 'Metronom',
    '<span class="dots" id="mD"><i></i><i></i><i></i><i></i></span>' +
    '<button type="button" class="ic" id="mG" title="Başlat / Durdur">' + PLAY + '</button>' +
    '<input type="range" id="mR" min="40" max="200" value="80" aria-label="Tempo">' +
    '<button type="button" class="ic" data-d="-1" title="Shift ile 5">−</button><span class="bp"><input id="mB" class="bn" type="text" inputmode="numeric" maxlength="3" value="80" aria-label="Tempo (bpm)" title="Yaz: 40-200"><small>bpm</small></span><button type="button" class="ic" data-d="1" title="Shift ile 5">+</button>');
  let bpm = 80, run = false, nt = 0, beat = 0, tm = 0;
  const setB = v => { bpm = Math.max(40, Math.min(200, Math.round(v) || bpm)); $a('mB').value = bpm; $a('mR').value = bpm; $a('mR').style.setProperty('--p', (bpm - 40) / 1.6 + '%'); };
  const bn = $a('mB');
  bn.oninput = () => { bn.value = bn.value.replace(/\D/g, ''); const v = +bn.value; if (v >= 40 && v <= 200) { bpm = v; $a('mR').value = v; $a('mR').style.setProperty('--p', (v - 40) / 1.6 + '%'); } };
  bn.onchange = () => setB(+bn.value);
  bn.onfocus = () => bn.select();
  bn.onkeydown = e => { if (e.key === 'Enter') { setB(+bn.value); bn.blur(); } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setB(bpm + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 5 : 1)); } };
  setB(80);
  $a('mR').oninput = e => setB(+e.target.value);
  tM.querySelectorAll('[data-d]').forEach(b => b.onclick = e => setB(bpm + +b.dataset.d * (e.shiftKey ? 5 : 1)));
  const click = (t, acc) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = acc ? 1600 : 1000;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(acc ? 0.9 : 0.55, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.06); };
  const flash = (b, t) => setTimeout(() => run && $a('mD').querySelectorAll('i').forEach((s, i) => s.classList.toggle('on', i === b)), Math.max(0, (t - ac.currentTime) * 1000));
  const tick = () => { while (nt < ac.currentTime + 0.12) { click(nt, beat === 0); flash(beat, nt); beat = (beat + 1) % 4; nt += 60 / bpm; } };
  const mOn = async () => { const c = ctx(); await c.resume(); run = true; beat = 0; nt = c.currentTime + 0.05; tick(); tm = setInterval(tick, 25); $a('mG').innerHTML = STOP; $a('mG').classList.add('on'); tM.classList.add('run'); };
  const mOff = () => { run = false; clearInterval(tm); $a('mG').innerHTML = PLAY; $a('mG').classList.remove('on'); tM.classList.remove('run'); $a('mD').querySelectorAll('i').forEach(s => s.classList.remove('on')); };
  $a('mG').onclick = () => (run ? mOff() : mOn());

  // ---------- open / close: the strip grows inside the bar; the title shrinks into the space left between the strips,
  // and only when even a small title has no room does it step back ----------
  // two open strips that would run into each other on a narrow screen: the one opened earlier folds back to its button
  let last = null;
  const fit = () => { const a = tA.getBoundingClientRect(), m = tM.getBoundingClientRect();
    if (tA.classList.contains('open') && tM.classList.contains('open') && a.right + 8 > m.left) return close(last === tA ? tM : tA);
    const b = brand.getBoundingClientRect(), c = (b.left + b.right) / 2, w = title.offsetWidth, L = a.right + 12, R = m.left - 12;
    const k = Math.min(1, (R - L) / w), ok = k >= 0.5, h = w * k / 2;   // the title slides into the free side, then shrinks
    const dx = c - h < L ? L + h - c : c + h > R ? R - h - c : 0;
    title.style.transform = ok && (k < 1 || dx) ? 'translateX(' + dx.toFixed(1) + 'px) scale(' + k.toFixed(3) + ')' : '';
    title.classList.toggle('back', !ok); };
  const close = c => { c.classList.remove('open'); if (c === tA) micOff(); setTimeout(fit, 260); };
  [tA, tM].forEach(c => c.querySelector('.tb').onclick = () => { if (c.classList.contains('open')) return close(c); c.classList.add('open'); last = c; setTimeout(fit, 260); });
  addEventListener('keydown', e => { if (e.key === 'Escape') [tA, tM].forEach(c => c.classList.contains('open') && close(c)); });
  addEventListener('resize', fit);
  [tA, tM].forEach(c => c.querySelector('.tx').addEventListener('transitionend', e => e.propertyName === 'max-width' && fit()));
})();

// V32 / V34 - full book page of a song (notes.js "page", "pageBW"), big and sharp, scrolls; Renkli / Siyah-beyaz -
// what is shown is what Yazdır prints; Esc / backdrop / Kapat close
(() => {
  const v = document.createElement('div'); v.className = 'pdfv'; v.hidden = true;
  const PDF = '<svg viewBox="0 0 24 28" aria-hidden="true"><path d="M3 1h12l6 6v19a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" fill="#fff" stroke="#e23b3b" stroke-width="1.6"/><path d="M15 1v6h6" fill="#fde2e2" stroke="#e23b3b" stroke-width="1.6" stroke-linejoin="round"/><rect x="0" y="13" width="19" height="9" rx="2" fill="#e23b3b"/><text x="9.5" y="20.2" font-size="6.6" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial">PDF</text></svg>';
  const PRN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z"/></svg>';
  const X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  v.innerHTML = '<div class="pb"><span class="pn">' + PDF + '<b></b><small>kitap sayfası</small></span>' +
    '<div class="vs ck"><button type="button" data-k="c" class="on">Renkli</button><button type="button" data-k="sb">Siyah-beyaz</button></div>' +
    '<div class="vs"><button type="button" class="pr on">' + PRN + 'Yazdır</button><button type="button" class="cl">' + X + 'Kapat</button></div></div>' +
    '<div class="pg"><img alt=""></div>';
  document.body.append(v);
  const img = v.querySelector('img'), ck = v.querySelector('.ck'); let pg = {};
  const pick = k => { ck.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === k)); img.src = k === 'sb' && pg.sb ? pg.sb : pg.c; };
  ck.querySelectorAll('button').forEach(b => b.onclick = () => pick(b.dataset.k));
  const close = () => { v.hidden = true; document.body.classList.remove('printing'); };
  window.openPage = (src, name, bw) => { pg = { c: src, sb: bw }; v.querySelector('.pn b').textContent = name; img.alt = name;
    ck.hidden = !bw; pick('c'); v.querySelector('.pg').scrollTop = 0; v.hidden = false; };
  v.querySelector('.cl').onclick = close;
  v.querySelector('.pr').onclick = () => { document.body.classList.add('printing'); print(); };
  addEventListener('afterprint', () => document.body.classList.remove('printing'));
  v.onclick = e => { if (e.target === v || e.target.classList.contains('pg')) close(); };
  addEventListener('keydown', e => { if (e.key === 'Escape' && !v.hidden) close(); });
})();
