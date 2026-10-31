(function () {
  const D = window.PORTFOLIO;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  // OS reduced-motion is the default; an explicit "play motion" choice overrides it
  const reduced = localStorage.getItem('motion') === 'on' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.toggle('reduce-motion', reduced);
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  let motionPaused = !reduced && localStorage.getItem('motion') === 'off';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  /* ---------------- Boot sequence ---------------- */
  function boot() {
    const el = $('#boot');
    const log = $('#boot-log');
    const finish = () => {
      if (el.classList.contains('done')) return;
      el.classList.add('done');
      document.body.classList.remove('booting');
      sessionStorage.setItem('booted', '1');
      startTyping();
    };
    if (reduced || sessionStorage.getItem('booted')) {
      el.classList.add('done');
      startTyping();
      return;
    }
    document.body.classList.add('booting');
    let i = 0;
    const next = () => {
      if (i >= D.boot.length) return setTimeout(finish, 450);
      log.innerHTML += D.boot[i++] + '\n';
      setTimeout(next, 180 + Math.random() * 160);
    };
    next();
    $('#boot-skip').addEventListener('click', finish);
    window.addEventListener('keydown', finish, { once: true });
  }

  /* ---------------- Typed roles ---------------- */
  let typingStarted = false;
  function startTyping() {
    if (typingStarted) return;
    typingStarted = true;
    const el = $('#typed');
    if (reduced) { el.textContent = D.roles[0]; return; }
    let r = 0, c = 0, del = false;
    const tick = () => {
      const word = D.roles[r];
      c += del ? -1 : 1;
      el.textContent = word.slice(0, c);
      let delay = del ? 35 : 70;
      if (!del && c === word.length) { del = true; delay = 1800; }
      else if (del && c === 0) { del = false; r = (r + 1) % D.roles.length; delay = 300; }
      setTimeout(tick, delay);
    };
    tick();
  }

  /* ---------------- Neural network background ---------------- */
  function neural() {
    const cv = $('#neural-bg');
    const ctx = cv.getContext('2d');
    let w, h, nodes = [], pulses = [], dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    const LINK = 140;

    const resize = () => {
      w = cv.width = innerWidth * dpr;
      h = cv.height = innerHeight * dpr;
      cv.style.width = innerWidth + 'px';
      cv.style.height = innerHeight + 'px';
      const count = Math.min(110, Math.floor((innerWidth * innerHeight) / 14000));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr,
        r: (Math.random() * 1.4 + 0.6) * dpr,
        hue: Math.random() < 0.5 ? 190 : 275,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const link = LINK * dpr;

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        const dx = mouse.x - n.x, dy = mouse.y - n.y, dist = Math.hypot(dx, dy);
        if (dist < 180 * dpr) { n.x += dx * 0.004; n.y += dy * 0.004; }
      }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < link) {
            ctx.strokeStyle = `hsla(${a.hue}, 90%, 65%, ${(1 - d / link) * 0.22})`;
            ctx.lineWidth = dpr * 0.7;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            if (!reduced && pulses.length < 14 && Math.random() < 0.0004) pulses.push({ a, b, t: 0 });
          }
        }
      }

      for (const n of nodes) {
        ctx.fillStyle = `hsla(${n.hue}, 90%, 70%, .8)`;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      }

      // signals travelling along synapses
      pulses = pulses.filter((p) => (p.t += 0.02) <= 1);
      for (const p of pulses) {
        const x = p.a.x + (p.b.x - p.a.x) * p.t, y = p.a.y + (p.b.y - p.a.y) * p.t;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 8 * dpr);
        g.addColorStop(0, 'rgba(255,255,255,.95)');
        g.addColorStop(1, 'rgba(34,211,238,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 8 * dpr, 0, Math.PI * 2); ctx.fill();
      }
    };

    let running = true;
    const loop = () => { if (running && !motionPaused) draw(); requestAnimationFrame(loop); };
    resize();
    addEventListener('resize', resize);
    addEventListener('mousemove', (e) => { mouse.x = e.clientX * dpr; mouse.y = e.clientY * dpr; });
    document.addEventListener('visibilitychange', () => { running = !document.hidden; });
    draw();
    if (!reduced) loop();
  }

  /* ---------------- Render content ---------------- */
  function render() {
    $('#stats').innerHTML = D.stats.map((s) => `
      <div class="card stat reveal">
        <div class="stat-num grad" data-count="${s.value}" data-suffix="${esc(s.suffix)}">0${esc(s.suffix)}</div>
        <div class="stat-label">${esc(s.label)}</div>
      </div>`).join('');

    $('#timeline').innerHTML = D.experience.map((e) => `
      <li class="tl-item reveal ${e.current ? 'current' : ''}">
        <span class="tl-node"></span>
        <article class="card tl-card">
          <div class="tl-top">
            <h3 class="tl-role">${esc(e.role)}${e.current ? '<span class="badge-now">● now</span>' : ''}</h3>
            <span class="tl-period">${esc(e.period)}</span>
          </div>
          <p class="tl-company">${esc(e.company)} · ${esc(e.location)}</p>
          <ul class="tl-points">
            ${e.points.map((p) => `<li>${p.title ? `<b>${esc(p.title)}:</b> ` : ''}${md(p.text)}</li>`).join('')}
          </ul>
        </article>
      </li>`).join('');

    $('#bento').innerHTML = D.projects.map((p) => `
      <article class="card proj reveal tilt ${p.featured ? 'featured' : ''}">
        ${p.flow ? `<span class="proj-flow">${p.flow.split('→').map((s) => esc(s.trim())).join(' <b>→</b> ')}</span>` : ''}
        <span class="proj-tag">${esc(p.tag)}</span>
        <h3>${esc(p.name)}</h3>
        <p>${md(p.desc)}</p>
        <div class="chips">${p.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
        <div class="proj-metrics">${p.metrics.map((m) => `<div><strong>${esc(m.v)}</strong><span>${esc(m.l)}</span></div>`).join('')}</div>
      </article>`).join('');

    $('#skills-grid').innerHTML = D.skills.map((s) => `
      <article class="card skill-card reveal">
        <div class="skill-head"><span class="skill-icon">${esc(s.icon)}</span><h3>${esc(s.name)}</h3></div>
        <div class="chips">${s.items.map((i) => `<span class="chip">${esc(i)}</span>`).join('')}</div>
      </article>`).join('');

    const words = ['Agentic RAG', 'GraphRAG', 'Azure OpenAI', 'Semantic Kernel', 'Vision LLMs', 'Prompt Engineering', '.NET', 'Python', 'Angular', 'AKS'];
    $('#marquee').innerHTML = [...words, ...words].map((w) => `<span>${esc(w)} ✦</span>`).join('');

    const e = D.education;
    $('#edu').classList.add('card');
    $('#edu').innerHTML = `
      <span class="proj-tag">Education · ${esc(e.period)}</span>
      <h3>${esc(e.school)}</h3>
      <p>${esc(e.degree)}</p>
      <p>${esc(e.location)}</p>
      <div class="big grad">${esc(e.cgpa)}</div>
      <p class="mono">CGPA</p>`;

    $('#awards').innerHTML = D.achievements.map((a, i) => `
      <article class="card award reveal">
        <span class="trophy">// achievement_0${i + 1}</span>
        <h4>${esc(a.title)}</h4>
        <p>${esc(a.text)}</p>
      </article>`).join('');

    $('#year').textContent = new Date().getFullYear();
  }

  /* ---------------- Scroll effects ---------------- */
  function scrollFx() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        setTimeout(() => (en.target.style.transitionDelay = ''), 1200);
        const num = $('[data-count]', en.target);
        if (num) countUp(num);
        io.unobserve(en.target);
      });
    }, { threshold: 0.15 });
    $$('.reveal').forEach((el, i) => {
      el.style.transitionDelay = `${(i % 3) * 80}ms`;
      io.observe(el);
    });

    const bar = $('#progress');
    const links = $$('#nav-links a');
    const sections = links.map((a) => $(a.getAttribute('href')));
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
      let current = -1;
      sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) current = i; });
      links.forEach((a, i) => a.classList.toggle('active', i === current));
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function countUp(el) {
    const target = +el.dataset.count, suffix = el.dataset.suffix;
    const fmt = (n) => n.toLocaleString('en-US') + suffix;
    if (reduced) { el.textContent = fmt(target); return; }
    const start = performance.now(), dur = 1600;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------------- Pointer interactions ---------------- */
  function pointerFx() {
    if (!finePointer || reduced) return;
    const glow = $('.cursor-glow');
    addEventListener('mousemove', (e) => { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; });

    document.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });

    $$('.tilt').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });

    $$('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------------- Nav ---------------- */
  function nav() {
    const btn = $('#nav-toggle'), ul = $('#nav-links');
    btn.addEventListener('click', () => {
      const open = ul.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
    });
    ul.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') { ul.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------------- Chat agent ---------------- */
  const agent = window.createAgent(D);

  function chat() {
    const log = $('#chat-log'), form = $('#chat-form'), input = $('#chat-input'), sug = $('#chat-suggest');
    let busy = false;

    const add = (role, html) => {
      const m = document.createElement('div');
      m.className = `msg ${role}`;
      if (role === 'user') m.textContent = html; else m.innerHTML = html;
      log.appendChild(m);
      log.scrollTop = log.scrollHeight;
      return m;
    };

    const stream = (el, text, meta) => new Promise((done) => {
      if (reduced) { el.innerHTML = md(text) + meta; return done(); }
      const words = text.split(/(\s+)/);
      let i = 0;
      const tick = () => {
        i += 2;
        el.innerHTML = md(words.slice(0, i).join('')).replace(/\*\*/g, '');
        log.scrollTop = log.scrollHeight;
        if (i < words.length) setTimeout(tick, 18); else { el.innerHTML += meta; log.scrollTop = log.scrollHeight; done(); }
      };
      tick();
    });

    // Visualise the retrieval pipeline step by step before the answer streams in
    const trace = async (res) => {
      const grounded = res.sources.length > 0;
      const steps = [
        ['Ingest', `${D.knowledge.length} resume passages`],
        ['Represent', `[${res.tokens.slice(0, 5).map(esc).join(', ')}${res.tokens.length > 5 ? ', …' : ''}]`],
        ['Retrieve', `BM25 → ${res.retrieved || 0} candidate${res.retrieved === 1 ? '' : 's'}`],
        ['Compose', grounded ? `extractive answer · top ${res.sources.length}` : 'no evidence → decline'],
        ['Attribute', grounded ? res.sources.map(esc).join(', ') : '—'],
      ];
      const el = document.createElement('div');
      el.className = 'trace';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = steps.map(([k, v]) => `<div class="trace-step"><i></i><b>${k}</b><span>${v}</span></div>`).join('');
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      const rows = $$('.trace-step', el);
      for (const row of rows) {
        row.classList.add('on');
        if (!reduced) await new Promise((r) => setTimeout(r, 140));
      }
      el.classList.add('done');
    };

    const ask = async (q) => {
      q = q.trim();
      if (!q || busy) return;
      busy = true;
      add('user', q);
      input.value = '';

      const res = agent.ask(q);
      if (res.tokens.length) {
        await trace(res);
      } else {
        const think = document.createElement('div');
        think.className = 'thinking';
        think.innerHTML = '<span>›</span> thinking…';
        log.appendChild(think);
        log.scrollTop = log.scrollHeight;
        await new Promise((r) => setTimeout(r, reduced ? 0 : 450));
        think.remove();
      }

      const meta = res.sources.length
        ? `<span class="msg-meta">sources: ${res.sources.map((s) => `<span class="src">[${esc(s)}]</span>`).join(' ')} · confidence ${res.confidence}</span>`
        : '';
      await stream(add('bot', ''), res.answer, meta);
      busy = false;
    };

    add('bot', md(D.agent.greeting));
    sug.innerHTML = D.agent.suggestions.map((s) => `<button type="button">${esc(s)}</button>`).join('');
    sug.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') ask(e.target.textContent); });
    form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });

    window.__askAgent = (q) => { switchTab('chat'); $('#console').scrollIntoView({ behavior: 'smooth' }); ask(q); };
  }

  /* ---------------- Terminal ---------------- */
  function terminal() {
    const out = $('#term-out'), input = $('#term-input'), form = $('#term-form'), term = $('#term');
    const history = [];
    let hIdx = 0;

    const print = (html) => {
      const line = document.createElement('div');
      line.className = 'term-out-line';
      line.innerHTML = html;
      out.appendChild(line);
      term.scrollTop = term.scrollHeight;
    };

    const link = (href, text) => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`;

    const neofetch = () => `<span class="c">   ███████╗██████╗ </span>  <span class="g">visitor</span>@<span class="g">shiva</span>
<span class="c">   ██╔════╝██╔══██╗</span>  -----------------
<span class="v">   ███████╗██████╔╝</span>  <span class="c">Name</span>:     ${esc(D.name)}
<span class="v">   ╚════██║██╔══██╗</span>  <span class="c">Role</span>:     ${esc(D.title)} @ FNFI
<span class="p">   ███████║██████╔╝</span>  <span class="c">Uptime</span>:   3+ years in production GenAI
<span class="p">   ╚══════╝╚═════╝ </span>  <span class="c">Kernel</span>:   RAG · GraphRAG · Agents
                       <span class="c">Shell</span>:    Python · C# · .NET · Angular
                       <span class="c">Cloud</span>:    Azure OpenAI · AI Search · AKS
                       <span class="c">Location</span>: ${esc(D.location)}`;

    const cmds = {
      help: () => `<span class="m">available commands:</span>
  <span class="c">whoami</span>       short bio
  <span class="c">neofetch</span>     system info, but it's me
  <span class="c">experience</span>   career timeline
  <span class="c">projects</span>     shipped GenAI systems
  <span class="c">skills</span>       tech stack
  <span class="c">impact</span>       headline numbers
  <span class="c">education</span>    degree
  <span class="c">contact</span>      ways to reach me
  <span class="c">resume</span>       download PDF
  <span class="c">ask</span> &lt;q&gt;      ask the AI agent, e.g. <span class="m">ask what is graphrag work</span>
  <span class="c">clear</span>        clear screen
<span class="m">psst… there are hidden commands too.</span>`,
      whoami: () => md(D.knowledge.find((k) => k.id === 'summary').answer),
      neofetch,
      experience: () => D.experience.map((e) => `<span class="g">▸ ${esc(e.role)}</span> <span class="m">@ ${esc(e.company)}</span>\n  <span class="c">${esc(e.period)}</span>`).join('\n'),
      projects: () => D.projects.map((p) => `<span class="v">◆ ${esc(p.name)}</span> <span class="m">(${esc(p.tag)})</span>\n  ${md(p.desc.split('. ')[0])}.`).join('\n'),
      skills: () => D.skills.map((s) => `<span class="c">${esc(s.name)}</span>\n  ${s.items.map(esc).join(' · ')}`).join('\n'),
      impact: () => D.stats.map((s) => `<span class="g">${esc(s.value.toLocaleString('en-US') + s.suffix).padStart(7)}</span>  ${esc(s.label)}`).join('\n'),
      education: () => md(D.knowledge.find((k) => k.id === 'edu').answer),
      contact: () => `email     <a href="mailto:${esc(D.email)}">${esc(D.email)}</a>
phone     <a href="tel:${esc(D.phone.replace(/\s/g, ''))}">${esc(D.phone)}</a>
linkedin  ${link(D.linkedin, 'linkedin.com/in/shivanand-biradar')}
github    ${link(D.github, 'github.com/Shivanand122')}`,
      resume: () => { window.open(D.resume, '_blank', 'noopener'); return '<span class="g">✓</span> opening résumé…'; },
      ls: () => '<span class="c">experience/</span>  <span class="c">projects/</span>  <span class="c">skills/</span>  secrets.txt  resume.pdf',
      'cat secrets.txt': () => '<span class="p">I\'ve rewritten a 3-month project in 1 month. With AI agents. Solo. 🤫</span>',
      'sudo hire-me': () => `<span class="g">[sudo] access granted.</span>
Drafting offer letter… <span class="g">done</span>
Sending to ${esc(D.email)}… <span class="m">(just kidding, click below)</span>
→ <a href="mailto:${esc(D.email)}?subject=Let's%20talk%20about%20a%20GenAI%20role">compose email</a>`,
      sudo: () => '<span class="p">nice try.</span> <span class="m">try: sudo hire-me</span>',
      date: () => esc(new Date().toString()),
      pwd: () => '/home/visitor/shivanand-portfolio',
      exit: () => '<span class="m">there is no escape. try </span><span class="c">contact</span>',
      'rm -rf /': () => '<span class="p">permission denied: this portfolio is production-grade.</span>',
      matrix: () => { matrixRain(); return '<span class="g">wake up, recruiter…</span>'; },
    };

    const run = (raw) => {
      const cmd = raw.trim();
      print(`<span class="prompt">visitor@shiva:~$</span> ${esc(cmd)}`);
      if (!cmd) return;
      history.push(cmd); hIdx = history.length;
      const lower = cmd.toLowerCase();

      if (lower === 'clear') { out.innerHTML = ''; return; }
      if (lower.startsWith('echo ')) return print(esc(cmd.slice(5)));
      if (lower.startsWith('ask ')) {
        const res = agent.ask(cmd.slice(4));
        return print(md(res.answer) + (res.sources.length ? `\n<span class="m">sources: ${res.sources.map(esc).join(', ')}</span>` : ''));
      }
      const fn = cmds[lower];
      if (fn) return print(fn());
      // Natural-language fallback: route to the agent
      if (lower.split(/\s+/).length > 2) {
        const res = agent.ask(cmd);
        return print(`<span class="m">command not found, routing to shiva.ai…</span>\n${md(res.answer)}`);
      }
      print(`<span class="p">command not found:</span> ${esc(cmd)}. Type <span class="c">help</span>.`);
    };

    print(neofetch());
    print('\n<span class="m">Type</span> <span class="c">help</span> <span class="m">to get started.</span>');

    form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); input.value = ''; });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && hIdx > 0) { input.value = history[--hIdx]; e.preventDefault(); }
      if (e.key === 'ArrowDown') { hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || ''; e.preventDefault(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        const match = Object.keys(cmds).concat('clear', 'ask ', 'echo ').find((c) => c.startsWith(input.value.toLowerCase()) && input.value);
        if (match) input.value = match;
      }
    });
    term.addEventListener('click', () => input.focus());
  }

  /* ---------------- Tabs ---------------- */
  function switchTab(name) {
    $$('.tab').forEach((t) => {
      const on = t.dataset.tab === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on);
    });
    $('#pane-chat').classList.toggle('active', name === 'chat');
    $('#pane-term').classList.toggle('active', name === 'term');
    (name === 'chat' ? $('#chat-input') : $('#term-input')).focus({ preventScroll: true });
  }
  function tabs() {
    $$('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  }

  /* ---------------- Easter egg: matrix rain ---------------- */
  function matrixRain() {
    if (reduced || $('#matrix')) return;
    const cv = document.createElement('canvas');
    cv.id = 'matrix';
    Object.assign(cv.style, { position: 'fixed', inset: 0, zIndex: 90, pointerEvents: 'none', transition: 'opacity 1s' });
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    cv.width = innerWidth; cv.height = innerHeight;
    const size = 16, cols = Math.ceil(innerWidth / size), drops = Array(cols).fill(0).map(() => Math.random() * -50);
    const chars = 'アイウエオカキクケコRAGLLMAI01<>{}';
    const start = performance.now();
    const frame = (now) => {
      ctx.fillStyle = 'rgba(5,6,15,.12)';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#4ade80';
      ctx.font = `${size}px JetBrains Mono, monospace`;
      drops.forEach((y, i) => {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * size, y * size);
        drops[i] = y * size > cv.height && Math.random() > 0.97 ? 0 : y + 1;
      });
      if (now - start < 4500) requestAnimationFrame(frame);
      else { cv.style.opacity = 0; setTimeout(() => cv.remove(), 1000); }
    };
    requestAnimationFrame(frame);
  }

  /* ---------------- Misc ---------------- */
  function motionToggle() {
    const btn = $('#motion-toggle');
    if (reduced) {
      btn.textContent = '▶ play motion';
      btn.setAttribute('aria-pressed', 'true');
      btn.addEventListener('click', () => { localStorage.setItem('motion', 'on'); location.reload(); });
      return;
    }
    const apply = () => {
      document.body.classList.toggle('motion-off', motionPaused);
      btn.setAttribute('aria-pressed', motionPaused);
      btn.textContent = motionPaused ? '▶ play motion' : '❚❚ pause motion';
    };
    btn.addEventListener('click', () => {
      motionPaused = !motionPaused;
      localStorage.setItem('motion', motionPaused ? 'off' : 'on');
      apply();
    });
    apply();
  }

  function misc() {
    const btn = $('#copy-email'), hint = $('#copy-hint');
    btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(D.email); hint.textContent = 'copied ✓'; }
      catch { location.href = `mailto:${D.email}`; }
      setTimeout(() => (hint.textContent = 'click to copy'), 2000);
    });

    // "/" focuses the AI chat from anywhere
    addEventListener('keydown', (e) => {
      if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        e.preventDefault();
        $('#console').scrollIntoView({ behavior: 'smooth' });
        switchTab('chat');
      }
    });

    // Konami code → matrix rain
    const seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let k = 0;
    addEventListener('keydown', (e) => {
      k = e.key === seq[k] ? k + 1 : (e.key === seq[0] ? 1 : 0);
      if (k === seq.length) { k = 0; matrixRain(); }
    });

    console.log('%c<SB/> Hey, curious engineer!', 'font: 700 18px monospace; color: #22d3ee');
    console.log('%cTry the terminal on the page, or type: __askAgent("what is his biggest impact?")', 'color: #a855f7');
  }

  render();
  neural();
  scrollFx();
  pointerFx();
  nav();
  chat();
  terminal();
  tabs();
  misc();
  motionToggle();
  boot();
})();
