'use strict';

// Coach chat: ask questions about training and food. The coach only answers;
// it never changes your plan, workouts or favourites.
// It needs the server function in api/chat.mjs, so it works on the Vercel
// address, not on GitHub Pages or `node serve.js` without a key.
const ChatScreens = (() => {
  const { icon, esc } = UI;
  const KEEP = 40;  // messages saved on this phone
  const SEND = 20;  // most recent messages sent with each question
  const SUGGESTIONS = [
    'What should I eat after a workout?',
    'My knees ache when I squat. What can I change?',
    'How do I get my first pull-up?',
    'Give me a quick high-protein breakfast idea.',
  ];
  let busy = false;

  // A short summary of the person so the coach doesn't have to ask.
  function context() {
    const s = Store.state;
    const p = s.profile;
    const lines = [];
    const t = Nutrition.targets(p);
    lines.push(`Goal: ${Nutrition.GOALS[p.goal].name}.`);
    if (t) lines.push(`Daily targets from the app: about ${t.kcal} kcal and ${t.protein} g protein (maintenance about ${t.maintenance} kcal).`);
    const about = [
      p.sex && p.sex !== 'other' ? p.sex : '',
      p.age ? `age ${p.age}` : '',
      p.heightCm ? `height ${Math.round(p.heightCm)} cm` : '',
      p.weightKg ? `weight ${UI.round1(p.weightKg)} kg` : '',
    ].filter(Boolean);
    if (about.length) lines.push(`Profile: ${about.join(', ')}.`);
    if (p.activity) lines.push(`Activity: ${Nutrition.ACTIVITY[p.activity]?.label}.`);
    lines.push(`Prefers ${p.units === 'imperial' ? 'lb and feet' : 'kg and cm'}.`);
    const next = TrainScreens.nextWorkout();
    if (next) lines.push(`Program: ${next.type.name}, ${next.level.name}. Next workout: day ${next.dayNum}, ${next.day.name}.`);
    else lines.push('No training program chosen yet.');
    const weekStart = UI.startOfWeek();
    lines.push(`Workouts logged: ${s.sessions.length} in total, ${s.sessions.filter(x => x.date >= weekStart).length} this week.`);
    return lines.join('\n');
  }

  // Turns the coach's plain text (with "- " lists and **bold**) into safe HTML.
  function format(text) {
    const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const out = [];
    let list = null;
    const close = () => {
      if (list) out.push(`<${list.tag}>${list.items.join('')}</${list.tag}>`);
      list = null;
    };
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*([-*•]|\d+[.)])\s+(.*)$/);
      if (m) {
        const tag = /\d/.test(m[1]) ? 'ol' : 'ul';
        if (list?.tag !== tag) { close(); list = { tag, items: [] }; }
        list.items.push(`<li>${inline(m[2])}</li>`);
      } else {
        close();
        if (line.trim()) out.push(`<p>${inline(line)}</p>`);
      }
    }
    close();
    return out.join('');
  }

  const bubble = m => m.role === 'user'
    ? `<div class="bubble user">${esc(m.content)}</div>`
    : `<div class="bubble coach">${format(m.content)}</div>`;

  const intro = () => `
    <section class="card chat-intro">
      <span class="type-icon" style="--c: var(--accent)">${icon('chat')}</span>
      <h3>Ask your coach</h3>
      <p class="small muted">Questions about exercises, form, aches, your program, meals or protein. The coach answers; it doesn't change anything in the app.</p>
      <p class="small muted">Your questions and your profile basics (goal, targets, program) are sent to get an answer. General guidance, not medical advice.</p>
    </section>
    <div class="suggestions">
      ${SUGGESTIONS.map(q => `<button class="suggestion" data-ask="${esc(q)}">${esc(q)}</button>`).join('')}
    </div>`;

  function chat() {
    const messages = Store.state.chat;
    return {
      title: 'Chat',
      html: `
        ${messages.length ? '<button class="btn quiet small-btn new-chat" data-action="new">New chat</button>' : ''}
        <section class="chat-log" aria-live="polite">
          ${messages.length ? messages.map(bubble).join('') : intro()}
        </section>
        <form class="composer" autocomplete="off">
          <textarea name="q" rows="1" maxlength="2000" placeholder="Ask your coach…" enterkeyhint="send" aria-label="Your question"></textarea>
          <button class="send" type="submit" aria-label="Send"${busy ? ' disabled' : ''}>${icon('send')}</button>
        </form>`,
      mount,
    };
  }

  function mount(page) {
    const form = page.querySelector('.composer');
    const box = form.elements.q;
    const log = page.querySelector('.chat-log');
    const toBottom = () => window.scrollTo(0, document.documentElement.scrollHeight);
    requestAnimationFrame(toBottom);

    const grow = () => {
      box.style.height = 'auto';
      box.style.height = `${Math.min(box.scrollHeight, 140)}px`;
    };
    box.addEventListener('input', grow);
    box.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        form.requestSubmit();
      }
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const text = box.value.trim();
      if (!text || busy) return;
      box.value = '';
      grow();
      ask(text);
    });

    page.addEventListener('click', e => {
      const q = e.target.closest('[data-ask]')?.dataset.ask;
      if (q && !busy) ask(q);
      if (e.target.closest('[data-action="new"]')) {
        if (busy || !confirm('Clear this chat and start a new one?')) return;
        Store.update(s => { s.chat = []; });
        App.refresh();
      }
    });

    async function ask(text) {
      if (!navigator.onLine) {
        UI.toast('Chat needs signal');
        box.value = text;
        return;
      }
      busy = true;
      Store.update(s => {
        s.chat.push({ role: 'user', content: text });
        s.chat = s.chat.slice(-KEEP);
      });
      if (log.querySelector('.chat-intro')) {
        log.innerHTML = '';
        page.querySelector('.suggestions')?.remove();
      }
      log.insertAdjacentHTML('beforeend', bubble({ role: 'user', content: text }));
      const reply = document.createElement('div');
      reply.className = 'bubble coach';
      reply.innerHTML = '<span class="typing" aria-label="Coach is typing"><i></i><i></i><i></i></span>';
      log.append(reply);
      form.querySelector('.send').disabled = true;
      toBottom();

      let answer = '';
      try {
        const res = await fetch('api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: Store.state.chat.slice(-SEND), context: context() }),
        });
        if (!res.ok) {
          const notHosted = res.status === 404 || res.status === 405 || res.status === 501;
          throw new Error(notHosted
            ? "Chat isn't available at this address. Open the Vercel version of the app."
            : (await res.text()) || 'The coach is unavailable right now.');
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          reply.innerHTML = format(answer);
          toBottom();
        }
        answer += decoder.decode();
        if (!answer.trim()) throw new Error('The coach had no answer. Try again.');
        reply.innerHTML = format(answer);
        Store.update(s => {
          s.chat.push({ role: 'assistant', content: answer });
          s.chat = s.chat.slice(-KEEP);
        });
      } catch (err) {
        // Take the question back off, so it can be sent again.
        Store.update(s => { if (s.chat.at(-1)?.role === 'user') s.chat.pop(); });
        reply.className = 'bubble error';
        reply.textContent = err instanceof TypeError ? "Couldn't reach the coach. Check your signal and try again." : err.message;
        if (!box.value) box.value = text;
        grow();
      } finally {
        busy = false;
        form.querySelector('.send').disabled = false;
        toBottom();
      }
    }
  }

  return { chat };
})();
