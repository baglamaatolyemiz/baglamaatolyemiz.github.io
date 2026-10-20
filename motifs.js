// V29b - Anatolian kilim motifs left and right of the title (they replace the saz pictures).
// Taken from his motif sheet (temp/motif/ref.png -> temp/motif/cut.py), coloured; left out at his word:
// bird, flag, triangle, hourglass, armed figure, tent, tall tree. 17 motifs: m01-m09 left, m10-m17 right.
(() => {
  const img = n => '<img src="assets/motif/m' + String(n).padStart(2, '0') + '.png" alt="">';
  const fill = (id, a, b) => { const e = document.getElementById(id); if (e) for (let n = a; n <= b; n++) e.insertAdjacentHTML('beforeend', img(n)); };
  fill('mol', 1, 9); fill('mor', 10, 17);
})();
