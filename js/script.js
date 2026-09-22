/* ==========================================================================
   LKJ Compassionate Hanz — script.js
   Handles: mobile nav, header scroll state, smooth anchors, FAQ accordion,
   gallery lightbox, care-needs guide, floating WhatsApp panel,
   contact form -> WhatsApp, copyright year, reveal-on-scroll.
   ========================================================================== */

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById('site-header');
  function onScroll() {
    if (window.scrollY > 12) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  var hamburger = document.getElementById('hamburger');
  var mobileMenu = document.getElementById('mobile-menu');
  var mobileMenuClose = document.getElementById('mobile-menu-close');
  var lastFocused = null;

  function openMobileMenu() {
    lastFocused = document.activeElement;
    mobileMenu.hidden = false;
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    mobileMenuClose.focus();
    document.addEventListener('keydown', onMobileMenuKeydown);
  }
  function closeMobileMenu() {
    mobileMenu.hidden = true;
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onMobileMenuKeydown);
    if (lastFocused) lastFocused.focus();
  }
  function onMobileMenuKeydown(e) {
    if (e.key === 'Escape') {
      closeMobileMenu();
      return;
    }
    if (e.key === 'Tab') {
      var focusable = mobileMenu.querySelectorAll('a, button');
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  hamburger.addEventListener('click', function () {
    if (mobileMenu.hidden) openMobileMenu(); else closeMobileMenu();
  });
  mobileMenuClose.addEventListener('click', closeMobileMenu);
  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMobileMenu);
  });

  /* ---------- Smooth anchor navigation (with header offset) ---------- */
  var headerHeight = header.offsetHeight;
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href');
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var top = target.getBoundingClientRect().top + window.pageYOffset - (headerHeight - 10);
      window.scrollTo({ top: top, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  });

  /* ---------- FAQ accordion ---------- */
  var accordionTriggers = document.querySelectorAll('.accordion-trigger');
  accordionTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var expanded = trigger.getAttribute('aria-expanded') === 'true';
      var panel = document.getElementById(trigger.getAttribute('aria-controls'));

      // Close all others (single-open accordion)
      accordionTriggers.forEach(function (t) {
        if (t !== trigger) {
          t.setAttribute('aria-expanded', 'false');
          document.getElementById(t.getAttribute('aria-controls')).hidden = true;
        }
      });

      trigger.setAttribute('aria-expanded', String(!expanded));
      panel.hidden = expanded;
    });
  });

  /* ---------- Gallery lightbox ---------- */
  var galleryItems = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
  var lightbox = document.getElementById('lightbox');
  var lightboxImage = document.getElementById('lightbox-image');
  var lightboxCaption = document.getElementById('lightbox-caption');
  var lightboxClose = document.getElementById('lightbox-close');
  var lightboxPrev = document.getElementById('lightbox-prev');
  var lightboxNext = document.getElementById('lightbox-next');
  var currentIndex = 0;
  var lightboxLastFocused = null;

  function showImage(index) {
    currentIndex = (index + galleryItems.length) % galleryItems.length;
    var item = galleryItems[currentIndex];
    var img = item.querySelector('img');
    var label = item.querySelector('span').textContent;
    lightboxImage.src = img.src;
    lightboxImage.alt = img.alt;
    lightboxCaption.textContent = label;
  }

  function openLightbox(index) {
    lightboxLastFocused = document.activeElement;
    showImage(index);
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    lightboxClose.focus();
    document.addEventListener('keydown', onLightboxKeydown);
  }

  function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onLightboxKeydown);
    if (lightboxLastFocused) lightboxLastFocused.focus();
  }

  function onLightboxKeydown(e) {
    if (e.key === 'Escape') { closeLightbox(); return; }
    if (e.key === 'ArrowRight') { showImage(currentIndex + 1); return; }
    if (e.key === 'ArrowLeft') { showImage(currentIndex - 1); return; }
    if (e.key === 'Tab') {
      var focusable = lightbox.querySelectorAll('button');
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  galleryItems.forEach(function (item, index) {
    item.addEventListener('click', function () { openLightbox(index); });
  });
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', function () { showImage(currentIndex - 1); });
  lightboxNext.addEventListener('click', function () { showImage(currentIndex + 1); });
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  /* ---------- Care-needs guide ---------- */
  var guideCards = document.querySelectorAll('.guide-card');
  var guideResult = document.getElementById('guide-result');
  var guideSummaryText = document.getElementById('guide-summary-text');
  var guideWhatsappBtn = document.getElementById('guide-whatsapp-btn');
  var guideResetBtn = document.getElementById('guide-reset-btn');
  var selectedNeeds = [];

  function joinWithAnd(items) {
    if (items.length === 1) return items[0];
    if (items.length === 2) return items[0] + ' and ' + items[1];
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }

  function updateGuideResult() {
    if (selectedNeeds.length === 0) {
      guideResult.hidden = true;
      return;
    }
    var joined = joinWithAnd(selectedNeeds);
    guideSummaryText.textContent = 'Your family may benefit from a conversation about ' + joined + '. Send us a WhatsApp message and we will listen to your needs.';
    var message = 'Hello LKJ Compassionate Hanz. I would like to learn more about ' + joined + ' for my loved one.';
    guideWhatsappBtn.href = 'https://wa.me/18682955909?text=' + encodeURIComponent(message);
    guideResult.hidden = false;
  }

  guideCards.forEach(function (card) {
    card.addEventListener('click', function () {
      var value = card.getAttribute('data-value');
      var pressed = card.getAttribute('aria-pressed') === 'true';
      card.setAttribute('aria-pressed', String(!pressed));
      if (pressed) {
        selectedNeeds = selectedNeeds.filter(function (n) { return n !== value; });
      } else {
        selectedNeeds.push(value);
      }
      updateGuideResult();
    });
  });

  guideResetBtn.addEventListener('click', function () {
    selectedNeeds = [];
    guideCards.forEach(function (card) { card.setAttribute('aria-pressed', 'false'); });
    guideResult.hidden = true;
    guideCards[0].focus();
  });

  /* ---------- Floating WhatsApp panel ---------- */
  var fwToggle = document.getElementById('fw-toggle');
  var fwPanel = document.getElementById('fw-panel');

  function openFwPanel() {
    fwPanel.hidden = false;
    fwToggle.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onFwOutsideClick);
    document.addEventListener('keydown', onFwKeydown);
  }
  function closeFwPanel() {
    fwPanel.hidden = true;
    fwToggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onFwOutsideClick);
    document.removeEventListener('keydown', onFwKeydown);
  }
  function onFwOutsideClick(e) {
    if (!fwPanel.contains(e.target) && e.target !== fwToggle) closeFwPanel();
  }
  function onFwKeydown(e) {
    if (e.key === 'Escape') { closeFwPanel(); fwToggle.focus(); }
  }
  fwToggle.addEventListener('click', function (e) {
    e.stopPropagation();
    if (fwPanel.hidden) openFwPanel(); else closeFwPanel();
  });

  /* ---------- Read More placeholders ---------- */
  document.querySelectorAll('.read-more').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      // Placeholder: route to a real article page keyed by data-article when available.
      // e.g. window.location.href = '/resources/' + link.dataset.article + '.html';
    });
  });

  /* ---------- Contact form -> WhatsApp ---------- */
  var contactForm = document.getElementById('contact-form');
  var nameInput = document.getElementById('cf-name');
  var contactInput = document.getElementById('cf-contact');
  var messageInput = document.getElementById('cf-message');
  var nameError = document.getElementById('cf-name-error');
  var contactError = document.getElementById('cf-contact-error');
  var messageError = document.getElementById('cf-message-error');

  function validateField(input, errorEl, message) {
    if (!input.value.trim()) {
      errorEl.textContent = message;
      return false;
    }
    errorEl.textContent = '';
    return true;
  }

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var validName = validateField(nameInput, nameError, 'Please enter your name.');
    var validContact = validateField(contactInput, contactError, 'Please enter a phone number or email.');
    var validMessage = validateField(messageInput, messageError, 'Please enter a short message.');

    if (!validName || !validContact || !validMessage) return;

    var text = 'Hello LKJ Compassionate Hanz.\n' +
      'Name: ' + nameInput.value.trim() + '\n' +
      'Contact: ' + contactInput.value.trim() + '\n' +
      'Message: ' + messageInput.value.trim();

    window.open('https://wa.me/18682955909?text=' + encodeURIComponent(text), '_blank', 'noopener');
    contactForm.reset();
  });

  /* ---------- Copyright year ---------- */
  document.getElementById('copyright-year').textContent = new Date().getFullYear();

  /* ---------- Reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { observer.observe(el); });
  }

})();
