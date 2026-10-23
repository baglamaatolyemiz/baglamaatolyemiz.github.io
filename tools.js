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
  const DL = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5M4 17v3h16v-3"/></svg>';   // V150
  v.innerHTML = '<div class="pb"><span class="pn">' + PDF + '<b></b><small>kitap sayfası</small></span>' +
    '<div class="vs ck"><button type="button" data-k="c" class="on">Renkli</button><button type="button" data-k="sb">Siyah-beyaz</button></div>' +
    '<div class="vs"><button type="button" class="pr on">' + PRN + 'Yazdır</button><button type="button" class="dl on">' + DL + 'İndir</button><button type="button" class="cl">' + X + 'Kapat</button></div></div>' +
    '<div class="pg"><div class="pi"><img alt=""></div></div>';
  document.body.append(v);
  const img = v.querySelector('img'), ck = v.querySelector('.ck'), pgEl = v.querySelector('.pg'), dl = v.querySelector('.dl'); let pg = [{}], k0 = 'c';
  // V104 - a book (footer Kitap 1/2/3) is a stack of its pieces' pages in this same window; Renkli / Siyah-beyaz and Yazdır cover every page
  const ims = () => pgEl.querySelectorAll('.pi img'), wraps = () => pgEl.querySelectorAll('.pi');   // V150 - each page sits in a .pi box with its hotspots
  const pick = k => { k0 = k; ck.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    ims().forEach((m, i) => { const p = pg[i] || {}; if (p.c) m.src = k === 'sb' && p.sb ? p.sb : p.c; }); };
  ck.querySelectorAll('button').forEach(b => b.onclick = () => pick(b.dataset.k));
  const close = () => { v.hidden = true; document.body.classList.remove('printing'); };
  // V103 - a book with no pages yet still opens its Drive PDF here, in a frame instead of the page images
  const fr = document.createElement('iframe'); fr.allow = 'fullscreen'; fr.hidden = true; pgEl.append(fr);
  let book = null;
  const kind = t => v.querySelector('.pn small').textContent = t;
  // V150 - İndir and the page's own Geri / İçindekiler / İleri buttons (public/pdfnav.js, page numbers of Tüm Kitap)
  const NV = () => window.PDFNAV || { books: {}, pieces: [], page: {}, hs: {} };
  let at = null;   // what is shown: f = PDF file, d = download name, p0 = book page of the first image, hs(i) = rects of image i, b / pc = book key / piece
  const aBook = (key, ok) => { const B = NV().books[key]; return B && { f: B.f, d: B.d, p0: B.p0, b: key, hs: i => ok ? (NV().hs[key] || [])[i] : null }; };
  const aPiece = (pc, ok) => { const B = NV().books[pc.k]; return { f: pc.f, d: pc.d, p0: pc.p0, pc, hs: i => ok && B ? (NV().hs[pc.k] || [])[pc.p0 - B.p0 + i] : null }; };
  const bookImgs = key => { const B = (window.BOOKS || {})[key]; if (!B) return [];
    const dir = 'notes/' + (/^Kısa Sap /.test(key) ? 'kisa-' : '') + 'kitap-' + (/Tüm Kitap$/.test(key) ? 'tum' : key.replace(/\D/g, ''));
    return Array.from({ length: B.n }, (_, i) => { const s = dir + '/sayfa-' + String(i + 1).padStart(2, '0'); return { c: s + '.jpg?v=' + B.v, sb: s + '-sb.jpg?v=' + B.v, a4: 1 }; }); };
  const last = () => (NV().books['Tüm Kitap'] || {}).n || 0;
  const tgt = (i, h) => { if (!at) return null; const n = at.p0 + i, t = h === 1 ? 2 : n + (h ? 1 : -1); return h === 1 && n === 2 || t < 1 || t > last() ? null : t; };
  const scrollTo = i => requestAnimationFrame(() => { const w = wraps()[i]; if (w) pgEl.scrollTop += w.getBoundingClientRect().top - pgEl.getBoundingClientRect().top - 16; });
  const fill = (pages, name, a, to) => { wraps().forEach((m, i) => i && m.remove()); pg = pages; at = a || null;
    pages.slice(1).forEach(() => { const w = document.createElement('div'), m = document.createElement('img'); w.className = 'pi'; m.alt = name; m.decoding = 'async'; w.append(m); fr.before(w); });
    img.alt = name; wraps().forEach(m => m.hidden = false); fr.hidden = true; book = null;
    wraps().forEach((w, i) => { w.querySelectorAll('.hs').forEach(h => h.remove()); const m = w.querySelector('img');
      if (pages[i].a4) { m.width = 595; m.height = 842; } else { m.removeAttribute('width'); m.removeAttribute('height'); }   // book pages: room kept before they load, so a jump lands
      ((at && at.hs(i)) || []).forEach((r, h) => { if (!r || tgt(i, h) == null) return;
        const e = document.createElement('a'); e.className = 'hs'; e.href = '#'; e.dataset.i = i; e.dataset.h = h; e.title = ['Geri', 'İçindekiler', 'İleri'][h]; e.setAttribute('aria-label', e.title);
        e.style.cssText = 'left:' + r[0] * 100 + '%;top:' + r[1] * 100 + '%;width:' + (r[2] - r[0]) * 100 + '%;height:' + (r[3] - r[1]) * 100 + '%'; w.append(e); }); });
    dl.hidden = !(at && at.f);
    v.querySelector('.pn b').textContent = name; ck.hidden = !pages.some(p => p.sb); pick(to == null ? 'c' : k0); pgEl.scrollTop = 0; v.hidden = false; if (to > 0) scrollTo(to); };
  const openKey = (key, t) => { const B = NV().books[key], p = bookImgs(key); if (!B || p.length !== B.n) return; kind('kitap'); fill(p, key, aBook(key, 1), t - B.p0); };
  const openPiece = (pc, t) => { const B = NV().books[pc.k], p = bookImgs(pc.k).slice(pc.p0 - B.p0, pc.p0 - B.p0 + pc.n); if (p.length !== pc.n) return;
    kind('kitap sayfası'); fill(p, pc.t.replace(/\s+/g, ' '), aPiece(pc, 1), t - pc.p0); };
  // Geri / İleri: the neighbouring image of this stack; past its ends the neighbouring piece (for a piece) or book (for a book), front pages from Tüm Kitap
  // İçindekiler: Tüm Kitap page 2
  const go = (i, h) => { const t = tgt(i, h); if (t == null) return;
    if (h !== 1 && t >= at.p0 && t < at.p0 + pg.length) return scrollTo(t - at.p0);
    const pre = /^Kısa Sap /.test(at.b || '') ? 'Kısa Sap ' : '';   // V162 - a Kısa Sap book stays in its own edition
    if (h === 1) return openKey(pre + 'Tüm Kitap', t);
    const B = NV().books, pc = at.pc && NV().pieces.find(x => t >= x.p0 && t < x.p0 + x.n);
    if (pc) return openPiece(pc, t);
    openKey(Object.keys(B).find(k => k.replace(/Kitap \d+$/, '') === pre && !at.pc && t >= B[k].p0 && t < B[k].p0 + B[k].n) || pre + 'Tüm Kitap', t); };
  pgEl.addEventListener('click', e => { const h = e.target.closest('.hs'); if (!h) return; e.preventDefault(); e.stopPropagation(); go(+h.dataset.i, +h.dataset.h); });
  window.openPage = (src, name, bw, src2, bw2) => { kind('kitap sayfası'); const P = [{ c: src, sb: bw }].concat(src2 ? [{ c: src2, sb: bw2 }] : []),   // V109 - a 2-page song opens both
    pc = NV().pieces[NV().page[((src || '').match(/notes\/([^/]+)\//) || [])[1]]]; fill(P, name, pc && aPiece(pc, P.length === pc.n)); };
  window.openBook = (pages, name, id, key) => { if (pages.length) { kind('kitap'); const B = NV().books[key]; return fill(pages, name, B && aBook(key, pages.length === B.n)); }
    book = id; wraps().forEach(m => m.hidden = true); fr.hidden = false; ck.hidden = true; kind('kitap'); dl.hidden = false; at = null;
    if (fr.dataset.id !== id) { fr.src = 'https://drive.google.com/file/d/' + id + '/preview'; fr.dataset.id = id; }
    v.querySelector('.pn b').textContent = name; v.hidden = false; };
  // V150 - İndir: the PDF of what is shown (Kitap N.pdf, Tüm Kitap.pdf or the piece's own PDF), from public/pdf/
  dl.onclick = () => { if (book) return window.open('https://drive.google.com/uc?export=download&id=' + book, '_blank', 'noopener');
    if (!at || !at.f) return; const a = document.createElement('a'); a.href = at.f; a.download = at.d; document.body.append(a); a.click(); a.remove(); };
  v.querySelector('.cl').onclick = close;
  // a book prints from its own PDF tab (a Drive frame cannot be printed from here)
  v.querySelector('.pr').onclick = () => { if (book) return window.open('https://drive.google.com/file/d/' + book + '/view', '_blank', 'noopener');
    document.body.classList.add('printing'); print(); };
  addEventListener('afterprint', () => document.body.classList.remove('printing'));
  v.onclick = e => { if (e.target === v || e.target.classList.contains('pg')) close(); };
  addEventListener('keydown', e => { if (e.key === 'Escape' && !v.hidden) close(); });
})();
