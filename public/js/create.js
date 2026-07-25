// Create-post panel: type switching, dynamic slide/source rows, submit.

let createType = 'clip';
let slideCount = 0;
let sourceRowCount = 0;

function openCreatePanel() {
  if (!currentUser) { showToast('Please sign in first'); return; }
  document.getElementById('createPanel').classList.add('open');
}

function closeCreatePanel() {
  document.getElementById('createPanel').classList.remove('open');
}

function addSlideRow(value = '') {
  slideCount += 1;
  const id = `slide-${slideCount}`;
  const wrap = document.createElement('div');
  wrap.className = 'dynamic-row';
  wrap.dataset.slideRow = id;
  wrap.innerHTML = `
    <input type="text" placeholder="Slide ${document.querySelectorAll('#slideList .dynamic-row').length + 1} caption" value="${value}">
    <button type="button" aria-label="Remove slide">✕</button>
  `;
  wrap.querySelector('button').addEventListener('click', () => wrap.remove());
  document.getElementById('slideList').appendChild(wrap);
}

function addSourceRow() {
  const wrap = document.createElement('div');
  wrap.className = 'dynamic-row';
  wrap.innerHTML = `
    <input type="text" placeholder="Source title" class="source-title">
    <input type="url" placeholder="https://..." class="source-url">
    <button type="button" aria-label="Remove source">✕</button>
  `;
  wrap.querySelector('button').addEventListener('click', () => wrap.remove());
  document.getElementById('sourceInputList').appendChild(wrap);
}

function collectSlides() {
  return Array.from(document.querySelectorAll('#slideList .dynamic-row input'))
    .map(input => ({ caption: input.value.trim() }))
    .filter(s => s.caption.length > 0);
}

function collectSources() {
  return Array.from(document.querySelectorAll('#sourceInputList .dynamic-row')).map(row => ({
    title: row.querySelector('.source-title').value.trim(),
    url: row.querySelector('.source-url').value.trim(),
  })).filter(s => s.url.length > 0);
}

function resetCreateForm() {
  document.getElementById('createForm').reset();
  document.getElementById('slideList').innerHTML = '';
  document.getElementById('sourceInputList').innerHTML = '';
  addSlideRow();
  addSourceRow();
  setCreateType('clip');
}

function setCreateType(type) {
  createType = type;
  document.querySelectorAll('#createTypeToggle button').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
  document.querySelector('.create-field-clip').style.display = type === 'clip' ? 'block' : 'none';
  document.querySelector('.create-field-card').style.display = type === 'card' ? 'block' : 'none';
  document.querySelector('.create-field-article').style.display = type === 'article' ? 'block' : 'none';
}

async function submitPost(e) {
  e.preventDefault();

  const token = localStorage.getItem('token');
  if (!token) { showToast('Please sign in first'); return; }

  const headline = document.getElementById('createHeadline').value.trim();
  if (!headline) { showToast('Headline is required'); return; }

  const body = {
    type: createType,
    headline,
    topicId: document.getElementById('createTopic').value || undefined,
    sources: collectSources(),
  };

  if (createType === 'clip') {
    body.videoUrl = document.getElementById('createVideoUrl').value.trim();
    body.duration = document.getElementById('createDuration').value.trim() || '0:00';
    if (!body.videoUrl) { showToast('Clips need a video URL'); return; }
  } else if (createType === 'card') {
    body.slides = collectSlides();
    if (body.slides.length < 1) { showToast('Add at least one slide'); return; }
  } else if (createType === 'article') {
    body.content = document.getElementById('createContent').value.trim();
    if (body.content.length < 10) { showToast('Article needs at least a few sentences'); return; }
  }

  const submitBtn = document.getElementById('publishBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Publishing...';

  try {
    const res = await fetch(`${API_URL}/posts/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      // The banner already nudges toward verifying — this is the moment
      // that actually matters, since it's the real (server-enforced) gate.
      showToast(data.error || 'Failed to publish');
      return;
    }

    showToast('Published!');
    resetCreateForm();
    closeCreatePanel();
    initFeed('for-you');
  } catch (error) {
    showToast('Failed to publish: ' + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Publish';
  }
}

function setupCreateUI() {
  const toggle = document.getElementById('createTypeToggle');
  if (toggle) {
    toggle.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (btn) setCreateType(btn.dataset.type);
    });
  }

  const addSlideBtn = document.getElementById('addSlideBtn');
  if (addSlideBtn) addSlideBtn.addEventListener('click', () => addSlideRow());

  const addSourceBtn = document.getElementById('addSourceBtn');
  if (addSourceBtn) addSourceBtn.addEventListener('click', () => addSourceRow());

  const form = document.getElementById('createForm');
  if (form) form.addEventListener('submit', submitPost);

  const closeBtn = document.getElementById('closeCreatePanel');
  if (closeBtn) closeBtn.addEventListener('click', closeCreatePanel);

  resetCreateForm();
}
