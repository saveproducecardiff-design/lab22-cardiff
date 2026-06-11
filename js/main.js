/* ================================================
   LAB 22 — MAIN SCRIPT
   ================================================ */

/* --- Hero image rotation --- */
(function heroRotation() {
  const slides = document.querySelectorAll('.hero-slide');
  if (slides.length < 2) return;
  let current = 0;

  setInterval(() => {
    slides[current].classList.remove('active');
    current = (current + 1) % slides.length;
    slides[current].classList.add('active');
  }, 5000);
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
