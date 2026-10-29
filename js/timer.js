'use strict';

// Countdown bar at the bottom of the screen, used for rest between sets and timed holds.
// It keeps running while you move between screens.
const Timer = (() => {
  const bar = document.getElementById('timer');
  const labelEl = bar.querySelector('.timer-label');
  const timeEl = bar.querySelector('.timer-time');
  const fillEl = bar.querySelector('.timer-fill');

  let endAt = 0;
  let total = 0;
  let label = 'Rest';
  let onDone = null;
  let ticker = null;
  let hideTimer = null;
  let audio = null;

  // iPhone only plays sound that was unlocked by a tap, so call this from tap handlers.
  function unlockSound() {
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch {}
  }

  function beep() {
    if (!audio) return;
    try {
      for (const offset of [0, 0.3]) {
        const t = audio.currentTime + offset;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        osc.connect(gain).connect(audio.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      }
    } catch {}
  }

  const format = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  function tick() {
    const leftMs = Math.max(0, endAt - Date.now());
    timeEl.textContent = format(Math.ceil(leftMs / 1000));
    fillEl.style.transform = `scaleX(${total ? leftMs / total : 0})`;
    if (leftMs <= 0) finish();
  }

  // seconds: full length. until: optional end time, to pick up a timer after the app reopens.
  function start({ seconds, label: text = 'Rest', done = null, until = null }) {
    if (!seconds) return;
    clearInterval(ticker);
    clearTimeout(hideTimer);
    total = seconds * 1000;
    endAt = until || Date.now() + total;
    label = text;
    onDone = done;
    labelEl.textContent = label;
    bar.classList.remove('finished');
    bar.hidden = false;
    ticker = setInterval(tick, 250);
    tick();
  }

  function finish() {
    clearInterval(ticker);
    ticker = null;
    bar.classList.add('finished');
    labelEl.textContent = label === 'Hold' ? 'Done!' : 'Rest over';
    beep();
    navigator.vibrate?.([200, 100, 200]);
    hideTimer = setTimeout(stop, 4000);
    // Runs last, so it can start the next timer straight away.
    const callback = onDone;
    onDone = null;
    callback?.();
  }

  function stop() {
    clearInterval(ticker);
    clearTimeout(hideTimer);
    ticker = null;
    onDone = null;
    bar.hidden = true;
    bar.classList.remove('finished');
  }

  bar.addEventListener('click', e => {
    const action = e.target.closest('[data-timer]')?.dataset.timer;
    if (action === 'add' && ticker) {
      endAt += 15000;
      total += 15000;
      tick();
    } else if (action === 'skip') {
      stop();
    }
  });

  return {
    start,
    stop,
    unlockSound,
    get running() { return ticker !== null; },
  };
})();
