/* ==========================================================================
   FEATURES TIMELINE: WATER-FLOW SCROLL ANIMATION
   Drives the center fluid water stream and the staggered liquid floating
   motion of the icons and text along the timeline spine.
   ========================================================================== */
(function () {
  'use strict';

  var timeline = document.getElementById('featuresTimeline');
  var stream = document.getElementById('featuresStream');
  if (!timeline || !stream) return;

  var items = Array.prototype.slice.call(timeline.querySelectorAll('.features-item'));
  var terminalDot = timeline.querySelector('.features-spine-end');
  if (!items.length) return;

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    stream.style.height = '100%';
    items.forEach(function (item) {
      item.classList.add('is-active');
      var body = item.querySelector('.features-item-body');
      if (body) { body.style.opacity = '1'; body.style.transform = 'none'; }
    });
    if (terminalDot) terminalDot.classList.add('is-active');
    return;
  }

  // State for each item's fluid expansion and inertia
  var states = items.map(function (item, index) {
    return {
      item: item,
      body: item.querySelector('.features-item-body'),
      iconWrap: item.querySelector('.features-item-icon-wrap'),
      icon: item.querySelector('.features-icon'),
      isLeft: item.classList.contains('is-left'),
      isReached: false,
      // Interpolated physics
      currentY: 0,
      currentX: item.classList.contains('is-left') ? 24 : -24,
      currentOpacity: 0.32,
      currentScale: 0.88,
      iconScale: 0.88,
      fluidFollowRate: 0.09 - index * 0.005
    };
  });

  var currentStreamProgress = 0;
  var targetStreamProgress = 0;
  var lastScrollY = window.scrollY || 0;
  var scrollVelocity = 0;

  function update() {
    var rect = timeline.getBoundingClientRect();
    var windowHeight = window.innerHeight || document.documentElement.clientHeight;
    var currentScroll = window.scrollY || document.documentElement.scrollTop || 0;
    
    // Smooth scroll velocity tracker for dynamic liquid motion
    var deltaScroll = currentScroll - lastScrollY;
    scrollVelocity += (deltaScroll - scrollVelocity) * 0.25;
    lastScrollY = currentScroll;

    // Trigger point where the solid ink stream draws down (60% of viewport)
    var triggerY = windowHeight * 0.60;
    var timelineTop = rect.top;
    var timelineHeight = rect.height;

    // Progress of the solid stream down the spine
    var rawProgress = (triggerY - timelineTop) / (timelineHeight || 1);
    targetStreamProgress = Math.max(0, Math.min(1, rawProgress));

    // Smooth fluid lerp for the solid ink stream
    currentStreamProgress += (targetStreamProgress - currentStreamProgress) * 0.14;
    var streamPercent = Math.max(0, Math.min(100, currentStreamProgress * 100));
    stream.style.height = streamPercent.toFixed(2) + '%';

    var streamHeightPx = currentStreamProgress * timelineHeight;

    if (terminalDot) {
      terminalDot.classList.toggle('is-active', streamPercent > 96);
    }

    // Animate items with fluid expansion and inertia
    states.forEach(function (state, index) {
      var itemTop = state.item.offsetTop + state.item.offsetHeight / 2;
      var distFromTrigger = triggerY - (timelineTop + itemTop);

      var isReached = streamHeightPx >= (itemTop - 20);

      // Trigger pop if transitioning to reached
      if (isReached && !state.isReached) {
        state.iconScale = 1.22; // Expanding spring burst
      } else if (!isReached && state.isReached) {
        state.iconScale = 0.88;
      }
      state.isReached = isReached;
      state.item.classList.toggle('is-active', isReached);

      // Liquid floating wave + scroll inertia
      var floatFreq = 0.0022;
      var waterFloat = Math.sin((currentScroll * floatFreq) + index * 1.2) * 3.5;
      var inertiaY = Math.max(-14, Math.min(14, scrollVelocity * 0.12));
      var targetY = Math.max(-18, Math.min(18, distFromTrigger * 0.045)) + waterFloat - inertiaY;

      // Expansion effect: unreached tucks in slightly; reached expands out to full position
      var targetX = isReached ? 0 : (state.isLeft ? 26 : -26);
      var targetOpacity = isReached ? 1.0 : 0.32;
      var targetScale = isReached ? 1.0 : 0.90;
      var targetIconScale = isReached ? 1.06 : 0.88;

      // Spring lerp interpolation
      state.currentY += (targetY - state.currentY) * state.fluidFollowRate;
      state.currentX += (targetX - state.currentX) * 0.10;
      state.currentOpacity += (targetOpacity - state.currentOpacity) * 0.12;
      state.currentScale += (targetScale - state.currentScale) * 0.10;
      state.iconScale += (targetIconScale - state.iconScale) * 0.14;

      // Apply transforms
      if (state.body) {
        state.body.style.transform = 'translate3d(' + state.currentX.toFixed(2) + 'px, ' + state.currentY.toFixed(2) + 'px, 0) scale(' + state.currentScale.toFixed(3) + ')';
        state.body.style.opacity = state.currentOpacity.toFixed(3);
      }

      if (state.iconWrap) {
        state.iconWrap.style.transform = 'translate(-50%, -50%) translate3d(0, ' + (state.currentY * 0.65).toFixed(2) + 'px, 0) scale(' + state.iconScale.toFixed(3) + ')';
      }
    });

    requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
})();
