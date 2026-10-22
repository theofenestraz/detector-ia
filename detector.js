// Huella: heuristic AI-text detector. Runs entirely in the browser (also loadable from Node for tests).
(function (root) {
  'use strict';

  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // \b does not work with accented letters, so use Unicode letter lookarounds instead
  const wordRe = (list) =>
    new RegExp('(?<![\\p{L}\\p{N}])(?:' + list.map(esc).sort((a, b) => b.length - a.length).join('|') + ')(?![\\p{L}\\p{N}])', 'giu');

  const PHRASES = wordRe([
    // es
    'es importante destacar', 'es importante señalar', 'es importante tener en cuenta', 'es importante mencionar',
    'cabe destacar', 'cabe señalar', 'cabe mencionar', 'cabe resaltar', 'vale la pena mencionar', 'vale la pena destacar',
    'en conclusión', 'en resumen', 'en definitiva', 'en última instancia', 'en pocas palabras', 'en síntesis',
    'en el mundo actual', 'en el mundo de hoy', 'en el panorama actual', 'en la era digital', 'en la sociedad actual',
    'juega un papel', 'desempeña un papel', 'papel fundamental', 'papel crucial', 'papel clave', 'papel esencial',
    'sin lugar a dudas', 'sin duda alguna', 'a lo largo de la historia', 'en este sentido', 'dicho esto',
    'en otras palabras', 'de manera significativa', 'de manera efectiva', 'de forma significativa', 'de manera integral',
    'una amplia gama', 'un amplio abanico', 'una gran variedad de', 'un sinfín de', 'una miríada de',
    'adentrarnos en', 'sumergirnos en', 'profundizar en', 'en el ámbito de', 'en el contexto de',
    'un aspecto clave', 'es fundamental', 'es crucial', 'es esencial', 'resulta fundamental', 'resulta esencial',
    'pone de manifiesto', 'cobra especial relevancia', 'en constante evolución', 'en continua evolución',
    'ofrece una visión', 'abre la puerta a', 'marca un antes y un después', 'no solo', 'sino también',
    'espero que esto te ayude', 'espero que te sea útil', 'aquí tienes', 'por supuesto,', 'claro que sí',
    'teniendo en cuenta', 'de cara al futuro', 'un mundo cada vez más', 'cada vez más importante',
    // en
    "it's important to note", 'it is important to note', 'it is worth noting', "it's worth noting", 'it is essential to',
    'in conclusion', 'in summary', 'to sum up', "in today's", 'fast-paced', 'ever-evolving', 'ever-changing',
    'plays a crucial role', 'plays a vital role', 'plays a pivotal role', 'plays a key role', 'a testament to',
    'in the realm of', 'delve into', 'dive into', "let's dive", 'navigate the', 'a wide range of', 'a myriad of',
    'a plethora of', 'not only', 'but also', 'when it comes to', 'in other words', 'in essence', 'rich tapestry',
    'stands as a', 'serves as a', 'highlights the importance', 'underscores the importance', 'i hope this helps',
    'great question', "here's a", 'at its core', 'paving the way', 'in the digital age',
  ]);

  const BUZZ = wordRe([
    // es
    'crucial', 'cruciales', 'fundamental', 'fundamentales', 'esencial', 'esenciales', 'significativo', 'significativa',
    'significativos', 'significativas', 'holístico', 'holística', 'integral', 'innovador', 'innovadora', 'innovadores',
    'transformador', 'transformadora', 'fomentar', 'fomenta', 'potenciar', 'potencia', 'abordar', 'aborda', 'optimizar',
    'impulsar', 'impulsa', 'garantizar', 'panorama', 'ámbito', 'ámbitos', 'sinergia', 'paradigma', 'intrínseco',
    'multifacético', 'multifacética', 'robusto', 'robusta', 'primordial', 'enriquecedor', 'enriquecedora', 'invaluable',
    'vibrante', 'apasionante', 'fascinante', 'meticuloso', 'meticulosa', 'exhaustivo', 'exhaustiva', 'notable',
    'notablemente', 'indudablemente', 'asimismo', 'sostenible', 'eficiente', 'dinámico', 'dinámica',
    // en
    'delve', 'delves', 'tapestry', 'landscape', 'pivotal', 'crucial', 'vital', 'seamless', 'seamlessly', 'robust',
    'leverage', 'leveraging', 'foster', 'fostering', 'empower', 'empowering', 'unlock', 'elevate', 'enhance', 'enhancing',
    'streamline', 'comprehensive', 'multifaceted', 'holistic', 'nuanced', 'intricate', 'realm', 'testament', 'embark',
    'vibrant', 'bustling', 'meticulous', 'invaluable', 'transformative', 'innovative', 'paramount', 'notably',
    'profound', 'moreover', 'furthermore', 'additionally', 'ultimately', 'utilize', 'showcasing', 'boasts',
  ]);

  const OPENERS = new RegExp('^(?:' + [
    'además', 'asimismo', 'por otro lado', 'por otra parte', 'en primer lugar', 'en segundo lugar', 'en tercer lugar',
    'finalmente', 'por último', 'en conclusión', 'en resumen', 'no obstante', 'sin embargo', 'por lo tanto',
    'de este modo', 'de esta manera', 'así pues', 'en definitiva', 'en este sentido', 'por consiguiente',
    'moreover', 'furthermore', 'additionally', 'however', 'firstly', 'secondly', 'finally', 'overall',
    'ultimately', 'in addition', 'consequently', 'therefore',
  ].map(esc).join('|') + ')(?![\\p{L}])', 'iu');

  const INFORMAL_STRONG = wordRe([
    'jeje', 'jiji', 'xd', 'lol', 'lmao', 'idk', 'tbh', 'omg', 'o sea', 'en plan', 'tío', 'tía', 'ni idea', 'flipar',
    'flipé', 'flipando', 'mola', 'molaba', 'guay', 'curro', 'chaval', 'ostras', 'joder', 'hostia', 'madre mía', 'buah',
    'porfa', 'finde', 'xq', 'pq', 'tb', 'tmb', 'q', 'kinda', 'gonna', 'wanna', 'gotta', 'nah', 'dude', 'ugh', 'yeah',
    'cutre', 'rollo', 'menudo', 'menuda', 'peña', 'pasada', 'bua', 'uf', 'puf', 'vamos que', 'pues nada',
  ]);
  const LAUGH = /(?<![\p{L}])(?:ja){2,}|(?:je){2,}|(?:ha){2,}(?![\p{L}])/giu;
  const INFORMAL_WEAK = wordRe(['vale', 'bueno', 'pues', 'la verdad', 'igual', 'eh', 'vamos', 'honestly', 'okay', 'ok', 'anyway']);
  const FIRST_PERSON = wordRe(['yo', 'me', 'mi', 'mis', 'conmigo', 'i', "i'm", "i've", 'my', 'me']);

  const DASH = /[—–]/g;
  const TRIAD = /(?<![\p{L}])[\p{L}]+(?:\s[\p{L}]+)?,\s[\p{L}]+(?:\s[\p{L}]+)?,?\s(?:y|e|o|and|or)\s[\p{L}]+/iu;
  const NOT_X_BUT_Y = /(?:no\s(?:se\strata|es)\s[^.;]{1,60},\s?sino)|(?:(?:it's|it\sis)\snot\s(?:just\s|only\s|about\s)?[^.;]{1,50}[,;—–]\s?(?:it's|it\sis|but))/iu;
  const MARKDOWN = /^\s*(?:#{1,6}\s|[-*•]\s|\d+[.)]\s)|\*\*[^*]+\*\*/u;
  const WORD = /[\p{L}\p{N}'’-]+/gu;

  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
  const stdev = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };

  // Split into sentences keeping character offsets so the UI can highlight the original text.
  function segment(text) {
    const out = [];
    let start = 0;
    const push = (end) => {
      const raw = text.slice(start, end);
      const lead = raw.length - raw.trimStart().length;
      const t = raw.trim();
      if (t) out.push({ text: t, start: start + lead, end: start + lead + t.length });
    };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '\n') { push(i); start = i + 1; continue; }
      if ('.!?…'.includes(c)) {
        if (c === '.' && /\d/.test(text[i + 1] || '') && /\d/.test(text[i - 1] || '')) continue;
        let j = i + 1;
        while (j < text.length && '.!?…"»”\')]'.includes(text[j])) j++;
        if (j >= text.length || /\s/.test(text[j])) { push(j); start = j; i = j - 1; }
      }
    }
    push(text.length);
    return out;
  }

  function collect(re, s, kind, hits) {
    re.lastIndex = 0;
    let m;
    const found = [];
    while ((m = re.exec(s)) !== null) {
      found.push(m[0]);
      hits.push({ from: m.index, to: m.index + m[0].length, kind });
      if (m[0].length === 0) re.lastIndex++;
    }
    return found;
  }

  function analyze(text) {
    const sentences = segment(text || '');
    const totalWords = (text.match(WORD) || []).length;

    // Humans vary sentence length much more than LLMs do ("burstiness"). Measured over a window of
    // neighbouring sentences so that a human paragraph inside an AI text is judged on its own.
    const lens = sentences.map((s) => (s.text.match(WORD) || []).length);
    const burst = lens.map((_, i) => {
      const win = lens.slice(Math.max(0, i - 2), i + 3).filter((n) => n >= 3);
      if (win.length < 4) return null;
      const cv = stdev(win) / mean(win);
      if (cv < 0.25) return { label: 'Frases vecinas de longitud casi idéntica', weight: 0.6 };
      if (cv < 0.4) return { label: 'Frases vecinas de longitud regular', weight: 0.25 };
      if (cv > 0.7) return { label: 'Frases vecinas de longitud muy variada', weight: -0.5 };
      return null;
    });
    const docReasons = [];
    let docBias = 0;
    const paras = text.split(/\n\s*\n/).map((p) => (p.match(WORD) || []).length).filter((n) => n > 15);
    if (paras.length >= 3 && stdev(paras) / mean(paras) < 0.2) {
      docBias += 0.3; docReasons.push({ label: 'Párrafos de tamaño casi idéntico', weight: 0.3 });
    }

    const signals = {};
    const tally = (label, n = 1) => { signals[label] = (signals[label] || 0) + n; };

    const scored = sentences.map((s, i) => {
      const t = s.text;
      const words = (t.match(WORD) || []).length;
      const reasons = [];
      const hits = [];
      let x = -1.3 + docBias;
      const add = (label, w, detail) => { x += w; reasons.push({ label, weight: w, detail }); tally(label); };

      const phrases = collect(PHRASES, t, 'phrase', hits);
      if (phrases.length) add('Frases hechas típicas de IA', Math.min(phrases.length, 3) * 1.1, phrases.join(', '));
      const buzz = collect(BUZZ, t, 'buzz', hits).filter((b) => !phrases.some((p) => p.toLowerCase().includes(b.toLowerCase())));
      if (buzz.length) add('Palabras comodín', Math.min(buzz.length, 3) * 0.55, buzz.join(', '));
      const dashes = collect(DASH, t, 'dash', hits);
      if (dashes.length) add('Rayas (—) como pausa', Math.min(dashes.length, 2) * 0.8);
      if (OPENERS.test(t)) add('Empieza con conector formal', 0.6, t.match(OPENERS)[0]);
      if (TRIAD.test(t)) add('Enumeración de tres elementos', 0.5, t.match(TRIAD)[0]);
      if (NOT_X_BUT_Y.test(t)) add('Estructura «no es X, sino Y»', 0.9);
      if (MARKDOWN.test(t)) add('Formato de lista o negritas', 0.6);
      if (burst[i]) add(burst[i].label, burst[i].weight);
      if (words >= 14 && words <= 32) { x += 0.35; reasons.push({ label: 'Longitud de frase típica de IA', weight: 0.35 }); }
      const letters = (t.match(/\p{L}/gu) || []).length;
      if (words >= 6 && letters / words > 5.6) { x += 0.35; reasons.push({ label: 'Vocabulario largo y formal', weight: 0.35 }); }

      const informal = collect(INFORMAL_STRONG, t, 'human', hits).concat(collect(LAUGH, t, 'human', hits));
      if (informal.length) add('Tono coloquial', -1.4 * Math.min(informal.length, 2), informal.join(', '));
      const weak = collect(INFORMAL_WEAK, t, 'human', hits);
      if (weak.length) add('Muletillas de conversación', -0.45 * Math.min(weak.length, 2), weak.join(', '));
      if (/[!?]{2,}|\.{3}|…/.test(t)) add('Puntuación expresiva (!!, ...)', -0.6);
      if (/^[\p{Ll}]/u.test(t)) add('Empieza en minúscula', -0.6);
      if (FIRST_PERSON.test(t)) { FIRST_PERSON.lastIndex = 0; add('Habla en primera persona', -0.5); }
      FIRST_PERSON.lastIndex = 0;
      if (words > 0 && words < 6) { x -= 0.4; reasons.push({ label: 'Frase muy corta', weight: -0.4 }); }
      if (words > 45) { x -= 0.3; reasons.push({ label: 'Frase muy larga y enredada', weight: -0.3 }); }

      return { ...s, words, p: sigmoid(x), reasons, hits };
    });

    let ai = 0, doubt = 0, human = 0, weighted = 0;
    for (const s of scored) {
      if (s.p >= 0.6) ai += s.words; else if (s.p >= 0.4) doubt += s.words; else human += s.words;
      weighted += s.p * s.words;
    }
    const sum = ai + doubt + human || 1;
    return {
      sentences: scored,
      wordCount: totalWords,
      percentAI: Math.round((ai / sum) * 100),
      percentDoubt: Math.round((doubt / sum) * 100),
      percentHuman: 100 - Math.round((ai / sum) * 100) - Math.round((doubt / sum) * 100),
      probability: Math.round((weighted / sum) * 100),
      signals,
      docReasons,
    };
  }

  const api = { analyze, segment };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Huella = api;
})(typeof window !== 'undefined' ? window : globalThis);
