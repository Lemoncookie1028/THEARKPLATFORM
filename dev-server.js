// Local dev server that doesn't depend on the Vercel CLI.
//
// Your API handlers are already written in a Vercel-Node-runtime style —
// `module.exports = async (req, res) => {...}` using res.status()/.json()
// and req.body/req.query — which is deliberately Express-compatible, so
// this just wires them up directly with no rewriting needed.
//
// Usage:  npm run dev:local

require('dotenv').config({ path: '.env.local' });
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const API_DIR = path.join(__dirname, 'api');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Recursively walk api/ and mount every .js file (except _lib) at the path
// Vercel's file-based routing would give it — api/posts-handler.js -> /api/posts-handler
function mountApiRoutes(dir, base = '/api') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '_lib') continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      mountApiRoutes(fullPath, `${base}/${entry.name}`);
    } else if (entry.name.endsWith('.js')) {
      const routeName = entry.name.replace(/\.js$/, '');
      const routePath = `${base}/${routeName}`;
      const handler = require(fullPath);
      app.all(routePath, (req, res) => {
        Promise.resolve(handler(req, res)).catch((err) => {
          console.error(`Error in ${routePath}:`, err);
          if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
        });
      });
      console.log(`mounted ${routePath}`);
    }
  }
}

// Mirrors the "rewrites" array in vercel.json — Vercel resolves those at
// the platform level, but locally we need to replicate them ourselves so
// e.g. /api/auth/signin still reaches api/auth-handler.js the same way.
function mountRewrite(publicPath, handlerFile) {
  const handler = require(path.join(API_DIR, handlerFile));
  app.all(`${publicPath}/:action`, (req, res) => {
    req.query.action = req.params.action;
    Promise.resolve(handler(req, res)).catch((err) => {
      console.error(`Error in ${publicPath}/:action:`, err);
      if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    });
  });
  console.log(`mounted ${publicPath}/:action -> ${handlerFile} (rewrite)`);
}

mountApiRoutes(API_DIR);

mountRewrite('/api/auth', 'auth-handler.js');
mountRewrite('/api/posts', 'posts-handler.js');
mountRewrite('/api/drafts', 'drafts-handler.js');
mountRewrite('/api/flags', 'flags-handler.js');

// Static frontend, served last so it doesn't shadow /api routes
app.use(express.static(PUBLIC_DIR));
app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\nTHE ARK running at http://localhost:${PORT} (no Vercel CLI)\n`);
});
