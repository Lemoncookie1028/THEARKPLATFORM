const admin = require('firebase-admin');
const { initializeApp, cert } = require('firebase-admin/app');

// Admin SDK credentials MUST come from environment variables only.
// Never hardcode a service account key here — if this file is ever
// committed with real values in it, rotate the key immediately in the
// Firebase console (Project Settings > Service Accounts).
if (!admin.apps.length) {
  const required = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_STORAGE_BUCKET'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `Missing required Firebase env vars: ${missing.join(', ')}. ` +
      `Set these in your Vercel project settings (or .env.local for local dev) — do not hardcode them in source.`
    );
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // Private keys are usually stored with literal \n sequences in env vars;
    // this converts them back to real newlines for the PEM block.
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };

  admin.initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();

module.exports = { admin, db, auth, storage };
