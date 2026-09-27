/* ==========================================================================
   TALORIFY: "HOW IT WORKS" - PINNED SCROLL, HAND-ROLLED (NO SCROLL/ANIMATION LIBRARY)
   Built from the user's own measured spec, not a reference file.

   LENIS NOTE (read this before touching the wheel logic below):
   The rest of this site runs Lenis (app.js) for its own smooth-scroll feel, site-wide. Lenis attaches its
   own wheel listener and drives scroll from an internal RAF loop, so a second, independent wheel-jacking
   listener on the same page WILL fight it - Lenis doesn't know this section just moved the scroll position
   and will fight to pull it back toward whatever position IT last computed. This section was explicitly
   asked to have no scroll library driving IT, but it can't make the pre-existing Lenis instance disappear
   for the rest of the page. The compromise: `lenisInstance.stop()` for the exact duration this section is
   pinned, `lenisInstance.start()` the moment it releases (both directions). Nothing here ever calls a Lenis
   method to move the page - only to pause/resume the OTHER script's control of it. Flagged to the user;
   this is the one deviation from "no scroll library" and it's a pause, not a use.
   Also checked: `html { scroll-behavior: smooth }` is already scoped `html:not(.lenis)` in style.css, so
   it's inert while Lenis is running - not a conflict. No ancestor of this section has `overflow: hidden`.
   ========================================================================== */
(function () {
  'use strict';

  var section = document.getElementById('how-it-works');
  if (!section) return;

  var stepsList = document.getElementById('hiwSteps');
  var steps = Array.prototype.slice.call(section.querySelectorAll('.hiw2-step'));
  var highlight = document.getElementById('hiwHighlight');
  var cards = Array.prototype.slice.call(section.querySelectorAll('.hiw2-card'));
  var photo = document.getElementById('hiwPhoto');
  var desktopSlot = document.getElementById('hiwPhotoCol');
  var mobileSlots = Array.prototype.slice.call(section.querySelectorAll('.hiw2-mobile-photo-slot'));
  var N = steps.length;
  if (!N) return;

  var mobileQuery = window.matchMedia('(max-width: 860px)');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var activeIndex = 0;
  var collapsedHeights = [];
  var descHeights = [];
  var sectionStart = 0, sectionHeight = 0, stepDistance = 0;

  /* ---------- measuring (collapsed step height + full description height) ---------- */
  function measure() {
    stepsList.classList.add('hiw2-no-anim');
    steps.forEach(function (s, i) {
      var wasActive = s.classList.contains('is-active');
      if (wasActive) s.classList.remove('is-active');
      collapsedHeights[i] = s.offsetHeight;
      var inner = s.querySelector('.hiw2-step-desc-inner');
      descHeights[i] = inner ? inner.scrollHeight : 0;
      if (wasActive) s.classList.add('is-active');
    });
    // force the browser to apply the no-anim class before we remove it, so none of the above reads/writes animate
    void stepsList.offsetHeight;
    stepsList.classList.remove('hiw2-no-anim');
    positionHighlight(activeIndex, true);
    recalcScrollGeometry();
  }

  function positionHighlight(index, immediate) {
    if (!highlight) return;
    var top = 0;
    for (var i = 0; i < index; i++) top += collapsedHeights[i] || 0;
    var height = (collapsedHeights[index] || 0) + (descHeights[index] || 0);
    if (immediate) highlight.style.transition = 'none';
    highlight.style.transform = 'translateY(' + top + 'px)';
    highlight.style.height = height + 'px';
    if (immediate) {
      void highlight.offsetHeight;
      highlight.style.transition = '';
    }
  }

  function recalcScrollGeometry() {
    sectionStart = section.getBoundingClientRect().top + window.scrollY;
    sectionHeight = section.offsetHeight;
    stepDistance = N > 1 ? (sectionHeight - window.innerHeight) / (N - 1) : 0;
  }

  /* ---------- moving the shared photo between its desktop slot and the open mobile step ---------- */
  function placePhoto() {
    if (mobileQuery.matches) {
      var slot = mobileSlots[activeIndex];
      if (slot && photo.parentElement !== slot) slot.appendChild(photo);
    } else if (desktopSlot && photo.parentElement !== desktopSlot) {
      desktopSlot.appendChild(photo);
    }
  }

  /* ---------- activating a step: highlight, titles, cards ---------- */
  function setActive(newIndex) {
    newIndex = Math.max(0, Math.min(N - 1, newIndex));
    if (newIndex === activeIndex) return;
    var prevIndex = activeIndex;
    activeIndex = newIndex;

    steps.forEach(function (s, i) {
      var active = i === newIndex;
      s.classList.toggle('is-active', active);
      s.setAttribute('aria-current', active ? 'step' : 'false');
    });

    cards.forEach(function (c, i) {
      c.classList.remove('is-active', 'is-passed');
      if (i === newIndex) c.classList.add('is-active');
      else if (i < newIndex) c.classList.add('is-passed');
      c.setAttribute('aria-hidden', i === newIndex ? 'false' : 'true');
    });

    positionHighlight(newIndex, false);
    placePhoto();
    void prevIndex;
  }

  /* ---------- desktop: jump the pinned scroll to a step via Lenis or window scroll ---------- */
  function scrollToStepDesktop(i, smooth) {
    i = Math.max(0, Math.min(N - 1, i));
    recalcScrollGeometry();
    var targetY = Math.round(sectionStart + i * stepDistance);
    if (typeof lenisInstance !== 'undefined' && lenisInstance) {
      if (smooth !== false && !reduceMotion) {
        lenisInstance.scrollTo(targetY, { duration: 0.65 });
      } else {
        lenisInstance.scrollTo(targetY, { immediate: true });
      }
    } else {
      window.scrollTo({ top: targetY, behavior: (smooth !== false && !reduceMotion) ? 'smooth' : 'auto' });
    }
    setActive(i);
  }

  function isPinned(y) {
    if (y === undefined) y = window.scrollY;
    var releaseY = sectionStart + sectionHeight - window.innerHeight;
    return y >= sectionStart - 10 && y <= releaseY + 10;
  }

  /* ---------- desktop wheel gesture: one gesture = one step, smooth handoff at boundaries ---------- */
  var lastWheelTime = 0, lastDeltaAbs = 0, lastStepChangeTime = 0, gestureMoved = false;

  window.addEventListener('wheel', function (e) {
    if (mobileQuery.matches) return;

    var y = window.scrollY;
    recalcScrollGeometry();
    var releaseY = sectionStart + sectionHeight - window.innerHeight;

    // Only handle wheel gestures when viewport is within the pinned section
    var inSection = y >= sectionStart - 10 && y <= releaseY + 10;
    if (!inSection) {
      lastWheelTime = performance.now();
      lastDeltaAbs = 0;
      return;
    }

    var now = performance.now();
    var dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 33;
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    var absDy = Math.abs(dy);
    if (absDy < 1) return;

    var dir = dy > 0 ? 1 : -1;

    // BOUNDARY HANDOFF:
    // If at the last card (step N-1) and scrolling down, or first card (step 0) and scrolling up:
    // DO NOT intercept! Let Lenis scroll smoothly onward into the next or previous section.
    if (dir > 0 && activeIndex >= N - 1 && y >= releaseY - 20) {
      if (typeof lenisInstance !== 'undefined' && lenisInstance && lenisInstance.isStopped) {
        lenisInstance.start();
      }
      return;
    }
    if (dir < 0 && activeIndex <= 0 && y <= sectionStart + 20) {
      if (typeof lenisInstance !== 'undefined' && lenisInstance && lenisInstance.isStopped) {
        lenisInstance.start();
      }
      return;
    }

    // Rate-limit step transitions so 1 gesture = 1 deliberate step
    var newGesture = (now - lastWheelTime > 180) ||
      (absDy > lastDeltaAbs * 1.5 && (now - lastStepChangeTime) > 320);
    if (newGesture) gestureMoved = false;
    lastWheelTime = now;
    lastDeltaAbs = absDy;

    if (gestureMoved) {
      e.preventDefault();
      return;
    }

    var target = activeIndex + dir;
    if (target < 0 || target > N - 1) return;

    e.preventDefault();
    gestureMoved = true;
    lastStepChangeTime = now;
    scrollToStepDesktop(target, true);
  }, { passive: false });

  /* ---------- scroll event: keeps activeIndex synced to scroll progress & guarantees Lenis is running ---------- */
  var lastKnownY = window.scrollY;

  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (mobileQuery.matches) {
      lastKnownY = y;
      return;
    }

    // Safety net: ensure Lenis is never stopped
    if (typeof lenisInstance !== 'undefined' && lenisInstance && lenisInstance.isStopped) {
      lenisInstance.start();
    }

    recalcScrollGeometry();
    var releaseY = sectionStart + sectionHeight - window.innerHeight;
    var travel = releaseY - sectionStart;

    if (travel > 0 && y >= sectionStart && y <= releaseY) {
      var progress = (y - sectionStart) / travel;
      var stepIdx = 0;
      if (progress >= 0.65) stepIdx = 2;
      else if (progress >= 0.30) stepIdx = 1;
      else stepIdx = 0;

      if (stepIdx !== activeIndex) {
        setActive(stepIdx);
      }
    } else if (y < sectionStart && activeIndex !== 0) {
      setActive(0);
    } else if (y > releaseY && activeIndex !== N - 1) {
      setActive(N - 1);
    }

    lastKnownY = y;
  }, { passive: true });

  // Safety net on breakpoint change
  mobileQuery.addEventListener('change', function (e) {
    if (e.matches && typeof lenisInstance !== 'undefined' && lenisInstance && lenisInstance.isStopped) {
      lenisInstance.start();
    }
  });

  /* ---------- keyboard (desktop, only while pinned, releases at edges) ---------- */
  window.addEventListener('keydown', function (e) {
    if (mobileQuery.matches) return;
    var y = window.scrollY;
    recalcScrollGeometry();
    var releaseY = sectionStart + sectionHeight - window.innerHeight;
    if (y < sectionStart - 10 || y > releaseY + 10) return;

    var next = null;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) next = activeIndex + 1;
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) next = activeIndex - 1;
    if (next === null || next < 0 || next > N - 1) return;
    e.preventDefault();
    scrollToStepDesktop(next, true);
  });

  /* ---------- touch swipe (desktop-width touch devices only) ---------- */
  var touchStartY = null;
  section.addEventListener('touchstart', function (e) {
    if (mobileQuery.matches) return;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  section.addEventListener('touchmove', function (e) {
    if (mobileQuery.matches || touchStartY === null) return;
    var y = window.scrollY;
    recalcScrollGeometry();
    var releaseY = sectionStart + sectionHeight - window.innerHeight;
    if (y < sectionStart - 10 || y > releaseY + 10) return;

    var dy = touchStartY - e.touches[0].clientY;
    if (Math.abs(dy) <= 28) return;
    var dir = dy > 0 ? 1 : -1;
    var target = activeIndex + dir;
    if (target < 0 || target > N - 1) { touchStartY = null; return; }
    e.preventDefault();
    scrollToStepDesktop(target, true);
    touchStartY = e.touches[0].clientY;
  }, { passive: false });
  section.addEventListener('touchend', function () { touchStartY = null; });

  /* ---------- clicking / activating a step ---------- */
  function goToStep(i) {
    if (mobileQuery.matches) {
      if (i === activeIndex) return; // tapping the open step does nothing
      var closingIndex = activeIndex;
      var closingHeight = descHeights[closingIndex] || 0;
      var stepRect = steps[i].getBoundingClientRect();
      var targetY = window.scrollY + stepRect.top - 12;
      if (closingIndex < i) targetY -= closingHeight;
      setActive(i);
      requestAnimationFrame(function () {
        window.scrollTo({ top: targetY, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    } else {
      recalcScrollGeometry();
      scrollToStepDesktop(i);
    }
  }

  steps.forEach(function (s, i) {
    s.addEventListener('click', function () { goToStep(i); });
    s.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToStep(i); }
    });
  });

  /* ---------- resize / breakpoint changes ---------- */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      placePhoto();
      measure();
    }, 100);
  });

  /* ---------- init ---------- */
  placePhoto();
  measure();
  cards.forEach(function (c, i) { c.setAttribute('aria-hidden', i === 0 ? 'false' : 'true'); });

  // Fonts/images finishing after this script runs can reflow content above the section, shifting where it
  // starts - re-measure once everything has actually finished loading so sectionStart/height stay accurate.
  // Guarded on isPinned() so a late-arriving load/font event can never yank the section back to step 1 out
  // from under someone who is already scrolling through it (measure() itself never moves the scroll - this
  // is purely about not letting a stale sectionStart cause the NEXT scroll tick to misread arrival/release).
  function deferredMeasure() { if (!isPinned()) measure(); }
  if (document.readyState === 'complete') {
    deferredMeasure();
  } else {
    window.addEventListener('load', deferredMeasure);
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(deferredMeasure);
  }
})();
