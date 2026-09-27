/**
 * TALORIFY — HELP CENTER SCRIPT
 * Live search, category filtering, accordion interaction, and direct support modal.
 */
(function () {
  'use strict';

  // DOM elements
  const searchInput = document.getElementById('helpSearchInput');
  const searchClear = document.getElementById('helpSearchClear');
  const categoryPills = document.querySelectorAll('.help-category-pill');
  const sections = document.querySelectorAll('.help-section');
  const accordionItems = document.querySelectorAll('.help-accordion-item');
  const noResults = document.getElementById('helpNoResults');

  // Support Modal elements
  const openModalBtns = document.querySelectorAll('.btn-open-support-modal');
  const supportModal = document.getElementById('supportModal');
  const closeModalBtn = document.getElementById('supportModalClose');
  const supportForm = document.getElementById('supportHelpForm');
  const supportFormStatus = document.getElementById('supportFormStatus');
  const supportSubmitBtn = document.getElementById('supportSubmitBtn');

  let activeCategory = 'all';
  let searchQuery = '';

  /* --------------------------------------------------------------------------
     1. Accordion Toggling
     -------------------------------------------------------------------------- */
  accordionItems.forEach((item) => {
    const trigger = item.querySelector('.help-accordion-trigger');
    if (!trigger) return;

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      // Optional: toggle current item
      if (isOpen) {
        item.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* --------------------------------------------------------------------------
     2. Search & Category Filtering Logic
     -------------------------------------------------------------------------- */
  function filterHelpCenter() {
    const q = searchQuery.trim().toLowerCase();
    let totalVisible = 0;

    sections.forEach((section) => {
      const sectionCategory = section.getAttribute('data-category');
      const items = section.querySelectorAll('.help-accordion-item');
      let visibleInSection = 0;

      // Category match
      const categoryMatch = activeCategory === 'all' || sectionCategory === activeCategory;

      items.forEach((item) => {
        const questionText = item.querySelector('.help-accordion-trigger')?.textContent?.toLowerCase() || '';
        const bodyText = item.querySelector('.help-accordion-body')?.textContent?.toLowerCase() || '';
        const tags = item.getAttribute('data-keywords')?.toLowerCase() || '';

        const textMatches = !q || questionText.includes(q) || bodyText.includes(q) || tags.includes(q);

        if (categoryMatch && textMatches) {
          item.style.display = '';
          visibleInSection++;
          totalVisible++;

          // Auto-expand items when searching for direct visibility
          if (q.length > 2) {
            item.classList.add('is-open');
            item.querySelector('.help-accordion-trigger')?.setAttribute('aria-expanded', 'true');
          }
        } else {
          item.style.display = 'none';
        }
      });

      // Update section header visibility and counter
      if (visibleInSection > 0) {
        section.style.display = '';
        const countBadge = section.querySelector('.help-section-count');
        if (countBadge) countBadge.textContent = `${visibleInSection}`;
      } else {
        section.style.display = 'none';
      }
    });

    // Toggle Empty State
    if (noResults) {
      if (totalVisible === 0) {
        noResults.classList.add('is-visible');
      } else {
        noResults.classList.remove('is-visible');
      }
    }
  }

  // Search input events
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      if (searchClear) {
        if (searchQuery.length > 0) {
          searchClear.classList.add('is-visible');
        } else {
          searchClear.classList.remove('is-visible');
        }
      }
      filterHelpCenter();
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        searchInput.focus();
      }
      searchClear.classList.remove('is-visible');
      filterHelpCenter();
    });
  }

  // Category pill click events
  categoryPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      categoryPills.forEach((p) => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      activeCategory = pill.getAttribute('data-filter') || 'all';
      filterHelpCenter();
    });
  });

  /* --------------------------------------------------------------------------
     3. Support Modal & Custom Select Logic
     -------------------------------------------------------------------------- */
  const selectWrapper = document.getElementById('supportCategorySelect');
  const selectTrigger = document.getElementById('supportCategoryTrigger');
  const selectValue = document.getElementById('supportCategoryValue');
  const selectHidden = document.getElementById('supportCategoryInput');
  const selectOptions = document.querySelectorAll('.help-select-option');

  if (selectTrigger && selectWrapper) {
    selectTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = selectWrapper.classList.contains('is-open');
      if (isOpen) {
        selectWrapper.classList.remove('is-open');
        selectTrigger.setAttribute('aria-expanded', 'false');
      } else {
        selectWrapper.classList.add('is-open');
        selectTrigger.setAttribute('aria-expanded', 'true');
      }
    });

    selectOptions.forEach((option) => {
      option.addEventListener('click', (e) => {
        e.stopPropagation();
        const val = option.getAttribute('data-value');
        if (selectValue) selectValue.textContent = val;
        if (selectHidden) selectHidden.value = val;

        selectOptions.forEach((opt) => {
          opt.classList.remove('is-selected');
          opt.setAttribute('aria-selected', 'false');
        });
        option.classList.add('is-selected');
        option.setAttribute('aria-selected', 'true');

        selectWrapper.classList.remove('is-open');
        selectTrigger.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', (e) => {
      if (!selectWrapper.contains(e.target)) {
        selectWrapper.classList.remove('is-open');
        selectTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function openModal() {
    if (supportModal) {
      supportModal.showModal();
      document.body.style.overflow = 'hidden';
      if (supportFormStatus) {
        supportFormStatus.style.display = 'none';
        supportFormStatus.className = 'help-form-status';
      }
    }
  }

  function closeModal() {
    if (supportModal) {
      supportModal.close();
      document.body.style.overflow = '';
      if (selectWrapper) {
        selectWrapper.classList.remove('is-open');
        selectTrigger?.setAttribute('aria-expanded', 'false');
      }
    }
  }

  openModalBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  if (supportModal) {
    supportModal.addEventListener('click', (e) => {
      if (e.target === supportModal) {
        closeModal();
      }
    });
    supportModal.addEventListener('cancel', () => {
      document.body.style.overflow = '';
    });
  }

  // Formspree AJAX Submission
  if (supportForm) {
    supportForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!supportSubmitBtn) return;

      const originalBtnText = supportSubmitBtn.innerHTML;
      supportSubmitBtn.disabled = true;
      supportSubmitBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin" style="animation: spin 0.8s linear infinite;">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg> Sending message...
      `;

      const formData = new FormData(supportForm);
      try {
        const response = await fetch(supportForm.action, {
          method: 'POST',
          body: formData,
          headers: {
            Accept: 'application/json',
          },
        });

        if (response.ok) {
          supportForm.reset();
          if (supportFormStatus) {
            supportFormStatus.textContent = 'Thank you! Your message has been sent. Our support team will reply within 24 hours.';
            supportFormStatus.className = 'help-form-status is-success';
          }
          setTimeout(() => {
            closeModal();
          }, 3200);
        } else {
          throw new Error('Server returned error status');
        }
      } catch (err) {
        if (supportFormStatus) {
          supportFormStatus.innerHTML = 'There was a problem sending your message. Please email us directly at <a href="mailto:supporttalorify@kre8mind.com" style="text-decoration: underline; color: inherit;">supporttalorify@kre8mind.com</a>.';
          supportFormStatus.className = 'help-form-status is-error';
        }
      } finally {
        supportSubmitBtn.disabled = false;
        supportSubmitBtn.innerHTML = originalBtnText;
      }
    });
  }
})();
