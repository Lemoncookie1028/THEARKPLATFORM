// Explore page — a browsing view that sits in place of the feed.
//
// What's on it, and where the data comes from:
//   • Topics   — the same fixed list the feed tabs use (TOPIC_LABELS in
//                feed.js). Tapping one jumps to that topic's feed. (There is
//                no `topics` collection in Firestore to read from.)
//   • Creators — top accounts by follower count, from the `creators` collection.
//   • Latest   — recent posts, filterable by format (Clips / Cards / ...).
//   • Search   — matches headline, body text, slide text, source, author and
//                topic across everything loaded.
//
// One request (/api/posts/feed) powers topics, latest and search. That means
// search only covers the most recent EXPLORE_POOL posts — fine for now, but
// it's not a full-text index; see the note in search.js.
//
// Everything that came from a user or an RSS feed is escaped before it goes
// into innerHTML.

const EXPLORE_POOL = 150;        // how many recent posts to load
const EXPLORE_ROW_LIMIT = 30;    // rows shown in "Latest"
const EXPLORE_SEARCH_LIMIT = 50; // rows shown for search results
const EXPLORE_CACHE_MS = 60 * 1000;

const EXPLORE_FORMATS = [
  { key: 'all', label: 'All' },
  { key: 'clip', label: 'Clips' },
  { key: 'card', label: 'Cards' },
  { key: 'article', label: 'Articles' },
  { key: 'news', label: 'News' },
];

const exploreState = {
  posts: [],
  creators: [],
  query: '',
  format: 'all',
  status: 'idle', // idle | loading | ready | error
  loadedAt: 0,
  searchTimer: null,
};

function exploreTopics() {
  return Object.entries(TOPIC_LABELS)
    .filter(([, label]) => label)
    .map(([key, label]) => ({ key, label }));
}

function exploreFilteredPosts() {
  const q = exploreState.query.trim().toLowerCase();
  return exploreState.posts.filter((post) => {
    if (exploreState.format !== 'all' && post.type !== exploreState.format) return false;
    if (!q) return true;
    const haystack = [
      post.headline,
      post.snippet,
      post.content,
      post.sourceName,
      post.creatorName,
      post.topicId,
      ...(post.slides || []).map((slide) => slide && slide.caption),
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
}

function exploreFilteredCreators() {
  const q = exploreState.query.trim().toLowerCase();
  if (!q) return exploreState.creators;
  return exploreState.creators.filter((creator) =>
    `${creator.name || creator.displayName || ''} ${creator.handle || ''}`.toLowerCase().includes(q)
  );
}

// ---- rendering ----

function exploreSection(title, inner) {
  return `<section class="explore-section"><h3 class="explore-heading">${escapeHtmlAttr(title)}</h3>${inner}</section>`;
}

function exploreTopicTiles() {
  const poolFull = exploreState.posts.length >= EXPLORE_POOL;
  return `<div class="explore-topics">${exploreTopics().map(({ key, label }) => {
    const count = exploreState.posts.filter((post) => post.topicId === label).length;
    const plus = poolFull ? '+' : '';
    const noun = count === 1 && !plus ? 'post' : 'posts';
    return `<button type="button" class="explore-topic" data-topic="${escapeHtmlAttr(key)}">
      <span class="explore-topic-name">${escapeHtmlAttr(label)}</span>
      <span class="explore-topic-count">${count}${plus} ${noun}</span>
    </button>`;
  }).join('')}</div>`;
}

function exploreChips() {
  return `<div class="explore-chips">${EXPLORE_FORMATS.map(({ key, label }) =>
    `<button type="button" class="explore-chip${exploreState.format === key ? ' active' : ''}" data-format="${key}">${label}</button>`
  ).join('')}</div>`;
}

function exploreCreatorRow(creator) {
  const name = creator.name || creator.displayName || 'Unnamed';
  const followers = creator.followers || 0;
  const handle = creator.handle ? `${creator.handle} · ` : '';
  return `<button type="button" class="explore-creator" data-creator-id="${escapeHtmlAttr(creator.id)}">
    <span class="explore-avatar">${escapeHtmlAttr(initials(name))}</span>
    <span class="explore-creator-text">
      <span class="explore-creator-name">${escapeHtmlAttr(name)}</span>
      <span class="explore-creator-meta">${escapeHtmlAttr(handle)}${followers} follower${followers === 1 ? '' : 's'}</span>
    </span>
  </button>`;
}

function explorePostRow(post) {
  const source = post.sourceName || post.creatorName || '';
  const when = formatDate(post.timestamp);
  const meta = [source, post.topicId, when].filter(Boolean).join(' · ');
  return `<button type="button" class="explore-row" data-post-id="${escapeHtmlAttr(post.id)}">
    <span class="explore-row-type">${escapeHtmlAttr(String(post.type || 'post').toUpperCase())}</span>
    <span class="explore-row-headline">${escapeHtmlAttr(post.headline || 'Untitled')}</span>
    <span class="explore-row-meta">${escapeHtmlAttr(meta)}</span>
  </button>`;
}

function explorePostList(posts, limit) {
  if (!posts.length) return '';
  const shown = posts.slice(0, limit).map(explorePostRow).join('');
  const more = posts.length > limit
    ? `<p class="explore-note">Showing ${limit} of ${posts.length}</p>`
    : '';
  return `<div class="explore-list">${shown}</div>${more}`;
}

function renderExplore() {
  const body = document.getElementById('exploreBody');
  if (!body) return;
  const state = exploreState;

  if (state.status === 'loading' && !state.posts.length) {
    body.innerHTML = '<p class="explore-empty">Loading…</p>';
    return;
  }
  if (state.status === 'error') {
    body.innerHTML = `<p class="explore-empty">Couldn't load posts. Check your connection and try again.</p>
      <button type="button" class="explore-retry" id="exploreRetry">Try again</button>`;
    return;
  }

  const query = state.query.trim();
  const posts = exploreFilteredPosts();
  let html = '';

  if (query) {
    const creators = exploreFilteredCreators();
    if (creators.length) {
      html += exploreSection('CREATORS', `<div class="explore-creators">${creators.map(exploreCreatorRow).join('')}</div>`);
    }
    html += exploreSection(
      `RESULTS · ${posts.length}`,
      exploreChips() + (posts.length
        ? explorePostList(posts, EXPLORE_SEARCH_LIMIT)
        : `<p class="explore-empty">Nothing matches “${escapeHtmlAttr(query)}”.</p>`)
    );
  } else {
    html += exploreSection('TOPICS', exploreTopicTiles());
    if (state.creators.length) {
      html += exploreSection('TOP CREATORS', `<div class="explore-creators">${state.creators.map(exploreCreatorRow).join('')}</div>`);
    }
    html += exploreSection(
      'LATEST',
      exploreChips() + (posts.length
        ? explorePostList(posts, EXPLORE_ROW_LIMIT)
        : `<p class="explore-empty">${state.posts.length ? 'No posts in this format yet.' : 'Nothing here yet — be the first to post.'}</p>`)
    );
  }

  body.innerHTML = html;
}

// ---- data ----

async function fetchExplorePosts() {
  const res = await fetch(`${API_URL}/posts/feed?limit=${EXPLORE_POOL}`);
  if (!res.ok) throw new Error('Feed request failed');
  const data = await res.json();
  return data.posts || [];
}

async function loadExplore(force = false) {
  const state = exploreState;
  const fresh = state.status === 'ready' && Date.now() - state.loadedAt < EXPLORE_CACHE_MS;
  if (fresh && !force) {
    renderExplore();
    return;
  }

  state.status = 'loading';
  renderExplore();

  // Run both at once; losing the creators list shouldn't take the page down.
  const [postsResult, creatorsResult] = await Promise.allSettled([fetchExplorePosts(), loadTopCreators()]);

  if (postsResult.status === 'rejected') {
    state.status = 'error';
    renderExplore();
    return;
  }

  state.posts = postsResult.value;
  state.creators = creatorsResult.status === 'fulfilled'
    ? (creatorsResult.value || []).filter((creator) => creator && (creator.name || creator.displayName))
    : [];
  state.status = 'ready';
  state.loadedAt = Date.now();
  renderExplore();
}

// ---- show / hide ----

function openExplore() {
  stopArticlesRealtime();
  document.getElementById('appContainer').classList.add('explore-active');
  loadExplore();
}

function closeExplore() {
  const app = document.getElementById('appContainer');
  if (app) app.classList.remove('explore-active');
}

function goToTopic(key) {
  closeExplore();
  setBottomNavActive('home');
  const tab = document.querySelector(`#tabContainer .tab[data-tab="${key}"]`);
  if (tab) tab.click(); // the tab's own handler highlights it and loads that topic
}

function openExplorePost(post) {
  if (post.type === 'card') {
    openCardViewer(post);
  } else {
    openSourcePanel(post);
  }
}

function setupExploreUI() {
  const view = document.getElementById('exploreView');
  const search = document.getElementById('exploreSearch');
  if (!view || !search) return;

  search.addEventListener('input', () => {
    clearTimeout(exploreState.searchTimer);
    exploreState.searchTimer = setTimeout(() => {
      exploreState.query = search.value;
      renderExplore();
    }, 150);
  });

  view.addEventListener('click', (e) => {
    const topic = e.target.closest('.explore-topic');
    if (topic) { goToTopic(topic.dataset.topic); return; }

    const chip = e.target.closest('.explore-chip');
    if (chip) {
      exploreState.format = chip.dataset.format;
      renderExplore();
      return;
    }

    const row = e.target.closest('.explore-row');
    if (row) {
      const post = exploreState.posts.find((p) => p.id === row.dataset.postId);
      if (post) openExplorePost(post);
      return;
    }

    const creator = e.target.closest('.explore-creator');
    if (creator) { openProfile(creator.dataset.creatorId); return; }

    if (e.target.closest('#exploreRetry')) loadExplore(true);
  });
}
