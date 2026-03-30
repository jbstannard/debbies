/* ═══════════════════════════════════════════════════════════
   DEBBIE'S — MAIN.JS
   Smooth scroll, sticky header, scroll-spy, scroll-reveal,
   mobile nav, form validation & AJAX submission.
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ─── STICKY HEADER ─── */

  const header = document.getElementById('site-header');
  const sentinel = document.getElementById('header-sentinel');

  if (header && sentinel) {
    const headerObs = new IntersectionObserver(
      ([entry]) => {
        header.classList.toggle('header--scrolled', !entry.isIntersecting);
      },
      { threshold: 0 }
    );
    headerObs.observe(sentinel);
  }

  /* ─── SMOOTH SCROLL ─── */

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      const headerHeight = header ? header.offsetHeight : 0;
      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;

      window.scrollTo({
        top,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
      });

      // Close mobile nav if open
      closeMobileNav();
    });
  });

  /* ─── SCROLL-SPY ─── */

  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');

  if (sections.length && navLinks.length) {
    const spyObs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            navLinks.forEach(link => {
              const href = link.getAttribute('href');
              link.classList.toggle('is-active', href === '#' + id);
            });
          }
        });
      },
      {
        rootMargin: '-30% 0px -60% 0px',
        threshold: 0
      }
    );
    sections.forEach(s => spyObs.observe(s));
  }

  /* ─── SCROLL REVEAL ─── */

  if (!prefersReducedMotion) {
    const reveals = document.querySelectorAll('.reveal');

    const revealObs = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = parseInt(el.dataset.delay || '0', 10);

            setTimeout(() => {
              el.classList.add('is-visible');
            }, delay);

            revealObs.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );

    reveals.forEach(el => revealObs.observe(el));
  } else {
    // Show everything immediately if reduced motion
    document.querySelectorAll('.reveal').forEach(el => {
      el.classList.add('is-visible');
    });
  }

  /* ─── MOBILE NAV ─── */

  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.getElementById('nav-menu');

  function closeMobileNav() {
    if (navToggle && navMenu) {
      navToggle.setAttribute('aria-expanded', 'false');
      navMenu.classList.remove('is-open');
    }
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!isOpen));
      navMenu.classList.toggle('is-open');
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (navMenu.classList.contains('is-open') &&
          !navMenu.contains(e.target) &&
          !navToggle.contains(e.target)) {
        closeMobileNav();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && navMenu.classList.contains('is-open')) {
        closeMobileNav();
        navToggle.focus();
      }
    });
  }

  /* ─── FORM VALIDATION & SUBMISSION ─── */

  const form = document.getElementById('enquiry-form');
  const submitBtn = document.getElementById('submit-btn');
  const successEl = document.getElementById('form-success');

  if (form) {
    // Basic UK phone regex: starts with 0 or +44, 10-13 digits total
    const phoneRegex = /^(?:(?:\+44)|0)\s*\d[\d\s]{8,12}$/;

    function validateField(input) {
      const error = input.parentElement.querySelector('.form-error');
      let message = '';

      if (input.required && !input.value.trim()) {
        message = 'This field is required';
      } else if (input.type === 'tel' && input.value.trim() && !phoneRegex.test(input.value.trim().replace(/\s/g, ''))) {
        // Relax: just check it has enough digits
        const digits = input.value.replace(/\D/g, '');
        if (digits.length < 10) {
          message = 'Please enter a valid phone number';
        }
      }

      input.classList.toggle('has-error', !!message);
      if (error) error.textContent = message;
      return !message;
    }

    // Live validation on blur
    form.querySelectorAll('.form-input').forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.classList.contains('has-error')) {
          validateField(input);
        }
      });
    });

    form.addEventListener('submit', async e => {
      e.preventDefault();

      // Validate all required fields
      const inputs = form.querySelectorAll('.form-input[required]');
      let allValid = true;
      inputs.forEach(input => {
        if (!validateField(input)) allValid = false;
      });

      if (!allValid) return;

      // Loading state
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;

      try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          // Get the loved one's name for the success message
          const lovedOneName = formData.get('loved_one_name') || 'your loved one';
          const successNameEl = document.getElementById('success-name');
          if (successNameEl) successNameEl.textContent = lovedOneName;

          // Hide form, show success
          form.style.display = 'none';
          document.querySelector('.form-reassurance').style.display = 'none';
          successEl.hidden = false;

          // Track conversion if Facebook Pixel exists
          if (typeof fbq === 'function') {
            fbq('track', 'Lead');
          }
        } else {
          throw new Error('Form submission failed');
        }
      } catch (err) {
        // Show fallback message
        const errorMsg = document.createElement('p');
        errorMsg.className = 'form-reassurance';
        errorMsg.style.color = 'var(--color-terracotta-light)';
        errorMsg.innerHTML = 'Something went wrong. Please call us directly &mdash; we\'d love to hear from you.';
        form.parentElement.appendChild(errorMsg);

        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
      }
    });
  }

})();
