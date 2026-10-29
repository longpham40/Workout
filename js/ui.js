'use strict';

// Small shared helpers: icons, formatting, units and the toast message.
const UI = (() => {
  const ICONS = {
    today: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    train: '<path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/>',
    eat: '<path d="M6 3v6a3 3 0 0 0 6 0V3M9 12v9M18 21V3c-2.5 1.2-3.5 4-3.5 7.5 0 1.7 1.5 2.5 3.5 2.5"/>',
    progress: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 6-7"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
    cardio: '<path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.4 8.8 11 8.8 11s8.8-5.6 8.8-11z"/><path d="M3.5 12h4l2-3 3 6 2-3h6"/>',
    calisthenics: '<path d="M3 4h18M8 4v3M16 4v3"/><circle cx="12" cy="10" r="2"/><path d="M8 7l4 5 4-5M12 12v5l-2.5 4M12 17l2.5 4"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    chevron: '<path d="M9 5l7 7-7 7"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    share: '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>',
    plusSquare: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    heart: '<path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.4 8.8 11 8.8 11s8.8-5.6 8.8-11z"/>',
    book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3"/><path d="M9 7h7M9 11h5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  };

  const sectionTitle = text => `<h2 class="section-title">${text}</h2>`;

  const icon = (name, cls = '') =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Dates are stored as 'YYYY-MM-DD' in local time.
  const isoDate = (d = new Date()) => d.toLocaleDateString('en-CA');
  const longDate = (d = new Date()) => d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  function startOfWeek() {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    return isoDate(d);
  }

  // Units. Everything is stored in kg and cm; these convert for display and input.
  const posNum = v => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n > 0 ? n : '';
  };
  const round1 = n => Math.round(n * 10) / 10;
  const LB_PER_KG = 2.20462;
  const kgToLb = kg => kg * LB_PER_KG;
  const lbToKg = lb => (posNum(lb) ? posNum(lb) / LB_PER_KG : '');

  function cmToFtIn(cm) {
    const totalIn = cm / 2.54;
    let ft = Math.floor(totalIn / 12);
    let inch = Math.round(totalIn - ft * 12);
    if (inch === 12) { ft += 1; inch = 0; }
    return { ft, inch };
  }

  function ftInToCm(ft, inch) {
    const total = (parseFloat(ft) || 0) * 12 + (parseFloat(inch) || 0);
    return total > 0 ? total * 2.54 : '';
  }

  // Numbers show large; words (like a goal name) use a smaller size so they fit.
  const stat = (label, value) =>
    `<div class="stat"><div class="stat-value${typeof value === 'number' ? '' : ' text'}">${value}</div><div class="stat-label">${label}</div></div>`;

  let toastTimer;
  function toast(message) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 1800);
  }

  function download(filename, text) {
    const blob = new Blob([text], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  return {
    icon, sectionTitle, esc, isoDate, longDate, startOfWeek,
    posNum, round1, kgToLb, lbToKg, cmToFtIn, ftInToCm,
    stat, toast, download, isIOS, isStandalone,
  };
})();
