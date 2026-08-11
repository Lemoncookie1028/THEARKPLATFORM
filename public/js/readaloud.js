// Read-aloud for Articles, using the browser's built-in speechSynthesis —
// free, no API costs, nothing sent to a server. Preference is a simple
// on/off toggle in Settings, stored in localStorage since it's a device
// preference, not account data.

const READ_ALOUD_KEY = 'readAloudEnabled';
let currentUtterance = null;

function isReadAloudEnabled() {
  return localStorage.getItem(READ_ALOUD_KEY) === 'true';
}

function isSpeechSupported() {
  return typeof window.speechSynthesis !== 'undefined';
}

function stopReading() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
  currentUtterance = null;
  document.querySelectorAll('.listen-btn.playing').forEach(btn => {
    btn.classList.remove('playing');
    btn.querySelector('span').textContent = 'Listen';
  });
}

function toggleReadAloud(text, buttonEl) {
  if (!isSpeechSupported()) {
    showToast("Your browser doesn't support read-aloud");
    return;
  }

  const wasPlayingThisOne = buttonEl.classList.contains('playing');
  stopReading(); // only one article reads at a time

  if (wasPlayingThisOne) return; // this button's job was just to stop it

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.onend = () => {
    buttonEl.classList.remove('playing');
    buttonEl.querySelector('span').textContent = 'Listen';
    currentUtterance = null;
  };
  utterance.onerror = () => {
    buttonEl.classList.remove('playing');
    buttonEl.querySelector('span').textContent = 'Listen';
    currentUtterance = null;
  };

  currentUtterance = utterance;
  buttonEl.classList.add('playing');
  buttonEl.querySelector('span').textContent = 'Stop';
  window.speechSynthesis.speak(utterance);
}

function listenBtnHtml() {
  return `
    <button type="button" class="listen-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
      <span>Listen</span>
    </button>
  `;
}

function setupReadAloudSettings() {
  const toggle = document.getElementById('readAloudToggle');
  if (!toggle) return;

  toggle.checked = isReadAloudEnabled();
  toggle.addEventListener('change', () => {
    localStorage.setItem(READ_ALOUD_KEY, toggle.checked ? 'true' : 'false');
    if (!toggle.checked) stopReading();
    initFeed('for-you'); // re-render so Listen buttons appear/disappear immediately
  });
}

// Stop reading if the tab is hidden or the app is signed out — a voice
// reading in the background after you've navigated away is a bad surprise.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopReading();
});
