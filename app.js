(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const input = $('input');
  const marked = $('marked');
  let last = null;

  const SAMPLE = `En el mundo actual, la inteligencia artificial juega un papel fundamental en la transformación de numerosos sectores. Es importante destacar que su impacto abarca ámbitos tan diversos como la medicina, la educación y la industria. Además, estas tecnologías permiten optimizar procesos y fomentar la innovación de manera significativa.

Por otro lado, cabe señalar que su adopción plantea desafíos éticos que deben abordarse con responsabilidad. No se trata solo de una herramienta tecnológica, sino de un cambio de paradigma que redefine nuestra relación con el conocimiento.

Yo la uso sobre todo para repasar antes de los parciales. A veces me explica bien las integrales, otras veces se inventa cosas y me toca comprobarlo con los apuntes de clase. El otro día me dio un resultado que estaba mal. Lo vi porque no cuadraban las unidades jaja.`;

  const words = (t) => (t.match(/[\p{L}\p{N}'’-]+/gu) || []).length;
  const updateCount = () => {
    const n = words(input.value);
    $('count').textContent = n === 1 ? '1 palabra' : n + ' palabras';
    $('analyze').disabled = n === 0;
  };

  function cls(p) { return p >= 0.6 ? 'ai' + (p >= 0.8 ? ' hot' : '') : p >= 0.4 ? 'doubt' : 'human'; }

  // Rebuild the original text with each sentence wrapped and its flagged terms underlined.
  function renderMarked(text, res) {
    marked.textContent = '';
    let pos = 0;
    res.sentences.forEach((s, i) => {
      if (s.start > pos) marked.append(text.slice(pos, s.start));
      const span = document.createElement('span');
      span.className = 's ' + cls(s.p);
      span.tabIndex = 0;
      span.dataset.i = i;
      span.title = Math.round(s.p * 100) + '% IA';
      const ranges = s.hits.filter((h) => h.kind !== 'human').sort((a, b) => a.from - b.from);
      let p = 0;
      for (const r of ranges) {
        if (r.from < p) continue;
        if (r.from > p) span.append(s.text.slice(p, r.from));
        const t = document.createElement('span');
        t.className = 't';
        t.textContent = s.text.slice(r.from, r.to);
        span.append(t);
        p = r.to;
      }
      span.append(s.text.slice(p));
      marked.append(span);
      pos = s.end;
    });
    if (pos < text.length) marked.append(text.slice(pos));
  }

  function verdict(r) {
    if (r.percentAI >= 70) return 'La mayor parte del texto tiene rasgos muy típicos de IA.';
    if (r.percentAI >= 40) return 'Una parte importante del texto suena a IA. Revisa las frases marcadas en amarillo.';
    if (r.percentAI >= 15) return 'Hay algunas frases que suenan a IA, el resto parece escrito por una persona.';
    return 'El texto parece escrito por una persona. Casi no hay rasgos típicos de IA.';
  }

  function li(label, right, detail, negative) {
    const el = document.createElement('li');
    const left = document.createElement('span');
    left.textContent = label;
    if (negative) left.className = 'neg';
    if (detail) { const sm = document.createElement('small'); sm.textContent = detail; left.append(sm); }
    const k = document.createElement('span');
    k.className = 'k';
    k.textContent = right;
    el.append(left, k);
    return el;
  }

  function renderPanel(r) {
    $('empty').hidden = true;
    $('result').hidden = false;
    $('pct').textContent = r.percentAI;
    $('segAI').style.width = r.percentAI + '%';
    $('segDoubt').style.width = r.percentDoubt + '%';
    $('segHuman').style.width = r.percentHuman + '%';
    $('bar').setAttribute('aria-label', `IA ${r.percentAI}%, dudosa ${r.percentDoubt}%, humana ${r.percentHuman}%`);
    $('nAI').textContent = r.percentAI + '%';
    $('nDoubt').textContent = r.percentDoubt + '%';
    $('nHuman').textContent = r.percentHuman + '%';
    $('verdict').textContent = verdict(r) + ` Probabilidad media por frase: ${r.probability}%.`;

    const warn = $('warn');
    warn.hidden = r.wordCount >= 60;
    warn.textContent = 'Con menos de 60 palabras el resultado es poco fiable.';

    const list = $('signals');
    list.textContent = '';
    const humanLabels = new Set();
    r.sentences.forEach((s) => s.reasons.forEach((x) => { if (x.weight < 0) humanLabels.add(x.label); }));
    const entries = Object.entries(r.signals).sort((a, b) => b[1] - a[1]);
    r.docReasons.forEach((d) => list.append(li(d.label, 'todo el texto', null, d.weight < 0)));
    entries.slice(0, 8).forEach(([label, n]) =>
      list.append(li(label, n === 1 ? '1 frase' : n + ' frases', null, humanLabels.has(label))));
    if (!list.children.length) list.append(li('No se ha encontrado ningún rasgo destacable', ''));
    $('detail').hidden = true;
  }

  function showDetail(i) {
    const s = last.sentences[i];
    marked.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel'));
    marked.querySelector(`[data-i="${i}"]`).classList.add('sel');
    $('detail').hidden = false;
    $('detailP').textContent = `«${s.text.length > 140 ? s.text.slice(0, 140) + '…' : s.text}» · ${Math.round(s.p * 100)}% IA`;
    const ul = $('detailList');
    ul.textContent = '';
    const reasons = s.reasons.slice().sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    reasons.forEach((x) => ul.append(li(x.label, (x.weight > 0 ? '+' : '') + x.weight.toFixed(1), x.detail, x.weight < 0)));
    last.docReasons.forEach((d) => ul.append(li(d.label + ' (todo el texto)', (d.weight > 0 ? '+' : '') + d.weight.toFixed(1), null, d.weight < 0)));
    if (!ul.children.length) ul.append(li('Sin rasgos especiales', ''));
    if (window.matchMedia('(max-width: 860px)').matches) $('detail').scrollIntoView({ block: 'nearest' });
  }

  function run() {
    const text = input.value;
    if (!words(text)) return;
    last = window.Huella.analyze(text);
    renderMarked(text, last);
    renderPanel(last);
    $('editor').hidden = true;
    marked.hidden = false;
    $('edit').hidden = false;
    $('analyze').hidden = true;
  }

  function edit() {
    marked.hidden = true;
    $('editor').hidden = false;
    $('edit').hidden = true;
    $('analyze').hidden = false;
    input.focus();
  }

  $('analyze').addEventListener('click', run);
  $('edit').addEventListener('click', edit);
  $('sample').addEventListener('click', () => { input.value = SAMPLE; updateCount(); run(); });
  input.addEventListener('input', updateCount);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); });
  marked.addEventListener('click', (e) => { const s = e.target.closest('.s'); if (s) showDetail(+s.dataset.i); });
  marked.addEventListener('keydown', (e) => {
    const s = e.target.closest('.s');
    if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showDetail(+s.dataset.i); }
  });
  updateCount();
})();
