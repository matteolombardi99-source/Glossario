/* Sillabario — server (Cloudflare Worker)
 *
 * Cosa fa:
 *   GET  /health    controlla il collegamento: codice di accesso, archivio progressi, chiave Azure
 *   GET  /token     rilascia un token Azure temporaneo (10 minuti): la chiave vera resta qui, mai nell'app
 *   GET  /progress  legge i progressi salvati
 *   PUT  /progress  salva i progressi (l'app li unisce prima con quelli già presenti)
 *   GET  /tts       voce neurale giapponese (Azure), conservata nell'archivio: ogni frase si genera una volta sola
 *   POST /assess    valuta la pronuncia di una registrazione WAV 16 kHz rispetto al testo atteso
 *
 * Impostazioni richieste nel Worker (Settings → Variables and Secrets / Bindings):
 *   ACCESS_CODE     segreto  il codice personale che inserirai nell'app
 *   AZURE_KEY       segreto  la chiave della risorsa Speech di Azure (KEY 1)
 *   AZURE_REGION    testo    la regione della risorsa, per esempio westeurope
 *   ALLOWED_ORIGIN  testo    l'indirizzo del sito, per esempio https://tuonome.github.io
 *   PROGRESS        KV       collegamento a uno spazio KV (per esempio "sillabario-progress")
 */

const MAX_BYTES = 4 * 1024 * 1024;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
    const localDev = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const originOk = !origin || allowed.includes(origin) || localDev;
    const cors = {
      'Access-Control-Allow-Origin': origin && originOk ? origin : (allowed[0] || 'null'),
      'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!originOk) return json({ error: 'origine non consentita' }, 403);

    const url = new URL(req.url);
    if (url.pathname === '/') return json({ service: 'sillabario', ok: true });

    if (!env.ACCESS_CODE) return json({ error: 'ACCESS_CODE non impostato nel Worker' }, 500);
    const code = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (!sameString(code, env.ACCESS_CODE)) return json({ error: 'codice di accesso errato' }, 401);

    const profile = ((url.searchParams.get('profile') || 'main').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)) || 'main';
    const key = 'progress:' + profile;

    try {
      if (url.pathname === '/health' && req.method === 'GET') {
        let azure = false, azureError = null;
        if (env.AZURE_KEY && env.AZURE_REGION) {
          const r = await issueToken(env);
          azure = r.ok; if (!r.ok) azureError = 'Azure ha risposto ' + r.status;
        } else azureError = 'AZURE_KEY o AZURE_REGION mancanti';
        return json({ ok: true, progress: !!env.PROGRESS, azure, azureError, region: env.AZURE_REGION || null });
      }

      if (url.pathname === '/token' && req.method === 'GET') {
        if (!env.AZURE_KEY || !env.AZURE_REGION) return json({ error: 'Azure non configurato' }, 503);
        const r = await issueToken(env);
        if (!r.ok) return json({ error: 'Azure ha risposto ' + r.status }, 502);
        return json({ token: r.token, region: env.AZURE_REGION, expiresIn: 540 });
      }

      if (url.pathname === '/tts' && req.method === 'GET') {
        if (!env.AZURE_KEY || !env.AZURE_REGION) return json({ error: 'Azure non configurato' }, 503);
        const text = (url.searchParams.get('t') || '').trim();
        if (!text || text.length > 200) return json({ error: 'testo mancante o troppo lungo' }, 400);
        const voice = VOICES.includes(url.searchParams.get('v')) ? url.searchParams.get('v') : VOICES[0];
        const rate = RATES[url.searchParams.get('r')] != null ? url.searchParams.get('r') : 'slow';
        const cacheKey = 'tts:v1:' + voice + ':' + rate + ':' + await sha256(text);
        const audioHeaders = { ...cors, 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=31536000, immutable' };
        if (env.PROGRESS) { const hit = await env.PROGRESS.get(cacheKey, { type: 'arrayBuffer' }); if (hit) return new Response(hit, { headers: { ...audioHeaders, 'X-Cache': 'hit' } }); }
        const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP"><voice name="${voice}"><prosody rate="${RATES[rate]}">${xmlEscape(text)}</prosody></voice></speak>`;
        const r = await fetch(`https://${env.AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
          method: 'POST', body: ssml,
          headers: { 'Ocp-Apim-Subscription-Key': env.AZURE_KEY, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'sillabario' }
        });
        if (!r.ok) return json({ error: 'Azure (voce) ha risposto ' + r.status }, 502);
        const audio = await r.arrayBuffer();
        if (env.PROGRESS && audio.byteLength > 0) await env.PROGRESS.put(cacheKey, audio);
        return new Response(audio, { headers: { ...audioHeaders, 'X-Cache': 'miss' } });
      }

      if (url.pathname === '/assess' && req.method === 'POST') {
        if (!env.AZURE_KEY || !env.AZURE_REGION) return json({ error: 'Azure non configurato' }, 503);
        const ref = (url.searchParams.get('ref') || '').trim();
        if (!ref || ref.length > 200) return json({ error: 'testo di riferimento mancante' }, 400);
        const audio = await req.arrayBuffer();
        if (audio.byteLength < 1000) return json({ error: 'registrazione vuota' }, 400);
        if (audio.byteLength > 1500000) return json({ error: 'registrazione troppo lunga (massimo circa 30 secondi)' }, 413);
        const params = { ReferenceText: ref, GradingSystem: 'HundredMark', Granularity: 'Word', Dimension: 'Comprehensive', EnableMiscue: 'True' };
        const r = await fetch(`https://${env.AZURE_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=ja-JP&format=detailed`, {
          method: 'POST', body: audio,
          headers: { 'Ocp-Apim-Subscription-Key': env.AZURE_KEY, 'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000', 'Accept': 'application/json', 'Pronunciation-Assessment': b64utf8(JSON.stringify(params)) }
        });
        if (!r.ok) return json({ error: 'Azure (pronuncia) ha risposto ' + r.status }, 502);
        const d = await r.json();
        if (d.RecognitionStatus !== 'Success' || !d.NBest || !d.NBest.length) return json({ status: d.RecognitionStatus || 'Error' });
        const nb = d.NBest[0]; const pa = nb.PronunciationAssessment || nb;
        const words = (nb.Words || []).map(w => { const x = w.PronunciationAssessment || w; return { w: w.Word, acc: x.AccuracyScore, err: x.ErrorType || 'None' }; });
        return json({ status: 'Success', text: nb.Display || d.DisplayText || '', pron: pa.PronScore, accuracy: pa.AccuracyScore, fluency: pa.FluencyScore, completeness: pa.CompletenessScore, words });
      }

      if (url.pathname === '/progress') {
        if (!env.PROGRESS) return json({ error: 'archivio KV non collegato (PROGRESS)' }, 503);
        if (req.method === 'GET') {
          const v = await env.PROGRESS.get(key);
          return json(v ? JSON.parse(v) : { state: null, savedAt: 0 });
        }
        if (req.method === 'PUT') {
          const text = await req.text();
          if (text.length > MAX_BYTES) return json({ error: 'dati troppo grandi' }, 413);
          let body; try { body = JSON.parse(text); } catch (e) { return json({ error: 'JSON non valido' }, 400); }
          if (!body || typeof body.state !== 'object' || body.state === null || body.state.v !== 2) return json({ error: 'formato dei progressi non riconosciuto' }, 400);
          const savedAt = Date.now();
          await env.PROGRESS.put(key, JSON.stringify({ state: body.state, savedAt }));
          return json({ ok: true, savedAt });
        }
      }
      return json({ error: 'percorso non trovato' }, 404);
    } catch (e) {
      return json({ error: 'errore interno: ' + (e && e.message || e) }, 500);
    }
  }
};

const VOICES = ['ja-JP-NanamiNeural', 'ja-JP-KeitaNeural'];
const RATES = { slow: '-15%', normal: '0%' };
function xmlEscape(s) { return String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c])); }
function b64utf8(s) { const b = new TextEncoder().encode(s); let bin = ''; for (const x of b) bin += String.fromCharCode(x); return btoa(bin); }
async function sha256(s) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 32); }

async function issueToken(env) {
  const r = await fetch(`https://${env.AZURE_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
    method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': env.AZURE_KEY, 'Content-Length': '0' }
  });
  return { ok: r.ok, status: r.status, token: r.ok ? await r.text() : null };
}

// confronto a tempo costante, per non dare indizi sul codice a chi prova a indovinarlo
function sameString(a, b) {
  a = String(a); b = String(b);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
