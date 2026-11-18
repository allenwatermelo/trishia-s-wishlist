const opening = document.querySelector('#opening');
const welcome = document.querySelector('#welcome');
const gallery = document.querySelector('#gallery');
const begin = document.querySelector('#begin');
const view = document.querySelector('#view');
const soundToggle = document.querySelector('#sound-toggle');
const title = document.querySelector('#welcome-title');
const cards = document.querySelector('#cards');
const carouselViewport = document.querySelector('.carousel-viewport');
const cardList = [...document.querySelectorAll('.wish-card')];
const slideStatus = document.querySelector('#slide-status');
const progressDots = [...document.querySelectorAll('.progress-dots i')];
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
let audioContext;
let audioEnabled = true;
let activeCard = 0;
let touchStartX = null;
let missingAudioApiReported = false;
const activeAudioNodes = new Set();

// Keep words intact on mobile while giving each title letter its own pop-in.
const titleColors = ['#f42f91', '#ff743d', '#efae00', '#199f98', '#9a72eb', '#e65363'];
let letterIndex = 0;
"Trishea's 3 Wishlists".split(' ').forEach((word, wordIndex, words) => {
  const wordElement = document.createElement('span');
  wordElement.className = 'title-word';
  wordElement.setAttribute('aria-hidden', 'true');
  [...word].forEach((character) => {
    const letter = document.createElement('span');
    letter.className = 'title-letter';
    letter.textContent = character;
    letter.style.setProperty('--letter-color', titleColors[letterIndex % titleColors.length]);
    letter.style.setProperty('--delay', `${letterIndex * 68}ms`);
    wordElement.append(letter);
    letterIndex += 1;
  });
  title.append(wordElement);
  if (wordIndex < words.length - 1) {
    const space = document.createElement('span');
    space.className = 'title-space';
    space.setAttribute('aria-hidden', 'true');
    title.append(space);
  }
});

function getAudioContext() {
  if (!AudioContextClass) {
    if (!missingAudioApiReported) {
      console.error('AudioContext and webkitAudioContext are unavailable in this browser.');
      missingAudioApiReported = true;
    }
    return null;
  }
  if (audioContext?.state === 'closed') audioContext = null;
  if (!audioContext) {
    try {
      audioContext = new AudioContextClass();
      audioContext.onstatechange = () => {
        if (audioContext.state === 'interrupted') console.warn('AudioContext was interrupted by the browser or operating system.');
      };
    } catch (error) {
      console.error('Could not create the wishlist AudioContext.', error);
      return null;
    }
  }
  return audioContext;
}

// Resume is requested inside the tap. Its Promise is used only for error reporting;
// oscillator nodes are started synchronously before the user interaction returns.
function requestContextResume(context) {
  if (context.state === 'running') return;
  try {
    const result = context.resume();
    if (result && typeof result.then === 'function') {
      result.then(() => {
        if (context.state !== 'running') console.warn(`AudioContext resume resolved in state: ${context.state}`);
      }).catch((error) => console.error('AudioContext.resume() rejected.', error));
    }
  } catch (error) {
    console.error('AudioContext.resume() threw.', error);
  }
}

function stopAudio() {
  activeAudioNodes.forEach((node) => {
    try { node.stop(); } catch { /* The scheduled note has already ended. */ }
  });
  activeAudioNodes.clear();
}

function startNotesImmediately(context, frequencies, { type = 'sine', volume = 0.14, spacing = 0.11, duration = 0.24 } = {}) {
  const start = context.currentTime + 0.006;
  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = start + index * spacing;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(volume, noteStart + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.addEventListener('ended', () => activeAudioNodes.delete(oscillator), { once: true });
    activeAudioNodes.add(oscillator);
    oscillator.start(noteStart);
    oscillator.stop(noteStart + duration + 0.025);
  });
}

function playNotes(frequencies, options = {}) {
  if (!audioEnabled) return;
  const context = getAudioContext();
  if (!context) return;
  requestContextResume(context);
  stopAudio();
  try {
    startNotesImmediately(context, frequencies, options);
  } catch (error) {
    console.error('Wishlist oscillator playback failed.', error);
  }
}

function updateSoundToggle() {
  soundToggle.textContent = audioEnabled ? '🔊' : '🔇';
  soundToggle.setAttribute('aria-label', audioEnabled ? 'Turn sound off' : 'Turn sound on');
  soundToggle.title = audioEnabled ? 'Turn sound off' : 'Turn sound on';
}

soundToggle.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  updateSoundToggle();
  if (!audioEnabled) stopAudio();
  else playNotes([784], { volume: 0.13, duration: 0.2 });
});

function showCard(index) {
  activeCard = (index + cardList.length) % cardList.length;
  cards.style.transform = `translateX(-${activeCard * 100}%)`;
  slideStatus.textContent = `${activeCard + 1} of ${cardList.length} wishlists`;
  progressDots.forEach((dot, dotIndex) => dot.classList.toggle('is-current', dotIndex === activeCard));
  cardList.forEach((card, cardIndex) => {
    card.classList.remove('is-active');
    if (cardIndex === activeCard) {
      void card.offsetWidth;
      card.classList.add('is-active');
    }
  });
}

function animateArrow(arrow) {
  arrow.classList.remove('is-bopping');
  void arrow.offsetWidth;
  arrow.classList.add('is-bopping');
}

const previousArrow = document.querySelector('.arrow-prev');
const nextArrow = document.querySelector('.arrow-next');
previousArrow.addEventListener('click', () => {
  animateArrow(previousArrow);
  showCard(activeCard - 1);
  playNotes([740, 988], { type: 'triangle', volume: 0.17, duration: 0.24 });
});
nextArrow.addEventListener('click', () => {
  animateArrow(nextArrow);
  showCard(activeCard + 1);
  playNotes([880, 1174.66], { type: 'triangle', volume: 0.17, duration: 0.24 });
});

carouselViewport.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'pen') touchStartX = event.clientX;
});
carouselViewport.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'touch' || touchStartX === null) return;
  const delta = event.clientX - touchStartX;
  touchStartX = null;
  if (Math.abs(delta) < 45) return;
  showCard(activeCard + (delta < 0 ? 1 : -1));
  playNotes(delta < 0 ? [880, 1174.66] : [740, 988], { type: 'triangle', volume: 0.15 });
});
carouselViewport.addEventListener('pointercancel', () => { touchStartX = null; });
carouselViewport.addEventListener('touchstart', (event) => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });
carouselViewport.addEventListener('touchend', (event) => {
  if (touchStartX === null) return;
  const delta = event.changedTouches[0].clientX - touchStartX;
  touchStartX = null;
  if (Math.abs(delta) < 45) return;
  showCard(activeCard + (delta < 0 ? 1 : -1));
  playNotes(delta < 0 ? [880, 1174.66] : [740, 988], { type: 'triangle', volume: 0.15 });
}, { passive: true });

document.querySelectorAll('.shop-link').forEach((link) => {
  link.addEventListener('click', () => playNotes([740], { volume: 0.1, duration: 0.14 }));
});

begin.addEventListener('click', () => {
  // Start the opening arpeggio directly in this trusted tap.
  playNotes([523.25, 659.25, 783.99, 1046.5, 880, 1174.66], { type: 'triangle', volume: 0.18, spacing: 0.13, duration: 0.22 });
  opening.classList.add('is-gone');
  welcome.classList.remove('is-hidden');
  view.classList.add('is-ready');
}, { once: true });

view.addEventListener('click', () => {
  playNotes([659.25, 880], { volume: 0.12, duration: 0.2 });
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
