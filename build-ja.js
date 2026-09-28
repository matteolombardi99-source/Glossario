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
  {
    id: 'N5', code: 'JLPT N5', title: 'Le fondamenta della lingua',
    desc: 'Il primo livello della certificazione ufficiale. Struttura della frase, particelle, verbi, aggettivi e i primi kanji. In questa versione il livello è parziale: verrà completato fino al programma d\'esame.',
    exam: { n: 30, pass: 0.8, provisional: true },
    chapters: [
    {
      id: 'N5-c1', title: 'Presentarsi e indicare',
      lessons: [
      { id: 'n5-1', title: 'La frase nominale: は e です', glyph: 'は・です',
        goal: 'Dire chi sei e che cosa è qualcosa, in forma affermativa, negativa e interrogativa.',
        theory: [
          'Principio fondamentale: in giapponese <b>il verbo sta sempre alla fine</b>. L\'ordine è soggetto, oggetto, verbo (SOV), non soggetto, verbo, oggetto come in italiano.',
          'La frase più semplice è <b>A は B です</b>: "A è B". <span class="jp">は</span> marca il <b>tema</b> della frase, cioè ciò di cui si parla, e qui si legge <b>wa</b>. <span class="jp">です</span> (desu) chiude la frase in modo cortese, come il nostro "è".',
          'Per negare, <span class="jp">です</span> diventa <b><span class="jp">じゃありません</span></b> (ja arimasen); nello scritto più formale <span class="jp">ではありません</span>. Per fare una domanda basta aggiungere <b><span class="jp">か</span></b> alla fine, senza cambiare l\'ordine delle parole. Si risponde con <span class="jp">はい</span> (sì) o <span class="jp">いいえ</span> (no).',
          'Non esistono articoli né plurale: <span class="jp">がくせい</span> vuol dire "studente", "uno studente", "lo studente" o "studenti" a seconda del contesto. Dopo il nome di un\'altra persona si aggiunge <span class="jp">さん</span>, mai dopo il proprio.'],
        grammar: [
          { id: 'wa-desu', title: 'A は B です', it: 'A è B (frase nominale cortese)' },
          { id: 'ja-arimasen', title: 'A は B じゃありません', it: 'A non è B' },
          { id: 'ka', title: '〜か', it: 'domanda: si aggiunge か alla fine' }],
        words: LW([['わたし', 'watashi', 'io'], ['がくせい', 'gakusei', 'studente'], ['せんせい', 'sensei', 'insegnante'], ['かいしゃいん', 'kaishain', 'impiegato'], ['いしゃ', 'isha', 'medico'], ['イタリアじん', 'itariajin', 'italiano (persona)'], ['にほんじん', 'nihonjin', 'giapponese (persona)'], ['ともだち', 'tomodachi', 'amico'], ['はい', 'hai', 'sì'], ['いいえ', 'iie', 'no']]),
        sentences: SEN([
          ['わたしは がくせいです。', 'watashi wa gakusei desu.', 'Io sono uno studente.', 'わたし|は|がくせい|です', 'wa-desu', { gap: { q: 'わたし ＿ がくせいです。', a: 'は', o: ['は', 'を', 'に', 'の'], ex: 'は marca il tema della frase e qui si legge "wa".' } }],
          ['せんせいは にほんじんです。', 'sensei wa nihonjin desu.', 'L\'insegnante è giapponese.', 'せんせい|は|にほんじん|です', 'wa-desu'],
          ['マリオさんは イタリアじんです。', 'Mario-san wa itariajin desu.', 'Mario è italiano.', 'マリオさん|は|イタリアじん|です', 'wa-desu'],
          ['たなかさんは いしゃですか。', 'Tanaka-san wa isha desu ka.', 'Il signor Tanaka è medico?', 'たなかさん|は|いしゃ|です|か', 'ka', { gap: { q: 'たなかさんは いしゃです ＿。', a: 'か', o: ['か', 'は', 'の', 'を'], ex: 'か alla fine della frase la trasforma in domanda.' } }],
          ['いいえ、いしゃじゃありません。', 'iie, isha ja arimasen.', 'No, non è medico.', 'いいえ|いしゃ|じゃありません', 'ja-arimasen'],
          ['わたしは かいしゃいんじゃありません。', 'watashi wa kaishain ja arimasen.', 'Io non sono un impiegato.', 'わたし|は|かいしゃいん|じゃありません', 'ja-arimasen', { gap: { q: 'わたしは かいしゃいん ＿。', a: 'じゃありません', o: ['じゃありません', 'です', 'ですか', 'の'], ex: 'La frase è negativa: です diventa じゃありません.' } }]]),
        transforms: [
          { gp: 'ja-arimasen', task: 'Volgi al negativo', from: 'がくせいです。', to: ['がくせいじゃありません', 'がくせいではありません'] },
          { gp: 'ja-arimasen', task: 'Volgi al negativo', from: 'いしゃです。', to: ['いしゃじゃありません', 'いしゃではありません'] },
          { gp: 'ja-arimasen', task: 'Volgi al negativo', from: 'にほんじんです。', to: ['にほんじんじゃありません', 'にほんじんではありません'] },
          { gp: 'ka', task: 'Trasforma in domanda', from: 'せんせいです。', to: ['せんせいですか'] },
          { gp: 'ka', task: 'Trasforma in domanda', from: 'たなかさんは かいしゃいんです。', to: ['たなかさんはかいしゃいんですか'] },
          { gp: 'wa-desu', task: 'Scrivi in giapponese: «Io sono italiano.»', from: '', to: ['わたしはイタリアじんです'] }],
        drills: [
          { gp: 'ja-arimasen', prompt: 'Qual è la forma negativa di です?', options: ['じゃありません', 'ですか', 'でした', 'ません'], answer: 'じゃありません', jp: true },
          { gp: 'wa-desu', prompt: 'Come si legge は quando marca il tema?', options: ['wa', 'ha', 'ba', 'e'], answer: 'wa' },
          { gp: 'wa-desu', prompt: 'Dove va il verbo in una frase giapponese?', options: ['Alla fine', 'All\'inizio', 'Dopo il soggetto', 'In qualsiasi posizione'], answer: 'Alla fine' },
          { gp: 'ka', prompt: 'Come trasformi がくせいです in una domanda?', options: ['がくせいですか', 'かがくせいです', 'がくせいか です', 'がくせいでか'], answer: 'がくせいですか', jp: true }] },
      { id: 'n5-2', title: 'Possesso e dimostrativi: の, これ, それ, あれ', glyph: 'の・これ',
        goal: 'Indicare oggetti vicini e lontani e dire a chi appartengono.',
        theory: [
          'La particella <b><span class="jp">の</span></b> lega due nomi: il primo possiede o specifica il secondo. <span class="jp">わたしの ほん</span> = il mio libro. <span class="jp">せんせいの かさ</span> = l\'ombrello dell\'insegnante. L\'ordine è l\'opposto dell\'italiano: prima il possessore, poi la cosa posseduta.',
          'I dimostrativi seguono una serie ordinata, detta <b>ko-so-a-do</b>: <span class="jp">これ</span> (questo, vicino a chi parla), <span class="jp">それ</span> (codesto, vicino a chi ascolta), <span class="jp">あれ</span> (quello, lontano da entrambi), <span class="jp">どれ</span> (quale?). La stessa serie tornerà per luoghi e direzioni.',
          'Per chiedere "cosa?" si usa <span class="jp">なん</span>, per "di chi?" <span class="jp">だれの</span>. La struttura resta quella della lezione precedente: A は B ですか。'],
        grammar: [
          { id: 'no', title: 'N1 の N2', it: 'N2 di N1: possesso e specificazione' },
          { id: 'kosoa', title: 'これ・それ・あれ・どれ', it: 'dimostrativi secondo la distanza' }],
        words: LW([['これ', 'kore', 'questo (vicino a me)'], ['それ', 'sore', 'codesto (vicino a te)'], ['あれ', 'are', 'quello (lontano da entrambi)'], ['ほん', 'hon', 'libro'], ['かばん', 'kaban', 'borsa'], ['とけい', 'tokei', 'orologio'], ['かさ', 'kasa', 'ombrello'], ['くるま', 'kuruma', 'automobile'], ['だれ', 'dare', 'chi'], ['なん', 'nan', 'cosa']]),
        sentences: SEN([
          ['これは ほんです。', 'kore wa hon desu.', 'Questo è un libro.', 'これ|は|ほん|です', 'kosoa'],
          ['それは わたしの かばんです。', 'sore wa watashi no kaban desu.', 'Quella è la mia borsa.', 'それ|は|わたし|の|かばん|です', 'no', { gap: { q: 'それは わたし ＿ かばんです。', a: 'の', o: ['の', 'は', 'を', 'か'], ex: 'の lega possessore e cosa posseduta: わたしの = mio.' } }],
          ['あれは だれの くるまですか。', 'are wa dare no kuruma desu ka.', 'Di chi è quella macchina laggiù?', 'あれ|は|だれ|の|くるま|です|か', 'no'],
          ['これは なんですか。', 'kore wa nan desu ka.', 'Che cos\'è questo?', 'これ|は|なん|です|か', 'kosoa', { gap: { q: '＿ は なんですか。', a: 'これ', o: ['これ', 'それ', 'あれ', 'どれ'], ex: 'L\'oggetto è vicino a chi parla: これ.' } }],
          ['せんせいの とけいです。', 'sensei no tokei desu.', 'È l\'orologio dell\'insegnante.', 'せんせい|の|とけい|です', 'no', { gap: { q: 'せんせい ＿ とけいです。', a: 'の', o: ['の', 'を', 'に', 'か'], ex: 'Il possessore viene prima, seguito da の.' } }]]),
        transforms: [
          { gp: 'no', task: 'Unisci con の: «il mio libro»', from: 'わたし ／ ほん', to: ['わたしのほん'] },
          { gp: 'no', task: 'Unisci con の: «l\'ombrello dell\'insegnante»', from: 'せんせい ／ かさ', to: ['せんせいのかさ'] },
          { gp: 'kosoa', task: 'Scrivi in giapponese: «Che cos\'è quello laggiù?»', from: '', to: ['あれはなんですか'] }],
        drills: [
          { gp: 'kosoa', prompt: 'L\'oggetto è vicino a chi ascolta. Quale dimostrativo usi?', options: ['それ', 'これ', 'あれ', 'どれ'], answer: 'それ', jp: true, explain: 'こ = vicino a chi parla, そ = vicino a chi ascolta, あ = lontano da entrambi.' },
          { gp: 'no', prompt: 'Come si dice "la borsa dell\'amico"?', options: ['ともだちの かばん', 'かばんの ともだち', 'ともだちは かばん', 'ともだちを かばん'], answer: 'ともだちの かばん', jp: true },
          { gp: 'kosoa', prompt: 'Come chiedi "quale?" nella serie ko-so-a-do?', options: ['どれ', 'だれ', 'なん', 'あれ'], answer: 'どれ', jp: true, explain: 'だれ significa "chi", なん "cosa".' }] },
      { id: 'n5-3', title: 'I numeri', glyph: '一二三',
        goal: 'Leggere, dire e comporre i numeri da 1 a 999.',
        theory: [
          'I numeri da 1 a 10 sono la base di tutto: <span class="jp">いち に さん よん ご ろく なな はち きゅう じゅう</span>. Il 4, il 7 e il 9 hanno due letture (<span class="jp">よん/し</span>, <span class="jp">なな/しち</span>, <span class="jp">きゅう/く</span>): nel contare si usano soprattutto <span class="jp">よん</span>, <span class="jp">なな</span> e <span class="jp">きゅう</span>.',
          'I numeri composti si costruiscono con moltiplicazione e somma. Il moltiplicatore va <b>prima</b> di じゅう: <span class="jp">にじゅう</span> = 2×10 = 20. Ciò che si somma va <b>dopo</b>: <span class="jp">じゅうさん</span> = 10+3 = 13. Quindi <span class="jp">にじゅうさん</span> = 23.',
          'Cento è <span class="jp">ひゃく</span> e si combina allo stesso modo, con alcune eccezioni fonetiche: 300 <span class="jp">さんびゃく</span>, 600 <span class="jp">ろっぴゃく</span>, 800 <span class="jp">はっぴゃく</span>.'],
        grammar: [{ id: 'numeri', title: 'Numeri composti', it: 'moltiplicatore prima di じゅう/ひゃく, addendo dopo' }],
        words: LW([['いち', 'ichi', '1'], ['に', 'ni', '2'], ['さん', 'san', '3'], ['よん', 'yon', '4', ['し']], ['ご', 'go', '5'], ['ろく', 'roku', '6'], ['なな', 'nana', '7', ['しち']], ['はち', 'hachi', '8'], ['きゅう', 'kyū', '9', ['く']], ['じゅう', 'jū', '10'], ['ひゃく', 'hyaku', '100']]),
        sentences: [
          { jp: 'にじゅうさん', r: 'nijūsan', it: '23', tokens: ['に', 'じゅう', 'さん'], gp: 'numeri', build: 'Componi il numero 23' },
          { jp: 'じゅうはち', r: 'jūhachi', it: '18', tokens: ['じゅう', 'はち'], gp: 'numeri', build: 'Componi il numero 18' },
          { jp: 'よんじゅうご', r: 'yonjūgo', it: '45', tokens: ['よん', 'じゅう', 'ご'], gp: 'numeri', build: 'Componi il numero 45' },
          { jp: 'ひゃくにじゅう', r: 'hyakunijū', it: '120', tokens: ['ひゃく', 'に', 'じゅう'], gp: 'numeri', build: 'Componi il numero 120' }],
        transforms: [
          { gp: 'numeri', task: 'Scrivi il numero in giapponese', from: '23', to: ['にじゅうさん'] },
          { gp: 'numeri', task: 'Scrivi il numero in giapponese', from: '48', to: ['よんじゅうはち'] },
          { gp: 'numeri', task: 'Scrivi il numero in giapponese', from: '16', to: ['じゅうろく'] },
          { gp: 'numeri', task: 'Scrivi il numero in giapponese', from: '99', to: ['きゅうじゅうきゅう'] },
          { gp: 'numeri', task: 'Scrivi il numero in giapponese', from: '300', to: ['さんびゃく'] },
          { gp: 'numeri', task: 'Scrivi il numero in giapponese', from: '71', to: ['ななじゅういち', 'しちじゅういち'] }],
        drills: [
          { gp: 'numeri', prompt: 'Come si dice 11?', options: ['じゅういち', 'いちじゅう', 'じゅうに', 'いちいち'], answer: 'じゅういち', jp: true, explain: '10 + 1: prima じゅう, poi いち.' },
          { gp: 'numeri', prompt: 'Come si dice 20?', options: ['にじゅう', 'じゅうに', 'にいち', 'じゅうじゅう'], answer: 'にじゅう', jp: true, explain: '2 × 10: il moltiplicatore va prima di じゅう.' },
          { gp: 'numeri', prompt: 'Quanto fa さんじゅうご?', options: ['35', '53', '315', '30'], answer: '35' },
          { gp: 'numeri', prompt: 'Quanto fa ななじゅうきゅう?', options: ['79', '97', '709', '17'], answer: '79' },
          { gp: 'numeri', prompt: 'Come si dice 300?', options: ['さんびゃく', 'さんひゃく', 'ひゃくさん', 'さんぴゃく'], answer: 'さんびゃく', jp: true, explain: 'Eccezione fonetica: dopo さん, ひゃく diventa びゃく.' },
          { gp: 'numeri', prompt: 'Come si dice 600?', options: ['ろっぴゃく', 'ろくひゃく', 'ろくびゃく', 'ひゃくろく'], answer: 'ろっぴゃく', jp: true, explain: 'Eccezione fonetica: ろく + ひゃく = ろっぴゃく.' }] }
      ]
    },
    {
      id: 'N5-c2', title: 'Azioni quotidiane',
      lessons: [
      { id: 'n5-4', title: 'I verbi in forma cortese: ます', glyph: 'ます',
        goal: 'Coniugare i verbi al presente, al passato e al negativo in forma cortese.',
        theory: [
          'I verbi giapponesi non cambiano per persona: <span class="jp">たべます</span> vale per io, tu, lui, noi e loro. Il soggetto, se è chiaro dal contesto, si omette.',
          'La forma cortese ha quattro terminazioni da imparare subito: <b><span class="jp">ます</span></b> (presente o futuro affermativo), <b><span class="jp">ません</span></b> (negativo), <b><span class="jp">ました</span></b> (passato), <b><span class="jp">ませんでした</span></b> (passato negativo).',
          'Il complemento oggetto si marca con <b><span class="jp">を</span></b>, che si legge <b>o</b>: <span class="jp">みずを のみます</span> = bevo acqua. Il verbo, come sempre, chiude la frase.',
          'Il giapponese non ha un futuro grammaticale: <span class="jp">いきます</span> significa sia "vado" sia "andrò". Lo chiariscono il contesto o una parola di tempo come <span class="jp">あした</span> (domani). Le parole di tempo come <span class="jp">きのう</span> (ieri) di solito non vogliono particelle.'],
        grammar: [
          { id: 'masu', title: 'V-ます / ません / ました / ませんでした', it: 'forma cortese del verbo: presente, negativo, passato, passato negativo' },
          { id: 'o', title: 'N を V', it: 'を marca il complemento oggetto (si legge "o")' }],
        words: LW([['たべます', 'tabemasu', 'mangiare'], ['のみます', 'nomimasu', 'bere'], ['いきます', 'ikimasu', 'andare'], ['きます', 'kimasu', 'venire'], ['かえります', 'kaerimasu', 'tornare (a casa)'], ['みます', 'mimasu', 'guardare, vedere'], ['よみます', 'yomimasu', 'leggere'], ['します', 'shimasu', 'fare'], ['みず', 'mizu', 'acqua'], ['きのう', 'kinō', 'ieri']]),
        sentences: SEN([
          ['わたしは ごはんを たべます。', 'watashi wa gohan o tabemasu.', 'Io mangio il riso.', 'わたし|は|ごはん|を|たべます', 'o'],
          ['みずを のみます。', 'mizu o nomimasu.', 'Bevo acqua.', 'みず|を|のみます', 'o', { gap: { q: 'みず ＿ のみます。', a: 'を', o: ['を', 'は', 'の', 'か'], ex: 'を marca il complemento oggetto e si legge "o".' } }],
          ['きのう テレビを みました。', 'kinō terebi o mimashita.', 'Ieri ho guardato la televisione.', 'きのう|テレビ|を|みました', 'masu', { alts: ['テレビ|を|きのう|みました'], gap: { q: 'きのう テレビを ＿。', a: 'みました', o: ['みました', 'みます', 'みません', 'みませんでした'], ex: 'Azione passata affermativa: ます → ました.' } }],
          ['ほんを よみません。', 'hon o yomimasen.', 'Non leggo libri.', 'ほん|を|よみません', 'masu', { gap: { q: 'ほんを ＿。', a: 'よみません', o: ['よみません', 'よみます', 'よみました', 'よみませんでした'], ex: 'Presente negativo: ます → ません.' } }],
          ['きのう ほんを よみませんでした。', 'kinō hon o yomimasen deshita.', 'Ieri non ho letto libri.', 'きのう|ほん|を|よみませんでした', 'masu', { alts: ['ほん|を|きのう|よみませんでした'] }]]),
        transforms: [
          { gp: 'masu', task: 'Volgi al passato', from: 'たべます', to: ['たべました'] },
          { gp: 'masu', task: 'Volgi al negativo', from: 'のみます', to: ['のみません'] },
          { gp: 'masu', task: 'Volgi al passato negativo', from: 'いきます', to: ['いきませんでした'] },
          { gp: 'masu', task: 'Volgi al passato', from: 'みます', to: ['みました'] },
          { gp: 'masu', task: 'Volgi al negativo', from: 'きます', to: ['きません'] },
          { gp: 'masu', task: 'Volgi al passato', from: 'かえります', to: ['かえりました'] },
          { gp: 'masu', task: 'Volgi al passato negativo', from: 'します', to: ['しませんでした'] },
          { gp: 'o', task: 'Scrivi in giapponese: «Bevo acqua.»', from: 'みず ／ のみます', to: ['みずをのみます'] },
          { gp: 'o', task: 'Scrivi in giapponese: «Leggo un libro.»', from: 'ほん ／ よみます', to: ['ほんをよみます'] }],
        drills: [
          { gp: 'masu', prompt: 'たべます al passato', options: ['たべました', 'たべません', 'たべませんでした', 'たべまして'], answer: 'たべました', jp: true },
          { gp: 'masu', prompt: 'のみます al negativo', options: ['のみません', 'のみました', 'のみませんでした', 'のみです'], answer: 'のみません', jp: true },
          { gp: 'masu', prompt: 'いきます al passato negativo', options: ['いきませんでした', 'いきました', 'いきません', 'いきでした'], answer: 'いきませんでした', jp: true },
          { gp: 'masu', prompt: 'Cosa significa よみました?', options: ['ho letto', 'leggo', 'non leggo', 'non ho letto'], answer: 'ho letto' },
          { gp: 'o', prompt: 'Come si pronuncia la particella を?', options: ['o', 'wa', 'e', 'wo-o'], answer: 'o', explain: 'Si scrive con il segno della riga W, ma oggi si pronuncia "o".' }] }
      ,
      { id: 'n5-5', title: 'Le particelle di luogo e mezzo: に, へ, で', glyph: 'に・で',
        goal: 'Dire dove vai, con che mezzo e dove fai qualcosa.',
        theory: [
          'Le <b>particelle</b> sono il cuore della grammatica giapponese: parole brevi che seguono un nome e ne indicano il ruolo nella frase, come le nostre preposizioni, ma messe dopo.',
          '<b><span class="jp">に</span></b> indica la <b>destinazione</b> (<span class="jp">がっこうに いきます</span>, vado a scuola) e anche il momento preciso. <b><span class="jp">へ</span></b>, letta <b>e</b>, indica la <b>direzione</b>: con i verbi di movimento è quasi intercambiabile con に.',
          '<b><span class="jp">で</span></b> ha due usi: il <b>luogo dove si svolge un\'azione</b> (<span class="jp">レストランで たべます</span>, mangio al ristorante) e il <b>mezzo</b> (<span class="jp">でんしゃで</span>, in treno).',
          'Riepilogo: を oggetto, に destinazione, へ direzione, で luogo dell\'azione o mezzo. Una frase può contenerne diverse, e l\'ordine dei complementi è abbastanza libero purché il verbo resti in fondo: <span class="jp">バスで えきに いきます</span> e <span class="jp">えきに バスで いきます</span> sono entrambe corrette.'],
        grammar: [
          { id: 'ni', title: 'luogo に いきます', it: 'に: destinazione del movimento' },
          { id: 'e', title: 'luogo へ いきます', it: 'へ (letta "e"): direzione' },
          { id: 'de', title: 'luogo/mezzo で V', it: 'で: luogo dove si svolge l\'azione, oppure mezzo' }],
        words: LW([['がっこう', 'gakkō', 'scuola'], ['うち', 'uchi', 'casa (propria)'], ['えき', 'eki', 'stazione'], ['レストラン', 'resutoran', 'ristorante'], ['としょかん', 'toshokan', 'biblioteca'], ['でんしゃ', 'densha', 'treno'], ['バス', 'basu', 'autobus'], ['あした', 'ashita', 'domani']]),
        sentences: SEN([
          ['がっこうに いきます。', 'gakkō ni ikimasu.', 'Vado a scuola.', 'がっこう|に|いきます', 'ni', { gap: { q: 'がっこう ＿ いきます。', a: 'に', o: ['に', 'を', 'で', 'の'], ex: 'に indica la destinazione del movimento.' } }],
          ['でんしゃで いきます。', 'densha de ikimasu.', 'Vado in treno.', 'でんしゃ|で|いきます', 'de', { gap: { q: 'でんしゃ ＿ いきます。', a: 'で', o: ['で', 'を', 'に', 'は'], ex: 'で indica il mezzo con cui si compie l\'azione.' } }],
          ['レストランで ごはんを たべます。', 'resutoran de gohan o tabemasu.', 'Mangio al ristorante.', 'レストラン|で|ごはん|を|たべます', 'de', { alts: ['ごはん|を|レストラン|で|たべます'], gap: { q: 'レストラン ＿ ごはんを たべます。', a: 'で', o: ['で', 'に', 'へ', 'を'], ex: 'で indica il luogo dove si svolge l\'azione.' } }],
          ['あした うちへ かえります。', 'ashita uchi e kaerimasu.', 'Domani torno a casa.', 'あした|うち|へ|かえります', 'e', { alts: ['うち|へ|あした|かえります'], gap: { q: 'あした うち ＿ かえります。', a: 'へ', o: ['へ', 'を', 'で', 'の'], ex: 'へ (letta "e") indica la direzione. Anche に sarebbe corretto.' } }],
          ['としょかんで ほんを よみます。', 'toshokan de hon o yomimasu.', 'Leggo libri in biblioteca.', 'としょかん|で|ほん|を|よみます', 'de', { alts: ['ほん|を|としょかん|で|よみます'], gap: { q: 'としょかんで ほん ＿ よみます。', a: 'を', o: ['を', 'に', 'へ', 'の'], ex: 'を marca il complemento oggetto.' } }],
          ['バスで えきに いきます。', 'basu de eki ni ikimasu.', 'Vado alla stazione in autobus.', 'バス|で|えき|に|いきます', 'ni', { alts: ['えき|に|バス|で|いきます'] }]]),
        transforms: [
          { gp: 'ni', task: 'Scrivi in giapponese: «Vado a scuola.»', from: 'がっこう ／ いきます', to: ['がっこうにいきます', 'がっこうへいきます'] },
          { gp: 'de', task: 'Scrivi in giapponese: «Vado in autobus.»', from: 'バス ／ いきます', to: ['バスでいきます'] },
          { gp: 'de', task: 'Scrivi in giapponese: «Leggo in biblioteca.»', from: 'としょかん ／ よみます', to: ['としょかんでよみます'] },
          { gp: 'e', task: 'Scrivi in giapponese: «Torno a casa.»', from: 'うち ／ かえります', to: ['うちへかえります', 'うちにかえります'] }],
        drills: [
          { gp: 'e', prompt: 'Come si legge la particella へ?', options: ['e', 'he', 'ha', 'o'], answer: 'e' },
          { gp: 'de', prompt: 'Quale particella indica il luogo dove si svolge un\'azione?', options: ['で', 'に', 'を', 'の'], answer: 'で', jp: true },
          { gp: 'ni', prompt: 'Quale particella indica la destinazione di いきます?', options: ['に', 'で', 'を', 'の'], answer: 'に', jp: true }] }
      ]
    },
    {
      id: 'N5-c3', title: 'Descrivere e leggere i primi kanji',
      lessons: [
      { id: 'n5-6', title: 'Gli aggettivi in い e in な', glyph: 'い・な',
        goal: 'Descrivere persone e cose con i due tipi di aggettivo, anche al negativo.',
        theory: [
          'Il giapponese ha <b>due famiglie di aggettivi</b>, che si comportano in modo diverso.',
          'Gli <b>aggettivi in い</b> finiscono in い e si coniugano come piccoli verbi: <span class="jp">たかい</span> (caro) al negativo diventa <span class="jp">たかくない</span>, togliendo い e aggiungendo くない. Davanti a un nome si mettono così come sono: <span class="jp">たかい くるま</span>.',
          'Gli <b>aggettivi in な</b> si comportano come nomi: <span class="jp">しずかです</span> (è tranquillo), negativo <span class="jp">しずかじゃありません</span>. Davanti a un nome prendono <b>な</b>: <span class="jp">しずかな まち</span>, una città tranquilla.',
          'Eccezione da ricordare: <span class="jp">きれい</span> (bello, pulito) finisce in い ma è un aggettivo <b>な</b>: <span class="jp">きれいな はな</span>. Per dire "questo + nome" si usa <span class="jp">この</span> (non これ): <span class="jp">この ほん</span>, questo libro.'],
        grammar: [
          { id: 'i-adj', title: 'Aggettivi in い', it: 'たかい → たかくない; たかい + nome' },
          { id: 'na-adj', title: 'Aggettivi in な', it: 'しずか → しずかじゃありません; しずかな + nome' }],
        words: LW([['おおきい', 'ōkii', 'grande'], ['ちいさい', 'chiisai', 'piccolo'], ['たかい', 'takai', 'alto, costoso'], ['やすい', 'yasui', 'economico'], ['おもしろい', 'omoshiroi', 'interessante'], ['しずか', 'shizuka', 'tranquillo (agg. な)'], ['きれい', 'kirei', 'bello, pulito (agg. な)'], ['げんき', 'genki', 'in forma (agg. な)'], ['まち', 'machi', 'città'], ['この', 'kono', 'questo (+ nome)']]),
        sentences: SEN([
          ['この ほんは おもしろいです。', 'kono hon wa omoshiroi desu.', 'Questo libro è interessante.', 'この|ほん|は|おもしろい|です', 'i-adj'],
          ['しずかな まちです。', 'shizuka na machi desu.', 'È una città tranquilla.', 'しずかな|まち|です', 'na-adj', { gap: { q: '＿ まちです。', a: 'しずかな', o: ['しずかな', 'しずかい', 'しずかの', 'しずか'], ex: 'Davanti a un nome, l\'aggettivo な prende な.' } }],
          ['この かばんは たかくないです。', 'kono kaban wa takakunai desu.', 'Questa borsa non è costosa.', 'この|かばん|は|たかくない|です', 'i-adj', { gap: { q: 'この かばんは ＿ です。', a: 'たかくない', o: ['たかくない', 'たかいじゃない', 'たかない', 'たかいない'], ex: 'Negativo degli aggettivi い: si toglie い e si aggiunge くない.' } }],
          ['きれいな はなです。', 'kirei na hana desu.', 'È un bel fiore.', 'きれいな|はな|です', 'na-adj'],
          ['わたしの くるまは ちいさいです。', 'watashi no kuruma wa chiisai desu.', 'La mia macchina è piccola.', 'わたし|の|くるま|は|ちいさい|です', 'i-adj']]),
        transforms: [
          { gp: 'i-adj', task: 'Volgi al negativo', from: 'たかいです。', to: ['たかくないです', 'たかくありません'] },
          { gp: 'i-adj', task: 'Volgi al negativo', from: 'おおきいです。', to: ['おおきくないです', 'おおきくありません'] },
          { gp: 'i-adj', task: 'Volgi al negativo', from: 'おもしろいです。', to: ['おもしろくないです', 'おもしろくありません'] },
          { gp: 'na-adj', task: 'Volgi al negativo', from: 'しずかです。', to: ['しずかじゃありません', 'しずかではありません'] },
          { gp: 'na-adj', task: 'Volgi al negativo', from: 'げんきです。', to: ['げんきじゃありません', 'げんきではありません'] },
          { gp: 'na-adj', task: 'Unisci aggettivo e nome: «un bel fiore»', from: 'きれい ／ はな', to: ['きれいなはな'] },
          { gp: 'i-adj', task: 'Unisci aggettivo e nome: «una macchina piccola»', from: 'ちいさい ／ くるま', to: ['ちいさいくるま'] }],
        drills: [
          { gp: 'na-adj', prompt: 'Completa: ＿ まち (una città tranquilla)', options: ['しずかな', 'しずかい', 'しずかの', 'しずかく'], answer: 'しずかな', jp: true },
          { gp: 'i-adj', prompt: 'Negativo di たかいです', options: ['たかくないです', 'たかいじゃありません', 'たかないです', 'たかくです'], answer: 'たかくないです', jp: true },
          { gp: 'na-adj', prompt: 'きれい è un aggettivo…', options: ['in な (eccezione)', 'in い', 'verbo', 'nome'], answer: 'in な (eccezione)', explain: 'Finisce in い ma si comporta come un aggettivo な: きれいな はな.' },
          { gp: 'na-adj', prompt: 'Negativo di しずかです', options: ['しずかじゃありません', 'しずかくないです', 'しずかないです', 'しずかません'], answer: 'しずかじゃありません', jp: true },
          { gp: 'i-adj', prompt: 'Negativo di おおきいです', options: ['おおきくないです', 'おおきいじゃありません', 'おおきないです', 'おおきません'], answer: 'おおきくないです', jp: true }] },
      { id: 'n5-7', title: 'I primi kanji', glyph: '山川木',
        goal: 'Riconoscere dodici kanji fondamentali, il loro significato e le letture principali.',
        theory: [
          'I <b>kanji</b> sono ideogrammi: ogni segno porta un significato, non solo un suono. Molti dei più semplici nascono da disegni stilizzati: <span class="jp">山</span> è una montagna, <span class="jp">川</span> un fiume che scorre, <span class="jp">木</span> un albero con le radici, <span class="jp">口</span> una bocca aperta.',
          'Ogni kanji ha di solito <b>due tipi di lettura</b>. La lettura <b>kun</b> è giapponese e si usa quando il kanji sta da solo o con desinenze in hiragana (<span class="jp">山 = やま</span>). La lettura <b>on</b> deriva dal cinese e si usa nelle parole composte (<span class="jp">富士山 = ふじさん</span>, monte Fuji).',
          'Nelle tabelle la lettura kun è scritta per convenzione in hiragana, e tra parentesi c\'è la parte in hiragana che segue il kanji: <span class="jp">ひと(つ)</span> si scrive <span class="jp">一つ</span>. Per il livello N5 servono circa 100 kanji: si comincia da questi dodici.'],
        kanji: [
          { k: '一', on: ['いち', 'いつ'], kun: ['ひと(つ)'], it: 'uno' },
          { k: '二', on: ['に'], kun: ['ふた(つ)'], it: 'due' },
          { k: '三', on: ['さん'], kun: ['み(っつ)'], it: 'tre' },
          { k: '人', on: ['じん', 'にん'], kun: ['ひと'], it: 'persona' },
          { k: '日', on: ['にち', 'じつ'], kun: ['ひ', 'か'], it: 'giorno, sole' },
          { k: '月', on: ['げつ', 'がつ'], kun: ['つき'], it: 'luna, mese' },
          { k: '山', on: ['さん'], kun: ['やま'], it: 'montagna' },
          { k: '川', on: ['せん'], kun: ['かわ'], it: 'fiume' },
          { k: '口', on: ['こう'], kun: ['くち'], it: 'bocca' },
          { k: '木', on: ['もく', 'ぼく'], kun: ['き'], it: 'albero' },
          { k: '水', on: ['すい'], kun: ['みず'], it: 'acqua' },
          { k: '火', on: ['か'], kun: ['ひ'], it: 'fuoco' }] }
      ]
    }]
  },
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
    if (s.tokens.join('').replace(/[、。\s]/g, '') !== s.jp.replace(/[、。\s]/g, '') && !s.build) throw new Error(le.id + ': token non coerenti con la frase: ' + s.jp);
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
const out = path.join(__dirname, 'ja.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(course, null, 1));
console.log('scritto', out, (fs.statSync(out).size / 1024).toFixed(1) + ' KB', ids.size + ' lezioni');
