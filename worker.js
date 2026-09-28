/* Sillabario — server (Cloudflare Worker)
 *
 * Cosa fa:
 *   GET  /health    controlla il collegamento: codice di accesso, archivio progressi, chiave Azure
 *   GET  /token     rilascia un token Azure temporaneo (10 minuti): la chiave vera resta qui, mai nell'app
 *   GET  /progress  legge i progressi salvati
 *   PUT  /progress  salva i progressi (l'app li unisce prima con quelli già presenti)
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
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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
