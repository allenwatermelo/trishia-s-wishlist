const opening = document.querySelector('#opening');
const welcome = document.querySelector('#welcome');
const gallery = document.querySelector('#gallery');
const begin = document.querySelector('#begin');
const view = document.querySelector('#view');
const soundToggle = document.querySelector('#sound-toggle');
const title = document.querySelector('#welcome-title');
const cards = document.querySelector('#cards');
const cardList = [...document.querySelectorAll('.wish-card')];
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioContext;
let soundEnabled = true;
let activeCard = 0;
let touchStartX = 0;

// The title is built as individual spans so each letter can pop in with its own color.
const titleColors = ['#f42f91', '#ff743d', '#efae00', '#199f98', '#9a72eb', '#e65363'];
[..."Trishea's 3 Wishlists"].forEach((character, index) => {
  if (character === ' ') {
    const space = document.createElement('span');
    space.className = 'title-space';
    space.setAttribute('aria-hidden', 'true');
    title.append(space);
    return;
  }
  const letter = document.createElement('span');
  letter.className = 'title-letter';
  letter.textContent = character;
  letter.setAttribute('aria-hidden', 'true');
  letter.style.setProperty('--letter-color', titleColors[index % titleColors.length]);
  letter.style.setProperty('--delay', `${index * 42}ms`);
  title.append(letter);
});

function getAudio() {
  if (!AudioContextClass) return null;
  if (!audioContext) audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
  return audioContext;
}

function playNotes(notes, { type = 'sine', volume = 0.13, spacing = 0.1, duration = 0.32 } = {}) {
  if (!soundEnabled) return;
  const context = getAudio();
  if (!context) return;
  const start = context.currentTime + 0.015;
  notes.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const noteStart = start + index * spacing;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    envelope.gain.setValueAtTime(0.0001, noteStart);
    envelope.gain.exponentialRampToValueAtTime(volume, noteStart + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);
    oscillator.connect(envelope).connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + duration + 0.02);
  });
}

function updateSoundToggle() {
  soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
  soundToggle.setAttribute('aria-label', soundEnabled ? 'Turn sound off' : 'Turn sound on');
  soundToggle.title = soundEnabled ? 'Turn sound off' : 'Turn sound on';
}

soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  updateSoundToggle();
  if (soundEnabled) playNotes([784], { volume: 0.08, duration: 0.18 });
});

function showCard(index) {
  activeCard = (index + cardList.length) % cardList.length;
  cards.style.transform = `translateX(-${activeCard * 100}%)`;
}

document.querySelector('.arrow-prev').addEventListener('click', () => {
  showCard(activeCard - 1);
  playNotes([587, 784], { volume: 0.07, duration: 0.2 });
});
document.querySelector('.arrow-next').addEventListener('click', () => {
  showCard(activeCard + 1);
  playNotes([784, 988], { volume: 0.07, duration: 0.2 });
});

cards.addEventListener('touchstart', (event) => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });
cards.addEventListener('touchend', (event) => {
  const delta = event.changedTouches[0].clientX - touchStartX;
  if (Math.abs(delta) < 45) return;
  showCard(activeCard + (delta < 0 ? 1 : -1));
  playNotes(delta < 0 ? [784, 988] : [587, 784], { volume: 0.06, duration: 0.2 });
}, { passive: true });

document.querySelectorAll('.shop-link').forEach((link) => {
  link.addEventListener('click', () => playNotes([740], { volume: 0.055, duration: 0.14 }));
});

begin.addEventListener('click', () => {
  playNotes([523.25, 659.25, 783.99, 1046.5], { type: 'triangle', volume: 0.14, spacing: 0.12, duration: 0.55 });
  opening.classList.add('is-gone');
  welcome.classList.remove('is-hidden');
  window.setTimeout(() => playNotes([880, 1174.66], { volume: 0.09, spacing: 0.08, duration: 0.24 }), 720);
  window.setTimeout(() => view.classList.add('is-ready'), 3000);
}, { once: true });

view.addEventListener('click', () => {
  playNotes([659.25, 880], { volume: 0.07, duration: 0.2 });
  welcome.classList.add('is-hidden');
  gallery.classList.remove('is-hidden');
  showCard(activeCard);
});

document.addEventListener('keydown', (event) => {
  if (gallery.classList.contains('is-hidden') || event.target.closest('a,button')) return;
  if (event.key === 'ArrowLeft') showCard(activeCard - 1);
  if (event.key === 'ArrowRight') showCard(activeCard + 1);
});

updateSoundToggle();
