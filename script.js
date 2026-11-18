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
let soundEnabled = true;
let activeCard = 0;
let pointerStartX = null;
let nextSoundCueAt = 0;
const activeAudioNodes = new Set();

// Animate letters individually, but let the title wrap only at spaces on small screens.
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
    letter.style.setProperty('--delay', `${letterIndex * 35}ms`);
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

function getAudio() {
  if (!AudioContextClass) {
    console.warn('This browser does not expose Web Audio; wishlist sound effects are unavailable.');
    return null;
  }
  if (!audioContext) {
    try {
      audioContext = new AudioContextClass();
    } catch (error) {
      console.warn('Wishlist sounds are unavailable in this browser.', error);
      return null;
    }
  }
  return audioContext;
}

function playNotes(notes, { type = 'sine', volume = 0.16, spacing = 0.1, duration = 0.32 } = {}) {
  if (!soundEnabled) return;
  const context = getAudio();
  if (!context) return;
  const schedule = () => {
    if (!soundEnabled) return;
    const start = Math.max(context.currentTime + 0.035, nextSoundCueAt);
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const noteStart = start + index * spacing;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      envelope.gain.setValueAtTime(0.0001, noteStart);
      envelope.gain.exponentialRampToValueAtTime(volume, noteStart + 0.025);
      envelope.gain.exponentialRampToValueAtTime(0.0001, noteStart + duration);
      oscillator.connect(envelope).connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + duration + 0.025);
      activeAudioNodes.add(oscillator);
      oscillator.addEventListener('ended', () => activeAudioNodes.delete(oscillator), { once: true });
    });
    nextSoundCueAt = start + (notes.length - 1) * spacing + duration + 0.06;
  };
  // On iOS, wait for the user gesture to resume AudioContext before scheduling tones.
  if (context.state !== 'running') {
    try {
      const resumeResult = context.resume();
      if (resumeResult && typeof resumeResult.then === 'function') {
        resumeResult.then(() => {
          if (context.state === 'running') schedule();
          else console.warn(`Wishlist audio remained ${context.state} after resume.`);
        }).catch((error) => console.warn('Wishlist audio could not resume.', error));
      } else {
        schedule();
      }
    } catch (error) {
      console.warn('Wishlist audio could not resume.', error);
    }
  } else {
    schedule();
  }
}

function stopAudio() {
  activeAudioNodes.forEach((node) => {
    try { node.stop(); } catch { /* The note already ended. */ }
  });
  activeAudioNodes.clear();
  if (audioContext) nextSoundCueAt = audioContext.currentTime;
}

function updateSoundToggle() {
  soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
  soundToggle.setAttribute('aria-label', soundEnabled ? 'Turn sound off' : 'Turn sound on');
  soundToggle.title = soundEnabled ? 'Turn sound off' : 'Turn sound on';
}

soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  updateSoundToggle();
  if (!soundEnabled) stopAudio();
  if (soundEnabled) playNotes([784], { volume: 0.11, duration: 0.2 });
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
  if (event.pointerType === 'pen') pointerStartX = event.clientX;
});
carouselViewport.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'touch') return;
  if (pointerStartX === null) return;
  const delta = event.clientX - pointerStartX;
  pointerStartX = null;
  if (Math.abs(delta) < 45) return;
  showCard(activeCard + (delta < 0 ? 1 : -1));
  playNotes(delta < 0 ? [784, 988] : [587, 784], { volume: 0.08, duration: 0.2 });
});
carouselViewport.addEventListener('pointercancel', () => { pointerStartX = null; });

let touchStartX = null;
carouselViewport.addEventListener('touchstart', (event) => {
  touchStartX = event.changedTouches[0].clientX;
}, { passive: true });
carouselViewport.addEventListener('touchend', (event) => {
  if (touchStartX === null) return;
  const delta = event.changedTouches[0].clientX - touchStartX;
  touchStartX = null;
  if (Math.abs(delta) < 45) return;
  showCard(activeCard + (delta < 0 ? 1 : -1));
  playNotes(delta < 0 ? [880, 1174.66] : [740, 988], { type: 'triangle', volume: 0.15, duration: 0.24 });
}, { passive: true });

document.querySelectorAll('.shop-link').forEach((link) => {
  link.addEventListener('click', () => playNotes([740], { volume: 0.07, duration: 0.14 }));
});

begin.addEventListener('click', () => {
  playNotes([523.25, 659.25, 783.99, 1046.5], { type: 'triangle', volume: 0.2, spacing: 0.12, duration: 0.55 });
  opening.classList.add('is-gone');
  welcome.classList.remove('is-hidden');
  window.setTimeout(() => playNotes([880, 1174.66], { volume: 0.11, spacing: 0.08, duration: 0.24 }), 720);
  view.classList.add('is-ready');
}, { once: true });

view.addEventListener('click', () => {
  playNotes([659.25, 880], { volume: 0.09, duration: 0.2 });
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
