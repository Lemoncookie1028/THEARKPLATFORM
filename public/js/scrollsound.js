// Scroll chime — a soft bell when you land on a new post in the feed.
//
// The sound is synthesized with the Web Audio API, so there's no audio file
// to host or license and nothing to download. Each note is a sine tone with
// a gentle attack (so it never clicks), a couple of quiet overtones for the
// bell-like shimmer, and a quick decay, run through a low-pass filter so it
// stays soft rather than sharp.
//
// Notes come from a C-major pentatonic scale, so any run of them sounds
// pleasant and no two can clash. Each post gets its own note, so scrolling
// down the feed plays a little rising phrase.
//
// On/off is a device preference in Settings (on by default), stored in
// localStorage the same way Read Aloud is.
//
// Browser rule worth knowing: audio can't start until the page has had a
// real tap, click or key press. Scrolling alone doesn't count, so the chime
// stays silent until the first of those happens after a page load.

const SCROLL_SOUND_KEY = 'scrollSoundEnabled';
const SCROLL_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0]; // C5 D5 E5 G5 A5
const SCROLL_PARTIALS = [[1, 1], [2.01, 0.28], [3.02, 0.08]]; // [frequency multiple, loudness]
const SCROLL_CHIME_PEAK = 0.11;     // overall loudness — deliberately quiet
const SCROLL_CHIME_SECONDS = 0.7;   // how long the fundamental rings
const SCROLL_CHIME_MIN_GAP_MS = 80; // never fire faster than this

let scrollAudioContext = null;
let scrollSoundCard = null; // the post we most recently landed on
let lastScrollChimeAt = 0;

function isScrollSoundEnabled() {
  // On unless the user has explicitly turned it off
  return localStorage.getItem(SCROLL_SOUND_KEY) !== 'false';
}

// Creates the audio context the first time it's called from a real user
// gesture, and resumes it if the browser has suspended it.
function unlockScrollAudio() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return null;
  if (!scrollAudioContext) scrollAudioContext = new AudioCtor();
  if (scrollAudioContext.state === 'suspended') scrollAudioContext.resume();
  return scrollAudioContext;
}

function playScrollChime(step) {
  const ctx = scrollAudioContext;
  if (!ctx || ctx.state !== 'running') return; // not unlocked yet — stay silent

  const nowMs = Date.now();
  if (nowMs - lastScrollChimeAt < SCROLL_CHIME_MIN_GAP_MS) return;
  lastScrollChimeAt = nowMs;

  const start = ctx.currentTime;
  const frequency = SCROLL_NOTES[((step % SCROLL_NOTES.length) + SCROLL_NOTES.length) % SCROLL_NOTES.length];

  // Overall level: ramps up over 12ms (instant jumps cause an audible click)
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, start);
  master.gain.linearRampToValueAtTime(SCROLL_CHIME_PEAK, start + 0.012);

  // Softens the top end so the overtones add shimmer, not edge
  const softener = ctx.createBiquadFilter();
  softener.type = 'lowpass';
  softener.frequency.value = 3200;

  master.connect(softener);
  softener.connect(ctx.destination);

  SCROLL_PARTIALS.forEach(([multiple, level]) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency * multiple;

    // Higher overtones die away faster, like a struck bell
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(level, start);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + SCROLL_CHIME_SECONDS / multiple);

    osc.connect(envelope);
    envelope.connect(master);
    osc.start(start);
    osc.stop(start + SCROLL_CHIME_SECONDS + 0.05);
  });
}

// Called whenever the feed scrolls: chimes if we've landed on a different post
function handleFeedScrollSound(container) {
  const cards = container.querySelectorAll('.card');
  if (!cards.length) {
    scrollSoundCard = null;
    return;
  }
  if (typeof currentCardIndex !== 'function') return;

  const index = currentCardIndex(container);
  const card = cards[index];
  if (card === scrollSoundCard) return;

  // If the post we were on is gone, the list was rebuilt (tab switch,
  // refresh, search) — that's not the user scrolling, so don't reward it.
  const listWasRebuilt = !scrollSoundCard || !container.contains(scrollSoundCard);
  scrollSoundCard = card;
  if (listWasRebuilt) return;

  if (isScrollSoundEnabled()) playScrollChime(index);
}

function setupScrollSound() {
  const container = document.getElementById('feedContainer');
  if (!container) return;

  // The first real gesture unlocks audio; after that these aren't needed
  const unlockEvents = ['pointerdown', 'keydown', 'touchend'];
  const unlock = () => {
    unlockScrollAudio();
    unlockEvents.forEach((name) => document.removeEventListener(name, unlock, true));
  };
  unlockEvents.forEach((name) => document.addEventListener(name, unlock, true));

  // A rebuilt list resets scrolling to the top: quietly note where we are
  // so the first genuine scroll afterwards is judged against the right post
  new MutationObserver(() => {
    const cards = container.querySelectorAll('.card');
    scrollSoundCard = cards.length && typeof currentCardIndex === 'function'
      ? cards[currentCardIndex(container)]
      : null;
  }).observe(container, { childList: true });

  let waiting = false;
  container.addEventListener('scroll', () => {
    if (waiting) return;
    waiting = true;
    requestAnimationFrame(() => {
      waiting = false;
      handleFeedScrollSound(container);
    });
  }, { passive: true });
}

function setupScrollSoundSettings() {
  const toggle = document.getElementById('scrollSoundToggle');
  if (!toggle) return;

  toggle.checked = isScrollSoundEnabled();
  toggle.addEventListener('change', () => {
    localStorage.setItem(SCROLL_SOUND_KEY, toggle.checked ? 'true' : 'false');
    if (toggle.checked) {
      // Flipping the switch is a real gesture, so we can play a preview
      // right away — handy for hearing what it sounds like
      const ctx = unlockScrollAudio();
      if (ctx && ctx.state === 'running') {
        playScrollChime(2);
      } else if (ctx) {
        // Some browsers report "suspended" for a moment after creation
        ctx.resume().then(() => playScrollChime(2)).catch(() => {});
      }
    }
  });
}
