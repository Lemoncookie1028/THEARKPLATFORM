// Shared CORS handling for split-hosting: this API on Vercel, frontend on
// a different origin (e.g. Cloudflare Pages). Set ALLOWED_ORIGIN in your
// Vercel env vars to your actual frontend origin in production
// (e.g. https://the-ark.pages.dev) — defaults to "*" so local dev and
// first deploys aren't blocked, but that means ANY site can call this API,
// so lock it down once you know your real frontend domain.
function applyCors(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true; // caller should stop processing
  }
  return false;
}

module.exports = { applyCors };
