/**
 * Talorify launch switch.
 *
 * Before launch every main button says "Join waitlist" and the sign-up forms are shown.
 * On launch day set live to true and paste the Chrome Web Store link into storeUrl, and:
 *   - every button marked data-cta becomes "Add to Chrome" and opens the store page
 *   - the waitlist forms are replaced with one "Add to Chrome" button
 * Nothing else on the site needs to change.
 */
window.TALORIFY_LAUNCH = {
  live: true,
  storeUrl: 'https://chromewebstore.google.com/'
};

(function () {
  var cfg = window.TALORIFY_LAUNCH;
  if (!cfg.live || !cfg.storeUrl) return;

  function apply() {
    document.querySelectorAll('[data-cta]').forEach(function (el) {
      el.setAttribute('href', cfg.storeUrl);
      el.setAttribute('target', '_blank');
      el.setAttribute('rel', 'noopener');
      el.classList.remove('scroll-to-waitlist');
      var label = el.querySelector('.btn-text');
      if (label) {
        label.textContent = 'Get Talorify';
      }
    });

    document.querySelectorAll('.waitlist-pill-form').forEach(function (form) {
      form.style.display = 'none';
      if (form.parentNode.querySelector('[data-cta]') || form.parentNode.querySelector('.btn-add-chrome')) {
        return;
      }
      var button = document.createElement('a');
      button.className = 'btn-pill-black btn-with-arrow btn-add-chrome';
      button.href = cfg.storeUrl;
      button.target = '_blank';
      button.rel = 'noopener';
      button.innerHTML = '<span class="btn-text">Get Talorify</span><span class="btn-arrow-badge" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg></span>';
      form.parentNode.insertBefore(button, form.nextSibling);
    });

    document.querySelectorAll('[data-launch-text]').forEach(function (el) {
      el.textContent = el.getAttribute('data-launch-text');
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
