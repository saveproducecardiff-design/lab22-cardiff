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
  const glasses = hero.querySelectorAll('.glass-layer');
  if (glasses.length) {
    let gi = 0;
    glasses[0].classList.add('active');
    if (glasses.length > 1) {
      setInterval(() => {
        glasses[gi].classList.remove('active');
        gi = (gi + 1) % glasses.length;
        glasses[gi].classList.add('active');
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
      // Mostly gold dust, with the occasional fainter purple speck
      const purple = Math.random() < 0.28;
      return {
        x: Math.random() * w,
        y: randomY ? Math.random() * h : h + 10,
        r: Math.random() * 1.8 + 0.4,
        speed: Math.random() * 0.35 + 0.12,
        drift: (Math.random() - 0.5) * 0.25,
        alpha: (Math.random() * 0.5 + 0.15) * (purple ? 0.6 : 1),
        twinkle: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2,
        rgb: purple ? '178, 152, 220' : '232, 213, 163'
      };
    }

    for (let i = 0; i < COUNT; i++) particles.push(spawn(true));

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
