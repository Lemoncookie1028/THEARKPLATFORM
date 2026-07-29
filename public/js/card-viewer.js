// Full-screen slide viewer for Card posts. Tap the right half to advance,
// left half to go back, swipe left/right on touch devices, or close and
// you're back in the feed. Tapping past the last slide closes the viewer
// (same pattern as "stories" style UIs), rather than doing nothing.

let viewerPost = null;
let viewerIndex = 0;

function renderViewerDots() {
  const dots = document.getElementById('cardViewerDots');
  const slides = viewerPost.slides || [];
  dots.innerHTML = slides.map((_, i) => {
    const cls = i === viewerIndex ? 'dot active' : i < viewerIndex ? 'dot done' : 'dot';
    return `<div class="${cls}"></div>`;
  }).join('');
}

function renderViewerSlide() {
  const slides = viewerPost.slides || [];
  const slide = slides[viewerIndex];
  document.getElementById('cardViewerHeadline').textContent = viewerPost.headline || '';
  document.getElementById('cardViewerCaption').textContent = slide ? slide.caption : '';
  document.getElementById('cardViewerTopic').textContent = `CARD · ${viewerIndex + 1}/${slides.length}`;
  renderViewerDots();
}

function viewerNext() {
  const slides = viewerPost.slides || [];
  if (viewerIndex >= slides.length - 1) {
    closeCardViewer();
    return;
  }
  viewerIndex += 1;
  renderViewerSlide();
}

function viewerPrev() {
  if (viewerIndex <= 0) return;
  viewerIndex -= 1;
  renderViewerSlide();
}

function openCardViewer(post) {
  if (!post.slides || !post.slides.length) {
    showToast('This card has no slides');
    return;
  }
  viewerPost = post;
  viewerIndex = 0;
  renderViewerSlide();
  document.getElementById('cardViewerPanel').classList.add('open');
}

function closeCardViewer() {
  document.getElementById('cardViewerPanel').classList.remove('open');
  viewerPost = null;
}

function setupCardViewerUI() {
  document.getElementById('closeCardViewer').addEventListener('click', closeCardViewer);
  document.getElementById('cardViewerPrev').addEventListener('click', viewerPrev);
  document.getElementById('cardViewerNext').addEventListener('click', viewerNext);

  const body = document.querySelector('.card-viewer-body');
  let touchStartX = null;

  body.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  body.addEventListener('touchend', (e) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const SWIPE_THRESHOLD = 50;
    if (deltaX <= -SWIPE_THRESHOLD) viewerNext();
    else if (deltaX >= SWIPE_THRESHOLD) viewerPrev();
    touchStartX = null;
  });
}
