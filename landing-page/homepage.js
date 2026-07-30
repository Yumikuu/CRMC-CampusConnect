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
  document.getElementById('heroGetStarted')?.addEventListener('click', e => { e.preventDefault(); openModal(registerModal); });
  document.getElementById('ctaCreateAccount')?.addEventListener('click', e => { e.preventDefault(); openModal(registerModal); });

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

  // ── HELPER: show inline error inside a modal ──
  function showFormError(formEl, message) {
    let err = formEl.querySelector('.form-error-msg');
    if (!err) {
      err = document.createElement('p');
      err.className = 'form-error-msg';
      err.style.cssText = 'color:#dc2626;font-size:.82rem;margin:.5rem 0 0;text-align:center;';
      formEl.prepend(err);
    }
    err.textContent = message;
    err.hidden = false;
  }

  function clearFormError(formEl) {
    const err = formEl.querySelector('.form-error-msg');
    if (err) err.hidden = true;
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.textContent = loading ? 'Please wait…' : btn.dataset.label;
  }

  // Save the original button labels
  document.querySelectorAll('.modal-form .btn-primary').forEach(btn => {
    btn.dataset.label = btn.textContent;
  });

  // ── DEPARTMENT → community slug map ──
  const DEPT_COMMUNITY = {
    'College of Business Education (CBE)':              'cbe',
    'College of Criminal Justice Education (CCJE)':     'ccje',
    'College of Computer Studies (CSS)':                'css',
    'College of Teacher Education (CTE)':               'cte',
    'Psychology (PSYCH)':                               'psych',
  };

  // ── Helper: generate internal email from student ID ──
  // No longer needed — we use real Gmail now

  // ── REGISTER: Step 1 — Verify student ID against master list ──
  let verifiedStudent = null; // holds the master list record after verification

  document.getElementById('regVerifyBtn').addEventListener('click', async () => {
    const form = document.getElementById('registerForm');
    const btn = document.getElementById('regVerifyBtn');
    clearFormError(form);

    const studentId = document.getElementById('regStudentId').value.trim();
    if (!studentId) {
      return showFormError(form, 'Please enter your Student ID.');
    }

    btn.disabled = true;
    btn.textContent = 'Verifying…';

    try {
      // Look up the student ID in the master list table
      const { data, error } = await db
        .from('students_master')
        .select('student_id, first_name, last_name, department')
        .eq('student_id', studentId)
        .single();

      if (error || !data) {
        throw new Error('Student ID not found in the master list. Please check your ID or contact your department admin.');
      }

      // Check if this student already has an account
      const { data: existingProfile } = await db
        .from('profiles')
        .select('id')
        .eq('student_id', studentId)
        .single();

      if (existingProfile) {
        throw new Error('An account already exists for this Student ID. Please log in instead.');
      }

      // Success — store the verified student data and show password fields
      verifiedStudent = data;
      document.getElementById('regAutoName').textContent = `${data.first_name} ${data.last_name}`;
      document.getElementById('regAutoDept').textContent = data.department;
      document.getElementById('regAutoFillInfo').style.display = 'block';
      document.getElementById('regPasswordSection').style.display = 'block';
      document.getElementById('regStudentId').readOnly = true;
      btn.style.display = 'none'; // hide verify button, show password section

    } catch (err) {
      console.error('Verification error:', err);
      showFormError(form, err.message || 'Verification failed. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Verify Student ID';
    }
  });

  // ── REGISTER: Step 2 — Create account after verification ──
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!verifiedStudent) return; // shouldn't happen, but guard

    const form = e.target;
    const submitBtn = form.querySelector('#regPasswordSection .btn-primary');
    clearFormError(form);

    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regPasswordConfirm').value;
    const agreed = form.querySelector('input[type="checkbox"]').checked;

    if (!password || !confirmPassword) {
      return showFormError(form, 'Please fill in both password fields.');
    }
    if (password.length < 6) {
      return showFormError(form, 'Password must be at least 6 characters.');
    }
    if (password !== confirmPassword) {
      return showFormError(form, 'Passwords do not match.');
    }
    if (!agreed) {
      return showFormError(form, 'You must agree to the Terms of Service.');
    }

    setLoading(submitBtn, true);

    try {
      // Generate internal email from student ID
      const email = `${verifiedStudent.student_id.replace(/\s+/g, '')}@crmc.student.local`;

      // Create auth user
      const { data: authData, error: authError } = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            student_id: verifiedStudent.student_id,
            first_name: verifiedStudent.first_name,
            last_name:  verifiedStudent.last_name,
            department: verifiedStudent.department,
          }
        }
      });

      if (authError) throw authError;

      // Auto-approve since student ID was validated against master list
      const userId = authData.user?.id;
      if (userId) {
        await db.from('profiles').update({ account_status: 'approved' }).eq('id', userId);
      }

      // Wait briefly for session to be established, then redirect
      await new Promise(resolve => setTimeout(resolve, 800));
      window.location.href = `../campusfeed.html`;

    } catch (err) {
      console.error('Registration error:', err);
      showFormError(form, err.message || 'Registration failed. Please try again.');
      setLoading(submitBtn, false);
    }
  });

  // ── LOGIN ──
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form      = e.target;
    const submitBtn = form.querySelector('.btn-primary');
    clearFormError(form);

    const input    = document.getElementById('loginStudentId').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!input || !password) {
      return showFormError(form, 'Please enter your Student ID/email and password.');
    }

    setLoading(submitBtn, true);

    try {
      // Determine if they typed an email or student ID
      let email = input;
      if (!input.includes('@')) {
        // It's a student ID — convert to internal email
        email = `${input.replace(/\s+/g, '')}@crmc.student.local`;
      }

      const { data: authData, error: authError } = await db.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login') || authError.message.includes('invalid')) {
          throw new Error('Invalid email/Student ID or password. Please try again.');
        }
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the verification link first.');
        }
        throw authError;
      }

      // Fetch their profile to get department and admin status
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('department, admin_role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      // Check if this is an admin account
      if (profile.admin_role && profile.admin_role !== 'student') {
        await db.auth.signOut();
        throw new Error('Please use the admin portal to login. Admins cannot access the student portal.');
      }

      // Redirect to student feed
      window.location.href = `../campusfeed.html`;

    } catch (err) {
      console.error('Login error:', err);
      showFormError(form, err.message || 'Login failed. Please check your credentials.');
      setLoading(submitBtn, false);
    }
  });

})();
