/* Sillabario — motore dell'app.
   Il motore non contiene contenuti: legge courses.json e il file del corso scelto (es. ja.json).
   Stato salvato in localStorage (chiave LS_KEY); la sincronizzazione remota si aggancia a Store. */
'use strict';

const APP_VERSION = '2.2';
const LS_KEY = 'sillabario.v2';
const DAY = 864e5;
const $app = document.getElementById('app');

/* ============================== utilità ============================== */
let TIME_OFFSET = 0; // usato solo dai test per simulare il passare dei giorni
const now = () => Date.now() + TIME_OFFSET;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const uniq = a => [...new Set(a)];
const pickOne = a => a[Math.floor(Math.random() * a.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function dayKey(t = now()) { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function startOfDay(t = now()) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
function addDays(t, n) { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); }
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
function options(correct, pool, n = 4) {
  const others = shuffle(uniq(pool.filter(x => x != null && x !== correct)));
  return shuffle([correct, ...others.slice(0, n - 1)]);
}

/* ============================== kana ============================== */
const ROMA = (() => {
  const t = {};
  const rows = {
    '': ['あ', 'い', 'う', 'え', 'お'], k: ['か', 'き', 'く', 'け', 'こ'], g: ['が', 'ぎ', 'ぐ', 'げ', 'ご'], s: ['さ', 'し', 'す', 'せ', 'そ'], z: ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
    t: ['た', 'ち', 'つ', 'て', 'と'], d: ['だ', 'ぢ', 'づ', 'で', 'ど'], n: ['な', 'に', 'ぬ', 'ね', 'の'], h: ['は', 'ひ', 'ふ', 'へ', 'ほ'], b: ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
    p: ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'], m: ['ま', 'み', 'む', 'め', 'も'], r: ['ら', 'り', 'る', 'れ', 'ろ'], x: ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ'], l: ['ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ']
  };
  const V = ['a', 'i', 'u', 'e', 'o'];
  for (const c in rows) rows[c].forEach((k, i) => { t[c + V[i]] = k; });
  Object.assign(t, { shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', ya: 'や', yu: 'ゆ', yo: 'よ', wa: 'わ', wo: 'を', we: 'うぇ', wi: 'うぃ',
    xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', lya: 'ゃ', lyu: 'ゅ', lyo: 'ょ', xtu: 'っ', ltu: 'っ', xtsu: 'っ', xwa: 'ゎ',
    fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', je: 'じぇ', she: 'しぇ', che: 'ちぇ', thi: 'てぃ', dhi: 'でぃ', tsa: 'つぁ', vu: 'ゔ', va: 'ゔぁ', vi: 'ゔぃ', ve: 'ゔぇ', vo: 'ゔぉ' });
  const Y = { ya: 'ゃ', yu: 'ゅ', yo: 'ょ' };
  const yo = { ky: 'き', gy: 'ぎ', sy: 'し', zy: 'じ', ty: 'ち', dy: 'ぢ', ny: 'に', hy: 'ひ', by: 'び', py: 'ぴ', my: 'み', ry: 'り', cy: 'ち', jy: 'じ' };
  for (const p in yo) for (const v in Y) t[p + v.slice(1)] = yo[p] + Y[v];
  for (const v in Y) { t['sh' + v.slice(1)] = 'し' + Y[v]; t['ch' + v.slice(1)] = 'ち' + Y[v]; t['j' + v.slice(1)] = 'じ' + Y[v]; }
  return t;
})();
function toHira(src, final) {
  const s = src.toLowerCase(); let out = ''; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === '-' || c === 'ー') { out += 'ー'; i++; continue; }
    if (!/[a-z']/.test(c)) { out += c; i++; continue; }
    if (c === "'") { i++; continue; }
    if (c === 'n') {
      const nx = s[i + 1];
      if (nx === 'n') { if (/[aiueoy]/.test(s[i + 2] || '')) { out += 'ん'; i += 1; } else { out += 'ん'; i += 2; } continue; }
      if (nx === "'") { out += 'ん'; i += 2; continue; }
      if (nx === undefined) { out += final ? 'ん' : 'n'; i++; continue; }
      if (!/[aiueoy]/.test(nx)) { out += 'ん'; i++; continue; }
    }
    if (/[bcdfghjkmpqrstvwxyz]/.test(c) && s[i + 1] === c) { out += 'っ'; i++; continue; }
    if (c === 't' && s[i + 1] === 'c' && s[i + 2] === 'h') { out += 'っ'; i++; continue; }
    let hit = false;
    for (let L = 4; L >= 1; L--) { const seg = s.substr(i, L); if (ROMA[seg]) { out += ROMA[seg]; i += L; hit = true; break; } }
    if (!hit) { out += c; i++; }
  }
  return out;
}
const kataToHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const hiraToKata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
const isKata = s => /^[゠-ヿー]+$/.test(s);
const normKana = s => kataToHira(String(s)).replace(/[\s、。・,.!?！？「」]/g, '');
function inputToKana(raw, final = true) { return /[a-z]/i.test(raw) ? toHira(raw, final) : raw; }
function normRoma(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, '').replace(/([aiueo])[-ー]/g, '$1$1').replace(/[.,!?'’-]/g, '')
    .replace(/ā/g, 'aa').replace(/ī/g, 'ii').replace(/ū/g, 'uu').replace(/ē/g, 'ee').replace(/ō/g, 'oo').replace(/ou/g, 'oo');
}
const stripOkuri = r => r.replace(/[()（）]/g, '');
const readingForms = r => uniq([r.replace(/\(.*?\)/g, ''), stripOkuri(r)]);

/* ============================== stato ============================== */
function freshState() {
  return { v: 2, course: 'ja', courses: {}, settings: { romaji: 'auto', goalMin: 15, rate: 0.75, reviewMax: 30, voice: '', sound: 1 }, log: {}, updatedAt: 0 };
}
const Store = {
  load() { try { const r = localStorage.getItem(LS_KEY); if (!r) return null; const s = JSON.parse(r); return s && s.v === 2 ? s : null; } catch (e) { return null; } },
  save(s) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) { } },
  remote: null // impostato da Sync quando il server è collegato
};
let S = Store.load() || freshState();
S.settings = Object.assign(freshState().settings, S.settings || {});
if (S.settings.rate === 0.85) S.settings.rate = 0.75; // vecchio predefinito, troppo veloce
function save() { S.updatedAt = now(); Store.save(S); if (Store.remote) Store.remote.push(S); }
function prog() { return S.courses[S.course] || (S.courses[S.course] = { placed: false, lessons: {}, chapters: {}, exams: {}, cards: {} }); }
function logToday(ok, ms) {
  const k = dayKey(); const d = S.log[k] || (S.log[k] = { n: 0, ok: 0, ms: 0 });
  d.n++; if (ok) d.ok++; d.ms += ms;
}
function streak() {
  let n = 0; let t = now();
  if (!(S.log[dayKey(t)] && S.log[dayKey(t)].n)) t = addDays(t, -1);
  while (S.log[dayKey(t)] && S.log[dayKey(t)].n) { n++; t = addDays(t, -1); }
  return n;
}
const minutesOn = k => Math.round(((S.log[k] && S.log[k].ms) || 0) / 60000);

/* ============================== sincronizzazione (server Cloudflare) ============================== */
function bestOf(a, b) { if (a == null) return b; if (b == null) return a; if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b); return typeof a === 'number' ? a : b; }
const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
// Unisce i progressi di due dispositivi: per ogni elemento vale il ripasso più recente, per lezioni/test il risultato migliore.
function mergeState(local, remote) {
  if (!remote || remote.v !== 2) return local;
  const newer = (remote.updatedAt || 0) > (local.updatedAt || 0) ? remote : local;
  const out = clone(newer);
  out.settings = Object.assign({}, freshState().settings, newer.settings, { sync: local.settings && local.settings.sync });
  out.courses = {};
  const L = local.courses || {}, R = remote.courses || {};
  for (const id of new Set([...Object.keys(L), ...Object.keys(R)])) {
    const a = L[id], b = R[id];
    if (!a || !b) { out.courses[id] = clone(a || b); continue; }
    if ((a.epoch || 0) !== (b.epoch || 0)) { out.courses[id] = clone((a.epoch || 0) > (b.epoch || 0) ? a : b); continue; } // azzerato su un dispositivo
    const c = { placed: !!(a.placed || b.placed), lessons: {}, chapters: {}, exams: {}, cards: {} };
    if (a.epoch) c.epoch = a.epoch;
    for (const k of new Set([...Object.keys(a.lessons || {}), ...Object.keys(b.lessons || {})])) {
      const x = (a.lessons || {})[k] || {}, y = (b.lessons || {})[k] || {};
      c.lessons[k] = { practice: !!(x.practice || y.practice) }; const bst = bestOf(x.best, y.best); if (bst != null) c.lessons[k].best = bst;
    }
    for (const f of ['chapters', 'exams']) for (const k of new Set([...Object.keys(a[f] || {}), ...Object.keys(b[f] || {})])) c[f][k] = bestOf((a[f] || {})[k], (b[f] || {})[k]);
    for (const k of new Set([...Object.keys(a.cards || {}), ...Object.keys(b.cards || {})])) {
      const x = (a.cards || {})[k], y = (b.cards || {})[k];
      c.cards[k] = clone(!x ? y : !y ? x : ((y.last || 0) > (x.last || 0) ? y : x));
    }
    out.courses[id] = c;
  }
  out.log = {};
  const LL = local.log || {}, RL = remote.log || {};
  for (const k of new Set([...Object.keys(LL), ...Object.keys(RL)])) { const x = LL[k], y = RL[k]; out.log[k] = clone(!x ? y : !y ? x : { n: Math.max(x.n, y.n), ok: Math.max(x.ok, y.ok), ms: Math.max(x.ms, y.ms) }); }
  out.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
  return out;
}
const Sync = {
  busy: false, last: 0, err: null, timer: null, token: null,
  cfg() { const c = S.settings.sync; return c && c.url && c.code ? c : null; },
  base(c) { return String(c.url).trim().replace(/\/+$/, ''); },
  async call(path, opt = {}, c = this.cfg()) {
    let r;
    try { r = await fetch(this.base(c) + path, { method: opt.method || 'GET', body: opt.body, keepalive: !!opt.keepalive, cache: 'no-store', headers: Object.assign({ Authorization: 'Bearer ' + c.code }, opt.body ? { 'Content-Type': 'application/json' } : {}) }); }
    catch (e) { throw new Error('Server non raggiungibile: controlla l\'indirizzo e la connessione.'); }
    let data = null; try { data = await r.json(); } catch (e) { }
    if (!r.ok) throw new Error(r.status === 401 ? 'Codice di accesso errato.' : r.status === 403 ? 'Il server non accetta richieste da questo sito: controlla ALLOWED_ORIGIN nel Worker.' : (data && data.error) || ('Errore del server (' + r.status + ').'));
    return data;
  },
  async sync({ force = false } = {}) {
    if (!this.cfg() || this.busy) return false;
    this.busy = true; const before = JSON.stringify(S);
    try {
      let merged = S;
      if (!force) { const remote = (await this.call('/progress')).state; if (remote) merged = mergeState(S, remote); }
      await this.call('/progress', { method: 'PUT', body: JSON.stringify({ state: merged }) });
      S = merged; Store.save(S); this.last = Date.now(); this.err = null;
      if (JSON.stringify(S) !== before) {
        if (COURSE && S.course !== COURSE.id) await loadCourse(S.course);
        if (VIEW.screen !== 'session') render();
      } else if (VIEW.screen === 'settings') render();
      return true;
    } catch (e) { this.err = e.message; if (VIEW.screen === 'settings') render(); return false; }
    finally { this.busy = false; }
  },
  schedule(ms = 15000) { clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), ms); },
  async azureToken() { // per la fase 4 (pronuncia e audio)
    if (this.token && this.token.exp > Date.now()) return this.token;
    const d = await this.call('/token'); this.token = { token: d.token, region: d.region, exp: Date.now() + (d.expiresIn || 540) * 1000 }; return this.token;
  }
};
Store.remote = { push() { Sync.schedule(); } };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && Sync.cfg()) { clearTimeout(Sync.timer); Sync.sync(); } else if (document.visibilityState === 'visible' && Sync.cfg()) Sync.schedule(500); });
window.addEventListener('online', () => { if (Sync.cfg()) Sync.schedule(500); });

/* ============================== corso ============================== */
let REGISTRY = null, COURSE = null, IDX = null;
async function loadJSON(url) { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) throw new Error(url + ' ' + r.status); return r.json(); }
async function loadCourse(id) {
  if (!REGISTRY) REGISTRY = (await loadJSON('courses.json')).courses;
  const meta = REGISTRY.find(c => c.id === id && !c.soon) || REGISTRY.find(c => !c.soon);
  COURSE = await loadJSON(meta.file);
  S.course = COURSE.id;
  IDX = indexCourse(COURSE);
}
function indexCourse(c) {
  const X = { levels: [], chapters: [], lessons: [], items: {} };
  const add = (le, it) => { if (!X.items[it.id]) { it.lesson = le; X.items[it.id] = it; } if (!le.itemIds.includes(it.id)) le.itemIds.push(it.id); };
  for (const l of c.levels) {
    l.chapters = l.chapters || []; X.levels.push(l);
    for (const ch of l.chapters) {
      ch.level = l; X.chapters.push(ch);
      for (const le of ch.lessons) {
        le.chapter = ch; le.level = l; le.itemIds = []; X.lessons.push(le);
        (le.kana || []).forEach(k => add(le, { id: 'k:' + k.k, kind: 'kana', k: k.k, r: k.r, alt: k.alt, script: le.script }));
        (le.words || []).forEach(w => add(le, { id: (w.role === 'read' ? 'r:' : 'w:') + w.jp, kind: 'word', ...w }));
        (le.kanji || []).forEach(k => add(le, { id: 'j:' + k.k, kind: 'kanji', ...k }));
        (le.grammar || []).forEach(g => add(le, { id: 'g:' + g.id, kind: 'grammar', gid: g.id, title: g.title, it: g.it,
          sentences: (le.sentences || []).filter(s => s.gp === g.id), drills: (le.drills || []).filter(d => d.gp === g.id), transforms: (le.transforms || []).filter(t => t.gp === g.id) }));
      }
    }
  }
  X.lessonIndex = new Map(X.lessons.map((l, i) => [l, i]));
  return X;
}
const item = id => IDX.items[id];
function itemLabel(it) {
  if (it.kind === 'kana') return it.k + ' · ' + it.r;
  if (it.kind === 'word') return it.jp + ' · ' + it.it;
  if (it.kind === 'kanji') return it.k + ' · ' + it.it;
  return it.title;
}
function showRomaji(level) { const m = S.settings.romaji; return m === 'always' || (m === 'auto' && level && level.id === 'L0'); }

/* ============================== ripasso dilazionato ============================== */
function card(id) { const p = prog(); return p.cards[id] || (p.cards[id] = { reps: 0, lapses: 0, ease: 2.5, ivl: 0, due: null, last: 0, n: 0, ok: 0 }); }
const inSRS = c => c && c.due != null;
function count(id, ok) { const c = card(id); c.n++; if (ok) c.ok++; c.last = now(); }
function schedule(id, ok) {
  const c = card(id);
  if (ok) {
    c.reps++;
    c.ivl = c.reps === 1 ? 1 : c.reps === 2 ? 3 : Math.round(c.ivl * c.ease);
    if (c.ivl >= 4) c.ivl = Math.max(1, Math.round(c.ivl * (0.95 + Math.random() * 0.1)));
    c.ivl = Math.min(c.ivl, 365);
    c.due = addDays(startOfDay(), c.ivl);
  } else {
    c.lapses++; c.reps = 0; c.ease = Math.max(1.3, c.ease - 0.2); c.ivl = 0;
    c.due = now() + 10 * 60000;
  }
}
function introduce(id, { ivl = 1, reps = 1, dueNow = false } = {}) {
  const c = card(id);
  if (inSRS(c)) return;
  c.reps = dueNow ? 0 : reps; c.ivl = dueNow ? 0 : ivl;
  c.due = dueNow ? now() : addDays(startOfDay(), ivl);
}
function dueIds() {
  const p = prog(), t = now();
  return Object.keys(p.cards).filter(id => item(id) && inSRS(p.cards[id]) && p.cards[id].due <= t).sort((a, b) => p.cards[a].due - p.cards[b].due);
}
function stageForCard(c) { if (c.reps <= 1) return pickOne([0, 1]); if (c.reps <= 3) return pickOne([1, 2]); return 2; }

/* ============================== progressione ============================== */
const passedLesson = le => prog().lessons[le.id] && prog().lessons[le.id].best != null;
const practiced = le => !!(prog().lessons[le.id] && prog().lessons[le.id].practice);
const passedChapter = ch => prog().chapters[ch.id] != null;
const passedExam = l => prog().exams[l.id] != null;
function lessonUnlocked(le) {
  const i = IDX.lessonIndex.get(le); if (i === 0) return true;
  const prev = IDX.lessons[i - 1];
  if (!passedLesson(prev)) return false;
  if (prev.chapter !== le.chapter) {
    if (!passedChapter(prev.chapter)) return false;
    if (prev.level !== le.level && !passedExam(prev.level)) return false;
  }
  return true;
}
const chapterUnlocked = ch => ch.lessons.every(passedLesson);
const examUnlocked = l => l.chapters.length > 0 && l.chapters.every(passedChapter);
function nextStep() {
  for (const l of IDX.levels) {
    if (l.soon) continue;
    for (const ch of l.chapters) {
      for (const le of ch.lessons) if (!passedLesson(le)) return { kind: 'lesson', le };
      if (!passedChapter(ch)) return { kind: 'chapter', ch };
    }
    if (!passedExam(l)) return { kind: 'exam', level: l };
  }
  return null;
}

/* ============================== voce ============================== */
let voices = [];
function loadVoices() { try { voices = speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
if ('speechSynthesis' in window) { loadVoices(); speechSynthesis.onvoiceschanged = () => { loadVoices(); if (VIEW && VIEW.screen === 'settings' && IDX) renderSettings(); }; }
function courseVoices() {
  const p = (COURSE && COURSE.tts || '').slice(0, 2).toLowerCase();
  return voices.filter(v => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith(p));
}
// punteggio di qualità: le voci "Premium"/"Enhanced" (iOS, macOS) e quelle neurali o online sono molto più naturali delle "compatte"
function voiceScore(v) {
  const n = (v.name + ' ' + v.voiceURI).toLowerCase();
  let s = 0;
  if (/premium/.test(n)) s += 60;
  if (/enhanced|avanzat|migliorat|erweitert|améliorée|mejorada/.test(n)) s += 50;
  if (/neural|natural|online/.test(n)) s += 45;
  if (/google/.test(n)) s += 35;
  if (/compact|eloquence/.test(n)) s -= 20;
  if (/kyoko|otoya|o-ren|hattori|nanami|keita/.test(n)) s += 5;
  if (/ja[-_]jp/i.test(v.lang)) s += 2;
  return s;
}
function voiceQuality(v) { const sc = voiceScore(v); return sc >= 45 ? 'alta qualità' : sc >= 30 ? 'buona' : 'base'; }
function voice() {
  const vs = courseVoices(); if (!vs.length) return null;
  if (S.settings.voice) { const chosen = vs.find(v => v.voiceURI === S.settings.voice); if (chosen) return chosen; }
  return vs.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0];
}
const canListen = () => !!voice();
function speak(text) {
  if (!('speechSynthesis' in window) || !text) return;
  try {
    const u = new SpeechSynthesisUtterance(String(text).replace(/[＿_]/g, ''));
    u.lang = COURSE.tts; u.rate = S.settings.rate; const v = voice(); if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch (e) { }
}

/* ============================== ordine dei tratti (dati KanjiVG, CC BY-SA 3.0) ============================== */
let STROKES = null;
async function loadStrokes() { try { STROKES = (await loadJSON('strokes.json')).strokes; } catch (e) { STROKES = {}; } }
const hasStrokes = ch => !!(STROKES && STROKES[ch]);
const SVGNS = 'http://www.w3.org/2000/svg';
const _samp = new Map();
function samplePath(d, n = 32) {
  const key = n + '|' + d; if (_samp.has(key)) return _samp.get(key);
  let host = document.getElementById('measure-svg');
  if (!host) { host = document.createElementNS(SVGNS, 'svg'); host.id = 'measure-svg'; host.setAttribute('width', '0'); host.setAttribute('height', '0'); host.style.cssText = 'position:absolute;left:-9999px;visibility:hidden'; document.body.appendChild(host); }
  const p = document.createElementNS(SVGNS, 'path'); p.setAttribute('d', d); host.appendChild(p);
  const L = p.getTotalLength(); const pts = [];
  for (let i = 0; i < n; i++) { const q = p.getPointAtLength(L * i / (n - 1)); pts.push([q.x, q.y]); }
  host.removeChild(p);
  const r = { pts, len: L }; _samp.set(key, r); return r;
}
function polyLen(p) { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }
function resample(p, n = 32) {
  if (p.length === 1) return Array.from({ length: n }, () => p[0].slice());
  const L = polyLen(p); if (L === 0) return Array.from({ length: n }, () => p[0].slice());
  const out = [p[0].slice()]; const step = L / (n - 1); let acc = 0; let i = 1; let prev = p[0];
  while (out.length < n - 1 && i < p.length) {
    const cur = p[i]; const seg = Math.hypot(cur[0] - prev[0], cur[1] - prev[1]);
    if (acc + seg >= step && seg > 0) { const t = (step - acc) / seg; const np = [prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t]; out.push(np); prev = np; acc = 0; }
    else { acc += seg; prev = cur; i++; }
  }
  while (out.length < n) out.push(p[p.length - 1].slice());
  return out;
}
const centroid = p => [p.reduce((a, x) => a + x[0], 0) / p.length, p.reduce((a, x) => a + x[1], 0) / p.length];
function meanDist(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]); return s / a.length; }
const strokeThr = len => Math.max(13, Math.min(21, len * 0.3));
// Confronta un tratto disegnato (coordinate nel riquadro 109×109) con il tratto atteso: forma, direzione e ordine.
function smooth(p, w = 2) { if (p.length < 5) return p; return p.map((_, i) => { let x = 0, y = 0, n = 0; for (let k = Math.max(0, i - w); k <= Math.min(p.length - 1, i + w); k++) { x += p[k][0]; y += p[k][1]; n++; } return [x / n, y / n]; }); }
function judgeStroke(user, ch, idx) {
  const exp = STROKES[ch]; const E = samplePath(exp[idx]);
  const sm = smooth(user); const u = resample(sm); const ulen = polyLen(resample(sm, 12));
  const dist = j => meanDist(u, samplePath(exp[j]).pts);
  let ok = false;
  // verso del tratto: il vettore inizio→fine deve andare nella stessa direzione di quello atteso
  const ev = [E.pts[E.pts.length - 1][0] - E.pts[0][0], E.pts[E.pts.length - 1][1] - E.pts[0][1]];
  const uv = [u[u.length - 1][0] - u[0][0], u[u.length - 1][1] - u[0][1]];
  const evl = Math.hypot(...ev), uvl = Math.hypot(...uv);
  if (evl > 8 && uvl > 4 && (ev[0] * uv[0] + ev[1] * uv[1]) / (evl * uvl) < -0.3) {
    const ce = centroid(E.pts), cu = centroid(u);
    if (Math.hypot(cu[0] - ce[0], cu[1] - ce[1]) < 20) return { ok: false, why: 'dir' };
  }
  if (E.len < 16) {
    const ce = centroid(E.pts), cu = centroid(u);
    ok = Math.hypot(cu[0] - ce[0], cu[1] - ce[1]) < 16 && ulen < E.len * 3 + 25;
  } else {
    ok = dist(idx) < strokeThr(E.len) && ulen > E.len * 0.4;
    if (!ok && meanDist(u.slice().reverse(), E.pts) < strokeThr(E.len) && ulen > E.len * 0.4) return { ok: false, why: 'dir' };
  }
  const d0 = dist(idx);
  // un altro tratto del carattere corrisponde molto meglio: ordine sbagliato (se viene dopo) o tratto già fatto (se viene prima)
  for (let j = 0; j < exp.length; j++) {
    if (j === idx) continue;
    const Ej = samplePath(exp[j]);
    if (E.len < 16 && Ej.len < 16) continue; // lineette del dakuten e segni minuti: quasi identiche, l'ordine tra loro non si giudica
    const dj = dist(j);
    const close = Ej.len >= 16 ? dj < strokeThr(Ej.len) : Math.hypot(...[0, 1].map(k => centroid(u)[k] - centroid(Ej.pts)[k])) < 10;
    if (close && dj < d0 * 0.6) return { ok: false, why: j > idx ? 'order' : 'again' };
  }
  if (ok) return { ok: true };
  return { ok: false, why: ulen < 4 ? 'short' : 'shape' };
}
function strokeSVG(ch, { cls = '', anim = false, from = 0, speed = 0.55 } = {}) {
  const S_ = STROKES[ch] || [];
  return S_.map((d, i) => i < from ? '' : `<path d="${d}" pathLength="1" ${anim ? `class="anim" style="--d:${((i - from) * speed).toFixed(2)}s"` : ''}/>`).join('');
}
function openStrokes(ch, label, sayText) {
  if (!hasStrokes(ch)) return;
  const n = STROKES[ch].length;
  const el = sheet(`<h2>Come si scrive ${esc(ch)}</h2><p class="lead">${esc(label)} · ${n} ${n === 1 ? 'tratto' : 'tratti'}. Come regola generale si procede dall'alto in basso e da sinistra a destra, ma conta l'ordine mostrato qui.</p>
    <div class="stroke-demo"><svg viewBox="0 0 109 109" class="trace demo" id="demo"><g class="grid"><line x1="54.5" y1="0" x2="54.5" y2="109"/><line x1="0" y1="54.5" x2="109" y2="54.5"/></g><g class="ghost">${strokeSVG(ch)}</g><g class="ink" id="demoink">${strokeSVG(ch, { anim: true })}</g></svg></div>
    <div class="cta-row center"><button class="btn" id="replay">Ripeti</button><button class="btn ghost" data-close>Chiudi</button></div>`);
  el.querySelector('[data-close]').onclick = () => el.remove();
  el.querySelector('#replay').onclick = () => { const g = el.querySelector('#demoink'); g.innerHTML = ''; requestAnimationFrame(() => { g.innerHTML = strokeSVG(ch, { anim: true }); }); speak(sayText || ch); };
  speak(sayText || ch);
}

/* ============================== suoni ============================== */
let AC = null;
function audioCtx() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === 'suspended') AC.resume().catch(() => { }); return AC; }
function tone(f, t0, dur, type = 'sine', gain = 0.07) {
  const c = audioCtx(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(); const t = c.currentTime + t0;
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.03);
}
const SFX = {
  ok() { tone(784, 0, 0.14); tone(1175, 0.07, 0.2); },
  bad() { tone(220, 0, 0.18, 'triangle', 0.06); tone(185, 0.09, 0.22, 'triangle', 0.05); },
  stroke() { tone(988, 0, 0.07, 'sine', 0.035); },
  pair() { tone(1047, 0, 0.1, 'sine', 0.05); },
  done() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.3, 'sine', 0.06)); }
};
function sfx(k) { if (S.settings.sound !== 0 && SFX[k]) SFX[k](); if (k === 'bad' && navigator.vibrate) try { navigator.vibrate(40); } catch (e) { } }

/* ============================== domande ============================== */
// Ogni domanda: {type:'mcq'|'roma'|'kana'|'build', item, stage, tid, prompt, sub, big, bigKind, say, audioOnly, options, optKind, answer, answers, tokens, orders, bank, sol, explain, level}
function kanaPool(it) {
  const idx = IDX.lessonIndex.get(it.lesson);
  return Object.values(IDX.items).filter(x => x.kind === 'kana' && x.script === it.script && IDX.lessonIndex.get(x.lesson) <= idx && x.r !== it.r);
}
const wordPool = role => Object.values(IDX.items).filter(x => x.kind === 'word' && x.role === role);
const kanjiPool = () => Object.values(IDX.items).filter(x => x.kind === 'kanji');
function kanjiReadings(k) { return [...k.on, ...k.kun]; }
function kanjiSol(k) { return { jp: k.k, r: 'on ' + k.on.join('・') + ' · kun ' + k.kun.join('・'), it: k.it }; }

function grammarTemplates(g) {
  const T = [];
  g.sentences.forEach((s, i) => {
    if (!s.build) T.push({ stage: 0, tid: g.id + '#m' + i, make: () => ({ type: 'mcq', prompt: 'Cosa significa questa frase?', big: s.jp, bigKind: 'sent', say: s.jp, romaji: s.r,
      options: options(s.it, Object.values(IDX.items).filter(x => x.kind === 'grammar').flatMap(x => x.sentences.filter(y => !y.build).map(y => y.it))), answer: s.it, long: true, sol: { jp: s.jp, r: s.r } }) });
    if (s.gap) T.push({ stage: 1, tid: g.id + '#g' + i, make: () => ({ type: 'mcq', prompt: 'Completa la frase', sub: s.it, big: s.gap.q, bigKind: 'sent', options: shuffle(s.gap.o), optKind: 'jp', answer: s.gap.a, explain: s.gap.ex, sayAfter: s.jp, sol: { jp: s.jp, r: s.r } }) });
    T.push({ stage: 2, tid: g.id + '#b' + i, make: () => {
      const tokPool = Object.values(IDX.items).filter(x => x.kind === 'grammar' && x.lesson.level === g.lesson.level).flatMap(x => x.sentences.flatMap(y => y.tokens));
      const extra = shuffle(uniq(tokPool.filter(t => !s.tokens.includes(t)))).slice(0, s.tokens.length > 4 ? 3 : 2);
      return { type: 'build', prompt: s.build || 'Traduci in giapponese', sub: s.build ? null : s.it, tokens: s.tokens, orders: [s.tokens, ...(s.alts || [])], bank: shuffle(s.tokens.concat(extra)), sayAfter: s.jp, sol: { jp: s.jp, r: s.r, it: s.build ? null : s.it } };
    } });
  });
  (g.transforms || []).forEach((t, i) => T.push({ stage: 2, tid: g.id + '#t' + i, make: () => ({ type: 'kana', prompt: t.task, big: t.from || null, bigKind: 'sent', answers: t.to, answer: t.to[0], kata: false, sayAfter: t.to[0], sol: { jp: t.to[0] } }) }));
  g.drills.forEach((d, i) => T.push({ stage: 1, tid: g.id + '#d' + i, make: () => ({ type: 'mcq', prompt: d.prompt, options: shuffle(d.options), optKind: d.jp ? 'jp' : null, answer: d.answer, explain: d.explain, long: d.options.some(o => o.length > 12), sol: { jp: d.jp ? d.answer : null, it: d.jp ? null : d.answer } }) }));
  return T;
}

function traceQ(ch, label, guided, sol) {
  return guided
    ? { type: 'trace', char: ch, guided: true, prompt: 'Ricalca il carattere', sub: 'Segui l\'ordine dei tratti: «' + label + '»', say: ch, sol }
    : { type: 'trace', char: ch, guided: false, prompt: 'Scrivi a memoria', sub: '«' + label + '»', sol };
}
function matchQ(its) {
  const pairs = []; const seenR = new Set();
  for (const it of shuffle(its)) {
    let L, R, lk;
    if (it.kind === 'kana') { L = it.k; R = it.r; lk = 'g'; }
    else if (it.kind === 'word') { L = it.jp; R = it.role === 'read' ? it.r : it.it; lk = 'jp'; }
    else if (it.kind === 'kanji') { L = it.k; R = it.it; lk = 'g'; }
    else continue;
    if (seenR.has(R)) continue; seenR.add(R);
    pairs.push({ id: it.id, L, R, lk });
    if (pairs.length >= 5) break;
  }
  if (pairs.length < 4) return null;
  return { type: 'match', prompt: 'Abbina le coppie', sub: 'Tocca un elemento a sinistra e il suo corrispondente a destra.', pairs, Lord: shuffle(pairs.map((_, i) => i)), Rord: shuffle(pairs.map((_, i) => i)), item: pairs[0].id, items: pairs.map(p => p.id), stage: 0, tid: 'match#' + pairs.map(p => p.id).join(','), level: item(pairs[0].id).lesson.level };
}
function makeQ(it, stage, opt = {}) {
  const lv = it.lesson.level;
  const listen = !opt.noListen && canListen();
  let q = null;
  if (it.kind === 'kana') {
    const pool = kanaPool(it); const sol = { jp: it.k, r: it.r };
    if (stage === 0) q = { type: 'mcq', prompt: 'Come si legge?', big: it.k, bigKind: 'glyph', say: it.k, options: options(it.r, pool.map(x => x.r)), answer: it.r, sol };
    else if (stage === 1) q = listen && Math.random() < 0.35
      ? { type: 'mcq', prompt: 'Ascolta: quale carattere hai sentito?', audioOnly: it.k, options: options(it.k, pool.map(x => x.k)), optKind: 'g', answer: it.k, sol }
      : { type: 'mcq', prompt: 'Quale carattere si legge «' + it.r + '»?', options: options(it.k, pool.map(x => x.k)), optKind: 'g', answer: it.k, sol };
    else if (opt.trace === true || (opt.trace !== false && hasStrokes(it.k) && Math.random() < 0.35)) q = traceQ(it.k, it.r, !!opt.guided, sol);
    else q = { type: 'roma', prompt: 'Scrivi la lettura in lettere latine', big: it.k, bigKind: 'glyph', say: it.k, answers: it.alt, answer: it.r, placeholder: 'es. ka', sol };
  } else if (it.kind === 'word' && it.role === 'read') {
    const pool = wordPool('read'); const sol = { jp: it.jp, r: it.r, it: it.it };
    if (stage === 0) q = { type: 'mcq', prompt: 'Come si legge questa parola?', big: it.jp, bigKind: 'word', say: it.jp, options: options(it.r, pool.map(x => x.r)), answer: it.r, sol };
    else if (stage === 1) q = listen && Math.random() < 0.35
      ? { type: 'mcq', prompt: 'Ascolta: quale parola hai sentito?', audioOnly: it.jp, options: options(it.jp, pool.filter(x => x.lesson.script === it.lesson.script).map(x => x.jp)), optKind: 'jp', answer: it.jp, sol }
      : { type: 'mcq', prompt: 'Cosa significa?', big: it.jp, bigKind: 'word', say: it.jp, options: options(it.it, pool.map(x => x.it)), answer: it.it, sol };
    else if (listen && Math.random() < 0.4) q = { type: 'kana', prompt: 'Dettato: ascolta e scrivi la parola', audioOnly: it.jp, answers: [it.kana], answer: it.kana, kata: isKata(it.kana), sol };
    else q = { type: 'roma', prompt: 'Scrivi la lettura in lettere latine', big: it.jp, bigKind: 'word', say: it.jp, answers: [it.r], answer: it.r, placeholder: 'lettura', sol };
  } else if (it.kind === 'word') {
    const pool = wordPool('lang'); const sol = { jp: it.jp, r: it.r, it: it.it };
    if (stage === 0) q = { type: 'mcq', prompt: 'Cosa significa?', big: it.jp, bigKind: 'word', say: it.jp, romaji: it.r, options: options(it.it, pool.map(x => x.it)), answer: it.it, sol };
    else if (stage === 1) q = listen && Math.random() < 0.35
      ? { type: 'mcq', prompt: 'Ascolta e scegli il significato', audioOnly: it.jp, options: options(it.it, pool.map(x => x.it)), answer: it.it, sol }
      : { type: 'mcq', prompt: 'Come si dice «' + it.it + '»?', options: options(it.jp, pool.map(x => x.jp)), optKind: 'jp', answer: it.jp, sol };
    else if (listen && Math.random() < 0.3) q = { type: 'kana', prompt: 'Dettato: ascolta e scrivi', audioOnly: it.jp, answers: [it.kana, ...(it.kanaAlts || [])], answer: it.kana, kata: isKata(it.kana), sol };
    else q = { type: 'kana', prompt: 'Scrivi in giapponese', sub: '«' + it.it + '»', answers: [it.kana, ...(it.kanaAlts || [])], answer: it.kana, kata: isKata(it.kana), sayAfter: it.jp, sol };
  } else if (it.kind === 'kanji') {
    const pool = kanjiPool(); const sol = kanjiSol(it);
    if (stage === 0) q = { type: 'mcq', prompt: 'Cosa significa questo kanji?', big: it.k, bigKind: 'glyph', options: options(it.it, pool.map(x => x.it)), answer: it.it, sol };
    else if (stage === 1) q = Math.random() < 0.5
      ? { type: 'mcq', prompt: 'Quale kanji significa «' + it.it + '»?', options: options(it.k, pool.map(x => x.k)), optKind: 'g', answer: it.k, sol }
      : { type: 'mcq', prompt: 'Qual è la lettura kun di questo kanji?', big: it.k, bigKind: 'glyph', options: options(it.kun[0], pool.filter(x => x.kun[0] !== it.kun[0]).map(x => x.kun[0])), optKind: 'jp', answer: it.kun[0], sayAfter: readingForms(it.kun[0])[0], sol };
    else if (opt.trace === true || (opt.trace !== false && hasStrokes(it.k) && Math.random() < 0.35)) q = traceQ(it.k, it.it, !!opt.guided, sol);
    else q = { type: 'kana', prompt: 'Scrivi una lettura di questo kanji', sub: 'va bene sia on sia kun', big: it.k, bigKind: 'glyph', answers: kanjiReadings(it).flatMap(readingForms), answer: kanjiReadings(it).join('・'), sol };
  } else if (it.kind === 'grammar') {
    const T = grammarTemplates(it).filter(t => !(opt.used && opt.used.has(t.tid)));
    if (!T.length) return null;
    let cand = T.filter(t => t.stage === stage);
    if (!cand.length) cand = T.filter(t => Math.abs(t.stage - stage) === 1);
    if (!cand.length) cand = T;
    const t = pickOne(cand);
    if (opt.used) opt.used.add(t.tid);
    q = Object.assign(t.make(), { tid: t.tid, stage: t.stage });
  }
  if (!q) return null;
  q.item = it.id; q.stage = q.stage != null ? q.stage : stage; q.level = lv; q.tid = q.tid || it.id + '#' + stage;
  return q;
}

/* ============================== sessioni ============================== */
function lessonItems(le) { return le.itemIds.map(item); }
function buildPractice(le) {
  const its = lessonItems(le); const used = new Set();
  const plain = its.filter(i => i.kind !== 'grammar'), gram = its.filter(i => i.kind === 'grammar');
  const A = shuffle(plain).map(i => makeQ(i, 0));
  const traceable = plain.filter(i => (i.kind === 'kana' || i.kind === 'kanji') && hasStrokes(i.k));
  const TR = shuffle(traceable).slice(0, 6).map(i => makeQ(i, 2, { trace: true, guided: true }));
  const M = plain.length >= 4 ? [matchQ(plain)] : [];
  const B = [];
  gram.forEach(g => { for (let k = 0; k < 4; k++) { const q = makeQ(g, k < 1 ? 0 : k < 3 ? 1 : 2, { used }); if (q) B.push(q); } });
  shuffle(plain).forEach(i => B.push(makeQ(i, 1)));
  const C = shuffle(plain).slice(0, 3).map(i => makeQ(i, 2, { trace: false }));
  const cap = Math.max(30, A.length) + TR.length + M.length;
  // ordine: riconoscimento, abbinamento, ricalco guidato, poi richiamo e produzione
  const rest = shuffle(B).concat(C);
  return A.concat(M, TR, rest).filter(Boolean).slice(0, cap);
}
function buildVerify(le) {
  const its = lessonItems(le); const used = new Set(); const qs = [];
  its.forEach(i => {
    if (i.kind === 'grammar') { [1, 2].forEach(st => { const q = makeQ(i, st, { used, noListen: true }); if (q) qs.push(q); }); }
    else if (i.kind === 'word' && i.role === 'read') qs.push(makeQ(i, pickOne([1, 2]), { noListen: true }));
    else qs.push(makeQ(i, pickOne([1, 2]), { noListen: true }));
  });
  return shuffle(qs.filter(Boolean));
}
function sampleAcross(groups, n) {
  // prende n elementi distribuendoli tra i gruppi (per esempio le lezioni di un capitolo)
  const G = groups.map(g => shuffle(g)); const out = [];
  let r = 0;
  while (out.length < n && G.some(g => g.length > r)) { for (const g of G) { if (g[r] && out.length < n) out.push(g[r]); } r++; }
  return out;
}
function buildChapter(ch) {
  const used = new Set();
  const picked = sampleAcross(ch.lessons.map(lessonItems), 30);
  return shuffle(picked.map(i => makeQ(i, i.kind === 'grammar' ? pickOne([1, 2]) : pickOne([1, 2, 2]), { used, noListen: true })).filter(Boolean));
}
function buildExam(l) {
  const used = new Set(); const n = (l.exam && l.exam.n) || 30;
  const picked = sampleAcross(l.chapters.flatMap(ch => ch.lessons.map(lessonItems)), n);
  return shuffle(picked.map(i => makeQ(i, Math.random() < 0.6 ? 2 : 1, { used, noListen: true })).filter(Boolean));
}
function buildReview() {
  const ids = dueIds().slice(0, S.settings.reviewMax); const used = new Set();
  return shuffle(ids.map(id => makeQ(item(id), stageForCard(card(id)), { used })).filter(Boolean));
}
function placementGroup(le) {
  const used = new Set();
  const its = shuffle(lessonItems(le));
  const qs = [];
  for (const i of its) {
    if (qs.length >= 3) break;
    const st = i.kind === 'word' && i.role === 'read' ? 0 : 1;
    const q = makeQ(i, st, { used, noListen: true });
    if (q && q.type === 'mcq') qs.push(q);
  }
  return qs;
}

let SES = null; // sessione in corso
function startSession(kind, ctx = {}) {
  let qs, title;
  if (kind === 'practice') { qs = buildPractice(ctx.le); title = 'Esercizi guidati · ' + ctx.le.title; }
  else if (kind === 'verify') { qs = buildVerify(ctx.le); title = 'Verifica · ' + ctx.le.title; }
  else if (kind === 'chapter') { qs = buildChapter(ctx.ch); title = 'Test di capitolo · ' + ctx.ch.title; }
  else if (kind === 'exam') { qs = buildExam(ctx.level); title = 'Esame · ' + ctx.level.code; }
  else if (kind === 'review') { qs = buildReview(); title = 'Ripasso'; if (!qs.length) { toast('Non ci sono ripassi in scadenza.'); return; } }
  else if (kind === 'placement') {
    const lessons = IDX.lessons.filter(le => !le.level.soon);
    SES = { kind, title: 'Test d\'ingresso', lessons, g: 0, groupStart: 0, qs: placementGroup(lessons[0]), i: 0, results: [], t0: now() };
    go({ screen: 'session' }); return;
  }
  SES = { kind, title, qs, i: 0, results: [], ctx, total: qs.length, t0: now() };
  go({ screen: 'session' });
}
function requeue(q) {
  if ((q.retry || 0) >= 2) return;
  const copy = Object.assign({}, q, { retry: (q.retry || 0) + 1, _st: null });
  if (q.type === 'mcq') copy.options = shuffle(q.options);
  if (q.type === 'build') copy.bank = shuffle(q.bank);
  SES.qs.push(copy);
}
function grade(q, ok) {
  const ms = Math.min(90000, now() - (q._shown || now()));
  logToday(ok, ms);
  const first = !q.retry;
  if (SES.kind !== 'placement') SES.results.push({ q, ok, first });
  SES.combo = ok ? (SES.combo || 0) + 1 : 0;
  if (q.type === 'match') { (q._st.itemOk || []).forEach(([id, iok]) => count(id, iok)); save(); return; }
  count(q.item, ok);
  if (first) {
    if (SES.kind === 'review') schedule(q.item, ok);
    else if ((SES.kind === 'chapter' || SES.kind === 'exam') && inSRS(card(q.item))) schedule(q.item, ok);
  }
  if (!ok && (SES.kind === 'practice' || SES.kind === 'review')) requeue(q);
  save();
}
function scoreOf(results) { const f = results.filter(r => r.first); return f.length ? Math.round(f.filter(r => r.ok).length / f.length * 100) : 0; }
function finishSession() {
  const s = SES; const p = prog(); const pct = scoreOf(s.results);
  const res = { kind: s.kind, pct, results: s.results, ctx: s.ctx, title: s.title, introduced: 0 };
  if (s.kind === 'practice') {
    const L = p.lessons[s.ctx.le.id] || (p.lessons[s.ctx.le.id] = {}); L.practice = true; res.passed = true;
  } else if (s.kind === 'verify') {
    res.passed = pct >= 80;
    if (res.passed) {
      const L = p.lessons[s.ctx.le.id] || (p.lessons[s.ctx.le.id] = {}); L.practice = true;
      L.best = typeof L.best === 'number' ? Math.max(L.best, pct) : pct;
      const wrong = new Set(s.results.filter(r => !r.ok).map(r => r.q.item));
      s.ctx.le.itemIds.forEach(id => { if (!inSRS(card(id))) { introduce(id, { dueNow: wrong.has(id) }); res.introduced++; } });
    }
  } else if (s.kind === 'chapter') {
    res.passed = pct >= 80; if (res.passed) p.chapters[s.ctx.ch.id] = typeof p.chapters[s.ctx.ch.id] === 'number' ? Math.max(p.chapters[s.ctx.ch.id], pct) : pct;
  } else if (s.kind === 'exam') {
    const need = Math.round(((s.ctx.level.exam && s.ctx.level.exam.pass) || 0.8) * 100);
    res.passed = pct >= need; res.need = need;
    if (res.passed) p.exams[s.ctx.level.id] = typeof p.exams[s.ctx.level.id] === 'number' ? Math.max(p.exams[s.ctx.level.id], pct) : pct;
  } else if (s.kind === 'review') { res.passed = true; }
  save();
  SES = null;
  go({ screen: 'result', res });
}
function finishPlacement(stoppedAt) {
  const s = SES; const p = prog();
  const passedLessons = s.lessons.slice(0, stoppedAt);
  passedLessons.forEach(le => {
    const L = p.lessons[le.id] || (p.lessons[le.id] = {}); if (L.best == null) { L.best = 'P'; L.practice = true; }
    le.itemIds.forEach(id => introduce(id, { ivl: 2, reps: 1 }));
  });
  IDX.chapters.forEach(ch => { if (ch.lessons.every(passedLesson) && p.chapters[ch.id] == null) p.chapters[ch.id] = 'P'; });
  IDX.levels.forEach(l => { if (!l.soon && l.chapters.length && l.chapters.every(passedChapter) && p.exams[l.id] == null) p.exams[l.id] = 'P'; });
  p.placed = true; save();
  const target = s.lessons[stoppedAt] || null;
  SES = null;
  go({ screen: 'result', res: { kind: 'placement', reached: passedLessons.length, target } });
}

/* ============================== interfaccia: struttura ============================== */
let VIEW = { screen: 'today' };
function go(v) { VIEW = v; render(); window.scrollTo(0, 0); }
const TABS = [
  ['today', 'Oggi', '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'],
  ['path', 'Percorso', '<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="12" r="2.2"/><circle cx="6" cy="18" r="2.2"/><path d="M8 6.8 15.9 11M15.9 13 8 17.2"/>'],
  ['stats', 'Progressi', '<path d="M5 20V11M12 20V5M19 20v-6"/>'],
  ['settings', 'Impostazioni', '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>']
];
function shell(inner, active) {
  return `<div class="page"><main class="wrap">${inner}</main></div>
  <nav class="tabbar" aria-label="Sezioni">${TABS.map(([id, label, icon]) => `<button class="tab ${active === id ? 'on' : ''}" data-tab="${id}" ${active === id ? 'aria-current="page"' : ''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg><span>${label}</span></button>`).join('')}</nav>`;
}
function bindShell() { $app.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => go({ screen: b.dataset.tab })); }
function bindSay(root = $app) { root.querySelectorAll('[data-say]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); speak(b.dataset.say); })); }
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2200); setTimeout(() => t.remove(), 2600);
}
const ICON_SAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

function render() {
  document.onkeydown = null;
  if (!IDX) return;
  if (!prog().placed && !['session', 'result', 'settings'].includes(VIEW.screen)) return renderWelcome();
  const f = { today: renderToday, path: renderPath, stats: renderStats, settings: renderSettings, lesson: renderLesson, session: renderSession, result: renderResult }[VIEW.screen];
  (f || renderToday)();
}

/* ============================== benvenuto ============================== */
function renderWelcome() {
  $app.innerHTML = `<div class="page"><main class="wrap"><section class="welcome">
    <div class="hero-g">${esc(COURSE.native)}</div>
    <div><span class="eyebrow">Corso di ${esc(COURSE.name.toLowerCase())}</span>
    <h1>Un corso completo, dalle basi alla certificazione</h1>
    <p class="lead">Si parte dai due alfabeti e si seguono i livelli JLPT, da N5 a N1. Ogni lezione ha un obiettivo, una spiegazione, esercizi guidati e una verifica: la superi con almeno l'80%. Ogni capitolo si chiude con un test, ogni livello con un esame. Quello che impari torna nei ripassi, a intervalli sempre più lunghi.</p></div>
    <button class="choice" id="zero"><b>Parto da zero</b><span>Comincio dalle cinque vocali hiragana.</span></button>
    <button class="choice" id="test"><b>Ho già qualche base: test d'ingresso</b><span>Tre domande per lezione. Mi fermo alla prima lezione che non superi e ti colloco lì.</span></button>
  </section></main></div>`;
  document.getElementById('zero').onclick = () => { prog().placed = true; save(); go({ screen: 'today' }); };
  document.getElementById('test').onclick = () => startSession('placement');
}

/* ============================== oggi ============================== */
function stepInfo(st) {
  if (!st) return null;
  if (st.kind === 'lesson') { const le = st.le; const n = le.chapter.lessons.indexOf(le) + 1; return { label: practiced(le) ? 'Verifica della lezione' : 'Prossima lezione', title: le.title, where: `${le.level.code} · ${le.chapter.title} · lezione ${n} di ${le.chapter.lessons.length}`, go: () => go({ screen: 'lesson', id: le.id }), glyph: le.glyph }; }
  if (st.kind === 'chapter') return { label: 'Test di capitolo', title: st.ch.title, where: `${st.ch.level.code} · ${st.ch.lessons.length} lezioni · soglia 80%`, go: () => startSession('chapter', { ch: st.ch }), glyph: '章' };
  return { label: 'Esame di livello', title: st.level.code + ' · ' + st.level.title, where: `${(st.level.exam && st.level.exam.n) || 30} domande · soglia ${Math.round(((st.level.exam && st.level.exam.pass) || 0.8) * 100)}%`, go: () => startSession('exam', { level: st.level }), glyph: '試験' };
}
function relDue(t) {
  const d = Math.round((startOfDay(t) - startOfDay()) / DAY);
  if (t <= now()) return 'adesso';
  if (d <= 0) { const m = Math.max(1, Math.round((t - now()) / 60000)); return m < 60 ? 'tra ' + m + ' min' : 'più tardi oggi'; }
  if (d === 1) return 'domani'; return 'tra ' + d + ' giorni';
}
function renderToday() {
  const due = dueIds(); const p = prog();
  const future = Object.values(p.cards).filter(c => inSRS(c) && c.due > now()).map(c => c.due).sort((a, b) => a - b);
  const st = stepInfo(nextStep());
  const d = new Date(now());
  const min = minutesOn(dayKey()); const goal = S.settings.goalMin; const today = S.log[dayKey()] || { n: 0, ok: 0 };
  const week = []; for (let i = 6; i >= 0; i--) { const t = addDays(now(), -i); week.push({ k: dayKey(t), m: minutesOn(dayKey(t)), l: GIORNI[new Date(t).getDay()][0].toUpperCase(), today: i === 0 }); }
  const wmax = Math.max(goal, ...week.map(w => w.m));
  const learned = Object.values(p.cards).filter(inSRS).length;
  const revMin = Math.max(1, Math.round(Math.min(due.length, S.settings.reviewMax) * 8 / 60));
  $app.innerHTML = shell(`
    <header class="today-head"><span class="eyebrow">${GIORNI[d.getDay()]} ${d.getDate()} ${MESI[d.getMonth()]}</span><h1>Oggi</h1></header>
    <section class="panel review-panel ${due.length ? 'hot' : ''}">
      <div class="rp-num">${due.length}</div>
      <div class="rp-body"><b>${due.length ? (due.length === 1 ? 'ripasso in scadenza' : 'ripassi in scadenza') : 'Sei in pari con i ripassi'}</b>
      <span>${due.length ? `circa ${revMin} min${due.length > S.settings.reviewMax ? ` · ${S.settings.reviewMax} per sessione` : ''}` : learned ? 'Prossimo ripasso ' + relDue(future[0]) : 'Gli elementi entrano nei ripassi quando superi una lezione.'}</span></div>
      ${due.length ? '<button class="btn" id="rev">Ripassa</button>' : ''}
    </section>
    ${st ? `<section class="panel next-panel"><div class="np-g">${esc(st.glyph)}</div><div class="np-body"><span class="eyebrow">${esc(st.label)}</span><b>${esc(st.title)}</b><span>${esc(st.where)}</span></div><button class="btn ${due.length ? 'ghost' : ''}" id="next">Vai</button></section>`
      : `<section class="panel"><b>Hai completato tutto il materiale disponibile.</b><p class="muted">I prossimi livelli sono in preparazione. Intanto i ripassi mantengono vivo quello che hai imparato.</p></section>`}
    <section class="panel goal">
      <div class="goal-top"><div><span class="eyebrow">Obiettivo di oggi</span><b class="num">${min} <small>/ ${goal} min</small></b></div>
      <div class="goal-side"><span><b class="num">${streak()}</b> ${streak() === 1 ? 'giorno' : 'giorni'} di fila</span><span>${today.n ? Math.round(today.ok / today.n * 100) + '% di risposte giuste oggi' : 'Nessuna risposta ancora oggi'}</span></div></div>
      <div class="meter"><i style="width:${clamp(min / goal * 100, 0, 100)}%"></i></div>
      <div class="week" aria-label="Minuti di studio negli ultimi 7 giorni">${week.map(w => `<div class="wd ${w.today ? 'now' : ''}" title="${w.m} min"><div class="wb"><i style="height:${w.m ? Math.max(6, w.m / wmax * 100) : 0}%"></i></div><span>${w.l}</span></div>`).join('')}</div>
    </section>`, 'today');
  bindShell();
  const r = document.getElementById('rev'); if (r) r.onclick = () => startSession('review');
  const n = document.getElementById('next'); if (n) n.onclick = st.go;
}

/* ============================== percorso ============================== */
function renderPath() {
  const p = prog(); const ns = nextStep();
  const lv = IDX.levels.map(l => {
    if (l.soon) return `<section class="level"><div class="lvl-head"><span class="eyebrow">${esc(l.code)}</span><h2>${esc(l.title)}</h2><span class="count">—<small>in preparazione</small></span></div><div class="soon">I contenuti di questo livello arriveranno nei prossimi aggiornamenti.</div></section>`;
    const all = l.chapters.flatMap(c => c.lessons); const done = all.filter(passedLesson).length;
    const chs = l.chapters.map(ch => {
      const rows = ch.lessons.map((le, i) => {
        const pd = passedLesson(le), un = lessonUnlocked(le), cur = ns && ns.kind === 'lesson' && ns.le === le;
        const b = p.lessons[le.id] && p.lessons[le.id].best;
        const n = le.itemIds.length;
        const meta = [le.script || (le.kanji ? 'Kanji' : 'Grammatica e lessico'), n + ' elementi', pd ? (b === 'P' ? 'superata al test d\'ingresso' : 'verifica ' + b + '%') : practiced(le) ? 'esercizi fatti, manca la verifica' : null].filter(Boolean).join(' · ');
        return `<li class="u ${pd ? 'done' : cur ? 'current' : un ? '' : 'locked'}"><button data-lesson="${le.id}" ${un ? '' : 'aria-disabled="true"'}><span class="node">${pd ? '✓' : i + 1}</span><span><span class="u-title">${esc(le.title)}</span><span class="u-meta">${esc(meta)}</span></span><span class="u-glyph">${esc(le.glyph)}</span></button></li>`;
      }).join('');
      const cp = passedChapter(ch), cu = chapterUnlocked(ch), cb = p.chapters[ch.id];
      const test = `<li class="u test ${cp ? 'done' : cu ? 'current' : 'locked'}"><button data-chapter="${ch.id}" ${cu ? '' : 'aria-disabled="true"'}><span class="node">${cp ? '✓' : '章'}</span><span><span class="u-title">Test di capitolo</span><span class="u-meta">${cp ? (cb === 'P' ? 'superato al test d\'ingresso' : 'superato con ' + cb + '%') : 'tutte le lezioni del capitolo · soglia 80%'}</span></span><span class="u-glyph"></span></button></li>`;
      return `<div class="chapter"><h3 class="ch-title">${esc(ch.title)}</h3><ol class="path">${rows}${test}</ol></div>`;
    }).join('');
    const ep = passedExam(l), eu = examUnlocked(l), eb = p.exams[l.id];
    const exam = `<ol class="path"><li class="u exam ${ep ? 'done' : eu ? 'current' : 'locked'}"><button data-exam="${l.id}" ${eu ? '' : 'aria-disabled="true"'}><span class="node">${ep ? '✓' : '試験'}</span><span><span class="u-title">Esame di livello${l.exam && l.exam.provisional ? ' (provvisorio)' : ''}</span><span class="u-meta">${ep ? (eb === 'P' ? 'superato al test d\'ingresso' : 'superato con ' + eb + '%') : ((l.exam && l.exam.n) || 30) + ' domande su tutto il livello · soglia 80%'}</span></span><span class="u-glyph"></span></button></li></ol>`;
    return `<section class="level"><div class="lvl-head"><span class="eyebrow">${esc(l.code)}</span><h2>${esc(l.title)}</h2><span class="count num">${done}/${all.length}<small>lezioni</small></span><p>${esc(l.desc || '')}</p><div class="meter"><i style="width:${all.length ? Math.round(done / all.length * 100) : 0}%"></i></div></div>${chs}${exam}</section>`;
  }).join('');
  $app.innerHTML = shell(`<header class="page-head"><span class="eyebrow">${esc(COURSE.native)}</span><h1>Percorso</h1></header>${lv}`, 'path');
  bindShell();
  $app.querySelectorAll('[data-lesson]').forEach(b => b.onclick = () => { const le = IDX.lessons.find(x => x.id === b.dataset.lesson); if (lessonUnlocked(le)) go({ screen: 'lesson', id: le.id }); else toast('Supera prima la lezione o il test precedente.'); });
  $app.querySelectorAll('[data-chapter]').forEach(b => b.onclick = () => { const ch = IDX.chapters.find(x => x.id === b.dataset.chapter); if (chapterUnlocked(ch)) startSession('chapter', { ch }); else toast('Il test si sblocca quando superi tutte le lezioni del capitolo.'); });
  $app.querySelectorAll('[data-exam]').forEach(b => b.onclick = () => { const l = IDX.levels.find(x => x.id === b.dataset.exam); if (examUnlocked(l)) startSession('exam', { level: l }); else toast('L\'esame si sblocca quando superi tutti i test di capitolo.'); });
}

/* ============================== lezione ============================== */
function renderLesson() {
  const le = IDX.lessons.find(x => x.id === VIEW.id); if (!le) return go({ screen: 'path' });
  const L = prog().lessons[le.id] || {}; const pr = practiced(le), pd = passedLesson(le);
  const ro = showRomaji(le.level);
  const n = le.chapter.lessons.indexOf(le) + 1;
  let blocks = '';
  if (le.grammar && le.grammar.length) blocks += `<div class="box"><h3>Schemi grammaticali</h3><div class="gram">${le.grammar.map(g => `<div class="gp"><span class="jp">${esc(g.title)}</span><span>${esc(g.it)}</span></div>`).join('')}</div></div>`;
  if (le.kana) blocks += `<div class="box"><h3>Caratteri · tocca per ascoltare e vedere come si scrive</h3><div class="grid-k">${le.kana.map(k => `<button class="kcell" data-char="${esc(k.k)}" data-label="${esc(k.r)}" data-sayt="${esc(k.k)}"><span class="g">${esc(k.k)}</span><span class="r">${esc(k.r)}</span></button>`).join('')}</div></div>`;
  if (le.kanji) blocks += `<div class="box"><h3>Kanji · tocca per ascoltare e vedere come si scrive</h3><div class="grid-j">${le.kanji.map(k => `<button class="jcell" data-char="${esc(k.k)}" data-label="${esc(k.it)}" data-sayt="${esc(readingForms(k.kun[0])[1])}"><span class="g">${esc(k.k)}</span><span class="m">${esc(k.it)}</span><span class="r"><i>on</i> ${esc(k.on.join('・'))}</span><span class="r"><i>kun</i> ${esc(k.kun.join('・'))}</span></button>`).join('')}</div></div>`;
  const romaToggle = ro ? '' : '<button class="linkish small" data-roma>Mostra romaji</button>';
  if (le.words) blocks += `<div class="box ${ro ? '' : 'hide-ro'}"><div class="box-h"><h3>${le.words[0].role === 'read' ? 'Parole da leggere' : 'Vocabolario'}</h3>${romaToggle}</div><div class="rows">${le.words.map(w => `<button class="row" data-say="${esc(w.jp)}"><span><span class="j">${esc(w.jp)}</span><span class="ro">${esc(w.r)}</span></span><span class="it">${esc(w.it)}</span></button>`).join('')}</div></div>`;
  if (le.sentences && le.sentences.length && !le.sentences[0].build) blocks += `<div class="box ${ro ? '' : 'hide-ro'}"><div class="box-h"><h3>Esempi</h3>${romaToggle}</div><div class="rows">${le.sentences.map(s => `<button class="row" data-say="${esc(s.jp)}"><span><span class="j">${esc(s.jp)}</span><span class="ro">${esc(s.r)}</span></span><span class="it">${esc(s.it)}</span></button>`).join('')}</div></div>`;
  $app.innerHTML = shell(`
    <button class="back" id="back">← Percorso</button>
    <div class="t-head"><span class="eyebrow">${esc(le.level.code)} · ${esc(le.chapter.title)} · lezione ${n} di ${le.chapter.lessons.length}</span><h1>${esc(le.title)}</h1><div class="big">${esc(le.glyph)}</div></div>
    <div class="goalbox"><span class="eyebrow">Obiettivo</span><p>${esc(le.goal)}</p></div>
    <div class="prose"><h2 class="sec">Spiegazione</h2>${le.theory.map(p => `<p>${p}</p>`).join('')}</div>
    ${blocks}
    <h2 class="sec">Attività</h2>
    <ol class="steps">
      <li class="step ${pr ? 'done' : 'current'}"><span class="node">${pr ? '✓' : '1'}</span><div><b>Esercizi guidati</b><span>Dal riconoscimento alla produzione. Gli errori tornano finché non li correggi. Non danno voto.</span></div><button class="btn ${pr ? 'ghost' : ''}" id="practice">${pr ? 'Ripeti' : 'Inizia'}</button></li>
      <li class="step ${pd ? 'done' : pr ? 'current' : 'locked'}"><span class="node">${pd ? '✓' : '2'}</span><div><b>Verifica</b><span>${pd ? (L.best === 'P' ? 'Superata al test d\'ingresso.' : 'Superata con ' + L.best + '%.') : 'Una domanda su ogni elemento della lezione. Serve almeno l\'80%.'}${pd ? '' : ' Supera la verifica e gli elementi entrano nei ripassi.'}</span></div><button class="btn ${pd ? 'ghost' : ''}" id="verify" ${pr || pd ? '' : 'disabled'}>${pd ? 'Ripeti' : 'Inizia'}</button></li>
      <li class="step locked"><span class="node">3</span><div><b>Pronuncia</b><span>Ripetizione con valutazione automatica: arriva con il collegamento ad Azure.</span></div><button class="btn ghost" disabled>Presto</button></li>
    </ol>`, 'path');
  bindShell(); bindSay();
  $app.querySelectorAll('[data-char]').forEach(b => b.onclick = () => { if (hasStrokes(b.dataset.char)) openStrokes(b.dataset.char, b.dataset.label, b.dataset.sayt); else speak(b.dataset.sayt); });
  document.getElementById('back').onclick = () => go({ screen: 'path' });
  document.getElementById('practice').onclick = () => startSession('practice', { le });
  document.getElementById('verify').onclick = () => { if (pr || pd) startSession('verify', { le }); };
  $app.querySelectorAll('[data-roma]').forEach(b => b.onclick = () => { const box = b.closest('.box'); box.classList.toggle('hide-ro'); b.textContent = box.classList.contains('hide-ro') ? 'Mostra romaji' : 'Nascondi romaji'; });
}

/* ============================== sessione ============================== */
function renderSession() {
  const s = SES; if (!s) return go({ screen: 'today' });
  const q = s.qs[s.i]; if (!q) return s.kind === 'placement' ? finishPlacement(s.lessons.length) : finishSession();
  q._st = q._st || { sel: null, built: [], typed: '', checked: false, right: false, showR: false };
  if (!q._shown) q._shown = now();
  const st = q._st;
  let pct, count = '';
  if (s.kind === 'placement') { pct = Math.round(s.g / s.lessons.length * 100); count = 'lezione ' + (s.g + 1) + '/' + s.lessons.length; }
  else if (s.kind === 'practice' || s.kind === 'review') { const done = s.results.filter(r => r.ok).length; const tot = s.total; pct = Math.round(Math.min(done, tot) / tot * 100); count = Math.min(done, tot) + '/' + tot; }
  else { pct = Math.round(s.i / s.qs.length * 100); count = (s.i + 1) + '/' + s.qs.length; }
  const ro = showRomaji(q.level);
  let stage = '';
  if (q.audioOnly) stage = `<div class="stage"><button class="say lg" data-say="${esc(q.audioOnly)}" aria-label="Riascolta">${ICON_SAY}</button></div>`;
  else if (q.big) {
    const body = q.bigKind === 'sent' ? `<span class="sent">${esc(q.big).replace('＿', '<span class="blank"></span>')}</span>` : q.bigKind === 'word' ? `<span class="word">${esc(q.big)}</span>` : `<span class="glyph">${esc(q.big)}</span>`;
    const rr = q.romaji ? (ro || st.showR ? `<span class="stage-ro">${esc(q.romaji)}</span>` : `<button class="linkish small" id="showr">Mostra lettura</button>`) : '';
    stage = `<div class="stage"><div class="stage-main">${body}${q.say ? `<button class="say" data-say="${esc(q.say)}" aria-label="Ascolta">${ICON_SAY}</button>` : ''}</div>${rr}</div>`;
  }
  let body = '';
  if (q.type === 'mcq') {
    body = `<div class="opts ${q.long ? 'long' : ''} ${st.checked ? 'locked' : ''}">${q.options.map((o, i) => {
      let c = 'opt'; if (q.optKind === 'g') c += ' g'; if (q.optKind === 'jp') c += ' jp';
      if (st.checked) { if (o === q.answer) c += ' right'; else if (o === st.sel) c += ' wrong'; } else if (o === st.sel) c += ' sel';
      return `<button class="${c}" data-opt="${i}"><span class="n">${i + 1}</span><span>${esc(o)}</span></button>`;
    }).join('')}</div>`;
  } else if (q.type === 'roma') {
    body = `<input class="typein" id="typein" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="${esc(q.placeholder || '')}" value="${esc(st.typed)}" ${st.checked ? 'disabled' : ''}>`;
  } else if (q.type === 'kana') {
    const prev = inputToKana(st.typed, true);
    body = `<div class="kana-prev jp" id="kprev" aria-live="polite">${esc(q.kata && /[a-z]/i.test(st.typed) ? hiraToKata(prev) : prev) || '<span class="ph">…</span>'}</div>
      <input class="typein" id="typein" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="scrivi in romaji, es. neko" value="${esc(st.typed)}" ${st.checked ? 'disabled' : ''}>
      <p class="hint">Si trasforma in kana mentre scrivi. Doppia n per ん se serve (hon'ya, konnichiwa). Puoi usare anche la tastiera giapponese.</p>`;
  } else if (q.type === 'build') {
    body = `<div class="answer-line jp">${st.built.map((bi, k) => `<button class="tile" data-un="${k}">${esc(q.bank[bi])}</button>`).join('') || '<span class="ph">Tocca i blocchi nell\'ordine giusto</span>'}</div>
      <div class="bank jp">${q.bank.map((t, i) => `<button class="tile ${st.built.includes(i) ? 'used' : ''}" data-tile="${i}" ${st.checked ? 'disabled' : ''}>${esc(t)}</button>`).join('')}</div>`;
  }
  if (q.type === 'trace') {
    const strokes = STROKES[q.char]; const n = strokes.length;
    const showGhost = q.guided || st.helped || st.checked;
    body = `<div class="trace-wrap"><svg class="trace" id="trace" viewBox="0 0 109 109" role="img" aria-label="Riquadro di scrittura">
      <g class="grid"><line x1="54.5" y1="0" x2="54.5" y2="109"/><line x1="0" y1="54.5" x2="109" y2="54.5"/></g>
      <g class="ghost">${showGhost ? strokeSVG(q.char) : ''}</g>
      <g class="ink" id="tink">${(STROKES[q.char] || []).slice(0, st.idx || 0).map(d => `<path d="${d}"/>`).join('')}</g>
      <g class="hint" id="thint"></g>
      <polyline id="live" class="live" points=""/></svg></div>
      <div class="trace-info"><span id="tmsg" class="${st.msgBad ? 'bad' : ''}">${esc(st.msg || (st.checked ? '' : 'Tratto ' + ((st.idx || 0) + 1) + ' di ' + n))}</span>
      ${st.checked ? '' : `<div class="cta-row center">${q.guided ? '<button class="btn ghost" id="tdemo">Mostra l\'ordine</button>' : `<button class="btn ghost" id="thelp" ${st.helped ? 'disabled' : ''}>Aiuto</button>`}<button class="btn ghost" id="treset">Ricomincia</button></div>`}</div>`;
  } else if (q.type === 'match') {
    const M = st.m || (st.m = { L: null, R: null, done: [], errs: [], flash: null });
    const tile = (side, i) => { const p = q.pairs[i]; const done = M.done.includes(i); const sel = M[side] === i; const bad = M.flash && M.flash[side] === i;
      return `<button class="mt ${side === 'L' && p.lk === 'g' ? 'g' : side === 'L' ? 'jp' : ''} ${done ? 'done' : ''} ${sel ? 'sel' : ''} ${bad ? 'bad' : ''}" data-m="${side}${i}" ${done || st.checked ? 'disabled' : ''}>${esc(side === 'L' ? p.L : p.R)}</button>`; };
    body = `<div class="match"><div class="mcol">${q.Lord.map(i => tile('L', i)).join('')}</div><div class="mcol">${q.Rord.map(i => tile('R', i)).join('')}</div></div>`;
  }
  const auto = q.type === 'trace' || q.type === 'match';
  const can = q.type === 'mcq' ? st.sel != null : q.type === 'build' ? st.built.length > 0 : auto ? false : st.typed.trim() !== '';
  let foot;
  if (st.checked) {
    const solJp = q.sol && q.sol.jp ? `<span class="jp">${esc(q.sol.jp)}</span>` : '';
    const solR = q.sol && q.sol.r ? (ro || q.type === 'roma' || q.item.startsWith('k:') || q.item.startsWith('j:') ? ` <span class="sol-r">${esc(q.sol.r)}</span>` : ` <details class="sol-rd"><summary>lettura</summary>${esc(q.sol.r)}</details>`) : '';
    const solIt = q.sol && q.sol.it ? ` · ${esc(q.sol.it)}` : '';
    const right = q.type === 'build' ? q.tokens.join(' ') : q.type === 'trace' ? q.char : q.type === 'match' ? '' : q.answer;
    const combo = st.right && SES.combo >= 3 ? `<span class="combo">${SES.combo} di fila</span>` : '';
    const traceNote = q.type === 'trace' ? `<div class="ex">${st.helped ? 'Hai usato l\'aiuto: conta come da ripassare.' : (st.mistakes || 0) === 0 ? 'Tutti i tratti giusti al primo colpo.' : (st.mistakes) + (st.mistakes === 1 ? ' tratto da rifare.' : ' tratti da rifare.')}</div>` : '';
    const matchNote = q.type === 'match' ? `<div class="ex">${(st.m.errs.length ? 'Abbinamenti sbagliati: ' + st.m.errs.length + '.' : 'Nessun errore.')}</div>` : '';
    foot = `<div class="fb ${st.right ? 'ok' : 'no'}" role="status"><b>${st.right ? pickOne(['Corretto', 'Esatto', 'Giusto']) : 'Non è corretto'}${combo}</b>${traceNote}${matchNote}
      ${st.right || !right ? '' : `<div class="sol">Risposta giusta: <span class="jp">${esc(right)}</span></div>`}
      ${solJp || solIt ? `<div class="sol">${solJp}${solR}${solIt}</div>` : ''}
      ${q.explain ? `<div class="ex">${esc(q.explain)}</div>` : ''}
      ${!st.right && (s.kind === 'practice' || s.kind === 'review') && (q.retry || 0) < 2 ? '<div class="ex">La ritroverai più avanti in questa sessione.</div>' : ''}</div>
      <button class="btn wide ${st.right ? 'ok' : 'bad'}" id="next">Continua</button>`;
  } else {
    foot = auto ? `<p class="hint">${q.type === 'trace' ? (q.guided ? 'Scrivi col dito sopra il carattere grigio, un tratto alla volta.' : 'Scrivi il carattere col dito, un tratto alla volta, nell\'ordine giusto.') : 'Quando hai abbinato tutto, si passa avanti.'}</p><button class="btn wide" id="check" hidden>Verifica</button>`
      : `<button class="btn wide" id="check" ${can ? '' : 'disabled'}>Verifica</button><p class="hint keys">Invio per confermare${q.type === 'mcq' ? ' · tasti 1–4 per scegliere' : ''}</p>`;
  }
  const quitLabel = s.kind === 'placement' ? 'Termina il test qui' : 'Esci';
  $app.innerHTML = `<div class="page session"><main class="wrap">
    <div class="q-top"><button class="x" id="quit" aria-label="${quitLabel}">×</button><div class="bar"><i style="width:${pct}%"></i></div><span class="q-count num">${count}</span></div>
    <span class="q-mode">${esc(s.title)}${s.kind === 'placement' ? ' · ' + esc(s.lessons[s.g].title) : ''}${q.retry ? ' · di nuovo' : ''}</span>
    <h2 class="q-prompt">${esc(q.prompt)}</h2>${q.sub ? `<p class="q-sub">${esc(q.sub)}</p>` : ''}
    ${stage}${body}
    <div class="q-foot">${foot}</div>
    <div class="quit-confirm" id="qc" hidden><p>${s.kind === 'placement' ? 'Vuoi terminare il test qui? Verrai collocato alla lezione corrente.' : s.kind === 'practice' || s.kind === 'review' ? 'Vuoi uscire? Le risposte date finora sono già salvate.' : 'Vuoi uscire? Il test non verrà conteggiato.'}</p><div class="cta-row"><button class="btn bad" id="qyes">${s.kind === 'placement' ? 'Termina' : 'Esci'}</button><button class="btn ghost" id="qno">Continua</button></div></div>
  </main></div>`;
  bindSay();
  document.getElementById('quit').onclick = () => { document.getElementById('qc').hidden = false; };
  document.getElementById('qno').onclick = () => { document.getElementById('qc').hidden = true; };
  document.getElementById('qyes').onclick = () => { if (s.kind === 'placement') finishPlacement(s.g); else { SES = null; go({ screen: s.ctx && s.ctx.le ? 'lesson' : 'today', id: s.ctx && s.ctx.le && s.ctx.le.id }); } };
  const sr = document.getElementById('showr'); if (sr) sr.onclick = () => { st.showR = true; renderSession(); };
  if (!st.checked) {
    $app.querySelectorAll('[data-opt]').forEach(b => b.onclick = () => { st.sel = q.options[+b.dataset.opt]; renderSession(); });
    $app.querySelectorAll('[data-tile]').forEach(b => b.onclick = () => { const i = +b.dataset.tile; if (!st.built.includes(i)) { st.built.push(i); renderSession(); } });
    $app.querySelectorAll('[data-un]').forEach(b => b.onclick = () => { st.built.splice(+b.dataset.un, 1); renderSession(); });
    const ti = document.getElementById('typein');
    if (ti) {
      ti.focus(); ti.setSelectionRange(ti.value.length, ti.value.length);
      ti.oninput = () => {
        st.typed = ti.value; document.getElementById('check').disabled = !ti.value.trim();
        const kp = document.getElementById('kprev');
        if (kp) { const pv = inputToKana(ti.value, true); kp.textContent = q.kata && /[a-z]/i.test(ti.value) ? hiraToKata(pv) : pv; }
      };
    }
    document.getElementById('check').onclick = check;
    if (q.type === 'trace') bindTrace(q, st);
    if (q.type === 'match') bindMatch(q, st);
  } else {
    const nx = document.getElementById('next'); nx.onclick = advance; nx.focus();
  }
  if (q.audioOnly && !st.played) { st.played = true; setTimeout(() => speak(q.audioOnly), 250); }
  document.onkeydown = e => {
    if (!document.getElementById('qc').hidden) return;
    if (e.key === 'Enter') { e.preventDefault(); if (st.checked) advance(); else { const c = document.getElementById('check'); if (c && !c.disabled) check(); } }
    else if (!st.checked && q.type === 'mcq' && /^[1-4]$/.test(e.key)) { const o = q.options[+e.key - 1]; if (o != null) { st.sel = o; renderSession(); } }
  };
}
function bindTrace(q, st) {
  const svg = document.getElementById('trace'); if (!svg) return;
  const strokes = STROKES[q.char]; const n = strokes.length;
  st.idx = st.idx || 0; st.mistakes = st.mistakes || 0; st.miss = st.miss || {};
  const allowed = n <= 3 ? 1 : Math.floor(n / 3);
  const live = document.getElementById('live'), ink = document.getElementById('tink'), hint = document.getElementById('thint'), msg = document.getElementById('tmsg');
  const setMsg = (t, bad) => { st.msg = t; st.msgBad = !!bad; msg.textContent = t; msg.className = bad ? 'bad' : ''; };
  const showHint = i => { const p0 = samplePath(strokes[i]).pts[0]; hint.innerHTML = `<path d="${strokes[i]}" pathLength="1" class="anim" style="--d:0s"/><circle cx="${p0[0].toFixed(1)}" cy="${p0[1].toFixed(1)}" r="3.2"/>`; };
  let pts = null;
  const pos = e => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 109, (e.clientY - r.top) / r.height * 109]; };
  svg.addEventListener('pointerdown', e => { e.preventDefault(); try { svg.setPointerCapture(e.pointerId); } catch (_) { } audioCtx(); pts = [pos(e)]; live.classList.remove('bad'); live.setAttribute('points', pts[0].join(',')); });
  svg.addEventListener('pointermove', e => { if (!pts) return; e.preventDefault(); const p = pos(e), l = pts[pts.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.7) { pts.push(p); live.setAttribute('points', pts.map(x => x[0].toFixed(1) + ',' + x[1].toFixed(1)).join(' ')); } });
  const end = () => { if (!pts) return; const u = pts; pts = null; onStroke(u); };
  svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
  function onStroke(u) {
    const r = judgeStroke(u, q.char, st.idx);
    if (r.ok) {
      live.setAttribute('points', ''); hint.innerHTML = '';
      ink.insertAdjacentHTML('beforeend', `<path d="${strokes[st.idx]}"/>`);
      st.idx++; sfx('stroke');
      if (st.idx >= n) { st.traceOk = !st.helped && st.mistakes <= allowed; st.msg = ''; check(); return; }
      setMsg('Tratto ' + (st.idx + 1) + ' di ' + n);
    } else {
      if (r.why === 'short' && polyLen(u) < 1.5) { live.setAttribute('points', ''); return; }
      st.mistakes++; st.miss[st.idx] = (st.miss[st.idx] || 0) + 1;
      live.classList.add('bad'); setTimeout(() => { live.setAttribute('points', ''); live.classList.remove('bad'); }, 380);
      if (S.settings.sound !== 0) tone(233, 0, 0.12, 'triangle', 0.04);
      setMsg(r.why === 'dir' ? 'Direzione sbagliata: questo tratto va nel verso opposto.' : r.why === 'order' ? 'Quel tratto viene dopo: segui l\'ordine.' : r.why === 'again' ? 'Quel tratto l\'hai già fatto.' : 'Non corrisponde al tratto ' + (st.idx + 1) + '. Riprova.', true);
      if (st.miss[st.idx] >= 2 || (q.guided && st.miss[st.idx] >= 1)) showHint(st.idx);
    }
  }
  const demo = document.getElementById('tdemo'); if (demo) demo.onclick = () => { hint.innerHTML = ''; requestAnimationFrame(() => { hint.innerHTML = strokeSVG(q.char, { anim: true, from: st.idx }); }); };
  const help = document.getElementById('thelp'); if (help) help.onclick = () => { st.helped = true; renderSession(); };
  const reset = document.getElementById('treset'); if (reset) reset.onclick = () => { st.idx = 0; st.msg = ''; st.msgBad = false; renderSession(); };
}
function bindMatch(q, st) {
  const M = st.m;
  $app.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    const side = b.dataset.m[0], i = +b.dataset.m.slice(1);
    audioCtx(); M.flash = null; M[side] = M[side] === i ? null : i;
    if (M.L != null && M.R != null) {
      if (M.L === M.R) { M.done.push(M.L); sfx('pair'); if (q.pairs[M.L].lk === 'jp' || q.pairs[M.L].lk === 'g') speak(q.pairs[M.L].L); }
      else { if (!M.errs.includes(M.L)) M.errs.push(M.L); M.flash = { L: M.L, R: M.R }; if (S.settings.sound !== 0) tone(233, 0, 0.12, 'triangle', 0.04); }
      M.L = M.R = null;
    }
    if (M.done.length === q.pairs.length) { st.itemOk = q.pairs.map((p, k) => [p.id, !M.errs.includes(k)]); st.matchOk = M.errs.length <= 1; check(); return; }
    renderSession();
  });
}
function isRight(q, st) {
  if (q.type === 'mcq') return st.sel === q.answer;
  if (q.type === 'roma') return q.answers.map(normRoma).includes(normRoma(st.typed));
  if (q.type === 'kana') { const got = normKana(inputToKana(st.typed.trim(), true)); return q.answers.some(a => normKana(a) === got); }
  if (q.type === 'build') { const got = st.built.map(i => q.bank[i]).join('|'); return q.orders.some(o => o.join('|') === got); }
  if (q.type === 'trace') return !!st.traceOk;
  if (q.type === 'match') return !!st.matchOk;
  return false;
}
function check() {
  const q = SES.qs[SES.i], st = q._st;
  st.right = isRight(q, st); st.checked = true;
  grade(q, st.right);
  sfx(st.right ? 'ok' : 'bad');
  if (st.right && q.sayAfter) setTimeout(() => speak(q.sayAfter), 280);
  if (q.type === 'trace' && st.right && q.say) setTimeout(() => speak(q.say), 280);
  renderSession();
}
function advance() {
  const s = SES;
  if (s.kind === 'placement') {
    s.i++;
    if (s.i - s.groupStart >= s.qs.length - s.groupStart) {
      const grp = s.qs.slice(s.groupStart);
      const ok = grp.filter(x => x._st && x._st.right).length;
      if (ok < 2) return finishPlacement(s.g);
      s.g++;
      if (s.g >= s.lessons.length) return finishPlacement(s.lessons.length);
      s.groupStart = s.qs.length; s.qs.push(...placementGroup(s.lessons[s.g]));
    }
    renderSession(); window.scrollTo(0, 0); return;
  }
  s.i++; renderSession(); window.scrollTo(0, 0);
}

/* ============================== risultati ============================== */
function renderResult() {
  const r = VIEW.res;
  if (r.passed && (r.kind === 'verify' || r.kind === 'chapter' || r.kind === 'exam') && !r._played) { r._played = true; setTimeout(() => sfx('done'), 150); }
  if (r.kind === 'placement') {
    const t = r.target;
    $app.innerHTML = `<div class="page"><main class="wrap"><section class="result">
      <span class="eyebrow">Test d'ingresso</span>
      <h1>${r.reached === 0 ? 'Si parte dall\'inizio' : t ? 'Ti ho collocato qui' : 'Hai superato tutto il materiale disponibile'}</h1>
      <p class="lead center">${r.reached === 0 ? 'Il corso è costruito proprio per partire da zero.' : t ? `Hai superato ${r.reached} ${r.reached === 1 ? 'lezione' : 'lezioni'}. Riparti da <b>${esc(t.title)}</b> (${esc(t.level.code)}). Gli elementi delle lezioni superate entrano nei ripassi tra due giorni, così verifichi di conoscerli davvero.` : 'I prossimi livelli sono in preparazione.'}</p>
      <div class="cta-row center">${t ? '<button class="btn" id="goT">Vai alla lezione</button>' : ''}<button class="btn ghost" id="home">Vai a Oggi</button></div>
    </section></main></div>`;
    document.getElementById('home').onclick = () => go({ screen: 'today' });
    const g = document.getElementById('goT'); if (g) g.onclick = () => go({ screen: 'lesson', id: t.id });
    return;
  }
  const first = r.results.filter(x => x.first); const ok = first.filter(x => x.ok).length;
  const miss = uniq(first.filter(x => !x.ok).map(x => x.q)).slice(0, 30);
  const le = r.ctx && r.ctx.le;
  let heading, note = '', actions = '';
  if (r.kind === 'practice') { heading = 'Esercizi completati'; note = `Al primo tentativo: ${ok} giuste su ${first.length}. Ora puoi fare la verifica della lezione.`; actions = '<button class="btn" id="toVerify">Vai alla verifica</button><button class="btn ghost" id="toLesson">Torna alla lezione</button>'; }
  else if (r.kind === 'verify') {
    heading = r.passed ? 'Lezione superata' : 'Verifica non superata';
    note = r.passed ? `${r.introduced ? r.introduced + ' elementi entrano nei ripassi.' : ''} ${miss.length ? 'Quelli sbagliati te li ripropongo già oggi.' : ''}` : 'Serve almeno l\'80%. Rileggi la spiegazione e rifai gli esercizi guidati: le domande cambiano ogni volta.';
    const ns = nextStep();
    actions = r.passed ? (ns ? `<button class="btn" id="goNext">${ns.kind === 'lesson' ? 'Prossima lezione' : ns.kind === 'chapter' ? 'Test di capitolo' : 'Esame di livello'}</button>` : '') + '<button class="btn ghost" id="home">Vai a Oggi</button>' : '<button class="btn" id="toLesson">Torna alla lezione</button><button class="btn ghost" id="again">Riprova ora</button>';
  } else if (r.kind === 'chapter' || r.kind === 'exam') {
    heading = r.passed ? (r.kind === 'chapter' ? 'Capitolo superato' : 'Esame superato') : (r.kind === 'chapter' ? 'Test non superato' : 'Esame non superato');
    note = r.passed ? '' : `Serve almeno il ${r.need || 80}%. Ripassa gli elementi qui sotto e riprova.`;
    const ns = nextStep();
    actions = (r.passed && ns ? `<button class="btn" id="goNext">Continua il percorso</button>` : !r.passed ? '<button class="btn" id="again">Riprova</button>' : '') + '<button class="btn ghost" id="home">Vai a Oggi</button>';
  } else { heading = 'Ripasso completato'; note = dueIds().length ? `Restano ${dueIds().length} ripassi in scadenza.` : 'Sei in pari con i ripassi.'; actions = (dueIds().length ? '<button class="btn" id="more">Continua a ripassare</button>' : '') + '<button class="btn ghost" id="home">Vai a Oggi</button>'; }
  const stamp = r.kind === 'verify' || r.kind === 'chapter' || r.kind === 'exam' ? `<span class="stamp ${r.passed ? 'ok' : 'no'}">${r.passed ? '合格' : '不合格'}</span>` : '';
  $app.innerHTML = `<div class="page"><main class="wrap"><section class="result">
    <span class="eyebrow">${esc(r.title)}</span>
    ${r.kind === 'practice' || r.kind === 'review' ? '' : `<div class="score num">${r.pct}<small>%</small></div>`}
    <h1>${heading}</h1>${stamp}
    <p class="lead center">${r.kind === 'practice' || r.kind === 'review' ? '' : `${ok} risposte giuste su ${first.length}. `}${note}</p>
    <div class="cta-row center">${actions}</div>
    ${miss.length ? `<div class="mist"><span class="eyebrow">Da rivedere</span><ul>${miss.map(q => `<li><span class="q">${esc(q.prompt)}${q.big ? ' · ' + esc(q.big) : q.sub ? ' · ' + esc(q.sub) : ''}</span><span class="a jp">${esc(q.sol && q.sol.jp ? q.sol.jp : q.answer)}${q.sol && q.sol.it ? ' · ' + esc(q.sol.it) : ''}</span></li>`).join('')}</ul></div>` : ''}
  </section></main></div>`;
  const on = (id, f) => { const b = document.getElementById(id); if (b) b.onclick = f; };
  on('home', () => go({ screen: 'today' }));
  on('toLesson', () => go({ screen: 'lesson', id: le.id }));
  on('toVerify', () => startSession('verify', { le }));
  on('more', () => startSession('review'));
  on('again', () => startSession(r.kind, r.ctx));
  on('goNext', () => { const i = stepInfo(nextStep()); i && i.go(); });
}

/* ============================== progressi ============================== */
function renderStats() {
  const p = prog(); const cards = Object.entries(p.cards).filter(([id]) => item(id));
  const learned = cards.filter(([, c]) => inSRS(c)); const mature = learned.filter(([, c]) => c.ivl >= 21);
  const n = cards.reduce((a, [, c]) => a + c.n, 0), ok = cards.reduce((a, [, c]) => a + c.ok, 0);
  const totalMin = Math.round(Object.values(S.log).reduce((a, d) => a + d.ms, 0) / 60000);
  const fc = []; for (let i = 0; i < 7; i++) { const a = addDays(startOfDay(), i), b = addDays(startOfDay(), i + 1); fc.push({ l: i === 0 ? 'oggi' : GIORNI[new Date(a).getDay()].slice(0, 3), n: learned.filter(([, c]) => (i === 0 ? c.due < b : c.due >= a && c.due < b)).length }); }
  const fmax = Math.max(1, ...fc.map(x => x.n));
  const hard = cards.filter(([, c]) => c.n >= 2 && c.ok < c.n).map(([id, c]) => ({ it: item(id), c, acc: c.ok / c.n })).sort((a, b) => a.acc - b.acc || b.c.lapses - a.c.lapses).slice(0, 8);
  const levels = IDX.levels.filter(l => !l.soon).map(l => {
    const ls = l.chapters.flatMap(c => c.lessons); const ids = ls.flatMap(le => le.itemIds);
    const lr = ids.filter(id => inSRS(p.cards[id])).length;
    return `<div class="lv-row"><div><b>${esc(l.code)}</b><span>${esc(l.title)}</span></div><div class="lv-nums num"><span>${ls.filter(passedLesson).length}/${ls.length} lezioni</span><span>${l.chapters.filter(passedChapter).length}/${l.chapters.length} capitoli</span><span>${lr}/${ids.length} elementi</span><span>${passedExam(l) ? 'esame superato' : 'esame da fare'}</span></div><div class="meter"><i style="width:${ids.length ? lr / ids.length * 100 : 0}%"></i></div></div>`;
  }).join('');
  $app.innerHTML = shell(`<header class="page-head"><span class="eyebrow">${esc(COURSE.name)}</span><h1>Progressi</h1></header>
    <div class="kpis">
      <div class="kpi"><b class="num">${learned.length}</b><span>elementi in ripasso</span></div>
      <div class="kpi"><b class="num">${mature.length}</b><span>consolidati (intervallo ≥ 21 giorni)</span></div>
      <div class="kpi"><b class="num">${n ? Math.round(ok / n * 100) : 0}%</b><span>risposte giuste in totale</span></div>
      <div class="kpi"><b class="num">${totalMin}</b><span>minuti di studio · ${streak()} giorni di fila</span></div>
    </div>
    <section class="panel"><h3 class="ph3">Ripassi dei prossimi 7 giorni</h3>
      <div class="fc">${fc.map(x => `<div class="fcd"><span class="num">${x.n}</span><div class="wb"><i style="height:${x.n ? Math.max(6, x.n / fmax * 100) : 0}%"></i></div><span>${x.l}</span></div>`).join('')}</div></section>
    <section class="panel"><h3 class="ph3">Livelli</h3>${levels}</section>
    <section class="panel"><h3 class="ph3">Elementi più difficili</h3>${hard.length ? `<ul class="hard">${hard.map(h => `<li><span class="jp">${esc(itemLabel(h.it))}</span><span class="num">${Math.round(h.acc * 100)}% · ${h.c.n} risposte</span></li>`).join('')}</ul>` : '<p class="muted">Qui compariranno gli elementi su cui sbagli più spesso.</p>'}</section>`, 'stats');
  bindShell();
}

/* ============================== impostazioni ============================== */
function seg(name, cur, opts) { return `<div class="seg" role="radiogroup">${opts.map(([v, l]) => `<button role="radio" aria-checked="${String(v) === String(cur)}" class="${String(v) === String(cur) ? 'on' : ''}" data-set="${name}" data-v="${v}">${l}</button>`).join('')}</div>`; }
function syncStatus() {
  if (!Sync.cfg()) return 'Non collegato: i progressi restano solo su questo dispositivo. Collega il tuo server per averli su tutti i dispositivi e per attivare i servizi di Azure.';
  if (Sync.err) return 'Collegato, ma l\'ultima sincronizzazione non è riuscita: ' + esc(Sync.err);
  if (Sync.last) { const d = new Date(Sync.last); return 'Collegato. Ultima sincronizzazione alle ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + '. I progressi si aggiornano da soli.'; }
  return 'Collegato. I progressi si aggiornano da soli.';
}
function renderSettings() {
  const st = S.settings;
  $app.innerHTML = shell(`<header class="page-head"><h1>Impostazioni</h1></header>
    <section class="panel set"><div class="set-row"><div><b>Lingua del corso</b><span>${esc(COURSE.name)} · contenuti del ${esc(COURSE.version || '')}</span></div><button class="btn ghost" id="langs">Cambia</button></div></section>
    <section class="panel set">
      <div class="set-row col"><div><b>Romaji</b><span>In un percorso serio le lettere latine si abbandonano presto. Automatico: visibili nel livello 0, poi solo su richiesta.</span></div>${seg('romaji', st.romaji, [['auto', 'Automatico'], ['always', 'Sempre'], ['never', 'Mai']])}</div>
      <div class="set-row col"><div><b>Obiettivo giornaliero</b><span>Minuti di studio al giorno.</span></div>${seg('goalMin', st.goalMin, [[5, '5'], [10, '10'], [15, '15'], [20, '20'], [30, '30']])}</div>
      <div class="set-row col"><div><b>Ripassi per sessione</b><span>Quanti elementi al massimo in una sessione di ripasso.</span></div>${seg('reviewMax', st.reviewMax, [[20, '20'], [30, '30'], [50, '50'], [100, '100']])}</div>
      <div class="set-row col"><div><b>Suoni</b><span>Effetti sonori per risposte giuste, errori e lezioni superate.</span></div>${seg('sound', st.sound, [[1, 'Attivi'], [0, 'Disattivati']])}</div>
      <div class="set-row col"><div><b>Voce</b><span>${canListen() ? 'Voce in uso: ' + esc(voice().name) + ' (' + voiceQuality(voice()) + ').' : 'Nessuna voce giapponese trovata sul dispositivo: gli esercizi di ascolto vengono saltati.'}${canListen() && courseVoices().every(v => voiceQuality(v) === 'base') ? ' Sul dispositivo c\'è solo la versione base: puoi scaricarne una di qualità migliore dalle impostazioni del telefono (vedi sotto).' : ''}</span></div>
        ${courseVoices().length > 1 ? `<select class="sel" id="voicesel"><option value="">Automatica (la migliore disponibile)</option>${courseVoices().slice().sort((a, b) => voiceScore(b) - voiceScore(a)).map(v => `<option value="${esc(v.voiceURI)}" ${v.voiceURI === S.settings.voice ? 'selected' : ''}>${esc(v.name)} · ${voiceQuality(v)}</option>`).join('')}</select>` : ''}
        <details class="howto"><summary>Come avere una voce più naturale su iPhone</summary><p>Apri Impostazioni → Accessibilità → Contenuti letti ad alta voce → Voci → Giapponese. Scegli una voce (per esempio Kyoko o Otoya) e scarica la versione <b>Avanzata</b> o <b>Premium</b>, se disponibile. Poi chiudi e riapri Sillabario: la sceglie da sola.</p></details></div>
      <div class="set-row col"><div><b>Velocità della voce</b><span>Per imparare conviene partire lenti.</span></div>${seg('rate', st.rate, [[0.6, 'Molto lenta'], [0.75, 'Lenta'], [0.9, 'Media'], [1, 'Naturale']])}<button class="linkish small" id="testvoice">Prova la voce</button></div>
    </section>
    <section class="panel set">
      <div class="set-row col"><div><b>Sincronizzazione e servizi</b><span>${syncStatus()}</span></div>
        <label class="eyebrow lbl" for="syurl">Indirizzo del server</label>
        <input class="field" id="syurl" type="url" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://sillabario-api.tuonome.workers.dev" value="${esc((S.settings.sync && S.settings.sync.url) || '')}">
        <label class="eyebrow lbl" for="sycode">Codice di accesso</label>
        <input class="field" id="sycode" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="il codice scelto nel Worker" value="${esc((S.settings.sync && S.settings.sync.code) || '')}">
        <div class="cta-row"><button class="btn" id="syconnect">${Sync.cfg() ? 'Salva e riprova' : 'Collega e prova'}</button>${Sync.cfg() ? '<button class="btn ghost" id="synow">Sincronizza ora</button><button class="btn ghost danger" id="syoff">Scollega</button>' : ''}</div>
        <div class="msg" id="symsg"></div>
      </div>
    </section>
    <section class="panel set">
      <div class="set-row"><div><b>Backup e trasferimento</b><span>Copia i progressi a mano su un altro dispositivo.</span></div><button class="btn ghost" id="backup">Apri</button></div>
      <div class="set-row"><div><b>Rifai il test d'ingresso</b><span>Ricolloca il percorso senza cancellare i ripassi.</span></div><button class="btn ghost" id="retest">Inizia</button></div>
      <div class="set-row"><div><b>Azzera i progressi</b><span>Cancella lezioni, ripassi e statistiche di questo corso.</span></div><button class="btn ghost danger" id="reset">Azzera</button></div>
      <div class="confirm" id="resetc" hidden><p>Sei sicuro? L'operazione non si può annullare. Se vuoi conservare i dati, fai prima un backup.</p><div class="cta-row"><button class="btn bad" id="resety">Sì, azzera</button><button class="btn ghost" id="resetn">Annulla</button></div></div>
    </section>
    <p class="foot-note">Sillabario v${APP_VERSION} · ${Sync.cfg() ? 'progressi sincronizzati con il tuo server' : 'progressi salvati su questo dispositivo'}<br>Ordine dei tratti: <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">KanjiVG</a> © Ulrich Apel, licenza CC BY-SA 3.0</p>`, 'settings');
  bindShell();
  $app.querySelectorAll('[data-set]').forEach(b => b.onclick = () => { const k = b.dataset.set; const v = b.dataset.v; S.settings[k] = isNaN(+v) ? v : +v; save(); renderSettings(); });
  document.getElementById('testvoice').onclick = () => speak('こんにちは。にほんごを べんきょうしましょう。');
  const vsel = document.getElementById('voicesel'); if (vsel) vsel.onchange = () => { S.settings.voice = vsel.value; save(); renderSettings(); speak('こんにちは。'); };
  document.getElementById('backup').onclick = openBackup;
  document.getElementById('syconnect').onclick = async () => {
    const m = document.getElementById('symsg'); const url = document.getElementById('syurl').value.trim(); const code = document.getElementById('sycode').value;
    if (!/^https?:\/\//.test(url) || !code) { m.className = 'msg no'; m.textContent = 'Inserisci l\'indirizzo completo (con https://) e il codice.'; return; }
    m.className = 'msg'; m.textContent = 'Collegamento in corso…';
    try {
      const h = await Sync.call('/health', {}, { url, code });
      if (!h.progress) throw new Error('Il Worker risponde, ma l\'archivio KV non è collegato (binding PROGRESS).');
      S.settings.sync = { url, code }; Store.save(S);
      const ok = await Sync.sync();
      const az = h.azure ? 'Azure pronto (regione ' + h.region + ').' : 'Azure non ancora pronto: ' + (h.azureError || 'controlla chiave e regione') + '.';
      const mm = document.getElementById('symsg');
      if (mm) { mm.className = ok ? 'msg ok' : 'msg no'; mm.textContent = ok ? 'Collegato, progressi sincronizzati. ' + az : (Sync.err || 'Sincronizzazione non riuscita.'); }
    } catch (e) { m.className = 'msg no'; m.textContent = e.message; }
  };
  const syn = document.getElementById('synow'); if (syn) syn.onclick = async () => { const m = document.getElementById('symsg'); m.textContent = 'Sincronizzazione…'; const ok = await Sync.sync(); const mm = document.getElementById('symsg'); if (mm) { mm.className = ok ? 'msg ok' : 'msg no'; mm.textContent = ok ? 'Sincronizzato.' : Sync.err; } };
  const syo = document.getElementById('syoff'); if (syo) syo.onclick = () => { delete S.settings.sync; Store.save(S); toast('Server scollegato: i progressi restano su questo dispositivo.'); renderSettings(); };
  document.getElementById('langs').onclick = openLangs;
  document.getElementById('retest').onclick = () => startSession('placement');
  document.getElementById('reset').onclick = () => { document.getElementById('resetc').hidden = false; };
  document.getElementById('resetn').onclick = () => { document.getElementById('resetc').hidden = true; };
  document.getElementById('resety').onclick = () => { S.courses[S.course] = { placed: false, lessons: {}, chapters: {}, exams: {}, cards: {}, epoch: now() }; save(); if (Sync.cfg()) Sync.sync({ force: false }); toast('Progressi azzerati.'); go({ screen: 'today' }); };
}
function sheet(html) {
  const el = document.createElement('div'); el.className = 'veil';
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(el);
  el.onclick = e => { if (e.target === el) el.remove(); };
  return el;
}
function openLangs() {
  const el = sheet(`<h2>Quale lingua vuoi studiare?</h2><p class="lead">Ogni corso segue lo stesso metodo: livelli, capitoli, lezioni, verifiche ed esami, con ripasso dilazionato.</p>
    <ul class="langs">${REGISTRY.map(c => `<li><button class="lang-opt ${c.id === COURSE.id ? 'on' : ''}" data-id="${c.id}" ${c.soon ? 'disabled' : ''}><span class="nat">${esc(c.native)}</span><span><b>${esc(c.name)}</b></span><span class="tag">${c.soon ? 'In preparazione' : c.id === COURSE.id ? 'In corso' : 'Disponibile'}</span></button></li>`).join('')}</ul>
    <div class="cta-row"><button class="btn ghost wide" data-close>Chiudi</button></div>`);
  el.querySelector('[data-close]').onclick = () => el.remove();
  el.querySelectorAll('.lang-opt:not([disabled])').forEach(b => b.onclick = async () => { el.remove(); if (b.dataset.id !== COURSE.id) { await loadCourse(b.dataset.id); save(); } go({ screen: 'today' }); });
}
function exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
function importCode(code) {
  const o = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  if (!o || o.v !== 2 || !o.courses) throw new Error('bad');
  S = o; S.settings = Object.assign(freshState().settings, S.settings || {}); save();
}
function openBackup() {
  const el = sheet(`<h2>Backup e trasferimento</h2>
    <p class="lead">Copia il codice e incollalo sull'altro dispositivo, nella sezione Importa. Contiene tutti i progressi e le impostazioni.</p>
    <label class="eyebrow lbl" for="exp">Il tuo codice</label><textarea class="codebox" id="exp" readonly>${exportCode()}</textarea>
    <div class="cta-row"><button class="btn" id="copy">Copia codice</button></div><div class="msg" id="cmsg"></div>
    <label class="eyebrow lbl" for="imp">Importa da un altro dispositivo</label><textarea class="codebox" id="imp" placeholder="Incolla qui il codice"></textarea>
    <p class="hint left">L'importazione sostituisce i progressi presenti su questo dispositivo.</p>
    <div class="cta-row"><button class="btn ghost" id="doimp">Importa e sostituisci</button><button class="btn ghost" data-close>Chiudi</button></div><div class="msg" id="imsg"></div>`);
  el.querySelector('[data-close]').onclick = () => el.remove();
  el.querySelector('#copy').onclick = () => {
    const ta = el.querySelector('#exp'), m = el.querySelector('#cmsg');
    const done = () => { m.className = 'msg ok'; m.textContent = 'Codice copiato.'; };
    const fb = () => { ta.focus(); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { m.className = 'msg'; m.textContent = 'Codice selezionato: copialo a mano.'; } };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, fb); else fb();
  };
  el.querySelector('#doimp').onclick = async () => {
    const m = el.querySelector('#imsg'), v = el.querySelector('#imp').value;
    if (!v.trim()) { m.className = 'msg no'; m.textContent = 'Incolla prima un codice.'; return; }
    try { importCode(v); await loadCourse(S.course); m.className = 'msg ok'; m.textContent = 'Progressi importati.'; setTimeout(() => { el.remove(); go({ screen: 'today' }); }, 700); }
    catch (e) { m.className = 'msg no'; m.textContent = 'Il codice non è valido: controlla di averlo copiato per intero.'; }
  };
}

/* ============================== avvio ============================== */
async function boot() {
  $app.innerHTML = '<div class="page"><main class="wrap"><p class="muted loading">Caricamento del corso…</p></main></div>';
  try { await Promise.all([loadCourse(S.course), loadStrokes()]); }
  catch (e) {
    $app.innerHTML = `<div class="page"><main class="wrap"><section class="result"><h1>Non riesco a caricare il corso</h1><p class="lead center">Controlla la connessione e riapri l'app. Se il problema continua, verifica che i file <b>courses.json</b> e <b>ja.json</b> siano stati caricati su GitHub insieme a index.html.</p><button class="btn" onclick="location.reload()">Riprova</button></section></main></div>`;
    return;
  }
  render();
  if (Sync.cfg()) Sync.sync();
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
boot();

/* Aggancio per i test automatici: non usato dall'interfaccia. */
window.__sill = {
  get S() { return S; }, get SES() { return SES; }, get IDX() { return IDX; }, toHira, normKana, normRoma,
  travel(days) { TIME_OFFSET += days * DAY; render(); },
  solve(wrong) {
    const q = SES && SES.qs[SES.i]; if (!q) return false; const st = q._st;
    if (q.type === 'trace') { st.idx = STROKES[q.char].length; st.traceOk = !wrong; st.mistakes = wrong ? 9 : 0; check(); return true; }
    if (q.type === 'match') { st.m = { L: null, R: null, done: q.pairs.map((_, i) => i), errs: wrong ? [0, 1] : [], flash: null }; st.itemOk = q.pairs.map((p, k) => [p.id, !(wrong && k < 2)]); st.matchOk = !wrong; check(); return true; }
    if (q.type === 'mcq') st.sel = wrong ? q.options.find(o => o !== q.answer) : q.answer;
    else if (q.type === 'roma') st.typed = wrong ? 'xxx' : q.answers[0];
    else if (q.type === 'kana') st.typed = wrong ? 'zzz' : q.answers[0];
    else if (q.type === 'build' && !wrong) { const used = new Set(); st.built = q.tokens.map(t => { const i = q.bank.findIndex((b, bi) => b === t && !used.has(bi)); used.add(i); return i; }); }
    if (q.type === 'build' && wrong) st.built = [0];
    check(); return true;
  },
  next() { advance(); },
  go(s) { go({ screen: s }); },
  api: { mergeState, Sync, judgeStroke, samplePath, matchQ, traceQ, makeQ, buildPractice, buildVerify, buildChapter, buildExam, buildReview, placementGroup, lessonItems, grammarTemplates, isRight, inputToKana }
};
