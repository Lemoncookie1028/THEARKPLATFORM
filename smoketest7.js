const { JSDOM } = require('jsdom');

(async () => {
  const errors = [];
  const scrollToCalls = [];

  const dom = await JSDOM.fromURL('http://localhost:4500/', {
    runScripts: 'dangerously',
    resources: 'usable',
    beforeParse(window) {
      window.firebase = {
        initializeApp: () => {},
        firestore: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }) }),
        auth: () => ({ currentUser: null, onAuthStateChanged: () => {}, signInWithEmailAndPassword: async () => ({}) }),
      };
      window.fetch = async (url) => {
        if (url.includes('/auth/verify')) return { ok: false, json: async () => ({}) };
        if (url.includes('/posts/feed')) return { ok: true, json: async () => ({ posts: [] }) };
        return { ok: false, json: async () => ({}) };
      };
      window.addEventListener('error', (e) => errors.push(e.error ? e.error.stack : e.message));
    },
  });

  const { window } = dom;
  await new Promise((resolve) => {
    if (window.document.readyState === 'complete') return resolve();
    window.addEventListener('load', resolve);
    setTimeout(resolve, 3000);
  });
  await new Promise(r => setTimeout(r, 300));

  // Stub scrollTo to capture calls (jsdom has no real layout/scroll engine)
  const feedContainer = window.document.getElementById('feedContainer');
  feedContainer.scrollTo = (opts) => scrollToCalls.push(opts);
  // Fake a couple of cards so scrollToCardIndex has something to clamp against
  feedContainer.innerHTML = '<div class="card" style="height:500px"></div><div class="card" style="height:500px"></div><div class="card" style="height:500px"></div>';

  console.log('--- functions defined ---');
  ['currentCardIndex', 'scrollToCardIndex', 'feedNavNext', 'feedNavPrev', 'setupFeedNavUI', 'feedNavShouldIgnoreKeys']
    .forEach(fn => console.log(`${fn}: ${typeof window[fn]}`));

  console.log('\n--- clicking next/prev buttons calls scrollTo ---');
  window.document.getElementById('feedNextBtn').click();
  console.log('scrollTo called after next click:', scrollToCalls.length > 0);
  scrollToCalls.length = 0;
  window.document.getElementById('feedPrevBtn').click();
  console.log('scrollTo called after prev click:', scrollToCalls.length > 0);

  console.log('\n--- ArrowDown navigates when nothing is focused ---');
  scrollToCalls.length = 0;
  window.document.activeElement.blur && window.document.activeElement.blur();
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  console.log('scrollTo called on ArrowDown:', scrollToCalls.length > 0);

  console.log('\n--- ArrowDown is IGNORED while typing in the search input ---');
  scrollToCalls.length = 0;
  const searchInput = window.document.getElementById('searchInput');
  searchInput.focus();
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  console.log('scrollTo called while input focused (should be false):', scrollToCalls.length > 0);
  searchInput.blur();

  console.log('\n--- ArrowDown is IGNORED while the card viewer is open ---');
  scrollToCalls.length = 0;
  window.document.getElementById('cardViewerPanel').classList.add('open');
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  console.log('scrollTo called while viewer open (should be false):', scrollToCalls.length > 0);
  window.document.getElementById('cardViewerPanel').classList.remove('open');

  console.log('\n--- clamping: scrollToCardIndex(99) clamps to last card, not out of range ---');
  scrollToCalls.length = 0;
  window.scrollToCardIndex(99);
  console.log('scrollTo call:', scrollToCalls[0]);

  console.log('\n--- errors ---');
  console.log(errors.length ? errors : 'none');

  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
