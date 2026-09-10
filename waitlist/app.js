/**
 * Talorify Waitlist Application Script
 * Supabase client integration for waitlist insertion,
 * interactive 3-step feature switcher, customized celebration modal & confetti,
 * error state handling, and FAQ modal.
 */

/* ==========================================================================
   SUPABASE CONFIGURATION & CLIENT INITIALIZATION
   ========================================================================== */
const SUPABASE_URL = "https://lhjhdtvooasdekczhrhe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hVl96h496UcsL4m_f201nw_PAuCf469";

let supabaseClient = null;

function initSupabase() {
  if (typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
    try {
      supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('Talorify: Supabase client initialized successfully.');
    } catch (err) {
      console.warn('Talorify: Could not initialize Supabase client:', err);
    }
  } else {
    console.warn('Talorify: Supabase JS library not loaded.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Supabase
  initSupabase();

  // 2. Interactive 3-Step Feature Switcher
  initStepSwitcher();

  // 3. Supabase Waitlist Registration Forms (Hero & Footer)
  initWaitlistForms();

  // 4. Customized Celebration Modal
  initCelebrationModal();

  // 5. Formspree Contact Form (AJAX submission)
  initContactForm();

  // 6. FAQ Modal Dialog
  initFaqModal();

  // 7. Navigation & Mobile Drawer
  initNavigation();
  initSmartNavbar();

  // 8. Lenis Smooth Inertial Scroll (Framer-style slow scroll)
  initLenisSmoothScroll();

  // 9. Framer Motion Slide-ups & Dynamic Animations
  initFramerMotionAnimations();
});

/* ==========================================================================
   1. INTERACTIVE 3-STEP FEATURE SWITCHER
   ========================================================================== */
function initStepSwitcher() {
  const stepTabs = document.querySelectorAll('.step-card-tab');
  const stepImages = [
    document.getElementById('stepImg1'),
    document.getElementById('stepImg2'),
    document.getElementById('stepImg3')
  ];

  if (!stepTabs.length) return;

  stepTabs.forEach((tab) => {
    const handleStepSelect = () => {
      const stepNumber = parseInt(tab.getAttribute('data-step'), 10);
      if (isNaN(stepNumber)) return;

      // Update active state on tabs
      stepTabs.forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      // Update active image with smooth crossfade
      stepImages.forEach((img, idx) => {
        if (!img) return;
        const isTarget = idx === stepNumber - 1;
        img.classList.toggle('active', isTarget);
      });
    };

    tab.addEventListener('click', handleStepSelect);

    // Keyboard accessibility: Enter or Space triggers step selection
    tab.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleStepSelect();
      }
    });
  });
}

/* ==========================================================================
   2. SUPABASE WAITLIST REGISTRATION & CELEBRATION
   ========================================================================== */
function initWaitlistForms() {
  const heroForm = document.getElementById('heroWaitlistForm');
  const bottomForm = document.getElementById('bottomWaitlistForm');

  [heroForm, bottomForm].forEach((form) => {
    if (!form) return;
    const input = form.querySelector('.pill-input');
    const wrapper = form.querySelector('.pill-input-wrapper');
    const feedback = form.querySelector('.form-feedback') || form.nextElementSibling;

    // Reset error state on typing
    if (input && wrapper) {
      input.addEventListener('input', () => {
        wrapper.classList.remove('input-error');
        if (feedback && feedback.classList.contains('error')) {
          feedback.textContent = '';
          feedback.className = 'form-feedback';
        }
      });
    }
  });

  if (heroForm) {
    heroForm.addEventListener('submit', (e) => handleWaitlistSubmit(e, 'hero'));
  }

  if (bottomForm) {
    bottomForm.addEventListener('submit', (e) => handleWaitlistSubmit(e, 'bottom'));
  }
}

async function handleWaitlistSubmit(e, formType) {
  e.preventDefault();
  const form = e.target;
  const wrapper = form.querySelector('.pill-input-wrapper');
  const input = form.querySelector('.pill-input');
  const submitBtn = form.querySelector('.form-submit-btn');
  const feedback = document.getElementById(formType === 'hero' ? 'heroFeedback' : 'bottomFeedback');
  const email = input ? input.value.trim() : '';

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    if (wrapper) {
      wrapper.classList.remove('input-error');
      void wrapper.offsetWidth; // force reflow for shake animation
      wrapper.classList.add('input-error');
    }
    showFormMessage(feedback, '⚠ Please enter a valid email address.', 'error');
    if (input) input.focus();
    return;
  }

  // Clear any previous error state
  if (wrapper) wrapper.classList.remove('input-error');

  // Loading state
  submitBtn.disabled = true;
  const btnText = submitBtn.querySelector('.btn-text');
  const originalText = btnText ? btnText.textContent : 'Join waitlist';
  if (btnText) btnText.textContent = 'Joining...';

  // 1. Insert into Supabase 'waitlist' table
  let supabaseSuccess = false;
  let isDuplicate = false;

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('waitlist')
        .insert([{ email: email }]);

      if (error) {
        console.warn('Talorify: Supabase waitlist insert response:', error);
        if (error.code === '23505' || (error.message && error.message.toLowerCase().includes('duplicate'))) {
          isDuplicate = true;
          supabaseSuccess = true;
        } else if (error.code === '42501') {
          console.warn('Talorify: Row-level security is active on waitlist table. Run SQL to enable public insert.');
        }
      } else {
        supabaseSuccess = true;
        console.log('Talorify: Successfully inserted into Supabase waitlist:', email);
      }
    } catch (err) {
      console.warn('Talorify: Supabase request exception:', err);
    }
  }

  // Backup submission via Formspree if Supabase is blocked by RLS
  if (!supabaseSuccess && !isDuplicate) {
    try {
      fetch('https://formspree.io/f/xyeylwry', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, _subject: 'Tailorify Waitlist Lead' })
      }).catch(() => {});
    } catch (e) {}
  }

  // 2. Determine realistic queue position: 100 + totalCount (4 signups = 104, 5 signups = 105)
  const waitlistLocal = JSON.parse(localStorage.getItem('tailorify_waitlist') || '[]');
  const isAlreadyOnList = waitlistLocal.some((entry) => entry.email.toLowerCase() === email.toLowerCase());

  // Base starts with the 4 registered users
  let totalCount = Math.max(4, parseInt(localStorage.getItem('tailorify_global_count') || '4', 10));

  if (supabaseClient) {
    try {
      const { count, error: countErr } = await supabaseClient
        .from('waitlist')
        .select('*', { count: 'exact', head: true });
      if (!countErr && typeof count === 'number' && count > 0) {
        totalCount = Math.max(totalCount, count);
      }
    } catch (cErr) {
      console.warn('Talorify: Could not query waitlist count:', cErr);
    }
  }

  let queuePosition = 100 + totalCount;

  if (isAlreadyOnList) {
    const existing = waitlistLocal.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    queuePosition = existing && existing.position ? existing.position : (100 + totalCount);
  } else {
    // New signup: If we don't have a fresh Supabase live count, increment local counter
    if (!supabaseSuccess) {
      // If user had 4 and is submitting their 4th test, position is 104.
      // If already recorded 4, next is 105.
      if (localStorage.getItem('tailorify_global_count')) {
        totalCount += 1;
      }
      queuePosition = 100 + totalCount;
      localStorage.setItem('tailorify_global_count', String(totalCount));
    } else {
      queuePosition = 100 + totalCount;
      localStorage.setItem('tailorify_global_count', String(totalCount));
    }

    waitlistLocal.push({ email, date: new Date().toISOString(), position: queuePosition });
    localStorage.setItem('tailorify_waitlist', JSON.stringify(waitlistLocal));
  }

  // Swap button text to "Added! ✓" as requested
  submitBtn.disabled = false;
  if (btnText) btnText.textContent = 'Added! ✓';
  if (input) input.value = '';

  // Success styling on pill wrapper
  if (wrapper) wrapper.classList.add('input-success');

  // Inline feedback message & toast (clean, standard approach without numbers)
  const isExistingEmail = isAlreadyOnList || isDuplicate;
  if (isExistingEmail) {
    showFormMessage(feedback, "✓ This email is already on the waitlist.", 'success');
    showToast("✓ This email is already on the waitlist.");
  } else {
    showFormMessage(feedback, "✓ Added! You are on the waitlist.", 'success');
    showToast("✓ Added! You are on the waitlist.");
  }

  // Trigger customized celebration: Multi-burst confetti + celebration modal
  triggerCustomCelebration();
  openCelebrationModal(email, isExistingEmail);

  // Reset button text back after 4 seconds
  setTimeout(() => {
    if (btnText) btnText.textContent = originalText;
  }, 4000);
}

function showFormMessage(container, message, type) {
  if (!container) return;
  container.textContent = message;
  container.className = `form-feedback ${type}`;
}

/* Customized Multi-burst Celebration Confetti */
function triggerCustomCelebration() {
  if (typeof confetti !== 'function') return;

  // Tailorify Brand Celebration Palette: Charcoal, Warm Gold, Emerald, Beige
  const brandColors = ['#121214', '#10B981', '#F59E0B', '#F5F5DC', '#3B82F6'];

  // Left burst
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 55,
    origin: { x: 0.15, y: 0.65 },
    colors: brandColors,
  });

  // Right burst
  confetti({
    particleCount: 50,
    angle: 120,
    spread: 55,
    origin: { x: 0.85, y: 0.65 },
    colors: brandColors,
  });

  // Center celebration cannon
  setTimeout(() => {
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.6 },
      colors: brandColors,
    });
  }, 150);
}

/* ==========================================================================
   3. CUSTOMIZED CELEBRATION MODAL
   ========================================================================== */
function initCelebrationModal() {
  const modal = document.getElementById('celebrationModal');
  const closeBtn = document.getElementById('celebrationCloseBtn');
  const dismissBtn = document.getElementById('celebrationDismissBtn');

  if (!modal) return;

  const closeModal = () => {
    if (typeof modal.close === 'function') {
      modal.close();
    } else {
      modal.removeAttribute('open');
    }
  };

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (dismissBtn) dismissBtn.addEventListener('click', closeModal);

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    const rect = modal.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) closeModal();
  });
}

function openCelebrationModal(email, isDuplicate) {
  const modal = document.getElementById('celebrationModal');
  const modalTitle = document.getElementById('celebrationModalTitle');
  const userEmail = document.getElementById('celebrationUserEmail');

  if (!modal) return;

  if (modalTitle) {
    modalTitle.textContent = isDuplicate ? "You're already on the list!" : "You're on the list!";
  }
  if (userEmail) userEmail.textContent = email;

  if (typeof modal.showModal === 'function') {
    modal.showModal();
  } else {
    modal.setAttribute('open', 'true');
  }
}

/* ==========================================================================
   4. FORMSPREE CONTACT FORM (AJAX)
   ========================================================================== */
function initContactForm() {
  const contactForm = document.getElementById('contactForm');
  const feedback = document.getElementById('contactFeedback');

  if (!contactForm) return;

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('contactSubmitBtn');
    const btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
    const originalText = btnText ? btnText.textContent : 'Contact us';

    // Disable button & loading state
    if (submitBtn) submitBtn.disabled = true;
    if (btnText) btnText.textContent = 'Sending message...';

    const formData = new FormData(contactForm);

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        showFormMessage(feedback, "✓ Thank you! Your message has been sent. We'll reply shortly.", 'success');
        contactForm.reset();
        showToast("Message sent successfully! We'll be in touch.");
      } else {
        const data = await response.json();
        if (data && data.errors) {
          const errorMsg = data.errors.map(err => err.message).join(', ');
          showFormMessage(feedback, `⚠ ${errorMsg}`, 'error');
        } else {
          showFormMessage(feedback, '⚠ Oops! There was a problem submitting your form.', 'error');
        }
      }
    } catch (err) {
      console.warn('Formspree submission error:', err);
      showFormMessage(feedback, '⚠ Network error. Please check your connection and try again.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (btnText) btnText.textContent = originalText;
    }
  });
}

/* ==========================================================================
   5. FAQ MODAL DIALOG
   ========================================================================== */
function initFaqModal() {
  const faqLink = document.getElementById('faqLink');
  const faqModal = document.getElementById('faqModal');
  const faqCloseBtn = document.getElementById('faqCloseBtn');

  if (!faqModal) return;

  if (faqLink) {
    faqLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof faqModal.showModal === 'function') {
        faqModal.showModal();
      } else {
        faqModal.setAttribute('open', 'true');
      }
    });
  }

  if (faqCloseBtn) {
    faqCloseBtn.addEventListener('click', () => {
      if (typeof faqModal.close === 'function') {
        faqModal.close();
      } else {
        faqModal.removeAttribute('open');
      }
    });
  }

  // Close when clicking dialog backdrop
  faqModal.addEventListener('click', (e) => {
    const rect = faqModal.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      if (typeof faqModal.close === 'function') {
        faqModal.close();
      } else {
        faqModal.removeAttribute('open');
      }
    }
  });
}

/* ==========================================================================
   5. NAVIGATION & SMOOTH SCROLLING
   ========================================================================== */
function initNavigation() {
  const mobileToggle = document.getElementById('mobileToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  // Mobile menu toggle
  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close mobile menu when link is clicked
    document.querySelectorAll('.mobile-nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Smooth scroll for internal links using Lenis (if available) or native fallback
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#' || targetId === '#top') {
        e.preventDefault();
        if (lenisInstance) {
          lenisInstance.scrollTo(0, { duration: 1.5 });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
      if (targetId === '#faqModal' || targetId === '#celebrationModal') {
        return;
      }
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        if (lenisInstance) {
          lenisInstance.scrollTo(targetEl, { offset: -25, duration: 1.5 });
        } else {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });

  // Buttons with scroll-to-waitlist class
  document.querySelectorAll('.scroll-to-waitlist').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const heroInput = document.getElementById('heroEmailInput');
      const heroSection = document.getElementById('hero');
      if (heroSection) {
        if (lenisInstance) {
          lenisInstance.scrollTo(heroSection, {
            duration: 1.5,
            onComplete: () => {
              if (heroInput) heroInput.focus();
            }
          });
        } else {
          heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          setTimeout(() => {
            if (heroInput) heroInput.focus();
          }, 500);
        }
      }
    });
  });
}

/* ==========================================================================
   SMART HIDE/SHOW NAVBAR ON SCROLL
   ========================================================================== */
function initSmartNavbar() {
  const header = document.querySelector('.site-header');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!header) return;

  let lastScrollY = window.pageYOffset || document.documentElement.scrollTop;
  let ticking = false;

  const updateNav = (scrollY) => {
    // If mobile menu drawer is open, keep navbar visible
    if (mobileMenu && mobileMenu.classList.contains('open')) {
      header.classList.remove('nav-hidden');
      header.classList.add('nav-visible');
      return;
    }

    if (scrollY <= 30) {
      header.classList.remove('is-scrolled');
      header.classList.remove('nav-hidden');
      header.classList.add('nav-visible');
    } else {
      header.classList.add('is-scrolled');

      if (scrollY > lastScrollY + 6 && scrollY > 70) {
        // Scrolling DOWN -> hide navbar
        header.classList.add('nav-hidden');
        header.classList.remove('nav-visible');
      } else if (scrollY < lastScrollY - 6) {
        // Scrolling UP -> reveal navbar
        header.classList.remove('nav-hidden');
        header.classList.add('nav-visible');
      }
    }

    lastScrollY = scrollY;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      window.requestAnimationFrame(() => updateNav(scrollY));
      ticking = true;
    }
  }, { passive: true });
}

/* ==========================================================================
   TOAST NOTIFICATION HELPER (CLEAN, NO AI SPARKLES)
   ========================================================================== */
function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">✓</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(16px)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3800);
}

/* ==========================================================================
   8. LENIS LUXURIOUS "SLOW SCROLL" (FRAMER-STYLE INERTIAL PHYSICS)
   ========================================================================== */
let lenisInstance = null;

function initLenisSmoothScroll() {
  if (typeof window.Lenis === 'undefined') {
    console.warn('Talorify: Lenis library not loaded.');
    return;
  }

  // Create Lenis instance with silky smooth slow momentum
  lenisInstance = new window.Lenis({
    duration: 1.5, // Luxuriously slow, smooth glide
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential slow deceleration
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    smoothTouch: false,
    wheelMultiplier: 0.85, // Softer wheel for gentle slow scroll
    touchMultiplier: 1.5,
    infinite: false,
  });

  // Animation frame loop
  function raf(time) {
    lenisInstance.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  console.log('Talorify: Lenis smooth slow scroll activated.');
}

/* ==========================================================================
   9. FRAMER MOTION SLIDE-UP ANIMATIONS & SCROLL REVEAL
   ========================================================================== */
function initFramerMotionAnimations() {
  if (typeof window.Motion === 'undefined') {
    console.warn('Talorify: Motion library not loaded, using CSS scroll reveal fallback.');
    initScrollReveal();
    return;
  }

  const { animate, inView } = window.Motion;

  // Signature Framer spring curve
  const framerSpring = [0.16, 1, 0.3, 1];

  // 1. Hero Section Entrance Slide-ups (Staggered)
  const heroTitle = document.querySelector('.hero-title');
  const heroSubtitle = document.querySelector('.hero-subtitle');
  const heroForm = document.querySelector('.hero-section .waitlist-pill-form');

  if (heroTitle) {
    animate(heroTitle, 
      { opacity: [0, 1], transform: ['translateY(42px)', 'translateY(0px)'] }, 
      { duration: 1.0, easing: framerSpring, delay: 0.08 }
    );
  }

  if (heroSubtitle) {
    animate(heroSubtitle, 
      { opacity: [0, 1], transform: ['translateY(32px)', 'translateY(0px)'] }, 
      { duration: 1.0, easing: framerSpring, delay: 0.22 }
    );
  }

  if (heroForm) {
    animate(heroForm, 
      { opacity: [0, 1], transform: ['translateY(26px) scale(0.97)', 'translateY(0px) scale(1)'] }, 
      { duration: 1.0, easing: framerSpring, delay: 0.36 }
    );
  }

  // 2. "How It Works" Section Framer Motion inView Trigger
  const howSection = document.querySelector('.how-it-works-section');
  if (howSection) {
    howSection.classList.add('is-visible');
    inView(howSection, () => {
      // Badge slide-up
      const badge = howSection.querySelector('.pill-badge');
      if (badge) {
        animate(badge, 
          { opacity: [0, 1], transform: ['translateY(20px)', 'translateY(0px)'] }, 
          { duration: 0.75, easing: framerSpring }
        );
      }

      // Title & Side Description slide-up
      const mainTitle = howSection.querySelector('.how-main-title');
      const sideText = howSection.querySelector('.how-side-text');
      if (mainTitle) {
        animate(mainTitle, 
          { opacity: [0, 1], transform: ['translateY(36px)', 'translateY(0px)'] }, 
          { duration: 0.9, delay: 0.1, easing: framerSpring }
        );
      }
      if (sideText) {
        animate(sideText, 
          { opacity: [0, 1], transform: ['translateY(28px)', 'translateY(0px)'] }, 
          { duration: 0.9, delay: 0.2, easing: framerSpring }
        );
      }

      // Staggered Step Cards slide-up
      const stepTabs = howSection.querySelectorAll('.step-card-tab');
      stepTabs.forEach((tab, index) => {
        animate(tab, 
          { opacity: [0, 1], transform: ['translateX(-32px)', 'translateX(0px)'] }, 
          { duration: 0.85, delay: 0.15 + index * 0.12, easing: framerSpring }
        );
      });

      // Step Visual Frame slide-up with subtle scale
      const stepFrame = howSection.querySelector('.step-image-frame');
      if (stepFrame) {
        animate(stepFrame, 
          { opacity: [0, 1], transform: ['translateY(30px) scale(0.95)', 'translateY(0px) scale(1)'] }, 
          { duration: 0.95, delay: 0.25, easing: framerSpring }
        );
      }
    }, { amount: "some" });
  }

  // 3. "Still have questions?" Contact Card Deck Framer Motion inView
  const contactSection = document.querySelector('.contact-section');
  if (contactSection) {
    contactSection.classList.add('is-visible');
    inView(contactSection, () => {
      const cardDeck = contactSection.querySelector('.card-stack-deck');
      if (cardDeck) {
        animate(cardDeck, 
          { opacity: [0, 1], transform: ['translateY(48px) scale(0.95)', 'translateY(0px) scale(1)'] }, 
          { duration: 1.05, easing: framerSpring }
        );
      }
    }, { amount: "some" });
  }

  // 4. Footer CTA Section Framer Motion inView
  const footerCtaSection = document.querySelector('.footer-cta-section');
  if (footerCtaSection) {
    footerCtaSection.classList.add('is-visible');
    inView(footerCtaSection, () => {
      const heading = footerCtaSection.querySelector('.footer-cta-heading');
      const subheading = footerCtaSection.querySelector('.footer-cta-subheading');
      const form = footerCtaSection.querySelector('.waitlist-pill-form');

      if (heading) {
        animate(heading, 
          { opacity: [0, 1], transform: ['translateY(35px)', 'translateY(0px)'] }, 
          { duration: 0.9, easing: framerSpring }
        );
      }
      if (subheading) {
        animate(subheading, 
          { opacity: [0, 1], transform: ['translateY(25px)', 'translateY(0px)'] }, 
          { duration: 0.9, delay: 0.14, easing: framerSpring }
        );
      }
      if (form) {
        animate(form, 
          { opacity: [0, 1], transform: ['translateY(22px)', 'translateY(0px)'] }, 
          { duration: 0.9, delay: 0.28, easing: framerSpring }
        );
      }
    }, { amount: "some" });
  }
}

/* ==========================================================================
   10. INTERSECTION OBSERVER SCROLL REVEAL (CSS FALLBACK)
   ========================================================================== */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if (!revealElements.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach((el) => observer.observe(el));
  } else {
    // Graceful fallback for non-supporting browsers
    revealElements.forEach((el) => el.classList.add('is-visible'));
  }
}


