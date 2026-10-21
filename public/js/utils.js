// Toast system
function showToast(message, duration = 2200) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

// Turns whatever a timestamp arrives as into a Date (or null). Three shapes
// show up in this app: Firestore Timestamp objects (client SDK, has .toDate),
// plain {_seconds, _nanoseconds} objects (what /api/posts/feed returns after
// JSON serialisation — new Date() can't parse these, which used to make every
// API-fed date read "Invalid Date"), and ordinary date strings/numbers.
function toDateSafe(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  const seconds = timestamp._seconds ?? timestamp.seconds;
  if (typeof seconds === 'number') return new Date(seconds * 1000);
  const date = new Date(timestamp);
  return isNaN(date.getTime()) ? null : date;
}

// Format date
function formatDate(timestamp) {
  if (!timestamp) return 'Just now';
  const date = toDateSafe(timestamp);
  if (!date) return '';
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  return date.toLocaleDateString();
}

// Truncate text
function truncateText(text, maxLength = 100) {
  if (!text) return '';
  const clean = String(text).trim();
  return clean.length > maxLength ? clean.slice(0, maxLength).trim() + '…' : clean;
}

// Safe to embed inside an HTML attribute value (e.g. data-* attributes
// carrying user-generated or fetched text)
function escapeHtmlAttr(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Only allow http(s) links through — user-supplied URLs like "javascript:..."
// would otherwise run when clicked. Anything else becomes a dead "#" link.
function safeUrl(url) {
  return /^https?:\/\//i.test(String(url || '').trim()) ? String(url).trim() : '#';
}

// Generate initials from name
function getInitials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}