const { db } = require('./firebase');

// Very small admin gate: a `role: "admin"` field on the user's own
// /users/{uid} doc. There's no self-service way to become admin — set this
// manually in the Firebase console (Firestore -> users -> your doc ->
// add field role = "admin") for whichever account(s) should review drafts.
async function isAdmin(userId) {
  if (!userId) return false;
  const doc = await db.collection('users').doc(userId).get();
  return doc.exists && doc.data().role === 'admin';
}

module.exports = { isAdmin };
