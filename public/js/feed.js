// Feed rendering + tab/source-panel wiring.
// This file was referenced in index.html but never existed in the project —
// it's the reason the feed screen was always empty.

const TOPIC_LABELS = {
  'for-you': null, // no topic filter
  monetary: 'Monetary Policy',
  space: 'Space',
  health: 'Health',
};

let clipsSeenThisSession = 0;

function stampsFor(post) {
  const stamps = [];
  if (post.flag) stamps.push(`<span class="stamp ${post.flag.level}">${post.flag.label}</span>`);
  if (post.verifierReviewed) stamps.push('<span class="stamp teal">verifier reviewed</span>');
  if (post.creatorName && post.creatorId) {
    stamps.push(`<span class="stamp creator-stamp" data-creator-id="${post.creatorId}">by ${post.creatorName}</span>`);
  } else if (post.creatorName) {
    stamps.push(`<span class="stamp">by ${post.creatorName}</span>`);
  }
  return stamps.length ? `<div class="stamp-group">${stamps.join('')}</div>` : '';
}

function renderPost(post) {
  const sourceLabel = `${post.sourceCount || 0} SOURCE${post.sourceCount === 1 ? '' : 'S'}`;

  if (post.type === 'clip') {
    const confidence = post.confidence; // optional — only clips with a reviewed confidence score show the waterline
    return `
      <div class="meta"><span>CLIP · ${post.duration || '0:00'}</span><span>${sourceLabel}</span></div>
      <p class="headline">${post.headline}</p>
      ${stampsFor(post)}
      ${confidence ? `
        <div class="waterline"><div class="fill" style="width:${confidence.pct}%; background:${confidence.level === 'amber' ? '#d89b4a' : '#3fa88c'}"></div></div>
        <div class="waterline-label"><span>confidence</span><span>${confidence.label}</span></div>
      ` : ''}
    `;
  }

  if (post.type === 'card') {
    return `
      <div class="meta"><span>CARD · ${(post.slides || []).length} SLIDES</span><span>${sourceLabel}</span></div>
      <p class="headline">${post.headline}</p>
      ${stampsFor(post)}
    `;
  }

  if (post.type === 'article') {
    const minutes = Math.max(1, Math.round((post.content || '').split(' ').length / 200));
    return `
      <div class="meta"><span>ARTICLE · ${minutes} MIN READ</span><span>${sourceLabel}</span></div>
      <p class="headline">${post.headline}</p>
      ${stampsFor(post)}
    `;
  }

  if (post.type === 'news') {
    return `
      <div class="meta"><span>NEWS · ${(post.sourceName || 'UNKNOWN').toUpperCase()}</span><span>${formatDate(post.timestamp).toUpperCase()}</span></div>
      <p class="headline">${post.headline}</p>
      <p class="snippet" style="font-size:13px; color:#a6a399; line-height:1.5;">${post.snippet || ''}</p>
    `;
  }

  return `<p class="headline">${post.headline || 'Untitled'}</p>`;
}

function buildCardEl(post) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.postId = post.id;
  el.innerHTML = `<div class="card-body">${renderPost(post)}</div>`;
  el.addEventListener('click', (e) => {
    const stamp = e.target.closest('.creator-stamp');
    if (stamp) {
      e.stopPropagation();
      openProfile(stamp.dataset.creatorId);
      return;
    }
    openSourcePanel(post);
  });
  return el;
}

async function fetchFeed(topicKey) {
  const topicName = TOPIC_LABELS[topicKey];
  const params = new URLSearchParams({ limit: '20' });
  if (topicName) params.set('topic', topicName);

  const res = await fetch(`${API_URL}/posts/feed?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to load feed');
  const data = await res.json();
  return data.posts || [];
}

async function initFeed(topicKey = 'for-you') {
  const container = document.getElementById('feedContainer');
  const nudge = document.getElementById('depthNudge');
  if (!container) return;

  container.innerHTML = '';
  if (nudge) nudge.style.display = 'none';
  clipsSeenThisSession = 0;

  try {
    const posts = await fetchFeed(topicKey);

    if (!posts.length) {
      container.innerHTML = `<div class="card"><div class="card-body"><p class="headline">Nothing here yet — be the first to post in this topic.</p></div></div>`;
      return;
    }

    posts.forEach((post) => {
      container.appendChild(buildCardEl(post));
      if (post.type === 'clip') {
        clipsSeenThisSession += 1;
        if (clipsSeenThisSession === 2 && nudge) nudge.style.display = 'flex';
      }
    });
  } catch (error) {
    console.error('Feed load error:', error);
    container.innerHTML = `<div class="card"><div class="card-body"><p class="headline">Couldn't load the feed. Pull to refresh.</p></div></div>`;
  }
}

function openSourcePanel(post) {
  const panel = document.getElementById('sourcePanel');
  const list = document.getElementById('sourceList');
  if (!panel || !list) return;

  const sources = post.sources || [];
  list.innerHTML = sources.length
    ? sources.map(s => `
        <div class="source-item">
          <span class="badge">SRC</span>
          <a href="${s.url}" target="_blank" rel="noreferrer" style="color:inherit; text-decoration:none;">${s.title || s.url}</a>
        </div>
      `).join('')
    : `<div class="source-item"><span class="badge">—</span> No sources attached to this post yet.</div>`;

  panel.classList.add('open');
}

function closeSourcePanel() {
  const panel = document.getElementById('sourcePanel');
  if (panel) panel.classList.remove('open');
}

function setupFeedUI() {
  const tabContainer = document.getElementById('tabContainer');
  if (tabContainer) {
    tabContainer.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      tabContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      initFeed(tab.dataset.tab);
    });
  }

  const closeBtn = document.getElementById('closePanel');
  if (closeBtn) closeBtn.addEventListener('click', closeSourcePanel);

  const bottomBar = document.querySelector('.bottom-bar');
  if (bottomBar) {
    bottomBar.addEventListener('click', (e) => {
      const icon = e.target.closest('[data-tab]');
      if (!icon) return;
      bottomBar.querySelectorAll('svg').forEach(s => s.classList.remove('active'));
      icon.classList.add('active');

      const tab = icon.dataset.tab;
      if (tab === 'home') initFeed('for-you');
      else if (tab === 'profile') {
        if (!currentUser) { showToast('Please sign in first'); return; }
        openProfile(currentUser.id);
      }
      else showToast(`${tab[0].toUpperCase()}${tab.slice(1)} isn't built yet`);
    });
  }

  setupProfileUI();
}
