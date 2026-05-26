// ── SCROLL-TRIGGERED FADE-UP ANIMATIONS ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ── STICKY NAVBAR SHADOW ON SCROLL ──
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
  navbar.style.boxShadow = window.scrollY > 10
    ? '0 4px 30px rgba(107,15,26,.12)'
    : '0 2px 20px rgba(107,15,26,.06)';
});

// ── SCROLL SPY — active nav link ──
const sections = document.querySelectorAll('section[id]');
const navItems = document.querySelectorAll('.nav-links a[href^="#"]');

function updateActiveNav() {
  const scrollY = window.scrollY + 100; // offset for sticky navbar height

  // default to "Home" when at the very top
  if (scrollY < 200) {
    navItems.forEach(a => a.classList.remove('active'));
    const homeLink = document.querySelector('.nav-links a[href="#"]');
    if (homeLink) homeLink.classList.add('active');
    return;
  }

  let current = '';
  sections.forEach(section => {
    if (scrollY >= section.offsetTop) {
      current = section.getAttribute('id');
    }
  });

  navItems.forEach(a => {
    a.classList.remove('active');
    const href = a.getAttribute('href');
    if (href === '#' + current || (current === '' && href === '#')) {
      a.classList.add('active');
    }
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });
updateActiveNav();

// ── HAMBURGER TOGGLE (MOBILE) ──
const hamburger = document.querySelector('.hamburger');
const mobileDrawer = document.getElementById('mobileDrawer');

hamburger.addEventListener('click', () => {
  const expanded = hamburger.getAttribute('aria-expanded') === 'true';
  hamburger.setAttribute('aria-expanded', String(!expanded));
  mobileDrawer.classList.toggle('open');
  mobileDrawer.setAttribute('aria-hidden', String(expanded));
});

// Close drawer when a nav link is clicked
mobileDrawer.querySelectorAll('.mobile-nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.setAttribute('aria-expanded', 'false');
    mobileDrawer.classList.remove('open');
    mobileDrawer.setAttribute('aria-hidden', 'true');
  });
});

// Wire mobile Login / Register to modals
mobileDrawer.querySelector('.mobile-login').addEventListener('click', e => {
  e.preventDefault();
  hamburger.setAttribute('aria-expanded', 'false');
  mobileDrawer.classList.remove('open');
  document.getElementById('loginModal').hidden = false;
  document.body.style.overflow = 'hidden';
});

mobileDrawer.querySelector('.mobile-register').addEventListener('click', e => {
  e.preventDefault();
  hamburger.setAttribute('aria-expanded', 'false');
  mobileDrawer.classList.remove('open');
  document.getElementById('registerModal').hidden = false;
  document.body.style.overflow = 'hidden';
});


// ── MODALS ──
(function () {
  const loginModal    = document.getElementById('loginModal');
  const registerModal = document.getElementById('registerModal');

  function openModal(modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('input, select').focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  // Open triggers
  document.getElementById('openLogin').addEventListener('click', e => { e.preventDefault(); openModal(loginModal); });
  document.getElementById('openRegister').addEventListener('click', e => { e.preventDefault(); openModal(registerModal); });

  // Switch links
  document.getElementById('switchToRegister').addEventListener('click', e => { e.preventDefault(); closeModal(loginModal); openModal(registerModal); });
  document.getElementById('switchToLogin').addEventListener('click', e => { e.preventDefault(); closeModal(registerModal); openModal(loginModal); });

  // Close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      closeModal(loginModal);
      closeModal(registerModal);
    });
  });

  // Click outside to close
  [loginModal, registerModal].forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(loginModal); closeModal(registerModal); }
  });

  // Show/hide password toggle
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.querySelector('i').className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    });
  });
})();
