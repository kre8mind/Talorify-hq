/* ==========================================================================
   TALORIFY LANDING PAGE: THE DEMO, THE REVEALS AND THE STICKY BUTTON
   Loaded after app.js. It does not touch the waitlist forms.

   Contents
     1. Helpers
     2. The demo screens: copies for the hero and for phones
     3. The hero demo (loops through the three steps)
     4. Numbers that count up when a screen appears
     5. Sections that rise in
     6. The sticky button on phones
     7. The problem: three pills that fill and hand off to each other
     8. Testimonials: auto-swiping placeholder cards, no drag/cursor
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- 1. Helpers ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function isInView(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight);
  }

  /* ---------- 2. The demo screens ---------- */
  // "How it works" has been removed, so #stepImg1/2/3 no longer exist; the hero's floating demo below has
  // nothing left to clone, but it stays hidden either way.
  var sources = [1, 2, 3].map(function (n) { return document.getElementById('stepImg' + n); });

  function copyOfScreen(n) {
    var source = sources[n - 1];
    if (!source) return null;
    var copy = source.cloneNode(true);
    copy.removeAttribute('id');
    copy.classList.remove('step-visual-img', 'active');
    return copy;
  }

  /* ---------- 4. Numbers that count up ---------- */
  function countUp(screen) {
    Array.prototype.forEach.call(screen.querySelectorAll('[data-count]'), function (el) {
      var to = parseFloat(el.getAttribute('data-count'));
      var from = parseFloat(el.getAttribute('data-from') || '0');
      if (reduceMotion || isNaN(to)) { el.textContent = String(to); return; }
      var start = null;
      function frame(now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / 900, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(from + (to - from) * eased));
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
  }

  // When a step becomes the chosen one in "How it works", its numbers count up
  sources.forEach(function (screen) {
    if (!screen || !window.MutationObserver) return;
    new MutationObserver(function () { if (screen.classList.contains('active')) countUp(screen); })
      .observe(screen, { attributes: true, attributeFilter: ['class'] });
  });

  // Same thing for the rebuilt "How it works" cards (how-it-works.js toggles .is-active on them)
  Array.prototype.forEach.call(document.querySelectorAll('#how-it-works .hiw2-card'), function (card) {
    if (!window.MutationObserver) return;
    new MutationObserver(function () { if (card.classList.contains('is-active')) countUp(card); })
      .observe(card, { attributes: true, attributeFilter: ['class'] });
  });

  /* ---------- 3. The hero demo ---------- */
  var hero = document.getElementById('heroDemo');
  if (hero) {
    var stage = hero.querySelector('.hero-demo-stage');
    var dots = Array.prototype.slice.call(hero.querySelectorAll('.hero-demo-dots i'));
    var screens = [1, 2, 3].map(function (n) {
      var copy = copyOfScreen(n);
      if (copy) { copy.classList.add('hero-demo-screen'); stage.appendChild(copy); }
      return copy;
    }).filter(Boolean);

    var current = -1;
    var timer = null;

    var show = function (index) {
      current = index;
      screens.forEach(function (s, i) { s.classList.toggle('is-active', i === index); });
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
      if (screens[index]) countUp(screens[index]);
    };
    var next = function () { show((current + 1) % screens.length); };

    var play = function () { if (!timer && !reduceMotion) timer = setInterval(next, 3800); };
    var pause = function () { clearInterval(timer); timer = null; };

    // A person who reads it in order sees: the resume, the match, then the tailored result
    show(reduceMotion ? screens.length - 1 : 0);
    if (!reduceMotion && window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        entries[0].isIntersecting && !document.hidden ? play() : pause();
      }, { threshold: 0.25 }).observe(hero);
      document.addEventListener('visibilitychange', function () { document.hidden ? pause() : (isInView(hero) && play()); });
    }
    dots.forEach(function (dot, i) { dot.addEventListener('click', function () { pause(); show(i); }); });
  }

  /* ---------- 5. Sections that rise in ---------- */
  var risers = document.querySelectorAll('.lp-stagger');
  if (window.IntersectionObserver && !reduceMotion) {
    var riseObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        riseObserver.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(risers, function (el) { riseObserver.observe(el); });
  } else {
    Array.prototype.forEach.call(risers, function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- 7. The problem: three pills that fill and hand off to each other ---------- */
  (function () {
    var pills = Array.prototype.slice.call(document.querySelectorAll('.problem-pill'));
    var card = document.getElementById('problem-card');
    if (!pills.length || !card) return;

    var titles = (card.getAttribute('data-titles') || '').split('|');
    var texts = (card.getAttribute('data-texts') || '').split('|');
    var titleEl = card.querySelector('.problem-card-title');
    var textEl = card.querySelector('.problem-card-text');
    var DURATION = 4800; // how long each problem stays on screen before handing off to the next
    var current = 0;
    var lastRendered = -1;
    var rafId = null;
    var playing = false; // only true while the section is actually on screen

    function setFill(pill, pct) {
      var fill = pill.querySelector('.problem-pill-fill');
      if (fill) fill.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
    }

    // Smooth micro-motion when transitioning between problem capsules
    function renderCard(index) {
      if (index === lastRendered) return;
      var isFirst = lastRendered === -1;
      lastRendered = index;
      var contentEl = card.querySelector('.problem-card-content');
      if (!contentEl || reduceMotion || isFirst) {
        titleEl.textContent = titles[index] || '';
        textEl.textContent = texts[index] || '';
        return;
      }

      contentEl.classList.remove('is-entering');
      contentEl.classList.add('is-switching');
      card.classList.remove('card-pulse');
      void card.offsetWidth; // force reflow
      card.classList.add('card-pulse');

      setTimeout(function () {
        titleEl.textContent = titles[index] || '';
        textEl.textContent = texts[index] || '';
        contentEl.classList.remove('is-switching');
        contentEl.classList.add('is-entering');
        void contentEl.offsetWidth; // force reflow
        requestAnimationFrame(function () {
          contentEl.classList.remove('is-entering');
        });
      }, 140);
    }

    function setActive(index) {
      current = (index + pills.length) % pills.length;
      pills.forEach(function (p, i) {
        var active = i === current;
        p.classList.toggle('is-active', active);
        p.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (!active) setFill(p, 0);
      });
      renderCard(current);
    }

    function stopAnim() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    // Plays the given problem's pill filling from startPct to 100, then (if still on screen) hands off to the next one.
    function playFrom(index, startPct) {
      stopAnim();
      setActive(index);
      setFill(pills[current], startPct || 0);
      if (reduceMotion) { setFill(pills[current], 100); return; }
      var start = null;
      function frame(now) {
        if (start === null) start = now - ((startPct || 0) / 100) * DURATION;
        var elapsed = now - start;
        if (elapsed > DURATION * 1.5) { start = now; elapsed = 0; } // the tab was hidden or throttled; resume from here instead of racing to the end
        var pct = Math.min(100, (elapsed / DURATION) * 100);
        setFill(pills[current], pct);
        if (pct >= 100) {
          rafId = null;
          if (playing) playFrom(current + 1, 0);
          return;
        }
        rafId = requestAnimationFrame(frame);
      }
      rafId = requestAnimationFrame(frame);
    }

    setActive(0); // the first problem is already what the page shows before any script runs

    pills.forEach(function (pill, i) {
      pill.addEventListener('click', function () { playFrom(i, 0); });
    });

    playing = true;
    playFrom(0, 0);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        playing = false;
        stopAnim();
      } else {
        playing = true;
        if (!rafId) playFrom(current, 0);
      }
    });
  })();

  /* ---------- 8. Testimonials Slider with Fluid Progress Indicators & Controls (Image 4) ---------- */
  (function () {
    var slides = Array.prototype.slice.call(document.querySelectorAll('.testi-slide'));
    var dashes = Array.prototype.slice.call(document.querySelectorAll('.testi-dash'));
    var counter = document.getElementById('testiCounter');
    var nameEl = document.getElementById('testiName');
    var prevBtn = document.getElementById('testiPrevBtn');
    var nextBtn = document.getElementById('testiNextBtn');
    var cardContainer = document.querySelector('.testi-card-container');
    var section = document.getElementById('testimonials');
    if (!slides.length) return;

    var authors = [
      { name: "Alex M. — Product Designer" },
      { name: "Sarah K. — Frontend Engineer" },
      { name: "Marcus T. — Career Transitioner" },
      { name: "Elena R. — Growth & Marketing" }
    ];

    // Optionally load dynamic testimonials from Supabase if published
    try {
      var checkSupabase = function () {
        var sb = window.supabaseClient || (typeof window.supabase !== 'undefined' && window.supabase.createClient ? window.supabase : null);
        if (sb && typeof sb.from === 'function') {
          sb.from('testimonials')
            .select('*')
            .eq('is_published', true)
            .order('display_order', { ascending: true })
            .limit(slides.length)
            .then(function (res) {
              if (res && res.data && res.data.length > 0) {
                res.data.forEach(function (item, idx) {
                  if (idx < slides.length) {
                    var quoteP = slides[idx].querySelector('.testi-quote-text');
                    if (quoteP && item.quote) quoteP.innerHTML = '&ldquo;' + item.quote + '&rdquo;.';
                    var authorStr = item.author_name + (item.author_role ? ' — ' + item.author_role : '');
                    authors[idx] = { name: authorStr };
                  }
                });
                if (nameEl && authors[current]) nameEl.textContent = authors[current].name;
              }
            })
            .catch(function () {});
        }
      };
      if (document.readyState === 'complete') checkSupabase();
      else window.addEventListener('load', checkSupabase, { once: true });
    } catch (e) {}

    var current = 0;
    var duration = 5000; // 5 seconds per slide
    var startTime = null;
    var animFrame = null;

    function updateProgress(now) {
      if (document.hidden || reduceMotion) {
        animFrame = requestAnimationFrame(updateProgress);
        return;
      }

      if (!startTime) startTime = now;
      var elapsed = now - startTime;
      var progress = Math.min(elapsed / duration, 1);

      // Fluidly fill current dash
      dashes.forEach(function (d, i) {
        var fill = d.querySelector('.testi-dash-progress');
        if (!fill) return;
        if (i < current) {
          fill.style.width = '100%';
        } else if (i === current) {
          fill.style.width = (progress * 100).toFixed(1) + '%';
        } else {
          fill.style.width = '0%';
        }
      });

      if (progress >= 1) {
        startTime = now;
        show(current + 1);
      }

      animFrame = requestAnimationFrame(updateProgress);
    }

    function show(index) {
      current = (index + slides.length) % slides.length;
      startTime = performance.now();

      slides.forEach(function (s, i) {
        s.classList.toggle('is-active', i === current);
      });

      dashes.forEach(function (d, i) {
        d.classList.toggle('is-active', i === current);
        var fill = d.querySelector('.testi-dash-progress');
        if (fill) {
          fill.style.width = i < current ? '100%' : '0%';
        }
      });

      if (counter) counter.textContent = (current + 1) + '/' + slides.length;
      if (nameEl && authors[current]) nameEl.textContent = authors[current].name;
    }

    function next() { show(current + 1); }
    function prev() { show(current - 1); }

    dashes.forEach(function (dash, i) {
      dash.addEventListener('click', function () { show(i); });
    });

    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);

    // Continuous motion without pause-on-hover as requested by user
    show(0);
    animFrame = requestAnimationFrame(updateProgress);

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) startTime = performance.now();
    });
  })();

  /* ---------- 8b. FAQ Accordion Interaction ---------- */
  (function () {
    var accordion = document.getElementById('faqAccordion');
    if (!accordion) return;
    var items = Array.prototype.slice.call(accordion.querySelectorAll('.faq-accordion-item'));

    items.forEach(function (item) {
      var trigger = item.querySelector('.faq-accordion-trigger');
      if (!trigger) return;

      trigger.addEventListener('click', function () {
        var isOpen = item.classList.contains('is-open');
        items.forEach(function (other) {
          if (other !== item) {
            other.classList.remove('is-open');
            var otherBtn = other.querySelector('.faq-accordion-trigger');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });

        if (isOpen) {
          item.classList.remove('is-open');
          trigger.setAttribute('aria-expanded', 'false');
        } else {
          item.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    });
  })();

  /* ---------- 9. The Promise: continuous scroll-driven walk-in motion ---------- */
  (function () {
    var promiseSection = document.getElementById('promise');
    if (!promiseSection) return;

    var darkCard = promiseSection.querySelector('.promise-card--dark');
    var glassCard = promiseSection.querySelector('.promise-card--glass');
    var whiteCard = promiseSection.querySelector('.promise-card--white');
    if (!darkCard || !glassCard || !whiteCard) return;

    function clamp(val, min, max) {
      return Math.max(min, Math.min(max, val));
    }

    function ease(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    var ticking = false;

    function renderPromiseWalkIn() {
      ticking = false;

      var rect = promiseSection.getBoundingClientRect();
      var winH = window.innerHeight;

      // MOBILE & TABLET PORTRAIT (<= 820px): Sequential Walk-In Pull-Up & Emergence from Field
      if (window.innerWidth <= 820) {
        var startMob = winH * 0.88;
        var totalTravel = promiseSection.offsetHeight + winH * 0.15;
        var rawPMob = (startMob - rect.top) / totalTravel;
        var pMob = clamp(rawPMob, 0, 1);

        // Sequential walk-in pull-up timing:
        // 1st card pulls up first: pMob from 0.00 to 0.40
        // 2nd card pulls up next: pMob from 0.25 to 0.70
        // 3rd card comes out from behind the field: pMob from 0.52 to 0.95
        var p1 = ease(clamp((pMob - 0.00) / 0.40, 0, 1));
        var p2 = ease(clamp((pMob - 0.25) / 0.45, 0, 1));
        var p3 = ease(clamp((pMob - 0.52) / 0.43, 0, 1));

        // 1st card pulls up
        var y1 = (1 - p1) * 110;
        darkCard.style.transform = 'translate3d(0, ' + y1.toFixed(2) + 'px, 0)';
        darkCard.style.opacity = '1';
        darkCard.style.pointerEvents = 'auto';

        // 2nd card follows and pulls up
        var y2 = (1 - p2) * 130;
        var scale2 = 0.96 + p2 * 0.04;
        glassCard.style.transform = 'translate3d(0, ' + y2.toFixed(2) + 'px, 0) scale(' + scale2.toFixed(3) + ')';
        glassCard.style.opacity = '1';
        glassCard.style.pointerEvents = 'auto';

        // 3rd card ("the last one behind the field"): submerged behind grass (+110px),
        // comes OUT from behind the field as user scrolls down (-25px), goes back inside as they scroll up
        var y3 = (1 - p3) * 110 - (p3 * 25);
        whiteCard.style.transform = 'translate3d(0, ' + y3.toFixed(2) + 'px, 0)';
        whiteCard.style.opacity = '1';
        whiteCard.style.pointerEvents = 'auto';
        return;
      }

      var rect = promiseSection.getBoundingClientRect();
      var winH = window.innerHeight;

      // As user walks into section (rect.top enters viewport) until section is framed in view
      var start = winH * 0.92;
      var end = winH * 0.12;

      var rawP = (start - rect.top) / (start - end);
      var globalP = clamp(rawP, 0, 1);

      // Organic walk-in stagger: dark card starts, center glass card emerges, right white card floats up
      var pDark = ease(clamp((globalP - 0.0) / 0.85, 0, 1));
      var pGlass = ease(clamp((globalP - 0.08) / 0.85, 0, 1));
      var pWhite = ease(clamp((globalP - 0.16) / 0.84, 0, 1));

      var yDark = (1 - pDark) * 140;
      var yGlass = (1 - pGlass) * 155;
      var yWhite = (1 - pWhite) * 140;

      var opDark = clamp(pDark * 1.8, 0, 1);
      var opGlass = clamp(pGlass * 1.8, 0, 1);
      var opWhite = clamp(pWhite * 1.8, 0, 1);

      darkCard.style.transform = 'translate3d(0, ' + yDark.toFixed(2) + 'px, 0)';
      darkCard.style.opacity = opDark.toFixed(3);
      darkCard.style.pointerEvents = pDark > 0.5 ? 'auto' : 'none';

      glassCard.style.transform = 'translate3d(0, ' + yGlass.toFixed(2) + 'px, 0)';
      glassCard.style.opacity = opGlass.toFixed(3);
      glassCard.style.pointerEvents = pGlass > 0.5 ? 'auto' : 'none';

      whiteCard.style.transform = 'translate3d(0, ' + yWhite.toFixed(2) + 'px, 0)';
      whiteCard.style.opacity = opWhite.toFixed(3);
      whiteCard.style.pointerEvents = pWhite > 0.5 ? 'auto' : 'none';
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(renderPromiseWalkIn);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    // Connect to Lenis smooth scroll if present
    if (typeof lenisInstance !== 'undefined' && lenisInstance && lenisInstance.on) {
      lenisInstance.on('scroll', onScroll);
    }

    renderPromiseWalkIn();
  })();

  /* ---------- 6. The sticky button on phones ---------- */
  var sticky = document.getElementById('stickyCta');
  var firstForm = document.getElementById('heroWaitlistForm');
  var lastForm = document.getElementById('bottomWaitlistForm');
  var footerWrapper = document.querySelector('.footer-grass-wrapper') || document.getElementById('siteFooter');
  if (sticky && firstForm && window.IntersectionObserver) {
    var firstOut = false;
    var bottomReached = false;
    var update = function () {
      sticky.classList.toggle('is-visible', firstOut && !bottomReached);
    };

    new IntersectionObserver(function (entries) {
      firstOut = !entries[0].isIntersecting;
      update();
    }).observe(firstForm);

    var checkBottom = function () {
      var bottomRect = lastForm ? lastForm.getBoundingClientRect() : null;
      var footerRect = footerWrapper ? footerWrapper.getBoundingClientRect() : null;
      var isNearBottom = (bottomRect && bottomRect.top <= window.innerHeight) ||
                         (footerRect && footerRect.top <= window.innerHeight);
      if (isNearBottom !== bottomReached) {
        bottomReached = isNearBottom;
        update();
      }
    };

    var bottomObserver = new IntersectionObserver(checkBottom, { threshold: [0, 0.1, 0.5, 1.0] });
    if (lastForm) bottomObserver.observe(lastForm);
    if (footerWrapper) bottomObserver.observe(footerWrapper);

    window.addEventListener('scroll', checkBottom, { passive: true });
  }

  /* ==========================================================================
     7. Framer-Motion Style Slow Scroll Pull-Up / Ease-Down Engine
     Bidirectional: Pulls up when scrolling down, eases back down when scrolling up.
     Spring-damped LERP physics loop running on requestAnimationFrame.
     ========================================================================== */
  (function initFramerScroll() {
    var sectionEls = Array.prototype.slice.call(document.querySelectorAll('.fm-scroll-section'));
    if (!sectionEls.length) return;

    var sections = sectionEls.map(function (el) {
      var cards = Array.prototype.slice.call(el.querySelectorAll('.fm-scroll-card'));
      return {
        el: el,
        cards: cards,
        currentY: 44,
        targetY: 44,
        currentOpacity: 0.75,
        targetOpacity: 0.75,
        currentScale: 0.985,
        targetScale: 0.985,
        cardCurrentY: 18,
        cardTargetY: 18
      };
    });

    var isRunning = false;

    function updateTargets(immediate) {
      if (reduceMotion) return;
      var windowH = window.innerHeight || document.documentElement.clientHeight;

      sections.forEach(function (sec) {
        var rect = sec.el.getBoundingClientRect();
        // Compensate for current transform translation to prevent feedback oscillation
        var currentShift = sec.currentY || 0;
        var untransformedTop = rect.top - currentShift;

        // Starts pulling up when section top approaches bottom 96% of screen,
        // fully settled when section top reaches 20% from the top
        var startY = windowH * 0.96;
        var endY = windowH * 0.20;

        var progress;
        if (untransformedTop >= startY) {
          progress = 0;
        } else if (untransformedTop <= endY) {
          progress = 1;
        } else {
          progress = (startY - untransformedTop) / (startY - endY);
        }

        progress = Math.max(0, Math.min(1, progress));

        // Pulls up from 44px to 0px
        sec.targetY = (1 - progress) * 44;
        sec.targetOpacity = 0.75 + 0.25 * progress;
        sec.targetScale = 0.985 + 0.015 * progress;
        // Inner cards secondary micro-lift from 20px to 0px
        sec.cardTargetY = (1 - progress) * 20;

        if (immediate) {
          sec.currentY = sec.targetY;
          sec.currentOpacity = sec.targetOpacity;
          sec.currentScale = sec.targetScale;
          sec.cardCurrentY = sec.cardTargetY;
          sec.el.style.transform = 'translate3d(0, ' + sec.currentY.toFixed(2) + 'px, 0) scale(' + sec.currentScale.toFixed(4) + ')';
          sec.el.style.opacity = sec.currentOpacity.toFixed(3);
          if (sec.cards.length) {
            var cY = sec.cardCurrentY.toFixed(2);
            sec.cards.forEach(function (c) {
              c.style.transform = 'translate3d(0, ' + cY + 'px, 0)';
            });
          }
        }
      });

      if (!isRunning && !immediate) {
        isRunning = true;
        requestAnimationFrame(tick);
      }
    }

    function tick() {
      if (reduceMotion) {
        isRunning = false;
        return;
      }

      var needsMoreFrames = false;
      var lerp = 0.080; // Luxurious Framer-Motion style spring damping
      var cardLerp = 0.065;

      sections.forEach(function (sec) {
        var diffY = sec.targetY - sec.currentY;
        var diffO = sec.targetOpacity - sec.currentOpacity;
        var diffS = sec.targetScale - sec.currentScale;
        var diffCardY = sec.cardTargetY - sec.cardCurrentY;

        if (Math.abs(diffY) > 0.06 || Math.abs(diffO) > 0.004 || Math.abs(diffS) > 0.0008) {
          sec.currentY += diffY * lerp;
          sec.currentOpacity += diffO * lerp;
          sec.currentScale += diffS * lerp;
          needsMoreFrames = true;
        } else {
          sec.currentY = sec.targetY;
          sec.currentOpacity = sec.targetOpacity;
          sec.currentScale = sec.targetScale;
        }

        if (Math.abs(diffCardY) > 0.06) {
          sec.cardCurrentY += diffCardY * cardLerp;
          needsMoreFrames = true;
        } else {
          sec.cardCurrentY = sec.cardTargetY;
        }

        // Apply GPU accelerated transform
        sec.el.style.transform = 'translate3d(0, ' + sec.currentY.toFixed(2) + 'px, 0) scale(' + sec.currentScale.toFixed(4) + ')';
        sec.el.style.opacity = sec.currentOpacity.toFixed(3);

        if (sec.cards.length) {
          var cY = sec.cardCurrentY.toFixed(2);
          sec.cards.forEach(function (c) {
            c.style.transform = 'translate3d(0, ' + cY + 'px, 0)';
          });
        }
      });

      if (needsMoreFrames) {
        requestAnimationFrame(tick);
      } else {
        isRunning = false;
      }
    }

    window.addEventListener('scroll', updateTargets, { passive: true });
    window.addEventListener('resize', updateTargets, { passive: true });
    if (typeof lenisInstance !== 'undefined' && lenisInstance && lenisInstance.on) {
      lenisInstance.on('scroll', updateTargets);
    }
    updateTargets(true);
  })();

  /* ==========================================================================
     8. Scroll-Driven Reading Text ("Reads Like Text, Not Objects")
     Section titles start grayed out in var(--color-text-light).
     As the user scrolls down, words transition into normal solid color
     (var(--color-text-primary)) in natural reading order word by word.
     ========================================================================== */
  (function initScrollReadingText() {
    var titles = Array.prototype.slice.call(document.querySelectorAll('.reading-title'));
    if (!titles.length) return;

    // Wrap text nodes in .read-word spans while preserving HTML structure (<br>, spaces)
    titles.forEach(function (title) {
      if (title.querySelector('.read-word')) return;

      var childNodes = Array.prototype.slice.call(title.childNodes);
      title.innerHTML = '';

      childNodes.forEach(function (node) {
        if (node.nodeType === 3) { // Text node
          var text = node.textContent;
          var tokens = text.split(/(\s+)/);
          tokens.forEach(function (tok) {
            if (/^\s+$/.test(tok)) {
              title.appendChild(document.createTextNode(tok));
            } else if (tok.length > 0) {
              var span = document.createElement('span');
              span.className = 'read-word';
              span.textContent = tok;
              title.appendChild(span);
            }
          });
        } else if (node.nodeType === 1) { // Element node (e.g. <br>, <em>)
          if (node.tagName.toLowerCase() === 'br') {
            title.appendChild(node);
          } else {
            var innerText = node.textContent;
            var innerTokens = innerText.split(/(\s+)/);
            node.innerHTML = '';
            innerTokens.forEach(function (tok) {
              if (/^\s+$/.test(tok)) {
                node.appendChild(document.createTextNode(tok));
              } else if (tok.length > 0) {
                var span = document.createElement('span');
                span.className = 'read-word';
                span.textContent = tok;
                node.appendChild(span);
              }
            });
            title.appendChild(node);
          }
        }
      });
    });

    var items = titles.map(function (title) {
      return {
        el: title,
        words: Array.prototype.slice.call(title.querySelectorAll('.read-word'))
      };
    });

    var ticking = false;

    function renderReadingText() {
      ticking = false;
      var windowH = window.innerHeight || document.documentElement.clientHeight;

      items.forEach(function (item) {
        var total = item.words.length;
        if (!total) return;

        if (reduceMotion) {
          item.words.forEach(function (w) {
            w.style.setProperty('--word-p', '1');
          });
          return;
        }

        var rect = item.el.getBoundingClientRect();
        // Starts reading when title reaches bottom 85% of screen,
        // fully read by 35% from the top
        var startY = windowH * 0.85;
        var endY = windowH * 0.35;
        var progress;

        if (rect.top >= startY) {
          progress = 0;
        } else if (rect.top <= endY) {
          progress = 1;
        } else {
          progress = (startY - rect.top) / (startY - endY);
        }

        item.words.forEach(function (word, idx) {
          var wordStart = idx / total;
          var wordEnd = (idx + 1) / total;
          var p;

          if (progress <= wordStart) {
            p = 0;
          } else if (progress >= wordEnd) {
            p = 1;
          } else {
            p = (progress - wordStart) / (wordEnd - wordStart);
          }

          word.style.setProperty('--word-p', p.toFixed(3));
        });
      });
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(renderReadingText);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    if (typeof lenisInstance !== 'undefined' && lenisInstance && lenisInstance.on) {
      lenisInstance.on('scroll', onScroll);
    }
    renderReadingText();
  })();
})();

