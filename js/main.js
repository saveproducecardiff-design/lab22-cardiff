/* ================================================
   LAB 22 — MAIN SCRIPT
   ================================================ */

/* --- Interactive hero: parallax + gyro + gold dust --- */
(function interactiveHero() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layers = hero.querySelectorAll('[data-depth]');

  /* ---------- Glass carousel: crossfade one ghosted glass at a time ---------- */
  /* Each drink carries its own dust palette; new particles spawn in the
     active drink's colours so the speckles shift as the carousel turns. */
  const PALETTES = [
    ['244,138,160', '247,176,120', '232,213,163'], // pink highball: pink, orange, gold
    ['196,228,160', '224,238,190', '232,213,163'], // nick & nora: leaf greens, gold
    ['168,216,188', '205,175,135', '232,213,163']  // mint flip: mint, chocolate, gold
  ];
  let currentPalette = PALETTES[0];
  let onPaletteChange = null; // particle system hooks in below

  const glasses = hero.querySelectorAll('.glass-layer');
  if (glasses.length) {
    let gi = 0;
    glasses[0].classList.add('active');
    if (glasses.length > 1) {
      setInterval(() => {
        glasses[gi].classList.remove('active');
        gi = (gi + 1) % glasses.length;
        glasses[gi].classList.add('active');
        currentPalette = PALETTES[gi % PALETTES.length];
        if (onPaletteChange) onPaletteChange();
      }, 6500);
    }
  }

  /* ---------- Parallax (mouse on desktop, tilt on mobile) ---------- */
  if (!reducedMotion && layers.length) {
    // target = where the input wants us; current = eased position
    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;
    let running = false;

    function tick() {
      // lerp towards target for a weighty, liquid feel
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;

      layers.forEach(layer => {
        const depth = parseFloat(layer.dataset.depth);
        const x = curX * depth * 100;
        const y = curY * depth * 100;
        layer.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
      });

      if (Math.abs(targetX - curX) > 0.001 || Math.abs(targetY - curY) > 0.001) {
        requestAnimationFrame(tick);
      } else {
        running = false;
      }
    }

    function setTarget(x, y) {
      targetX = x;
      targetY = y;
      if (!running) { running = true; requestAnimationFrame(tick); }
    }

    const isTouch = window.matchMedia('(hover: none)').matches;

    if (!isTouch) {
      // Mouse: normalised -1..1 from hero centre
      hero.addEventListener('mousemove', e => {
        const r = hero.getBoundingClientRect();
        setTarget(
          ((e.clientX - r.left) / r.width - 0.5) * 2,
          ((e.clientY - r.top) / r.height - 0.5) * 2
        );
      });
      hero.addEventListener('mouseleave', () => setTarget(0, 0));
    } else if (window.DeviceOrientationEvent) {
      // Gyro tilt. iOS 13+ needs a user-gesture permission request;
      // if it never arrives the CSS bob animation carries the hero alone.
      const startGyro = () => {
        window.addEventListener('deviceorientation', e => {
          if (e.gamma === null) return;
          setTarget(
            Math.max(-1, Math.min(1, e.gamma / 30)),
            Math.max(-1, Math.min(1, (e.beta - 45) / 30))
          );
        }, true);
      };

      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const askOnce = () => {
          DeviceOrientationEvent.requestPermission()
            .then(state => { if (state === 'granted') startGyro(); })
            .catch(() => {});
          hero.removeEventListener('touchend', askOnce);
        };
        hero.addEventListener('touchend', askOnce, { once: true });
      } else {
        startGyro();
      }
    }
  }

  /* ---------- Gold particle dust ---------- */
  const canvas = hero.querySelector('.hero-particles');
  if (canvas && !reducedMotion) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let w, h;

    function resize() {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const COUNT = window.matchMedia('(min-width: 768px)').matches ? 45 : 22;

    function spawn(randomY) {
      // Colours come from the active drink's palette, with a rare purple accent
      const rgb = Math.random() < 0.1
        ? '178,152,220'
        : currentPalette[Math.floor(Math.random() * currentPalette.length)];
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : h + 10,
        r: Math.random() * 2.2 + 0.6,
        speed: Math.random() * 0.35 + 0.12,
        drift: (Math.random() - 0.5) * 0.25,
        alpha: Math.random() * 0.55 + 0.3,
        twinkle: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2,
        rgb: rgb
      };
    }

    for (let i = 0; i < COUNT; i++) particles.push(spawn(true));

    // When the carousel turns, drift most of the dust to the new drink's colours
    onPaletteChange = function () {
      particles.forEach(p => {
        if (Math.random() < 0.7) {
          p.rgb = currentPalette[Math.floor(Math.random() * currentPalette.length)];
        }
      });
    };

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p, i) => {
        p.y -= p.speed;
        p.x += p.drift + Math.sin(t / 2000 + p.phase) * 0.15;
        if (p.y < -10) particles[i] = spawn(false);

        const a = p.alpha * (0.6 + 0.4 * Math.sin(t / 600 * p.twinkle * 60 + p.phase));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.rgb + ',' + a.toFixed(3) + ')';
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }
}());


/* --- Liquid smoke shader: gold/purple churn that bends around the cursor --- */
(function liquidSmoke() {
  const canvas = document.querySelector('.hero-fluid');
  const hero = document.querySelector('.hero');
  if (!canvas || !hero) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { canvas.remove(); return; }

  const gl = canvas.getContext('webgl', { antialias: false, depth: false, stencil: false });
  if (!gl) { canvas.remove(); return; } // CSS atmosphere remains as fallback

  const VERT = [
    'attribute vec2 a;',
    'void main(){ gl_Position = vec4(a, 0.0, 1.0); }'
  ].join('\n');

  // Domain-warped fbm "ink" field; pointer adds a local swirl whose
  // strength follows cursor velocity, so fast moves stir the smoke.
  const FRAG = [
    'precision highp float;',
    'uniform vec2  u_res;',
    'uniform float u_time;',
    'uniform vec2  u_mouse;',   // 0..1, y up
    'uniform float u_swirl;',   // 0..1 stir strength
    '',
    'float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }',
    'float noise(vec2 p){',
    '  vec2 i = floor(p), f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),',
    '             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v = 0.0, a = 0.5;',
    '  for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.03 + vec2(17.0, 9.0); a *= 0.5; }',
    '  return v;',
    '}',
    '',
    'void main(){',
    '  vec2 uv = gl_FragCoord.xy / u_res;',
    '  float aspect = u_res.x / u_res.y;',
    '  vec2 p = uv * vec2(aspect, 1.0) * 1.7;',
    '',
    '  // cursor swirl: rotate the field around the pointer, falling off with distance',
    '  vec2 m = u_mouse * vec2(aspect, 1.0) * 1.7;',
    '  vec2 d = p - m;',
    '  float infl = u_swirl * exp(-dot(d, d) * 2.6);',
    '  float ang = infl * 3.0;',
    '  float ca = cos(ang), sa = sin(ang);',
    '  p = m + mat2(ca, -sa, sa, ca) * d;',
    '',
    '  float t = u_time * 0.045;',
    '  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t * 0.7));',
    '  vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2) + t * 1.4),',
    '                fbm(p + 2.0 * q + vec2(8.3, 2.8) - t));',
    '  float f = fbm(p + 2.6 * r);',
    '',
    '  vec3 gold   = vec3(0.79, 0.65, 0.35);',
    '  vec3 purple = vec3(0.40, 0.29, 0.60);',
    '  vec3 col = vec3(0.016, 0.014, 0.02);',
    '  col = mix(col, gold * 0.45, smoothstep(0.38, 0.95, f));',
    '  col = mix(col, purple * 0.42, smoothstep(0.45, 0.9, q.y) * 0.45);',
    '  col += gold * 0.22 * smoothstep(0.78, 1.0, f);',
    '  col += gold * infl * 0.18;  // faint warmth right at the stir point',
    '',
    '  float vig = smoothstep(1.25, 0.42, distance(uv, vec2(0.5, 0.45)));',
    '  col *= vig;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ].join('\n');

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.remove(); return; }

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.useProgram(prog);

  // fullscreen triangle
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');
  const uSwirl = gl.getUniformLocation(prog, 'u_swirl');

  // render at reduced resolution — it's soft smoke, nobody can tell
  const SCALE = window.matchMedia('(min-width: 768px)').matches ? 0.5 : 0.4;
  function resize() {
    canvas.width = Math.max(1, Math.floor(canvas.offsetWidth * SCALE));
    canvas.height = Math.max(1, Math.floor(canvas.offsetHeight * SCALE));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resize();
  window.addEventListener('resize', resize);

  // pointer state: eased position + velocity-driven swirl that decays
  let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, swirl = 0;

  function pointTo(clientX, clientY) {
    const r = hero.getBoundingClientRect();
    const nx = (clientX - r.left) / r.width;
    const ny = 1.0 - (clientY - r.top) / r.height; // gl y is up
    swirl = Math.min(1, swirl + Math.hypot(nx - tx, ny - ty) * 4.0);
    tx = nx; ty = ny;
  }
  hero.addEventListener('mousemove', e => pointTo(e.clientX, e.clientY), { passive: true });
  hero.addEventListener('touchmove', e => {
    if (e.touches.length) pointTo(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  // only render while the hero is on screen
  let visible = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; },
      { threshold: 0 }).observe(hero);
  }

  const t0 = performance.now();
  (function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    mx += (tx - mx) * 0.07;
    my += (ty - my) * 0.07;
    swirl *= 0.965; // stir settles back down

    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform1f(uTime, (now - t0) / 1000);
    gl.uniform2f(uMouse, mx, my);
    gl.uniform1f(uSwirl, swirl);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }(t0));
}());


/* --- Header: solid on scroll --- */
(function headerScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load
}());


/* --- Scroll reveal --- */
(function scrollReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length || !window.IntersectionObserver) {
    // Fallback: just show everything
    els.forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  els.forEach(el => observer.observe(el));
}());


/* --- Ticker: pause on hover / touch --- */
(function tickerPause() {
  const ticker = document.querySelector('.ticker');
  if (!ticker) return;

  ticker.addEventListener('mouseenter', () => {
    ticker.style.animationPlayState = 'paused';
  });
  ticker.addEventListener('mouseleave', () => {
    ticker.style.animationPlayState = 'running';
  });
}());


/* --- Smooth nav clicks (offset for fixed header) --- */
(function smoothNav() {
  const HEADER_H = 70;

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - HEADER_H;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
}());
