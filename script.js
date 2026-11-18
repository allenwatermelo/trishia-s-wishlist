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
const audioElement = document.querySelector('#audio-test-file');
const contextStateOutput = document.querySelector('#audio-context-state');
const resumeOutput = document.querySelector('#audio-resume-result');
const fileStatusOutput = document.querySelector('#audio-file-status');
const webAudioResult = document.querySelector('#web-audio-result');
const htmlAudioResult = document.querySelector('#html-audio-result');
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

function updateContextState() {
  contextStateOutput.textContent = audioContext ? audioContext.state : 'Not initialized';
  if (audioContext?.state === 'running' && /^(Resume requested|Resolved but state is)/.test(resumeOutput.textContent)) {
    resumeOutput.textContent = 'AudioContext is running';
  }
}

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
      audioContext.onstatechange = updateContextState;
      updateContextState();
    } catch (error) {
      contextStateOutput.textContent = 'Creation failed';
      resumeOutput.textContent = `${error.name || 'Error'}: ${error.message || error}`;
      console.error('Could not create the wishlist AudioContext.', error);
      return null;
    }
  }
  return audioContext;
}

// Called synchronously from the tap handler. Promise callbacks update diagnostics only;
// sound sources are created and started before this handler returns.
function requestContextResume(context) {
  updateContextState();
  if (context.state === 'running') {
    resumeOutput.textContent = 'Already running';
    return;
  }
  const previousState = context.state;
  resumeOutput.textContent = `Resume requested from ${previousState}`;
  try {
    const result = context.resume();
    if (result && typeof result.then === 'function') {
      result.then(() => {
        updateContextState();
        resumeOutput.textContent = context.state === 'running'
          ? `Succeeded (${previousState} → running)`
          : `Resolved but state is ${context.state}`;
      }).catch((error) => {
        updateContextState();
        resumeOutput.textContent = `Rejected: ${error.name || 'Error'}: ${error.message || error}`;
        console.error('AudioContext.resume() rejected.', error);
      });
    } else {
      updateContextState();
      resumeOutput.textContent = `resume() returned no Promise (${context.state})`;
    }
  } catch (error) {
    updateContextState();
    resumeOutput.textContent = `Threw: ${error.name || 'Error'}: ${error.message || error}`;
    console.error('AudioContext.resume() threw.', error);
  }
}

function stopAudio() {
  activeAudioNodes.forEach((node) => {
    try { node.stop(); } catch { /* The scheduled note has already ended. */ }
  });
  activeAudioNodes.clear();
  if (audioElement && !audioElement.paused) {
    audioElement.pause();
    try { audioElement.currentTime = 0; } catch { /* Metadata may not be ready yet. */ }
  }
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
  // Start the complete opening arpeggio in this trusted tap, without waiting for animation timers.
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

// TEST A: created and started synchronously in this button's own tap handler.
document.querySelector('#test-web-audio').addEventListener('click', () => {
  const context = getAudioContext();
  if (!context) {
    webAudioResult.textContent = 'Failed: Web Audio API unavailable; see console.';
    return;
  }
  stopAudio();
  requestContextResume(context);
  try {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.addEventListener('ended', () => {
      activeAudioNodes.delete(oscillator);
      webAudioResult.textContent = `Oscillator ended; AudioContext state=${context.state}`;
    }, { once: true });
    activeAudioNodes.add(oscillator);
    oscillator.start(start);
    oscillator.stop(start + 0.32);
    webAudioResult.textContent = `oscillator.start() called; context=${context.state}`;
  } catch (error) {
    webAudioResult.textContent = `Failed: ${error.name || 'Error'}: ${error.message || error}`;
    console.error('Web Audio test failed.', error);
  }
});

function updateAudioFileStatus(message) {
  fileStatusOutput.textContent = message;
}

audioElement.addEventListener('loadstart', () => updateAudioFileStatus('Loading file…'));
audioElement.addEventListener('loadeddata', () => updateAudioFileStatus('Loaded (readyState ' + audioElement.readyState + ')'));
audioElement.addEventListener('canplay', () => updateAudioFileStatus('Ready to play'));
audioElement.addEventListener('playing', () => {
  htmlAudioResult.textContent = 'playing event fired; HTML Audio playback started.';
});
audioElement.addEventListener('error', () => {
  const mediaError = audioElement.error;
  const message = mediaError ? `MediaError code ${mediaError.code}${mediaError.message ? `: ${mediaError.message}` : ''}` : 'Unknown media loading error';
  updateAudioFileStatus(`Failed: ${message}`);
  console.error('HTML Audio test file failed to load.', mediaError);
});
audioElement.addEventListener('stalled', () => updateAudioFileStatus('Loading stalled'));
audioElement.addEventListener('abort', () => updateAudioFileStatus('Loading aborted'));
if (audioElement.readyState >= 2) updateAudioFileStatus(`Loaded (readyState ${audioElement.readyState})`);
else audioElement.load();

// TEST B: HTMLAudioElement.play() is called synchronously in this button's tap handler.
document.querySelector('#test-html-audio').addEventListener('click', () => {
  stopAudio();
  try {
    audioElement.currentTime = 0;
    const result = audioElement.play();
    htmlAudioResult.textContent = 'play() called; waiting for browser result…';
    if (result && typeof result.then === 'function') {
      result.then(() => {
        htmlAudioResult.textContent = 'play() resolved; audio is playing.';
      }).catch((error) => {
        htmlAudioResult.textContent = `play() rejected: ${error.name || 'Error'}: ${error.message || error}`;
        console.error('HTMLAudioElement.play() rejected.', error);
      });
    } else {
      htmlAudioResult.textContent = 'play() returned no Promise; check whether the sound is audible.';
    }
  } catch (error) {
    htmlAudioResult.textContent = `play() threw: ${error.name || 'Error'}: ${error.message || error}`;
    console.error('HTMLAudioElement.play() threw.', error);
  }
});

document.addEventListener('keydown', (event) => {
  if (gallery.classList.contains('is-hidden') || event.target.closest('a,button')) return;
  if (event.key === 'ArrowLeft') showCard(activeCard - 1);
  if (event.key === 'ArrowRight') showCard(activeCard + 1);
});

updateSoundToggle();
updateContextState();
