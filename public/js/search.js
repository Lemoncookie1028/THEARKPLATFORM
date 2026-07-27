// Search. Worth being upfront about the limitation: Firestore doesn't do
// full-text search natively, so this fetches a batch of recent posts and
// filters by a case-insensitive headline substring match in the browser.
// Fine at the scale of "one creator's feed," but it's not a real search
// engine — it won't find matches beyond whatever LIMIT below pulls in, and
// it only matches the headline, not full article/slide content.

const SEARCH_POOL_LIMIT = 100;
let searchDebounceTimer = null;

async function runSearch(query) {
  const container = document.getElementById('feedContainer');
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    initFeed('for-you');
    return;
  }

  stopArticlesRealtime();
  container.innerHTML = '<div class="card"><div class="card-body"><p class="headline">Searching…</p></div></div>';

  try {
    const res = await fetch(`${API_URL}/posts/feed?limit=${SEARCH_POOL_LIMIT}`);
    const data = await res.json();
    const matches = (data.posts || []).filter(p =>
      (p.headline || '').toLowerCase().includes(trimmed)
    );

    container.innerHTML = '';
    if (!matches.length) {
      container.innerHTML = `<div class="card"><div class="card-body"><p class="headline">No headlines matching "${query}" in the last ${SEARCH_POOL_LIMIT} posts.</p></div></div>`;
      return;
    }
    matches.forEach(post => container.appendChild(buildCardEl(post)));
  } catch (error) {
    container.innerHTML = `<div class="card"><div class="card-body"><p class="headline">Search failed — try again.</p></div></div>`;
  }
}

function openSearchBar() {
  document.getElementById('searchBar').style.display = 'flex';
  document.getElementById('searchInput').focus();
}

function closeSearchBar() {
  document.getElementById('searchBar').style.display = 'none';
  document.getElementById('searchInput').value = '';
  initFeed('for-you');
}

function setupSearchUI() {
  const toggleBtn = document.getElementById('searchToggleBtn');
  if (toggleBtn) toggleBtn.addEventListener('click', openSearchBar);

  const closeBtn = document.getElementById('closeSearchBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeSearchBar);

  const input = document.getElementById('searchInput');
  if (input) {
    input.addEventListener('input', () => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => runSearch(input.value), 300);
    });
  }
}
