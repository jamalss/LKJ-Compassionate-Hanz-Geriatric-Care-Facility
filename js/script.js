/* ==========================================================================
   LKJ Compassionate Hanz — script.js
   Handles: font loading, missing-image fallbacks, gallery auto-show, header
   scroll state, mobile menu, FAQ accordion, gallery lightbox, care-needs
   guide, floating WhatsApp panel, contact form -> WhatsApp, copyright year,
   reveal-on-scroll.

   Security rules followed: no innerHTML, no eval, no inline handlers (the page
   CSP blocks them), all user text goes through textContent / encodeURIComponent.
   Every module checks its elements exist, so this file is safe on any page.
   ========================================================================== */

(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var WA_PRIMARY = '18682955909';
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Lets CSS apply scroll-reveal only when JS is running (content stays visible otherwise)
  root.classList.add('js');

  function $(id) { return doc.getElementById(id); }
  function waLink(number, text) {
    return 'https://wa.me/' + number + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  /* ---------- Google Fonts: switch from print to all (non-blocking load) ---------- */
  var fontLink = $('google-fonts');
  if (fontLink) {
    if (fontLink.sheet) { fontLink.media = 'all'; }
    else { fontLink.addEventListener('load', function () { fontLink.media = 'all'; }); }
  }

  /* ---------- Background inert helper (for modal menu + lightbox) ---------- */
  var backgroundSelectors = '.announcement-bar, .site-header, main, .site-footer, .floating-whatsapp';
  function setBackgroundInert(on) {
    doc.querySelectorAll(backgroundSelectors).forEach(function (el) {
      if (on) { el.setAttribute('inert', ''); } else { el.removeAttribute('inert'); }
    });
  }

  /* ---------- Focus trap helper ---------- */
  function trapTab(e, container) {
    if (e.key !== 'Tab') return;
    var focusable = Array.prototype.filter.call(
      container.querySelectorAll('a[href], button:not([disabled])'),
      function (el) { return el.offsetParent !== null; }
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- Missing images: hide the image (or its wrapper) instead of a broken icon ---------- */
  // Inside a <picture>, a missing WebP does NOT fall back to the JPG by itself. So on the first error
  // we drop the <source> tags and retry the JPG; only if that also fails do we hide anything.
  function handleBrokenImage(img) {
    var picture = img.parentElement && img.parentElement.tagName === 'PICTURE' ? img.parentElement : null;
    if (picture && picture.querySelector('source')) {
      picture.querySelectorAll('source').forEach(function (src) { src.remove(); });
      img.addEventListener('error', function () { handleBrokenImage(img); }, { once: true });
      img.src = img.getAttribute('src'); // retry with the JPG
      return;
    }
    var rule = img.getAttribute('data-fallback');
    var target = (!rule || rule === 'self') ? img : img.closest(rule);
    if (target) target.hidden = true;
  }
  doc.querySelectorAll('img[data-fallback]').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) {
      handleBrokenImage(img);
    } else {
      img.addEventListener('error', function () { handleBrokenImage(img); }, { once: true });
    }
  });

  /* ---------- Gallery: find which photos exist, then choose the layout ---------- */
  // Each slot is probed directly (not left to lazy-loading), so missing photos are removed up front
  // and the layout is decided from the real number of photos.
  var gallerySection = doc.querySelector('[data-gallery]');
  var galleryTrack = $('gallery-track');
  var galleryControls = gallerySection ? gallerySection.querySelector('.gallery-controls') : null;
  var galleryCounter = $('gallery-counter');
  var STRIP_MIN = 4; // photos needed before phones switch to the swipe strip

  function visibleSlides() {
    return galleryTrack ? Array.prototype.filter.call(galleryTrack.querySelectorAll('.gallery-slide'), function (li) { return !li.hidden; }) : [];
  }

  function setGalleryLayout() {
    var count = visibleSlides().length;
    if (!count) return;
    gallerySection.hidden = false;
    doc.querySelectorAll('[data-requires="gallery"]').forEach(function (el) { el.hidden = false; });
    var strip = count >= STRIP_MIN;
    galleryTrack.setAttribute('data-layout', strip ? 'strip' : 'grid');
    if (galleryControls) galleryControls.hidden = !strip;
    if (strip) {
      galleryTrack.setAttribute('tabindex', '0'); // lets keyboard users scroll the strip with arrow keys
      updateGalleryCounter();
    } else {
      galleryTrack.removeAttribute('tabindex');
    }
  }

  function currentSlideIndex() {
    var slides = visibleSlides();
    var trackLeft = galleryTrack.getBoundingClientRect().left;
    var best = 0, bestDist = Infinity;
    slides.forEach(function (li, i) {
      var d = Math.abs(li.getBoundingClientRect().left - trackLeft);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  function updateGalleryCounter() {
    if (!galleryCounter) return;
    galleryCounter.textContent = 'Photo ' + (currentSlideIndex() + 1) + ' of ' + visibleSlides().length;
  }

  function goToSlide(delta) {
    var slides = visibleSlides();
    var target = slides[Math.max(0, Math.min(slides.length - 1, currentSlideIndex() + delta))];
    if (target) {
      galleryTrack.scrollTo({ left: target.offsetLeft - galleryTrack.offsetLeft, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  }

  if (gallerySection && galleryTrack) {
    var slots = galleryTrack.querySelectorAll('.gallery-slide');
    var pending = slots.length;
    var settle = function () { pending -= 1; if (pending === 0) setGalleryLayout(); };
    slots.forEach(function (li) {
      var img = li.querySelector('img');
      var probe = new Image();
      probe.onload = settle;
      probe.onerror = function () { li.hidden = true; settle(); };
      probe.src = img.getAttribute('src'); // the JPG is the universal fallback
    });

    var prevBtn = $('gallery-prev');
    var nextBtn = $('gallery-next');
    if (prevBtn) prevBtn.addEventListener('click', function () { goToSlide(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goToSlide(1); });

    var scrollTimer;
    galleryTrack.addEventListener('scroll', function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(updateGalleryCounter, 80);
    }, { passive: true });
  }

  /* ---------- Header scroll state ---------- */
  var header = $('site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 12); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile menu ---------- */
  var hamburger = $('hamburger');
  var mobileMenu = $('mobile-menu');
  var mobileMenuClose = $('mobile-menu-close');

  if (hamburger && mobileMenu && mobileMenuClose) {
    var onMobileMenuKeydown = function (e) {
      if (e.key === 'Escape') { closeMobileMenu(true); return; }
      trapTab(e, mobileMenu);
    };
    var openMobileMenu = function () {
      mobileMenu.hidden = false;
      hamburger.setAttribute('aria-expanded', 'true');
      doc.body.style.overflow = 'hidden';
      setBackgroundInert(true);
      mobileMenuClose.focus();
      doc.addEventListener('keydown', onMobileMenuKeydown);
    };
    var closeMobileMenu = function (restoreFocus) {
      mobileMenu.hidden = true;
      hamburger.setAttribute('aria-expanded', 'false');
      doc.body.style.overflow = '';
      setBackgroundInert(false);
      doc.removeEventListener('keydown', onMobileMenuKeydown);
      if (restoreFocus) hamburger.focus();
    };

    hamburger.addEventListener('click', function () {
      if (mobileMenu.hidden) openMobileMenu(); else closeMobileMenu(true);
    });
    mobileMenuClose.addEventListener('click', function () { closeMobileMenu(true); });
    // Link click: close, then let the browser navigate (and move focus) to the section
    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { closeMobileMenu(false); });
    });
    // If the screen is widened past the mobile breakpoint while open, close it
    window.matchMedia('(min-width: 961px)').addEventListener('change', function (mq) {
      if (mq.matches && !mobileMenu.hidden) closeMobileMenu(false);
    });
  }

  /* ---------- FAQ accordion (single-open) ---------- */
  var accordionTriggers = doc.querySelectorAll('.accordion-trigger');
  accordionTriggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var expanded = trigger.getAttribute('aria-expanded') === 'true';
      accordionTriggers.forEach(function (t) {
        t.setAttribute('aria-expanded', 'false');
        var p = $(t.getAttribute('aria-controls'));
        if (p) p.hidden = true;
      });
      if (!expanded) {
        trigger.setAttribute('aria-expanded', 'true');
        var panel = $(trigger.getAttribute('aria-controls'));
        if (panel) panel.hidden = false;
      }
    });
  });

  /* ---------- Gallery lightbox ---------- */
  var lightbox = $('lightbox');
  var lightboxImage = $('lightbox-image');
  var lightboxCaption = $('lightbox-caption');
  var lightboxClose = $('lightbox-close');
  var lightboxPrev = $('lightbox-prev');
  var lightboxNext = $('lightbox-next');
  var allGalleryItems = Array.prototype.slice.call(doc.querySelectorAll('.gallery-item'));

  if (lightbox && lightboxImage && allGalleryItems.length) {
    var currentIndex = 0;
    var lightboxLastFocused = null;

    // Only photos that actually loaded take part in prev/next
    var visibleItems = function () {
      return allGalleryItems.filter(function (item) { return !item.hidden && !(item.closest('.gallery-slide') || {}).hidden; });
    };
    var showImage = function (index) {
      var items = visibleItems();
      if (!items.length) return;
      currentIndex = (index + items.length) % items.length;
      var item = items[currentIndex];
      var img = item.querySelector('img');
      lightboxImage.src = img.currentSrc || img.src;
      lightboxImage.alt = img.alt;
      lightboxCaption.textContent = item.querySelector('span').textContent;
      var single = items.length < 2;
      lightboxPrev.hidden = single;
      lightboxNext.hidden = single;
    };
    var onLightboxKeydown = function (e) {
      if (e.key === 'Escape') { closeLightbox(); return; }
      if (e.key === 'ArrowRight') { showImage(currentIndex + 1); return; }
      if (e.key === 'ArrowLeft') { showImage(currentIndex - 1); return; }
      trapTab(e, lightbox);
    };
    var openLightbox = function (item) {
      lightboxLastFocused = doc.activeElement;
      showImage(visibleItems().indexOf(item));
      lightbox.hidden = false;
      doc.body.style.overflow = 'hidden';
      setBackgroundInert(true);
      lightboxClose.focus();
      doc.addEventListener('keydown', onLightboxKeydown);
    };
    var closeLightbox = function () {
      lightbox.hidden = true;
      doc.body.style.overflow = '';
      setBackgroundInert(false);
      doc.removeEventListener('keydown', onLightboxKeydown);
      if (lightboxLastFocused) lightboxLastFocused.focus();
    };

    allGalleryItems.forEach(function (item) {
      item.addEventListener('click', function () { openLightbox(item); });
    });
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', function () { showImage(currentIndex - 1); });
    lightboxNext.addEventListener('click', function () { showImage(currentIndex + 1); });
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
  }

  /* ---------- Care-needs guide ---------- */
  var guideCards = doc.querySelectorAll('.guide-card');
  var guideResult = $('guide-result');
  var guideSummaryText = $('guide-summary-text');
  var guideWhatsappBtn = $('guide-whatsapp-btn');
  var guideResetBtn = $('guide-reset-btn');

  if (guideCards.length && guideResult && guideSummaryText && guideWhatsappBtn) {
    var selectedNeeds = [];

    var joinWithAnd = function (items) {
      if (items.length === 1) return items[0];
      if (items.length === 2) return items[0] + ' and ' + items[1];
      return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
    };
    var updateGuideResult = function () {
      if (!selectedNeeds.length) { guideResult.hidden = true; return; }
      var joined = joinWithAnd(selectedNeeds);
      guideSummaryText.textContent = 'Your family may benefit from a conversation about ' + joined + '. Send us a WhatsApp message and we will listen to your needs.';
      guideWhatsappBtn.href = waLink(WA_PRIMARY, 'Hello LKJ Compassionate Hanz. I would like to learn more about ' + joined + ' for my loved one.');
      guideResult.hidden = false;
    };

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

    if (guideResetBtn) {
      guideResetBtn.addEventListener('click', function () {
        selectedNeeds = [];
        guideCards.forEach(function (card) { card.setAttribute('aria-pressed', 'false'); });
        guideResult.hidden = true;
        guideCards[0].focus();
      });
    }
  }

  /* ---------- Floating WhatsApp panel ---------- */
  var fwToggle = $('fw-toggle');
  var fwPanel = $('fw-panel');

  if (fwToggle && fwPanel) {
    var onFwOutsideClick = function (e) {
      if (!fwPanel.contains(e.target) && !fwToggle.contains(e.target)) closeFwPanel();
    };
    var onFwKeydown = function (e) {
      if (e.key === 'Escape') { closeFwPanel(); fwToggle.focus(); }
    };
    var openFwPanel = function () {
      fwPanel.hidden = false;
      fwToggle.setAttribute('aria-expanded', 'true');
      doc.addEventListener('click', onFwOutsideClick);
      doc.addEventListener('keydown', onFwKeydown);
    };
    var closeFwPanel = function () {
      fwPanel.hidden = true;
      fwToggle.setAttribute('aria-expanded', 'false');
      doc.removeEventListener('click', onFwOutsideClick);
      doc.removeEventListener('keydown', onFwKeydown);
    };
    fwToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (fwPanel.hidden) openFwPanel(); else closeFwPanel();
    });
    fwPanel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeFwPanel);
    });
  }

  /* ---------- Contact form -> WhatsApp ---------- */
  var contactForm = $('contact-form');
  if (contactForm) {
    var nameInput = $('cf-name');
    var contactInput = $('cf-contact');
    var messageInput = $('cf-message');
    var formStatus = $('form-status');
    var formStatusLink = $('form-status-link');

    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    var looksLikePhone = function (v) { return v.replace(/\D/g, '').length >= 7; };

    var setError = function (input, message) {
      var errorEl = $(input.id + '-error');
      if (message) {
        input.setAttribute('aria-invalid', 'true');
        if (errorEl) errorEl.textContent = message;
        return false;
      }
      input.removeAttribute('aria-invalid');
      if (errorEl) errorEl.textContent = '';
      return true;
    };
    var validateName = function () {
      return setError(nameInput, nameInput.value.trim() ? '' : 'Please enter your name.');
    };
    var validateContact = function () {
      var v = contactInput.value.trim();
      if (!v) return setError(contactInput, 'Please enter a phone number or email.');
      if (!EMAIL_RE.test(v) && !looksLikePhone(v)) {
        return setError(contactInput, 'Please enter a valid phone number (at least 7 digits) or email address.');
      }
      return setError(contactInput, '');
    };
    var validateMessage = function () {
      return setError(messageInput, messageInput.value.trim() ? '' : 'Please enter a short message.');
    };

    // Clear an error as soon as the visitor fixes it
    [[nameInput, validateName], [contactInput, validateContact], [messageInput, validateMessage]].forEach(function (pair) {
      pair[0].addEventListener('input', function () {
        if (pair[0].getAttribute('aria-invalid') === 'true') pair[1]();
      });
    });

    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var okName = validateName();
      var okContact = validateContact();
      var okMessage = validateMessage();

      if (!okName || !okContact || !okMessage) {
        // Move focus to the first problem so keyboard/screen-reader users hear it
        var firstInvalid = contactForm.querySelector('[aria-invalid="true"]');
        if (firstInvalid) firstInvalid.focus();
        if (formStatus) formStatus.hidden = true;
        return;
      }

      var text = 'Hello LKJ Compassionate Hanz.\n' +
        'Name: ' + nameInput.value.trim() + '\n' +
        'Contact: ' + contactInput.value.trim() + '\n' +
        'Message: ' + messageInput.value.trim();
      var url = waLink(WA_PRIMARY, text);

      window.open(url, '_blank', 'noopener,noreferrer');

      // Keep what they typed (in case WhatsApp didn't open) and offer a manual link
      if (formStatus && formStatusLink) {
        formStatusLink.href = url;
        formStatus.hidden = false;
      }
    });
  }

  /* ---------- Copyright year ---------- */
  var yearEl = $('copyright-year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Reveal on scroll ---------- */
  var revealEls = doc.querySelectorAll('.reveal');
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
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { observer.observe(el); });
  }

})();
