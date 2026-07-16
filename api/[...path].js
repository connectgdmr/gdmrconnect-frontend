// Vercel serverless proxy — forwards all /api/* requests to Railway backend.
// Runs same-origin on gdmrconnect.com so Jio mobile data cannot block it.
export const config = { api: { bodyParser: false } };

const BACKEND = 'https://gdmrconnect-backend-production.up.railway.app';

export default async function handler(req, res) {
  // req.url = "/api/login" → strip leading /api → "/login" → BACKEND + "/api" + "/login"
  const targetUrl = BACKEND + '/api' + req.url.replace(/^\/api/, '');

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);

  const headers = {};
  for (const key of ['content-type', 'authorization', 'accept', 'accept-language']) {
    if (req.headers[key]) headers[key] = req.headers[key];
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) || body.length === 0 ? undefined : body,
    });

    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    res.status(503).json({ message: 'Unable to reach the server.' });
  }
}
