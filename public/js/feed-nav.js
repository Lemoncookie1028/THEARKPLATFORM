// Desktop navigation for the snap-scroll feed: arrow keys and on-screen
// buttons. Mobile already gets "swipe to advance" for free from CSS
// scroll-snap (see #feedContainer in styles.css) — this file only adds the
// non-touch ways to do the same thing.

function currentCardIndex() {
  const container = document.getElementById('feedContainer');
  if (!container || !container.clientHeight) return 0;
  // Each .card is exactly one container-height tall (scroll-snap relies on
  // this), so dividing scroll position by that height gives the index of
  // whichever card is currently snapped into view.
  return Math.round(container.scrollTop / container.clientHeight);
}

function scrollToCardIndex(index) {
  const container = document.getElementById('feedContainer');
  if (!container) return;
  const cards = container.querySelectorAll('.card');
  if (!cards.length) return;

  const clamped = Math.max(0, Math.min(index, cards.length - 1));
  container.scrollTo({ top: cards[clamped].offsetTop, behavior: 'smooth' });
}

function feedNavNext() {
  scrollToCardIndex(currentCardIndex() + 1);
}

function feedNavPrev() {
  scrollToCardIndex(currentCardIndex() - 1);
}

// True if the person is somewhere that arrow keys shouldn't be hijacked —
// typing in a field, or looking at an overlay (card viewer, any slide-up
// panel) that has its own reason to exist independent of the feed.
function feedNavShouldIgnoreKeys() {
  const tag = document.activeElement && document.activeElement.tagName;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return true;

  const cardViewer = document.getElementById('cardViewerPanel');
  if (cardViewer && cardViewer.classList.contains('open')) return true;

  if (document.querySelector('.source-panel.open')) return true;

  return false;
}

function setupFeedNavUI() {
  document.getElementById('feedPrevBtn').addEventListener('click', feedNavPrev);
  document.getElementById('feedNextBtn').addEventListener('click', feedNavNext);

  document.addEventListener('keydown', (e) => {
    if (feedNavShouldIgnoreKeys()) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      feedNavNext();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      feedNavPrev();
    }
  });
}
