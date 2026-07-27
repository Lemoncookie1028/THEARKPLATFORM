// Review queue for AI-drafted Cards. Non-admin accounts get a plain
// "not authorized" toast rather than seeing the queue at all — the button
// lives in Settings for everyone, but the backend is what actually gates
// this (see api/_lib/admin.js).

function slidesPreview(slides) {
  return (slides || [])
    .slice(0, 3)
    .map(s => `<li>${s.caption}</li>`)
    .join('');
}

function draftCardHtml(draft) {
  const label = draft.sourceName
    ? `DRAFT · ${draft.sourceName.toUpperCase()}`
    : 'DRAFT · AI-AUTHORED, NO SOURCE';
  return `
    <div class="review-card" data-draft-id="${draft.id}">
      <div class="meta"><span>${label}</span></div>
      <p class="headline">${draft.headline}</p>
      <ul class="review-slides">${slidesPreview(draft.slides)}</ul>
      <div class="review-actions">
        <button type="button" class="review-approve-btn">Approve</button>
        <button type="button" class="review-reject-btn">Reject</button>
      </div>
    </div>
  `;
}

async function loadReviewQueue() {
  const list = document.getElementById('reviewList');
  const token = localStorage.getItem('token');
  if (!token) { showToast('Please sign in first'); return; }

  list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Loading…</p>';

  try {
    const res = await fetch(`${API_URL}/drafts/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (res.status === 403) {
      list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Your account isn\'t set up for moderation.</p>';
      return;
    }
    if (!res.ok) {
      list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Could not load the review queue.</p>';
      return;
    }

    if (!data.drafts.length) {
      list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Nothing pending right now.</p>';
      return;
    }

    list.innerHTML = data.drafts.map(draftCardHtml).join('');
  } catch (error) {
    list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Could not load the review queue.</p>';
  }
}

async function reviewAction(draftId, action) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/drafts/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ draftId }),
  });
  const data = await res.json();
  if (!res.ok) {
    showToast(data.error || `Failed to ${action}`);
    return false;
  }
  return true;
}

function openReviewPanel() {
  if (!currentUser) { showToast('Please sign in first'); return; }
  document.getElementById('reviewPanel').classList.add('open');
  loadReviewQueue();
}

function closeReviewPanel() {
  document.getElementById('reviewPanel').classList.remove('open');
}

function setupReviewUI() {
  const openBtn = document.getElementById('openReviewQueueBtn');
  if (openBtn) openBtn.addEventListener('click', () => { closeSettingsPanel(); openReviewPanel(); });

  const closeBtn = document.getElementById('closeReviewPanel');
  if (closeBtn) closeBtn.addEventListener('click', closeReviewPanel);

  const list = document.getElementById('reviewList');
  if (list) {
    list.addEventListener('click', async (e) => {
      const card = e.target.closest('.review-card');
      if (!card) return;
      const draftId = card.dataset.draftId;

      if (e.target.closest('.review-approve-btn')) {
        card.style.opacity = '0.5';
        const ok = await reviewAction(draftId, 'approve');
        if (ok) { showToast('Published'); card.remove(); initFeed('for-you'); }
        else card.style.opacity = '1';
      } else if (e.target.closest('.review-reject-btn')) {
        card.style.opacity = '0.5';
        const ok = await reviewAction(draftId, 'reject');
        if (ok) { showToast('Rejected'); card.remove(); }
        else card.style.opacity = '1';
      }
    });
  }
}
