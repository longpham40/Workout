'use strict';

// Small SVG charts: a line chart and a bar chart. Each draws at the container's real width
// (so text stays crisp), shows a tooltip on tap or hover, and has a "Show data" table.
// One series per chart, so the title names it and no legend is needed.
const Charts = (() => {
  const esc = UI.esc;
  const HEIGHT = 180;
  const PAD = { l: 40, r: 16, t: 22, b: 26 };

  const parseDate = iso => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const shortDate = iso => parseDate(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

  // Round numbers for the y-axis, e.g. 78, 80, 82.
  function niceTicks(min, max, { integer = false } = {}) {
    if (min === max) { min -= 1; max += 1; }
    const rough = (max - min) / 2;
    const mag = 10 ** Math.floor(Math.log10(rough));
    let step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= rough);
    if (integer) step = Math.max(1, Math.ceil(step));
    const ticks = [];
    for (let v = Math.floor(min / step) * step; v < max + step; v += step) {
      ticks.push(Number(v.toFixed(6)));
      if (v >= max) break;
    }
    return ticks;
  }

  function frame(width, ticks, y) {
    return ticks.map(t => `
      <line class="chart-grid" x1="${PAD.l}" x2="${width - PAD.r}" y1="${y(t)}" y2="${y(t)}"/>
      <text class="chart-axis" x="${PAD.l - 8}" y="${y(t) + 4}" text-anchor="end">${t % 1 ? t.toFixed(1) : t}</text>`).join('');
  }

  function attachTooltip(container, svg, positions, show) {
    const tip = container.querySelector('.chart-tip');
    const pick = e => {
      const box = svg.getBoundingClientRect();
      const x = e.clientX - box.left;
      let best = 0;
      positions.forEach((p, i) => { if (Math.abs(p - x) < Math.abs(positions[best] - x)) best = i; });
      return best;
    };
    const move = e => {
      const i = pick(e);
      const { x, y, text } = show(i);
      tip.textContent = text;
      tip.hidden = false;
      const w = tip.offsetWidth;
      tip.style.left = `${Math.min(Math.max(0, x - w / 2), container.clientWidth - w)}px`;
      tip.style.top = `${Math.max(0, y - tip.offsetHeight - 10)}px`;
    };
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'mouse') return; // on touch, keep it until the next tap
      tip.hidden = true;
      show(-1);
    });
  }

  // points: [{ date: 'YYYY-MM-DD', value, tip }] in date order.
  function line(container, { points, label, format = v => v }) {
    const width = Math.max(240, container.clientWidth);
    const times = points.map(p => +parseDate(p.date));
    const t0 = Math.min(...times);
    const t1 = Math.max(...times);
    const values = points.map(p => p.value);
    const ticks = niceTicks(Math.min(...values), Math.max(...values));
    const lo = ticks[0];
    const hi = ticks.at(-1);
    const x = t => (t1 === t0 ? (PAD.l + width - PAD.r) / 2 : PAD.l + ((t - t0) / (t1 - t0)) * (width - PAD.l - PAD.r));
    const y = v => PAD.t + (1 - (v - lo) / (hi - lo)) * (HEIGHT - PAD.t - PAD.b);
    const xs = times.map(x);
    const ys = values.map(y);
    const path = xs.map((px, i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
    const showDots = points.length <= 24;
    const last = points.length - 1;

    container.innerHTML = `
      <svg class="chart" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}" role="img"
        aria-label="${esc(label)}: from ${esc(format(values[0]))} on ${shortDate(points[0].date)} to ${esc(format(values[last]))} on ${shortDate(points[last].date)}">
        ${frame(width, ticks, y)}
        <path class="chart-line" d="${path}"/>
        ${showDots ? xs.map((px, i) => `<circle class="chart-dot" cx="${px}" cy="${ys[i]}" r="4"/>`).join('') : ''}
        <circle class="chart-dot" cx="${xs[last]}" cy="${ys[last]}" r="4"/>
        <text class="chart-value" x="${Math.min(xs[last], width - PAD.r)}" y="${ys[last] - 10}" text-anchor="end">${esc(format(values[last]))}</text>
        <text class="chart-axis" x="${PAD.l}" y="${HEIGHT - 6}">${shortDate(points[0].date)}</text>
        ${last ? `<text class="chart-axis" x="${width - PAD.r}" y="${HEIGHT - 6}" text-anchor="end">${shortDate(points[last].date)}</text>` : ''}
        <line class="chart-cross" x1="0" x2="0" y1="${PAD.t}" y2="${HEIGHT - PAD.b}" visibility="hidden"/>
        <circle class="chart-dot active" r="6" visibility="hidden"/>
        <rect class="chart-hit" x="0" y="0" width="${width}" height="${HEIGHT}"/>
      </svg>
      <div class="chart-tip" hidden></div>`;

    const svg = container.querySelector('svg');
    const cross = svg.querySelector('.chart-cross');
    const dot = svg.querySelector('.chart-dot.active');
    attachTooltip(container, svg, xs, i => {
      const visible = i >= 0 ? 'visible' : 'hidden';
      cross.setAttribute('visibility', visible);
      dot.setAttribute('visibility', visible);
      if (i < 0) return {};
      cross.setAttribute('x1', xs[i]);
      cross.setAttribute('x2', xs[i]);
      dot.setAttribute('cx', xs[i]);
      dot.setAttribute('cy', ys[i]);
      return { x: xs[i], y: ys[i], text: points[i].tip };
    });
  }

  // A bar with only its top corners rounded, sitting on the baseline.
  function barPath(x, y, w, h) {
    const r = Math.min(4, h, w / 2);
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
  }

  // bars: [{ label, value, tip }]
  function bars(container, { bars: data, label }) {
    const width = Math.max(240, container.clientWidth);
    const ticks = niceTicks(0, Math.max(1, ...data.map(b => b.value)), { integer: true });
    const hi = ticks.at(-1);
    const y = v => PAD.t + (1 - v / hi) * (HEIGHT - PAD.t - PAD.b);
    const band = (width - PAD.l - PAD.r) / data.length;
    const barW = Math.min(28, band * 0.6);
    const centres = data.map((_, i) => PAD.l + band * (i + 0.5));

    container.innerHTML = `
      <svg class="chart" width="${width}" height="${HEIGHT}" viewBox="0 0 ${width} ${HEIGHT}" role="img"
        aria-label="${esc(label)}: ${data.map(b => `${b.label} ${b.value}`).join(', ')}">
        ${frame(width, ticks, y)}
        <line class="chart-base" x1="${PAD.l}" x2="${width - PAD.r}" y1="${y(0)}" y2="${y(0)}"/>
        ${data.map((b, i) => b.value > 0
          ? `<path class="chart-bar" data-i="${i}" d="${barPath(centres[i] - barW / 2, y(b.value), barW, y(0) - y(b.value))}"/>`
          : '').join('')}
        ${data.map((b, i) => (i % 2 === data.length % 2 ? '' : `<text class="chart-axis" x="${centres[i]}" y="${HEIGHT - 6}" text-anchor="middle">${esc(b.label)}</text>`)).join('')}
        <rect class="chart-hit" x="0" y="0" width="${width}" height="${HEIGHT}"/>
      </svg>
      <div class="chart-tip" hidden></div>`;

    const svg = container.querySelector('svg');
    attachTooltip(container, svg, centres, i => {
      svg.querySelectorAll('.chart-bar').forEach(el => el.classList.toggle('dim', i >= 0 && Number(el.dataset.i) !== i));
      if (i < 0) return {};
      return { x: centres[i], y: y(data[i].value), text: data[i].tip };
    });
  }

  // The same numbers as a table, for screen readers and anyone who prefers it.
  function table(headers, rows) {
    return `
      <details class="chart-data">
        <summary>Show data</summary>
        <table>
          <thead><tr>${headers.map((h, i) => `<th${i ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </details>`;
  }

  return { line, bars, table, shortDate, parseDate };
})();
