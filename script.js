const opening = document.querySelector('#opening');
const welcome = document.querySelector('#welcome');
const gallery = document.querySelector('#gallery');
const begin = document.querySelector('#begin');
const view = document.querySelector('#view');

function playWelcomeChime() {
  // A short, quiet two-note chime generated locally after the user's tap.
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, context.currentTime);
  master.gain.exponentialRampToValueAtTime(0.075, context.currentTime + 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.25);
  master.connect(context.destination);
  [659.25, 880, 1046.5].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const note = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    note.gain.setValueAtTime(0.0001, context.currentTime + index * 0.12);
    note.gain.exponentialRampToValueAtTime(0.32, context.currentTime + index * 0.12 + 0.025);
    note.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.12 + 0.42);
    oscillator.connect(note).connect(master);
    oscillator.start(context.currentTime + index * 0.12);
    oscillator.stop(context.currentTime + index * 0.12 + 0.45);
  });
  window.setTimeout(() => context.close(), 1600);
}

begin.addEventListener('click', () => {
  playWelcomeChime();
  opening.classList.add('is-gone');
  welcome.classList.remove('is-hidden');
  window.setTimeout(() => view.classList.add('is-ready'), 3000);
}, { once: true });

view.addEventListener('click', () => {
  welcome.classList.add('is-hidden');
  gallery.classList.remove('is-hidden');
  window.setTimeout(() => document.querySelector('.gallery').scrollIntoView({ behavior: 'smooth' }), 40);
});
