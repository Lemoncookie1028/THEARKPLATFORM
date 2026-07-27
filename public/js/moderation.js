// Moderation queue for user-reported posts. Same admin gate as the AI
// review queue — non-admins get a plain "not authorized" message, the
// backend (api/_lib/admin.js) is what actually enforces it.

const REASON_LABELS = {
  misleading: 'Misleading',
  spam: 'Spam',
  harassment: 'Harassment',
  other: 'Other',
};

function moderationCardHtml(flag) {
  return `
    <div class="moderation-card" data-flag-id="${flag.id}">
      <p class="headline" style="font-size:14px;">${flag.postHeadline || '(post headline unavailable)'}</p>
      <span class="moderation-reason">${REASON_LABELS[flag.reason] || flag.reason}</span>
      <div class="moderation-actions">
        <button type="button" class="moderation-dismiss-btn">Dismiss</button>
        <button type="button" class="moderation-remove-btn">Remove post</button>
      </div>
    </div>
  `;
}

async function loadModerationQueue() {
  const list = document.getElementById('moderationList');
  const token = localStorage.getItem('token');
  if (!token) { showToast('Please sign in first'); return; }

  list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Loading…</p>';

  try {
    const res = await fetch(`${API_URL}/flags/list`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (res.status === 403) {
      list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Your account isn\'t set up for moderation.</p>';
      return;
    }
    if (!res.ok) {
      list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Could not load reports.</p>';
      return;
    }

    if (!data.flags.length) {
      list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">No open reports right now.</p>';
      return;
    }

    list.innerHTML = data.flags.map(moderationCardHtml).join('');
  } catch (error) {
    list.innerHTML = '<p style="color:#6f6d66; font-size:12px;">Could not load reports.</p>';
  }
}

async function resolveFlag(flagId, action) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}/flags/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ flagId, action }),
  });
  const data = await res.json();
  if (!res.ok) {
    showToast(data.error || `Failed to ${action}`);
    return false;
  }
  return true;
}

function openModerationPanel() {
  if (!currentUser) { showToast('Please sign in first'); return; }
  document.getElementById('moderationPanel').classList.add('open');
  loadModerationQueue();
}

function closeModerationPanel() {
  document.getElementById('moderationPanel').classList.remove('open');
}

function setupModerationUI() {
  const openBtn = document.getElementById('openModerationQueueBtn');
  if (openBtn) openBtn.addEventListener('click', () => { closeSettingsPanel(); openModerationPanel(); });

  const closeBtn = document.getElementById('closeModerationPanel');
  if (closeBtn) closeBtn.addEventListener('click', closeModerationPanel);

  const list = document.getElementById('moderationList');
  if (list) {
    list.addEventListener('click', async (e) => {
      const card = e.target.closest('.moderation-card');
      if (!card) return;
      const flagId = card.dataset.flagId;

      if (e.target.closest('.moderation-dismiss-btn')) {
        card.style.opacity = '0.5';
        const ok = await resolveFlag(flagId, 'dismiss');
        if (ok) { showToast('Dismissed'); card.remove(); }
        else card.style.opacity = '1';
      } else if (e.target.closest('.moderation-remove-btn')) {
        card.style.opacity = '0.5';
        const ok = await resolveFlag(flagId, 'remove');
        if (ok) { showToast('Post removed'); card.remove(); initFeed('for-you'); }
        else card.style.opacity = '1';
      }
    });
  }
}
