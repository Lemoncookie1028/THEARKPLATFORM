// Calls the Gemini API (free tier via Google AI Studio — no credit card
// needed) to draft a multi-slide Card from a short news item. Output is
// ALWAYS conservative and ALWAYS goes to a human review queue (see
// api/drafts/*) — never published directly. The prompt is deliberately
// strict about not inventing facts beyond what's provided, since the
// source material (an RSS snippet) is short and hallucination risk on a
// "trustworthy info" platform is a real cost, not a style nitpick.
//
// Get a free key at https://aistudio.google.com/apikey — no billing setup
// required for the free tier. Rate limits apply (Google's free tier is
// generous but not unlimited) — if you start seeing 429s in the logs,
// that's the free-tier cap, not a bug.

async function draftCardFromNews({ headline, snippet, sourceName, sourceUrl }) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set — cannot generate AI drafts');
  }

  const prompt = `You are drafting a short "Card" post (a swipeable multi-slide summary) for a news platform, based ONLY on the text below. This text is a short RSS snippet, not the full article — do not invent facts, numbers, quotes, or context that aren't present in it. If the snippet doesn't give you enough to work with, write fewer, more general slides rather than filling gaps with assumptions.

Source: ${sourceName}
Headline: ${headline}
Snippet: ${snippet}

Respond with ONLY valid JSON, no markdown fences, no commentary, in this exact shape:
{"headline": "a clear, accurate headline (can reuse or lightly tighten the original)", "slides": [{"caption": "..."}, {"caption": "..."}]}

3 to 5 slides. Each caption should be one or two plain sentences. Do not include a slide that just repeats the headline.`;

  // "gemini-flash-latest" is a Google-maintained alias that always points to
  // their current stable Flash model, so this doesn't go stale as Google
  // ships new versions — no need to hunt down and update a model string
  // every few months.
  const model = 'gemini-flash-latest';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();

  let parsed;
  try {
    parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
  } catch (e) {
    throw new Error(`Could not parse AI response as JSON: ${text.slice(0, 200)}`);
  }

  if (!parsed.headline || !Array.isArray(parsed.slides) || parsed.slides.length < 1) {
    throw new Error('AI response missing required fields');
  }

  return {
    headline: parsed.headline,
    slides: parsed.slides.filter(s => s && s.caption).map(s => ({ caption: String(s.caption).slice(0, 300) })),
  };
}

module.exports = { draftCardFromNews };

// Generates an original, evergreen educational Card for a given topic —
// NOT tied to a specific news item, so there's no source snippet to ground
// it against. This is a meaningfully higher hallucination risk than
// draftCardFromNews, so the prompt is even more restrictive: stick to
// well-established, textbook-level concepts, never invent a specific
// statistic, date, or current-events claim it can't ground in something
// provided. This always lands in the review queue, clearly labeled as
// having no source — the reviewer needs to know it's fully AI-authored,
// not AI-summarized, when deciding whether to publish.
async function draftOriginalCard(topic) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set — cannot generate AI drafts');
  }

  const prompt = `Write a short educational "Card" post (a swipeable multi-slide explainer) about a well-established, textbook-level concept in the general subject area of "${topic}". This is NOT a news post — do not reference specific recent events, dates, statistics, or current figures you can't be fully certain of. Stick to durable, foundational knowledge that would be true regardless of what year it is. If you're not confident something is broadly and uncontroversially true, leave it out rather than including it.

Respond with ONLY valid JSON, no markdown fences, no commentary, in this exact shape:
{"headline": "a clear, specific headline naming the concept", "slides": [{"caption": "..."}, {"caption": "..."}]}

3 to 5 slides. Each caption should be one or two plain sentences. Do not include a slide that just repeats the headline.`;

  const model = 'gemini-flash-latest';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();

  let parsed;
  try {
    parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''));
  } catch (e) {
    throw new Error(`Could not parse AI response as JSON: ${text.slice(0, 200)}`);
  }

  if (!parsed.headline || !Array.isArray(parsed.slides) || parsed.slides.length < 1) {
    throw new Error('AI response missing required fields');
  }

  return {
    headline: parsed.headline,
    slides: parsed.slides.filter(s => s && s.caption).map(s => ({ caption: String(s.caption).slice(0, 300) })),
  };
}

module.exports = { draftCardFromNews, draftOriginalCard };
