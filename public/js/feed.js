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
let articlesUnsubscribe = null;

function stopArticlesRealtime() {
  if (articlesUnsubscribe) {
    articlesUnsubscribe();
    articlesUnsubscribe = null;
  }
}

function stampsFor(post) {
  const stamps = [];
  if (post.flag) stamps.push(`<span class="stamp ${post.flag.level}">${post.flag.label}</span>`);
  if (post.verifierReviewed) stamps.push('<span class="stamp teal">verifier reviewed</span>');
  if (post.aiAssisted) stamps.push('<span class="stamp amber">AI-assisted, human-reviewed</span>');
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
    const firstSlide = (post.slides || [])[0];
    return `
      <div class="meta"><span>CARD · ${(post.slides || []).length} SLIDES</span><span>${sourceLabel}</span></div>
      <p class="headline">${post.headline}</p>
      ${firstSlide ? `<p class="content-preview">${truncateText(firstSlide.caption, 140)}</p>` : ''}
      ${stampsFor(post)}
    `;
  }

  if (post.type === 'article') {
    const minutes = Math.max(1, Math.round((post.content || '').split(' ').length / 200));
    return `
      <div class="meta"><span>ARTICLE · ${minutes} MIN READ</span><span>${sourceLabel}</span></div>
      <p class="headline">${post.headline}</p>
      ${post.content ? `<p class="content-preview">${truncateText(post.content, 180)}</p>` : ''}
      ${stampsFor(post)}
    `;
  }

  if (post.type === 'news') {
    return `
      <div class="meta"><span>NEWS · ${(post.sourceName || 'UNKNOWN').toUpperCase()}</span><span>${formatDate(post.timestamp).toUpperCase()}</span></div>
      <p class="headline">${post.headline}</p>
      <p class="snippet" style="font-size:13px; color:#a6a399; line-height:1.5;">${post.snippet || ''}</p>
      ${post.sourceUrl ? `
        <a class="news-link-out" href="${post.sourceUrl}" target="_blank" rel="noopener noreferrer">
          <span>Read on ${post.sourceName || 'source'}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </a>
      ` : ''}
    `;
  }

  return `<p class="headline">${post.headline || 'Untitled'}</p>`;
}

const REPORT_REASONS = [
  { value: 'misleading', label: 'Misleading' },
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'other', label: 'Other' },
];

function saveToggleHtml() {
  return `<button type="button" class="save-toggle-btn" aria-label="Save this post">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
  </button>`;
}

function reportControlHtml() {
  return `
    <div class="report-control">
      <button type="button" class="report-toggle-btn" aria-label="Report this post">⚑</button>
      <div class="report-menu">
        ${REPORT_REASONS.map(r => `<button type="button" class="report-reason-btn" data-reason="${r.value}">${r.label}</button>`).join('')}
      </div>
    </div>
  `;
}

async function submitReport(postId, reason) {
  const token = localStorage.getItem('token');
  if (!token) { showToast('Please sign in first'); return false; }

  try {
    const res = await fetch(`${API_URL}/flags/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ postId, reason }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Failed to report'); return false; }
    return true;
  } catch (error) {
    showToast('Failed to report: ' + error.message);
    return false;
  }
}

function buildCardEl(post) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.postId = post.id;
  el.innerHTML = `<div class="card-body">${renderPost(post)}<div class="card-actions">${saveToggleHtml()}${reportControlHtml()}</div></div>`;
  el.addEventListener('click', (e) => {
    const stamp = e.target.closest('.creator-stamp');
    if (stamp) {
      e.stopPropagation();
      openProfile(stamp.dataset.creatorId);
      return;
    }
    if (e.target.closest('.news-link-out')) {
      e.stopPropagation();
      return; // let the anchor's own navigation happen
    }

    const saveToggle = e.target.closest('.save-toggle-btn');
    if (saveToggle) {
      e.stopPropagation();
      toggleSave(post.id, saveToggle);
      return;
    }

    const reportToggle = e.target.closest('.report-toggle-btn');
    if (reportToggle) {
      e.stopPropagation();
      reportToggle.closest('.report-control').classList.toggle('open');
      return;
    }

    const reasonBtn = e.target.closest('.report-reason-btn');
    if (reasonBtn) {
      e.stopPropagation();
      const control = reasonBtn.closest('.report-control');
      submitReport(post.id, reasonBtn.dataset.reason).then((ok) => {
        showToast(ok ? "Reported — thanks, this helps keep the feed trustworthy" : 'Failed to report');
        control.classList.remove('open');
      });
      return;
    }
    if (post.type === 'card') {
      openCardViewer(post);
    } else {
      openSourcePanel(post);
    }
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
  if (topicKey === 'articles') {
    initArticlesRealtime();
    return;
  }
  stopArticlesRealtime();

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

// Live-updating Articles section — uses the Firestore client SDK directly
// (onSnapshot) instead of the one-shot /api/posts/feed fetch, so new
// articles appear the moment they're published, no refresh needed.
// Requires a Firestore composite index on (type ASC, timestamp DESC) —
// see firestore.indexes.json.
function initArticlesRealtime() {
  const container = document.getElementById('feedContainer');
  const nudge = document.getElementById('depthNudge');
  if (!container) return;

  stopArticlesRealtime();
  container.innerHTML = '';
  if (nudge) nudge.style.display = 'none';

  articlesUnsubscribe = db.collection('posts')
    .where('type', '==', 'article')
    .orderBy('timestamp', 'desc')
    .limit(20)
    .onSnapshot(
      (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
          container.innerHTML = `<div class="card"><div class="card-body"><p class="headline">No articles yet — be the first to write one.</p></div></div>`;
          return;
        }
        snapshot.forEach((doc) => {
          container.appendChild(buildCardEl({ id: doc.id, ...doc.data() }));
        });
      },
      (error) => {
        console.error('Articles realtime error:', error);
        container.innerHTML = `<div class="card"><div class="card-body"><p class="headline">Couldn't load articles live — check your connection.</p></div></div>`;
      }
    );
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
      else if (tab === 'create') openCreatePanel();
      else if (tab === 'settings') openSettingsPanel();
      else showToast(`${tab[0].toUpperCase()}${tab.slice(1)} isn't built yet`);
    });
  }

  setupProfileUI();
  setupCreateUI();
  setupSettingsUI();
  setupReviewUI();
  setupModerationUI();
  setupSearchUI();
  setupSavesUI();
  setupCardViewerUI();
  setupFeedWheelNav();
}

// Desktop mouse-wheel / trackpad navigation for the snap-scroll feed.
// CSS scroll-snap alone can settle mid-transition with rapid wheel deltas
// (common on trackpads), leaving two cards partially visible at once —
// handling wheel events explicitly in JS avoids that: one gesture always
// means exactly one card, using each card's real on-screen position
// rather than assuming uniform spacing.
let feedWheelLocked = false;

function currentCardIndex(container) {
  const cards = [...container.querySelectorAll('.card')];
  let closest = 0;
  let closestDist = Infinity;
  cards.forEach((card, i) => {
    const dist = Math.abs(card.offsetTop - container.scrollTop);
    if (dist < closestDist) {
      closestDist = dist;
      closest = i;
    }
  });
  return closest;
}

function scrollToCardIndex(container, index) {
  const cards = container.querySelectorAll('.card');
  if (!cards.length) return;
  const clamped = Math.max(0, Math.min(index, cards.length - 1));
  cards[clamped].scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setupFeedWheelNav() {
  const container = document.getElementById('feedContainer');
  if (!container) return;

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (feedWheelLocked) return;

    const direction = e.deltaY > 0 ? 1 : -1;
    scrollToCardIndex(container, currentCardIndex(container) + direction);

    // Locked for roughly the smooth-scroll duration so a long trackpad
    // gesture (many rapid wheel events) still only moves one card.
    feedWheelLocked = true;
    setTimeout(() => { feedWheelLocked = false; }, 500);
  }, { passive: false });
}
