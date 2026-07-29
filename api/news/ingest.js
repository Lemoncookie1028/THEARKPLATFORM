const Parser = require('rss-parser');
const { db, admin } = require('../_lib/firebase');
const { draftCardFromNews } = require('../_lib/ai');

const parser = new Parser({ timeout: 100000000000000 });

// Curated feed list mapped to the platform's fixed topic taxonomy.
// These are placeholders — swap in whichever outlets you want to pull from.
// Only RSS feeds are used (headline + summary + link), never full article
// scraping — see Section 3.5 of the concept doc for why that line matters.
const FEEDS = [
  { url: 'https://www.federalreserve.gov/feeds/press_all.xml', sourceName: 'Federal Reserve', topic: 'Monetary Policy' },
  { url: 'https://www.nasa.gov/feed/', sourceName: 'NASA', topic: 'Space' },
  { url: 'https://feeds.npr.org/1128/rss.xml', sourceName: 'NPR Health', topic: 'Health' },
  { url: 'https://feeds.npr.org/1001/rss.xml', sourceName: 'NPR News', topic: null },
];

function truncate(text, max = 200) {
  if (!text) return '';
  const clean = text.replace(/<[^>]*>/g, '').trim();
  return clean.length > max ? clean.slice(0, max).trim() + '…' : clean;
}

module.exports = async (req, res) => {
  // Protect this endpoint — it's meant to be hit by Vercel Cron only, not
  // publicly triggerable (anyone calling it repeatedly could spam writes).
  const authHeader = req.headers.authorization;
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = { checked: 0, added: 0, skipped: 0, errors: [] };

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);

      for (const item of parsed.items.slice(0, 10)) {
        results.checked += 1;
        const link = item.link;
        if (!link) { results.skipped += 1; continue; }

        // Dedupe on the source link so re-running the cron doesn't create duplicates
        const existing = await db.collection('posts')
          .where('sourceUrl', '==', link)
          .limit(1)
          .get();

        if (!existing.empty) { results.skipped += 1; continue; }

        const postData = {
          type: 'news',
          headline: truncate(item.title, 140),
          sourceName: feed.sourceName,
          sourceUrl: link,
          snippet: truncate(item.contentSnippet || item.summary || item.content),
          timestamp: item.isoDate ? new Date(item.isoDate) : admin.firestore.FieldValue.serverTimestamp(),
          sourceCount: 1,
          sources: [{ title: feed.sourceName, url: link }],
          views: 0,
          saves: 0,
          shares: 0,
        };

        if (feed.topic) postData.topicId = feed.topic;

        await db.collection('posts').add(postData);
        results.added += 1;

        // Draft an AI-summarized Card from this item for human review.
        // Failures here don't affect the news post above — that's already
        // published, this is a separate, optional, best-effort step.
        if (process.env.GEMINI_API_KEY) {
          try {
            const draft = await draftCardFromNews({
              headline: postData.headline,
              snippet: postData.snippet,
              sourceName: feed.sourceName,
              sourceUrl: link,
            });

            await db.collection('drafts').add({
              type: 'card',
              headline: draft.headline,
              slides: draft.slides,
              sourceName: feed.sourceName,
              sourceUrl: link,
              topicId: feed.topic || null,
              status: 'pending',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            results.drafted = (results.drafted || 0) + 1;
          } catch (draftErr) {
            results.errors.push(`AI draft (${feed.sourceName}): ${draftErr.message}`);
          }
        }
      }
    } catch (err) {
      results.errors.push(`${feed.sourceName}: ${err.message}`);
    }
  }

  res.status(200).json(results);
};
