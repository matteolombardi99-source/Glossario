// Genera ja.json nella stessa cartella. Uso: node build-ja.js
// Il file JSON prodotto è quello che l'app carica; questo script serve solo a scriverlo in modo leggibile.
const fs = require('fs');
const path = require('path');

// Accento tonale (posizione della discesa, 0 = piatto). Fonte: Kanjium (github.com/mifunetoshiro/kanjium), CC BY-SA 4.0.
// Verbi in -ます: regola standard, discesa dopo ま. Omesse le parole con dati incerti (これ, それ, あれ, この, いいえ).
const ACC = {"あい": 1, "いえ": 2, "うえ": 0, "あお": 1, "かさ": 1, "すし": 2, "あき": 1, "こえ": 1, "しお": 2, "いす": 0, "いぬ": 2, "ねこ": 1, "なつ": 2, "くち": 0, "つくえ": 0, "そと": 1, "はな": 2, "ひと": 0, "ふね": 1, "みみ": 2, "ほし": 0, "むし": 0, "やま": 2, "ゆき": 2, "よる": 1, "さくら": 0, "わたし": 0, "ほん": 1, "かぎ": 2, "ごはん": 1, "ぶた": 0, "でんわ": 0, "えんぴつ": 0, "ひざ": 0, "きって": 0, "おちゃ": 0, "しゃしん": 0, "がっこう": 0, "きょう": 1, "いっしょ": 0, "アイス": 1, "ココア": 1, "キウイ": 1, "テニス": 1, "ネクタイ": 1, "ナイフ": 1, "テキスト": 1, "カメラ": 1, "トマト": 1, "ホテル": 1, "メロン": 1, "ミルク": 1, "コーヒー": 3, "ケーキ": 1, "テレビ": 1, "パン": 1, "ピザ": 1, "がくせい": 0, "せんせい": 3, "かいしゃいん": 3, "いしゃ": 0, "にほんじん": 4, "ともだち": 0, "はい": 1, "かばん": 0, "とけい": 0, "くるま": 0, "だれ": 1, "なん": 1, "いち": 2, "に": 1, "さん": 0, "よん": 1, "ご": 1, "ろく": 2, "なな": 1, "はち": 2, "きゅう": 1, "じゅう": 1, "ひゃく": 2, "みず": 0, "きのう": 2, "うち": 0, "えき": 1, "レストラン": 1, "としょかん": 2, "でんしゃ": 0, "バス": 1, "あした": 3, "おおきい": 3, "ちいさい": 3, "たかい": 2, "やすい": 2, "おもしろい": 4, "しずか": 1, "きれい": 1, "げんき": 1, "まち": 2, "たべます": 3, "のみます": 3, "いきます": 3, "きます": 2, "かえります": 4, "みます": 2, "よみます": 3, "します": 2};
const K = str => str.trim().split(/\s+/).map(p => { const [k, r] = p.split(':'); const rs = r.split('/'); return { k, r: rs[0], alt: rs }; });
const RW = list => list.map(([jp, r, it]) => ({ jp, kana: jp, r, it, role: 'read', ...(ACC[jp] != null ? { acc: ACC[jp] } : {}) }));
const LW = list => list.map(([jp, r, it, alts]) => ({ jp, kana: jp, r, it, role: 'lang', ...(alts ? { kanaAlts: alts } : {}), ...(ACC[jp] != null ? { acc: ACC[jp] } : {}) }));
// frase: [jp, romaji, italiano, token separati da |, gp, opzioni]
const SEN = list => list.map(([jp, r, it, t, gp, o = {}]) => ({ jp, r, it, tokens: t.split('|'), gp, ...(o.alts ? { alts: o.alts.map(a => a.split('|')) } : {}), ...(o.gap ? { gap: o.gap } : {}) }));

// Parole con kanji: [scrittura, lettura in kana, romaji, italiano, opzioni]
// opzioni: { alts: [letture alternative accettate], dict: 'forma per cercare l'accento', comp: true = composto regolare verificato a mano, non è una voce del dizionario }
const KW = list => list.map(([jp, kana, r, it, o = {}]) => ({ jp, kana, r, it, role: 'lang', ...(o.alts ? { kanaAlts: o.alts } : {}), ...(o.dict ? { dict: o.dict } : {}), ...(o.acc != null ? { acc: o.acc } : {}), ...(o.comp ? { comp: true } : {}) }));
const N5 = require('./n5.js')({ K, RW, LW, KW, SEN });

const course = {
  id: 'ja', name: 'Giapponese', native: '日本語', tts: 'ja-JP', version: '2026-09-28',
  levels: [
  {
    id: 'L0', code: 'Livello 0', title: 'Kana: i due alfabeti',
    desc: 'Prima di tutto si impara a leggere. Hiragana e katakana sono sillabari: ogni segno è un suono. Senza di loro non si va avanti.',
    exam: { n: 30, pass: 0.8 },
    chapters: [
    {
      id: 'L0-hira', title: 'Hiragana',
      lessons: [
      { id: 'h1', script: 'Hiragana', title: 'Le cinque vocali', glyph: 'あいうえお',
        goal: 'Riconoscere, leggere e scrivere le cinque vocali hiragana.',
        theory: [
          'Il giapponese si scrive con <b>tre sistemi</b> insieme: <b>hiragana</b> (parole giapponesi e desinenze grammaticali), <b>katakana</b> (parole straniere) e <b>kanji</b> (ideogrammi di origine cinese, che portano il significato).',
          'Si comincia dagli hiragana: 46 segni di base, ognuno dei quali rappresenta una sillaba intera, non una singola lettera. Il sistema è ordinato in una tabella: prima le cinque vocali, poi le righe consonante + vocale, sempre nell\'ordine a, i, u, e, o.',
          'Le vocali si pronunciano quasi come in italiano: <span class="jp">あ</span> a, <span class="jp">い</span> i, <span class="jp">う</span> u (con le labbra poco arrotondate), <span class="jp">え</span> e, <span class="jp">お</span> o. Sono sempre brevi e nette, senza dittonghi: <span class="jp">あい</span> si legge a-i, due sillabe distinte.'],
        kana: K('あ:a い:i う:u え:e お:o'),
        words: RW([['あい', 'ai', 'amore'], ['いえ', 'ie', 'casa'], ['うえ', 'ue', 'sopra'], ['あお', 'ao', 'blu'], ['いいえ', 'iie', 'no']]) },
      { id: 'h2', script: 'Hiragana', title: 'Righe K e S', glyph: 'かさ',
        goal: 'Leggere le righe K e S e le prime parole di due sillabe.',
        theory: [
          'Ogni riga della tabella unisce una consonante alle cinque vocali, nello stesso ordine: a, i, u, e, o.',
          'Riga K: <span class="jp">か き く け こ</span> (ka ki ku ke ko). La <b>k</b> è sempre dura, come in "casa", anche davanti a i ed e: <span class="jp">き</span> si legge "chi" italiano, mai "ci".',
          'Riga S: <span class="jp">さ し す せ そ</span>. Prima irregolarità della tabella: <span class="jp">し</span> non si legge "si" ma <b>shi</b>, come in "scivolo". La s è sempre sorda, come in "sasso".'],
        kana: K('か:ka き:ki く:ku け:ke こ:ko さ:sa し:shi/si す:su せ:se そ:so'),
        words: RW([['かさ', 'kasa', 'ombrello'], ['すし', 'sushi', 'sushi'], ['あき', 'aki', 'autunno'], ['こえ', 'koe', 'voce'], ['しお', 'shio', 'sale'], ['いす', 'isu', 'sedia']]) },
      { id: 'h3', script: 'Hiragana', title: 'Righe T e N', glyph: 'たな',
        goal: 'Leggere le righe T e N, con le irregolarità ち e つ.',
        theory: [
          'Riga T: <span class="jp">た ち つ て と</span>. Due irregolarità: <span class="jp">ち</span> si legge <b>chi</b> (come "ci" di "cibo") e <span class="jp">つ</span> si legge <b>tsu</b> (come la "z" di "pizza").',
          'Riga N: <span class="jp">な に ぬ ね の</span>, tutta regolare. <span class="jp">の</span> è anche una particella grammaticale molto usata: la ritroverai nel livello N5.',
          'Attenzione alle coppie simili: <span class="jp">ぬ</span> e <span class="jp">め</span> (ぬ ha un ricciolo finale), <span class="jp">ね</span> e <span class="jp">れ</span>, <span class="jp">わ</span> (ne, re, wa: le ultime due le vedrai più avanti).'],
        kana: K('た:ta ち:chi/ti つ:tsu/tu て:te と:to な:na に:ni ぬ:nu ね:ne の:no'),
        words: RW([['いぬ', 'inu', 'cane'], ['ねこ', 'neko', 'gatto'], ['なつ', 'natsu', 'estate'], ['くち', 'kuchi', 'bocca'], ['つくえ', 'tsukue', 'scrivania'], ['そと', 'soto', 'fuori']]) },
      { id: 'h4', script: 'Hiragana', title: 'Righe H e M', glyph: 'はま',
        goal: 'Leggere le righe H e M e pronunciare correttamente ふ.',
        theory: [
          'Riga H: <span class="jp">は ひ ふ へ ほ</span>. La <b>h</b> è aspirata, come in inglese "house". <span class="jp">ふ</span> si legge <b>fu</b>: un soffio tra le labbra, a metà tra f e h, senza toccare i denti.',
          'Riga M: <span class="jp">ま み む め も</span>, regolare.',
          'Anticipazione: quando <span class="jp">は</span> fa da particella grammaticale si legge <b>wa</b>, e quando <span class="jp">へ</span> fa da particella si legge <b>e</b>. Lo studierai nel livello N5; per ora leggi ha e he.'],
        kana: K('は:ha ひ:hi ふ:fu/hu へ:he ほ:ho ま:ma み:mi む:mu め:me も:mo'),
        words: RW([['はな', 'hana', 'fiore'], ['ひと', 'hito', 'persona'], ['ふね', 'fune', 'nave'], ['みみ', 'mimi', 'orecchio'], ['ほし', 'hoshi', 'stella'], ['むし', 'mushi', 'insetto']]) },
      { id: 'h5', script: 'Hiragana', title: 'Righe Y, R, W e la ん', glyph: 'やらわん',
        goal: 'Completare i 46 hiragana di base.',
        theory: [
          'Riga Y: solo tre segni, <span class="jp">や ゆ よ</span> (ya yu yo).',
          'Riga R: <span class="jp">ら り る れ ろ</span>. La r giapponese è un solo colpo leggero della lingua sul palato, a metà tra la nostra r e la l. Non va mai arrotata.',
          'Riga W: <span class="jp">わ</span> (wa) e <span class="jp">を</span>, che si pronuncia <b>o</b> e si usa quasi solo come particella dell\'oggetto.',
          'Infine <span class="jp">ん</span>: l\'unico suono consonantico che sta da solo, senza vocale. Si legge <b>n</b> e conta come una sillaba intera: <span class="jp">ほん</span> ha due battute, ho-n. Con questa lezione conosci tutti i 46 hiragana di base.'],
        kana: K('や:ya ゆ:yu よ:yo ら:ra り:ri る:ru れ:re ろ:ro わ:wa を:wo/o ん:n/nn'),
        words: RW([['やま', 'yama', 'montagna'], ['ゆき', 'yuki', 'neve'], ['よる', 'yoru', 'notte'], ['さくら', 'sakura', 'ciliegio in fiore'], ['わたし', 'watashi', 'io'], ['ほん', 'hon', 'libro']]) },
      { id: 'h6', script: 'Hiragana', title: 'Dakuten e handakuten', glyph: 'がぱ',
        goal: 'Leggere le sillabe sonore (g, z, d, b) e quelle con p.',
        theory: [
          'Due piccoli segni cambiano il suono di una sillaba. Il <b>dakuten</b> (゛, due trattini in alto a destra) rende sonora la consonante: k→<b>g</b>, s→<b>z</b>, t→<b>d</b>, h→<b>b</b>. La g è sempre dura, come in "gatto".',
          'L\'<b>handakuten</b> (゜, un cerchietto) si usa solo sulla riga H e la trasforma in <b>p</b>: <span class="jp">は→ぱ</span>.',
          'Irregolari: <span class="jp">じ</span> si legge <b>ji</b> (come "gi" di "giro"). <span class="jp">ぢ</span> e <span class="jp">づ</span> suonano come <span class="jp">じ</span> e <span class="jp">ず</span> e compaiono raramente: per ora basta riconoscerli.'],
        kana: K('が:ga ぎ:gi ぐ:gu げ:ge ご:go ざ:za じ:ji/zi ず:zu ぜ:ze ぞ:zo だ:da で:de ど:do ば:ba び:bi ぶ:bu べ:be ぼ:bo ぱ:pa ぴ:pi ぷ:pu ぺ:pe ぽ:po'),
        words: RW([['かぎ', 'kagi', 'chiave'], ['ごはん', 'gohan', 'riso cotto, pasto'], ['ぶた', 'buta', 'maiale'], ['でんわ', 'denwa', 'telefono'], ['えんぴつ', 'enpitsu', 'matita'], ['ひざ', 'hiza', 'ginocchio']]) },
      { id: 'h7', script: 'Hiragana', title: 'Sillabe composte, っ e vocali lunghe', glyph: 'きゃっ',
        goal: 'Leggere sillabe composte, consonanti doppie e vocali lunghe.',
        theory: [
          'Una sillaba della colonna <b>i</b> seguita da una <b>ゃ ゅ ょ piccola</b> forma un solo suono: <span class="jp">き+ゃ = きゃ</span> (kya), <span class="jp">し+ょ = しょ</span> (sho), <span class="jp">ち+ゅ = ちゅ</span> (chu). La piccola si scrive più in basso e più stretta. Confronta <span class="jp">きよ</span> (ki-yo, due sillabe) e <span class="jp">きょ</span> (kyo, una sillaba).',
          'La <b>っ piccola</b> non si pronuncia: blocca il fiato per una battuta e raddoppia la consonante che segue, come nelle nostre doppie. <span class="jp">きって</span> = ki<b>tt</b>e.',
          'Vocali lunghe: in hiragana si allungano aggiungendo una vocale. <span class="jp">おう</span> e <span class="jp">おお</span> si leggono ō, <span class="jp">えい</span> di solito ē, <span class="jp">うう</span> ū. La lunghezza distingue parole diverse (<span class="jp">おばさん</span> zia, <span class="jp">おばあさん</span> nonna), quindi va rispettata. Nelle risposte scritte puoi indicarla raddoppiando la vocale: gakkou o gakkoo.'],
        kana: K('きゃ:kya きゅ:kyu きょ:kyo しゃ:sha/sya しゅ:shu/syu しょ:sho/syo ちゃ:cha/tya ちゅ:chu/tyu ちょ:cho/tyo にゃ:nya りょ:ryo じゃ:ja/zya ぎょ:gyo びょ:byo'),
        words: RW([['きって', 'kitte', 'francobollo'], ['おちゃ', 'ocha', 'tè'], ['しゃしん', 'shashin', 'fotografia'], ['がっこう', 'gakkō', 'scuola'], ['きょう', 'kyō', 'oggi'], ['いっしょ', 'issho', 'insieme']]) }
      ]
    },
    {
      id: 'L0-kata', title: 'Katakana',
      lessons: [
      { id: 'k1', script: 'Katakana', title: 'Vocali, K e S', glyph: 'アカサ',
        goal: 'Riconoscere le prime righe katakana e distinguere シ da ツ.',
        theory: [
          'I <b>katakana</b> hanno esattamente gli stessi suoni degli hiragana, ma forme più spigolose. Si usano per le parole di origine straniera, i nomi stranieri, le onomatopee e per dare enfasi, un po\' come il nostro corsivo.',
          'Il tuo nome, per esempio, si scriverà in katakana. Italia è <span class="jp">イタリア</span>.',
          'Prima coppia insidiosa: <span class="jp">シ</span> (shi) e <span class="jp">ツ</span> (tsu). In シ i due trattini sono quasi orizzontali e il tratto lungo sale dal basso a sinistra verso destra; in ツ i trattini sono verticali e il tratto lungo scende dall\'alto a destra.'],
        kana: K('ア:a イ:i ウ:u エ:e オ:o カ:ka キ:ki ク:ku ケ:ke コ:ko サ:sa シ:shi/si ス:su セ:se ソ:so'),
        words: RW([['アイス', 'aisu', 'gelato'], ['ココア', 'kokoa', 'cioccolata calda'], ['スイス', 'suisu', 'Svizzera'], ['キウイ', 'kiui', 'kiwi']]) },
      { id: 'k2', script: 'Katakana', title: 'T, N e H', glyph: 'タナハ',
        goal: 'Leggere le righe T, N, H in katakana e le prime parole straniere.',
        theory: [
          'Stesse letture della tabella hiragana: <span class="jp">タ チ ツ テ ト</span>, <span class="jp">ナ ニ ヌ ネ ノ</span>, <span class="jp">ハ ヒ フ ヘ ホ</span>.',
          '<span class="jp">ヘ</span> katakana e <span class="jp">へ</span> hiragana sono praticamente identici. <span class="jp">ニ</span> assomiglia al kanji del numero due (二): il contesto li distingue.',
          'Le parole straniere si adattano ai suoni giapponesi aggiungendo vocali dopo le consonanti isolate: "tennis" diventa <span class="jp">テニス</span> (te-ni-su), "text" <span class="jp">テキスト</span> (te-ki-su-to).'],
        kana: K('タ:ta チ:chi/ti ツ:tsu/tu テ:te ト:to ナ:na ニ:ni ヌ:nu ネ:ne ノ:no ハ:ha ヒ:hi フ:fu/hu ヘ:he ホ:ho'),
        words: RW([['テニス', 'tenisu', 'tennis'], ['ネクタイ', 'nekutai', 'cravatta'], ['ナイフ', 'naifu', 'coltello'], ['テキスト', 'tekisuto', 'libro di testo']]) },
      { id: 'k3', script: 'Katakana', title: 'M, Y, R, W e ン', glyph: 'マヤラン',
        goal: 'Completare i katakana di base e distinguere ソ da ン.',
        theory: [
          'Ultime righe: <span class="jp">マ ミ ム メ モ</span>, <span class="jp">ヤ ユ ヨ</span>, <span class="jp">ラ リ ル レ ロ</span>, <span class="jp">ワ ン</span>. La <span class="jp">ヲ</span> katakana esiste ma non si usa quasi mai.',
          'Seconda coppia insidiosa: <span class="jp">ソ</span> (so) e <span class="jp">ン</span> (n). In ソ il trattino corto è quasi verticale e il tratto lungo scende dall\'alto; in ン il trattino è quasi orizzontale e il tratto lungo sale dal basso.',
          'Con queste righe puoi già leggere <span class="jp">イタリア</span>, <span class="jp">カメラ</span> e <span class="jp">トマト</span>.'],
        kana: K('マ:ma ミ:mi ム:mu メ:me モ:mo ヤ:ya ユ:yu ヨ:yo ラ:ra リ:ri ル:ru レ:re ロ:ro ワ:wa ン:n/nn'),
        words: RW([['イタリア', 'itaria', 'Italia'], ['カメラ', 'kamera', 'fotocamera'], ['トマト', 'tomato', 'pomodoro'], ['ホテル', 'hoteru', 'hotel'], ['メロン', 'meron', 'melone'], ['ミルク', 'miruku', 'latte']]) },
      { id: 'k4', script: 'Katakana', title: 'Suoni sonori e trattino lungo', glyph: 'ガパー',
        goal: 'Leggere le sillabe sonore in katakana e le vocali lunghe con ー.',
        theory: [
          'Dakuten e handakuten funzionano come negli hiragana: <span class="jp">カ→ガ</span>, <span class="jp">サ→ザ</span>, <span class="jp">タ→ダ</span>, <span class="jp">ハ→バ→パ</span>.',
          'Nei katakana le vocali lunghe si scrivono con un trattino: <b>ー</b>. <span class="jp">コーヒー</span> = kōhī, caffè. Nella scrittura verticale il trattino diventa verticale. Quando scrivi in lettere latine, il trattino si indica con "-": ko-hi-.',
          'Con questa lezione hai completato entrambi gli alfabeti. Da qui in poi si studia la lingua vera e propria.'],
        kana: K('ガ:ga ギ:gi グ:gu ゲ:ge ゴ:go ザ:za ジ:ji/zi ズ:zu ゼ:ze ゾ:zo ダ:da デ:de ド:do バ:ba ビ:bi ブ:bu ベ:be ボ:bo パ:pa ピ:pi プ:pu ペ:pe ポ:po'),
        words: RW([['コーヒー', 'kōhī', 'caffè'], ['ケーキ', 'kēki', 'torta'], ['テレビ', 'terebi', 'televisione'], ['パン', 'pan', 'pane'], ['ピザ', 'piza', 'pizza'], ['ローマ', 'rōma', 'Roma']]) }
      ]
    }]
  },
  N5,
  { id: 'N4', code: 'JLPT N4', title: 'Frasi complesse e forma て', soon: true },
  { id: 'N3', code: 'JLPT N3', title: 'Il giapponese di tutti i giorni', soon: true },
  { id: 'N2', code: 'JLPT N2', title: 'Testi reali e registri', soon: true },
  { id: 'N1', code: 'JLPT N1', title: 'Padronanza', soon: true }
  ]
};

// controlli di coerenza
const ids = new Set();
for (const l of course.levels) for (const c of l.chapters || []) for (const le of c.lessons) {
  if (ids.has(le.id)) throw new Error('lezione duplicata ' + le.id); ids.add(le.id);
  const gps = new Set((le.grammar || []).map(g => g.id));
  for (const s of le.sentences || []) { if (!gps.has(s.gp)) throw new Error(le.id + ': frase senza punto grammaticale valido ' + s.jp);
    if (s.tokens.join('').replace(/[、。？！\s]/g, '') !== s.jp.replace(/[、。？！\s]/g, '') && !s.build) throw new Error(le.id + ': token non coerenti con la frase: ' + s.jp);
    for (const a of s.alts || []) if ([...a].sort().join() !== [...s.tokens].sort().join()) throw new Error(le.id + ': ordine alternativo con token diversi: ' + s.jp);
    if (s.gap && !s.gap.o.includes(s.gap.a)) throw new Error(le.id + ': risposta mancante tra le opzioni');
    if (s.gap && new Set(s.gap.o).size !== s.gap.o.length) throw new Error(le.id + ': opzioni duplicate');
  }
  for (const d of le.drills || []) { if (!gps.has(d.gp)) throw new Error(le.id + ': esercizio senza punto grammaticale ' + d.prompt); if (!d.options.includes(d.answer)) throw new Error(le.id + ': risposta non tra le opzioni ' + d.prompt); if (new Set(d.options).size !== d.options.length) throw new Error('opzioni duplicate ' + d.prompt); }
  for (const t of le.transforms || []) { if (!gps.has(t.gp)) throw new Error(le.id + ': trasformazione senza punto grammaticale ' + t.task); if (!t.to.length || t.to.some(a => !/^[\u3040-\u30ffー]+$/.test(a))) throw new Error(le.id + ': risposta di trasformazione non in kana: ' + t.to); }
  for (const g of le.grammar || []) {
    const n = (le.sentences || []).filter(s => s.gp === g.id).length + (le.drills || []).filter(d => d.gp === g.id).length;
    if (n < 2) throw new Error(le.id + ': il punto ' + g.id + ' ha meno di 2 esercizi');
  }
}
// coerenza dei nuovi tipi di esercizio
for (const l of course.levels) for (const c of l.chapters || []) for (const le of c.lessons) {
  const chk = (what, o, a) => { if (!o.includes(a)) throw new Error(`${le.id}: ${what}: risposta «${a}» assente dalle opzioni`); if (new Set(o).size !== o.length) throw new Error(`${le.id}: ${what}: opzioni duplicate`); if (o.length < 3) throw new Error(`${le.id}: ${what}: meno di 3 opzioni`); };
  (le.vocabq || []).forEach(v => { chk('vocabolario ' + v.q, v.o, v.a); if (v.type === 'ctx' && !v.q.includes('＿＿')) throw new Error(`${le.id}: domanda di contesto senza ＿＿: ${v.q}`); });
  (le.readings || []).forEach(r => r.questions.forEach(q => chk('lettura ' + q.q, q.o, q.a)));
  (le.listening || []).forEach(d => { chk('ascolto ' + d.q, d.o, d.a); if (!d.lines.every(x => ['F', 'M', 'N'].includes(x[0]) && x[1])) throw new Error(`${le.id}: battuta di dialogo non valida`); });
}
// ===================== controlli sul dizionario (Kanjium, CC BY-SA 4.0) =====================
// Servono i file di Kanjium (github.com/mifunetoshiro/kanjium): cartella indicata da KANJIUM, altrimenti i controlli vengono saltati.
const KJ = process.env.KANJIUM || '/home/claude/mifunetoshiro/kanjium';
const hasDict = fs.existsSync(path.join(KJ, 'data/source_files/kanjidict.txt'));
const errors = [];
const kata2hira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const allLessons = course.levels.flatMap(l => (l.chapters || []).flatMap(c => c.lessons.map(le => ({ le, level: l }))));
const kanjiRe = /[一-鿿]/g;
if (hasDict) {
  // 1. letture dei kanji
  const kd = {};
  for (const line of fs.readFileSync(path.join(KJ, 'data/source_files/kanjidict.txt'), 'utf8').split('\n')) {
    const f = line.split('\t'); if (f.length < 10) continue;
    const on = (f[6] + '、' + f[8]).split(/[、,]/).map(x => kata2hira(x.replace(/\(.*?\)|\*|（.*?）/g, '').trim())).filter(Boolean);
    const kun = (f[7] + '、' + f[9]).split(/[、,]/).map(x => x.replace(/（/g, '(').replace(/）/g, ')').replace(/\*/g, '').trim()).filter(Boolean);
    kd[f[0]] = { on: new Set(on), kun: new Set(kun), jlpt: f[13] };
  }
  for (const { le } of allLessons) for (const k of le.kanji || []) {
    const d = kd[k.k]; if (!d) { errors.push(`${le.id}: kanji ${k.k} non trovato nel dizionario`); continue; }
    for (const r of k.on) if (!d.on.has(r)) errors.push(`${le.id}: ${k.k} lettura on ${r} non presente (${[...d.on].join('・')})`);
    for (const r of k.kun) if (!d.kun.has(r)) errors.push(`${le.id}: ${k.k} lettura kun ${r} non presente (${[...d.kun].join('・')})`);
  }
  // 2. parole: scrittura + lettura devono esistere; accento dal dizionario
  const acc = new Map();
  for (const line of fs.readFileSync(path.join(KJ, 'data/source_files/raw/accents.txt'), 'utf8').split('\n')) {
    const [w, r, a] = line.split('\t'); if (!a) continue;
    const key = w + '|' + kata2hira(r || w); if (!acc.has(key)) acc.set(key, parseInt(a.split(',')[0], 10));
  }
  const morae = s => { const out = []; for (const c of s) { if ('ゃゅょぁぃぅぇぉゎャュョァィゥェォヮ'.includes(c) && out.length) out[out.length - 1] += c; else out.push(c); } return out; };
  const UNCERTAIN = new Set(['これ', 'それ', 'あれ', 'この', 'いいえ']);
  for (const { le } of allLessons) for (const w of le.words || []) {
    if (w.acc == null && !UNCERTAIN.has(w.jp)) {
      if (/ます$/.test(w.kana)) w.acc = morae(w.kana).lastIndexOf('ま') + 1;          // forma cortese: discesa dopo ま
      else { const k1 = acc.get(w.jp + '|' + kata2hira(w.kana)), k2 = w.dict ? acc.get(w.dict + '|' + kata2hira(w.kana)) : undefined; const v = k1 != null ? k1 : k2; if (v != null) w.acc = v; }
    }
    if (/[一-鿿]/.test(w.jp) && !w.dict && !w.comp) {
      const base = w.jp.replace(/ます$/, '');
      if (!acc.has(w.jp + '|' + kata2hira(w.kana)) && !/ます$/.test(w.jp)) errors.push(`${le.id}: la parola ${w.jp} (${w.kana}) non esiste nel dizionario con questa lettura`);
    }
    delete w.dict; delete w.comp;
  }
  // 3. nel livello N5 si usano solo kanji già insegnati (nella lezione stessa o prima)
  const taught = new Set();
  for (const { le, level } of allLessons) {
    if (level.id === 'L0') continue;
    (le.kanji || []).forEach(k => taught.add(k.k));
    const texts = [];
    (le.words || []).forEach(w => texts.push(['parola', w.jp]));
    (le.sentences || []).forEach(x => { texts.push(['frase', x.jp]); if (x.gap) { texts.push(['frase', x.gap.q]); x.gap.o.forEach(o => texts.push(['opzione', o])); } });
    (le.drills || []).forEach(d => { if (d.jp) d.options.forEach(o => texts.push(['esercizio', o])); });
    (le.transforms || []).forEach(t => texts.push(['trasformazione', t.from]));
    (le.vocabq || []).forEach(v => { texts.push(['vocabolario', v.q]); v.o.forEach(o => texts.push(['vocabolario', o])); });
    (le.readings || []).forEach(r => { texts.push(['lettura', r.text]); r.questions.forEach(q => { texts.push(['lettura', q.q]); q.o.forEach(o => texts.push(['lettura', o])); }); });
    (le.listening || []).forEach(d => { d.lines.forEach(l => texts.push(['ascolto', l[1]])); texts.push(['ascolto', d.q]); d.o.forEach(o => texts.push(['ascolto', o])); });
    for (const [what, t] of texts) for (const ch of (t || '').match(kanjiRe) || []) if (!taught.has(ch)) errors.push(`${le.id}: ${what} «${t}» usa ${ch} non ancora insegnato`);
  }
  // 4. kanji simili per le domande di scrittura (dati Kanjium + integrazioni)
  const looks = {};
  for (const line of fs.readFileSync(path.join(KJ, 'data/source_files/lookalikes.txt'), 'utf8').split('\n')) { const [k, v] = line.split('\t'); if (k && v) looks[k] = v.split(',').filter(Boolean); }
  const EXTRA = { 日: '目白曰', 目: '日自且', 白: '百日自', 百: '白', 人: '入八', 入: '人八', 八: '人入', 大: '犬太天', 天: '夫大', 木: '本休', 本: '木休', 千: '干午', 午: '牛年千', 年: '午', 右: '石左', 左: '右友', 友: '左反', 見: '貝具', 間: '聞問', 聞: '間問', 読: '続話', 話: '語読', 語: '話', 買: '貝', 先: '失', 男: '田思', 名: '各夕', 気: '汽', 雨: '両', 東: '車束', 車: '東軍', 西: '四酉', 四: '西', 北: '比', 後: '復', 今: '令会', 会: '今合', 分: '公', 半: '平', 金: '全', 何: '荷', 社: '仕', 店: '庁', 道: '首', 飲: '飯', 食: '良飯', 電: '雷雲', 国: '固図', 高: '商', 安: '女', 新: '親', 古: '吉', 長: '張', 万: '方', 円: '内', 週: '過', 毎: '海母', 母: '毎', 父: '交', 子: '字', 女: '安', 立: '音', 出: '山', 上: '土止', 下: '不', 中: '申', 手: '毛', 足: '走', 耳: '取', 口: '回', 言: '信', 書: '昼', 行: '往', 来: '米', 休: '体', 空: '究', 花: '化', 魚: '角', 山: '出', 川: '州', 水: '氷永', 火: '大', 土: '士上', 小: '少', 少: '小', 多: '夕', 外: '夕', 校: '枚', 学: '字', 生: '牛', 駅: '験', 九: '丸', 十: '千', 七: '匕', 五: '互', 六: '穴', 南: '商', 月: '円' };
  const used = new Set(allLessons.flatMap(({ le }) => (le.kanji || []).map(k => k.k)));
  course.looks = {};
  for (const k of used) course.looks[k] = [...new Set([...(looks[k] || []), ...[...(EXTRA[k] || '')]])].filter(x => x !== k);
  console.log('controlli dizionario: fatti');
} else console.warn('ATTENZIONE: dizionario Kanjium non trovato, controlli saltati');
if (errors.length) { console.error(errors.join('\n')); console.error(errors.length + ' errori'); process.exit(1); }

const out = path.join(__dirname, 'ja.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(course, null, 1));
console.log('scritto', out, (fs.statSync(out).size / 1024).toFixed(1) + ' KB', ids.size + ' lezioni');
