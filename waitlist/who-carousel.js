/* ==========================================================================
   "WHO IT'S FOR": the four-card rotating carousel - round 2

   Round 1 shook the page because the cards were normal flex items whose width/height were being resized -
   every frame changed the row's own box, which changed the section's height, which pushed everything below
   it up and down. The fix: the stage gets a JS-fixed height that never changes, and every card is
   `position:absolute` inside it - completely out of document flow. Once a card is out of flow, resizing it
   (even with plain left/top/width/height, set directly from JS rather than a CSS transition) cannot move
   anything outside the stage, because out-of-flow elements never affect their ancestors' layout. That's the
   actual rule that matters; "animate transform, not width/height" is just the usual shortcut for reaching
   it, and here it's reached a different way on purpose - because a real width/height/left/top change is
   what lets `object-fit: cover` recompute the correct crop at every single frame, so the photos reframe
   without ever looking stretched, which a scale() transform on a non-uniform aspect change can't do cleanly.

   Motion, matched to the user's reference video, per "step" (~800ms):
     Phase A (0-200ms):   the active card's title/description fade out. Nothing moves yet.
     Phase B (200-500ms): every card's box moves one slot, all at once - old active shrinks into "previous",
                           old "next" grows to fill the whole active-card frame (photo only, no text yet),
                           old small "next-after" grows into "next". The card leaving the previous slot exits
                           off the left edge while fading out; at its exact midpoint (invisible, opacity 0)
                           it's silently repositioned off the right edge and fades back in as the new small
                           "next-after" - that's the trick that makes the loop endless without cloning any
                           DOM nodes: there are exactly four cards for exactly four slots, so "wrapping" is
                           just relabelling, and the only card that visually "travels" does so while unseen.
     Phase C (500-800ms): the new active card's photo eases from filling the whole frame down into its slot
                           on the left (revealing the white padding as it goes), and its title/description
                           fade in slightly after that reveal starts.
   Every property changed above is driven by a single requestAnimationFrame loop computing exact values from
   elapsed time, not by parallel CSS transitions - which is what makes the frame-filling → left-slot photo
   resize and the exit/re-entry teleport possible at all.
   ========================================================================== */
(function () {
  'use strict';

  var stage = document.getElementById('whoCarousel');
  var track = document.getElementById('whoTrack');
  var progressWrap = document.getElementById('whoProgress');
  if (!stage || !track || !progressWrap) return;

  var cards = Array.prototype.slice.call(track.querySelectorAll('.who2-card'));
  if (cards.length < 2) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var DWELL_MS = 4200; // comfortable reading dwell time before auto-advancing
  var STEP_MS = 1200; // smooth, premium duration for card transitions

  function isInView(el) {
    var r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function applyEase(name, t) { return name === 'inout' ? easeInOutCubic(t) : name === 'out' ? easeOutCubic(t) : t; }

  /* ---------- Geometry: recomputed on load and on resize, never during an animation ---------- */
  var GEOM = {};
  function computeGeom() {
    var stageWidth = stage.clientWidth;
    var vw = window.innerWidth;
    var stacked = vw <= 820;
    var c;
    if (stacked) {
      // Mobile & Tablet: Balanced active card with top photo & text below + right-edge peek card
      var activeW = Math.min(Math.round(stageWidth * 0.78), 305);
      if (stageWidth < 340) activeW = Math.round(stageWidth * 0.74);
      var cardH = 376;
      var gap = 14;
      var nextW = 82;
      var prevW = 82;
      var next2W = 82;
      c = {
        prevW: prevW, prevH: cardH,
        activeW: activeW, activeH: cardH,
        nextW: nextW, nextH: cardH,
        next2W: next2W, next2H: cardH,
        gap: gap,
        padSmall: 8,
        padActive: 12,
        photoWActive: activeW - 24,
        photoHActive: 232
      };
    } else if (vw <= 1000) {
      c = { prevW: 100, prevH: 268, activeW: 460, activeH: 330, nextW: 100, nextH: 268, next2W: 78, next2H: 210, gap: 20, padSmall: 8, padActive: 12, photoWActive: 216, photoHActive: 330 - 24 };
    } else {
      c = { prevW: 123, prevH: 330, activeW: 545, activeH: 392, nextW: 123, nextH: 330, next2W: 96, next2H: 258, gap: 25, padSmall: 8, padActive: 13, photoWActive: 257, photoHActive: 392 - 26 };
    }

    var xPrev, xActive, xNext, xNext2;
    if (stacked) {
      xActive = 0;
      xPrev = -(c.prevW + c.gap + 20);
      xNext = xActive + c.activeW + c.gap;
      xNext2 = xNext + c.nextW + c.gap + 20;
    } else {
      var total = c.prevW + c.gap + c.activeW + c.gap + c.nextW + c.gap + c.next2W;
      var startX = Math.max(0, (stageWidth - total) / 2);
      xPrev = startX;
      xActive = xPrev + c.prevW + c.gap;
      xNext = xActive + c.activeW + c.gap;
      xNext2 = xNext + c.nextW + c.gap;
    }
    var stageH = c.activeH;
    function cy(h) { return (stageH - h) / 2; }
    GEOM = {
      stacked: stacked, stageW: stageWidth, stageH: stageH, gap: c.gap,
      padSmall: c.padSmall, padActive: c.padActive,
      photoWActive: c.photoWActive, photoHActive: c.photoHActive,
      prev: { x: xPrev, y: cy(c.prevH), w: c.prevW, h: c.prevH },
      active: { x: xActive, y: cy(c.activeH), w: c.activeW, h: c.activeH },
      next: { x: xNext, y: cy(c.nextH), w: c.nextW, h: c.nextH },
      next2: { x: xNext2, y: cy(c.next2H), w: c.next2W, h: c.next2H }
    };
    stage.style.height = stageH + 'px';
  }

  function gPrev() {
    var g = GEOM;
    var ph = Math.max(0, g.prev.h - 2 * g.padSmall);
    var pw = Math.max(0, g.prev.w - 2 * g.padSmall);
    return { x: g.prev.x, y: g.prev.y, w: g.prev.w, h: g.prev.h, pad: g.padSmall, photoW: pw, photoH: ph };
  }
  function gNext() {
    var g = GEOM;
    var ph = Math.max(0, g.next.h - 2 * g.padSmall);
    var pw = Math.max(0, g.next.w - 2 * g.padSmall);
    return { x: g.next.x, y: g.next.y, w: g.next.w, h: g.next.h, pad: g.padSmall, photoW: pw, photoH: ph };
  }
  function gNext2() {
    var g = GEOM;
    var ph = Math.max(0, g.next2.h - 2 * g.padSmall);
    var pw = Math.max(0, g.next2.w - 2 * g.padSmall);
    return { x: g.next2.x, y: g.next2.y, w: g.next2.w, h: g.next2.h, pad: g.padSmall, photoW: pw, photoH: ph };
  }
  function gActiveFull() {
    var g = GEOM;
    return { x: g.active.x, y: g.active.y, w: g.active.w, h: g.active.h, pad: 0, photoW: g.active.w, photoH: g.active.h };
  }
  function gActiveSplit() {
    var g = GEOM;
    var ph = g.stacked ? g.photoHActive : Math.max(0, g.active.h - 2 * g.padActive);
    return { x: g.active.x, y: g.active.y, w: g.active.w, h: g.active.h, pad: g.padActive, photoW: g.photoWActive, photoH: ph };
  }
  function gOffLeft() {
    var g = GEOM;
    var ph = Math.max(0, g.prev.h - 2 * g.padSmall);
    var pw = Math.max(0, g.prev.w - 2 * g.padSmall);
    return { x: -(g.prev.w + g.gap + 60), y: g.prev.y, w: g.prev.w, h: g.prev.h, pad: g.padSmall, photoW: pw, photoH: ph };
  }
  function gOffRight() {
    var g = GEOM;
    var ph = Math.max(0, g.next2.h - 2 * g.padSmall);
    var pw = Math.max(0, g.next2.w - 2 * g.padSmall);
    return { x: g.stageW + g.gap + 60, y: g.next2.y, w: g.next2.w, h: g.next2.h, pad: g.padSmall, photoW: pw, photoH: ph };
  }

  function applyGeom(card, g) {
    card.style.left = g.x + 'px';
    card.style.top = g.y + 'px';
    card.style.width = g.w + 'px';
    card.style.height = g.h + 'px';
    card.style.padding = g.pad + 'px';
    var photo = card.querySelector('.who2-card-photo');
    if (photo) {
      photo.style.width = g.photoW + 'px';
      photo.style.height = (g.photoH !== undefined ? g.photoH : Math.max(0, g.h - 2 * g.pad)) + 'px';
    }
  }

  /* ---------- Resting state: exact per-role geometry for the current activeIndex, no animation ---------- */
  var activeIndex = 0;

  function applyResting() {
    var A = activeIndex, n = cards.length;
    var roleGeom = { prev: gPrev(), active: gActiveSplit(), next: gNext(), next2: gNext2() };
    cards.forEach(function (card, i) {
      var role = i === A ? 'active' : i === (A + n - 1) % n ? 'prev' : i === (A + 1) % n ? 'next' : 'next2';
      card.style.opacity = 1;
      applyGeom(card, roleGeom[role]);
      card.querySelector('.who2-card-title').style.opacity = role === 'active' ? 1 : 0;
      card.querySelector('.who2-card-desc').style.opacity = role === 'active' ? 1 : 0;
      card.classList.toggle('is-active', role === 'active');
    });
    updateDotsActive();
  }

  /* ---------- Plans: per-card keyframe tracks for one forward or backward step ---------- */
  function buildPlans(direction) {
    var A = activeIndex, n = cards.length;
    var prevIdx = (A + n - 1) % n, nextIdx = (A + 1) % n, next2Idx = (A + 2) % n;
    var plans = {};
    var stacked = GEOM.stacked;

    if (direction > 0) {
      plans[A] = { // active -> prev
        geom: stacked ? [{ t: 0, v: gActiveSplit() }, { t: 750, v: gPrev(), ease: 'inout' }]
                      : [{ t: 120, v: gActiveSplit() }, { t: 750, v: gPrev(), ease: 'inout' }],
        title: [{ t: 0, v: 1 }, { t: 180, v: 0, ease: 'out' }],
        desc: [{ t: 0, v: 1 }, { t: 180, v: 0, ease: 'out' }]
      };
      plans[nextIdx] = stacked
        ? { geom: [{ t: 0, v: gNext() }, { t: 750, v: gActiveSplit(), ease: 'inout' }],
            title: [{ t: 360, v: 0 }, { t: 750, v: 1, ease: 'out' }],
            desc: [{ t: 420, v: 0 }, { t: 800, v: 1, ease: 'out' }] }
        : { geom: [{ t: 120, v: gNext() }, { t: 750, v: gActiveFull(), ease: 'inout' }, { t: 1200, v: gActiveSplit(), ease: 'inout' }],
            title: [{ t: 820, v: 0 }, { t: 1120, v: 1, ease: 'out' }],
            desc: [{ t: 880, v: 0 }, { t: 1200, v: 1, ease: 'out' }] };
      plans[next2Idx] = {
        geom: stacked ? [{ t: 0, v: gNext2() }, { t: 750, v: gNext(), ease: 'inout' }]
                      : [{ t: 120, v: gNext2() }, { t: 750, v: gNext(), ease: 'inout' }],
        title: [{ t: 0, v: 0 }],
        desc: [{ t: 0, v: 0 }]
      };
      plans[prevIdx] = {
        geom: stacked ? [{ t: 0, v: gPrev() }, { t: 375, v: gOffLeft(), ease: 'inout' }, { t: 376, v: gOffRight() }, { t: 750, v: gNext2(), ease: 'inout' }]
                      : [{ t: 120, v: gPrev() }, { t: 435, v: gOffLeft(), ease: 'inout' }, { t: 436, v: gOffRight() }, { t: 750, v: gNext2(), ease: 'inout' }],
        opacity: stacked ? [{ t: 0, v: 1 }, { t: 375, v: 0, ease: 'inout' }, { t: 376, v: 0 }, { t: 750, v: 1, ease: 'inout' }]
                         : [{ t: 120, v: 1 }, { t: 435, v: 0, ease: 'inout' }, { t: 436, v: 0 }, { t: 750, v: 1, ease: 'inout' }],
        title: [{ t: 0, v: 0 }],
        desc: [{ t: 0, v: 0 }]
      };
    } else {
      plans[prevIdx] = stacked
        ? { geom: [{ t: 0, v: gPrev() }, { t: 750, v: gActiveSplit(), ease: 'inout' }],
            title: [{ t: 360, v: 0 }, { t: 750, v: 1, ease: 'out' }],
            desc: [{ t: 420, v: 0 }, { t: 800, v: 1, ease: 'out' }] }
        : { geom: [{ t: 120, v: gPrev() }, { t: 750, v: gActiveFull(), ease: 'inout' }, { t: 1200, v: gActiveSplit(), ease: 'inout' }],
            title: [{ t: 820, v: 0 }, { t: 1120, v: 1, ease: 'out' }],
            desc: [{ t: 880, v: 0 }, { t: 1200, v: 1, ease: 'out' }] };
      plans[A] = {
        geom: stacked ? [{ t: 0, v: gActiveSplit() }, { t: 750, v: gNext(), ease: 'inout' }]
                      : [{ t: 120, v: gActiveSplit() }, { t: 750, v: gNext(), ease: 'inout' }],
        title: [{ t: 0, v: 1 }, { t: 180, v: 0, ease: 'out' }],
        desc: [{ t: 0, v: 1 }, { t: 180, v: 0, ease: 'out' }]
      };
      plans[nextIdx] = {
        geom: stacked ? [{ t: 0, v: gNext() }, { t: 750, v: gNext2(), ease: 'inout' }]
                      : [{ t: 120, v: gNext() }, { t: 750, v: gNext2(), ease: 'inout' }],
        title: [{ t: 0, v: 0 }],
        desc: [{ t: 0, v: 0 }]
      };
      plans[next2Idx] = {
        geom: stacked ? [{ t: 0, v: gNext2() }, { t: 375, v: gOffRight(), ease: 'inout' }, { t: 376, v: gOffLeft() }, { t: 750, v: gPrev(), ease: 'inout' }]
                      : [{ t: 120, v: gNext2() }, { t: 435, v: gOffRight(), ease: 'inout' }, { t: 436, v: gOffLeft() }, { t: 750, v: gPrev(), ease: 'inout' }],
        opacity: stacked ? [{ t: 0, v: 1 }, { t: 375, v: 0, ease: 'inout' }, { t: 376, v: 0 }, { t: 750, v: 1, ease: 'inout' }]
                         : [{ t: 120, v: 1 }, { t: 435, v: 0, ease: 'inout' }, { t: 436, v: 0 }, { t: 750, v: 1, ease: 'inout' }],
        title: [{ t: 0, v: 0 }],
        desc: [{ t: 0, v: 0 }]
      };
    }
    return plans;
  }

  function sampleTrack(track, t) {
    if (!track || !track.length) return undefined;
    if (t <= track[0].t) return track[0].v;
    for (var i = 1; i < track.length; i++) {
      if (t <= track[i].t) {
        var a = track[i - 1], b = track[i];
        var span = b.t - a.t;
        var lt = span <= 0 ? 1 : applyEase(b.ease, (t - a.t) / span);
        return typeof a.v === 'number' ? lerp(a.v, b.v, lt) : {
          x: lerp(a.v.x, b.v.x, lt), y: lerp(a.v.y, b.v.y, lt), w: lerp(a.v.w, b.v.w, lt),
          h: lerp(a.v.h, b.v.h, lt), pad: lerp(a.v.pad, b.v.pad, lt),
          photoW: lerp(a.v.photoW, b.v.photoW, lt),
          photoH: lerp(a.v.photoH, b.v.photoH, lt)
        };
      }
    }
    return track[track.length - 1].v;
  }

  /* ---------- Progress dots ---------- */
  var dotSlots = [];
  cards.forEach(function (card, i) {
    var slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'who2-dot-slot';
    slot.setAttribute('aria-label', 'Show ' + (card.getAttribute('data-title') || 'slide ' + (i + 1)));
    var dot = document.createElement('span');
    dot.className = 'who2-dot';
    var fill = document.createElement('span');
    fill.className = 'who2-dot-fill';
    dot.appendChild(fill);
    slot.appendChild(dot);
    slot.addEventListener('click', function () { jumpTo(i); });
    progressWrap.appendChild(slot);
    dotSlots.push({ slot: slot, fill: fill });
  });
  function updateDotsActive() {
    dotSlots.forEach(function (d, i) {
      d.slot.classList.toggle('is-active', i === activeIndex);
      if (i !== activeIndex) d.fill.style.transform = 'scaleX(0)';
    });
  }
  function setActiveDotFill(pct) { dotSlots[activeIndex].fill.style.transform = 'scaleX(' + pct + ')'; }

  /* ---------- The step animation ---------- */
  var isAnimating = false;
  var queue = [];

  function play(direction) {
    if (isAnimating) return;
    isAnimating = true;
    pauseDwell();
    if (dotSlots[activeIndex]) dotSlots[activeIndex].fill.style.transform = 'scaleX(0)';

    if (reduceMotion) {
      activeIndex = (activeIndex + direction + cards.length) % cards.length;
      applyResting();
      finishStep();
      return;
    }

    var plans = buildPlans(direction);
    var newActive = (activeIndex + direction + cards.length) % cards.length;
    var start = null;

    var stepMs = GEOM.stacked ? 850 : STEP_MS;

    function frame(now) {
      if (start === null) start = now;
      var t = Math.min(now - start, stepMs);
      cards.forEach(function (card, idx) {
        var plan = plans[idx];
        if (!plan) return;
        var g = sampleTrack(plan.geom, t);
        if (g) applyGeom(card, g);
        var op = sampleTrack(plan.opacity, t);
        if (op !== undefined) card.style.opacity = op;
        var titleOp = sampleTrack(plan.title, t);
        if (titleOp !== undefined) card.querySelector('.who2-card-title').style.opacity = titleOp;
        var descOp = sampleTrack(plan.desc, t);
        if (descOp !== undefined) card.querySelector('.who2-card-desc').style.opacity = descOp;
      });
      if (t < stepMs) requestAnimationFrame(frame);
      else { activeIndex = newActive; applyResting(); finishStep(); }
    }
    requestAnimationFrame(frame);
  }

  function finishStep() {
    isAnimating = false;
    if (queue.length) play(queue.shift());
    else startDwell(0);
  }

  function jumpTo(targetIndex) {
    if (isAnimating || targetIndex === activeIndex) return;
    var diff = (targetIndex - activeIndex + cards.length) % cards.length;
    var forwardSteps = diff, backwardSteps = cards.length - diff;
    var dir = forwardSteps <= backwardSteps ? 1 : -1;
    var steps = Math.min(forwardSteps, backwardSteps);
    queue = [];
    for (var i = 1; i < steps; i++) queue.push(dir);
    play(dir);
  }

  /* ---------- Dwell timer: pausable/resumable, drives both auto-advance and the pill fill ---------- */
  var dwellRaf = null, dwellStart = null, dwellElapsed = 0;

  function dwellFrame(now) {
    if (dwellStart === null) dwellStart = now;
    var t = now - dwellStart;
    setActiveDotFill(Math.min(1, t / DWELL_MS));
    if (t >= DWELL_MS) { dwellRaf = null; play(1); }
    else dwellRaf = requestAnimationFrame(dwellFrame);
  }
  function startDwell(fromElapsed) {
    if (reduceMotion || dwellRaf || isAnimating) return;
    dwellStart = performance.now() - (fromElapsed || 0);
    dwellRaf = requestAnimationFrame(dwellFrame);
  }
  function pauseDwell() {
    if (dwellRaf) { dwellElapsed = performance.now() - dwellStart; cancelAnimationFrame(dwellRaf); dwellRaf = null; dwellStart = null; }
  }

  /* ---------- Input: clicks, dots (above), keyboard, swipe ---------- */
  cards.forEach(function (card, i) { card.addEventListener('click', function () { jumpTo(i); }); });

  stage.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); jumpTo((activeIndex + 1) % cards.length); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); jumpTo((activeIndex + cards.length - 1) % cards.length); }
  });

  var touchStartX = null;
  stage.addEventListener('touchstart', function (e) { touchStartX = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', function (e) {
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < 30) return;
    jumpTo(dx < 0 ? (activeIndex + 1) % cards.length : (activeIndex + cards.length - 1) % cards.length);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pauseDwell();
    else if (!isAnimating) startDwell(dwellElapsed);
  });

  /* ---------- Resize: recompute geometry, snap (never animate) to the new breakpoint ---------- */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      computeGeom();
      if (!isAnimating) applyResting();
    }, 120);
  });

  /* ---------- Initial state ---------- */
  computeGeom();
  applyResting();
  startDwell(0);
})();
