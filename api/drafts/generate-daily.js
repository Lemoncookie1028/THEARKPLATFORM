const { db, admin } = require('../_lib/firebase');
const { draftOriginalCard } = require('../_lib/ai');

// Same fixed topics used elsewhere in the app.
const TOPICS = ['Monetary Policy', 'Space', 'Health'];

module.exports = async (req, res) => {
  // Cron-only, same pattern as api/news/ingest.js.
  const authHeader = req.headers.authorization;
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = { drafted: 0, errors: [] };

  for (const topic of TOPICS) {
    try {
      const draft = await draftOriginalCard(topic);

      await db.collection('drafts').add({
        type: 'card',
        headline: draft.headline,
        slides: draft.slides,
        sourceName: null,       // no source — this is fully AI-authored, not summarized
        sourceUrl: null,
        origin: 'daily-generated',
        topicId: topic,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      results.drafted += 1;
    } catch (err) {
      results.errors.push(`${topic}: ${err.message}`);
    }
  }

  res.status(200).json(results);
};
