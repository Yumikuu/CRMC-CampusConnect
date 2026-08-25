// ── AUTO-REDIRECT after email confirmation ──
// When a user clicks the verification link in their Gmail, Supabase redirects
// them back here with a session in the URL hash. Detect it and send to feed.
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    // Has a valid session — check they're a student (not admin)
    const { data: profile } = await db
      .from('profiles')
      .select('admin_role')
      .eq('id', session.user.id)
      .single();

    if (!profile?.admin_role || profile.admin_role === 'student') {
      window.location.href = '../campusfeed.html';
      return;
    }
  }
})();

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
  const scrollY = window.scrollY + 100;
  if (scrollY < 200) {
    navItems.forEach(a => a.classList.remove('active'));
    const homeLink = document.querySelector('.nav-links a[href="#"]');
    if (homeLink) homeLink.classList.add('active');
    return;
  }
  let current = '';
  sections.forEach(section => {
    if (scrollY >= section.offsetTop) current = section.getAttribute('id');
  });
  navItems.forEach(a => {
    a.classList.remove('active');
    const href = a.getAttribute('href');
    if (href === '#' + current || (current === '' && href === '#')) a.classList.add('active');
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

mobileDrawer.querySelectorAll('.mobile-nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.setAttribute('aria-expanded', 'false');
    mobileDrawer.classList.remove('open');
    mobileDrawer.setAttribute('aria-hidden', 'true');
  });
});

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
  const loginModal      = document.getElementById('loginModal');
  const registerModal   = document.getElementById('registerModal');

  function openModal(modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    const first = modal.querySelector('input, select, button:not(.modal-close)');
    if (first) first.focus();
  }

  function closeModal(modal) {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  function closeAllModals() {
    [loginModal, registerModal].forEach(m => closeModal(m));
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
    btn.addEventListener('click', closeAllModals);
  });

  // Click outside to close
  [loginModal, registerModal].forEach(modal => {
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal); });
  });

  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
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

  function setLoading(btn, loading, loadingText = 'Please wait…') {
    btn.disabled = loading;
    btn.textContent = loading ? loadingText : btn.dataset.label;
  }

  document.querySelectorAll('.modal-form .btn-primary').forEach(btn => {
    btn.dataset.label = btn.textContent.trim();
  });

  // ── DEPARTMENT → community slug map ──
  const DEPT_COMMUNITY = {
    'College of Business Education (CBE)':              'cbe',
    'College of Criminal Justice Education (CCJE)':     'ccje',
    'College of Computer Studies (CCS)':                'css',
    'College of Teacher Education (CTE)':               'cte',
    'Psychology (PSYCH)':                               'psych',
  };

  // ── REGISTER: Step 1 — Verify student ID against master list ──
  let verifiedStudent = null;

  document.getElementById('regVerifyBtn').addEventListener('click', async () => {
    const form = document.getElementById('registerForm');
    const btn = document.getElementById('regVerifyBtn');
    clearFormError(form);

    const studentId = document.getElementById('regStudentId').value.trim();
    if (!studentId) return showFormError(form, 'Please enter your Student ID.');

    btn.disabled = true;
    btn.textContent = 'Verifying…';

    try {
      const { data, error } = await db
        .from('students_master')
        .select('student_id, first_name, last_name, department')
        .eq('student_id', studentId)
        .single();

      if (error || !data) {
        throw new Error('Student ID not found in the master list. Please check your ID or contact your department admin.');
      }

      const { data: existingProfile } = await db
        .from('profiles')
        .select('id')
        .eq('student_id', studentId)
        .single();

      if (existingProfile) {
        throw new Error('An account already exists for this Student ID. Please log in instead.');
      }

      verifiedStudent = data;
      document.getElementById('regAutoName').textContent = `${data.first_name} ${data.last_name}`;
      document.getElementById('regAutoDept').textContent = data.department;
      document.getElementById('regAutoFillInfo').style.display = 'block';
      document.getElementById('regPasswordSection').style.display = 'block';
      document.getElementById('regStudentId').readOnly = true;
      btn.style.display = 'none';

    } catch (err) {
      console.error('Verification error:', err);
      showFormError(form, err.message || 'Verification failed. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Verify Student ID';
    }
  });

  // ── REGISTER: Step 2 — Create account with Gmail + password ──
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!verifiedStudent) return;

    const form = e.target;
    const submitBtn = form.querySelector('#regPasswordSection .btn-primary');
    clearFormError(form);

    const gmail   = document.getElementById('regGmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regPasswordConfirm').value;
    const agreed = form.querySelector('input[type="checkbox"]').checked;

    if (!gmail) return showFormError(form, 'Please enter your Gmail address.');
    if (!gmail.endsWith('@gmail.com')) return showFormError(form, 'Please enter a valid Gmail address (must end in @gmail.com).');
    if (!password || !confirmPassword) return showFormError(form, 'Please fill in both password fields.');
    if (password.length < 6) return showFormError(form, 'Password must be at least 6 characters.');
    if (password !== confirmPassword) return showFormError(form, 'Passwords do not match.');
    if (!agreed) return showFormError(form, 'You must agree to the Terms of Service.');

    setLoading(submitBtn, true);

    try {
      // Check if this Gmail is already registered
      const { data: existingGmail } = await db
        .from('profiles')
        .select('id')
        .eq('email', gmail)
        .single();

      if (existingGmail) {
        throw new Error('This Gmail is already linked to another account. Please use a different Gmail or log in.');
      }

      // Create auth user with their real Gmail — Supabase will send a verification email
      const { data: authData, error: authError } = await db.auth.signUp({
        email: gmail,
        password,
        options: {
          emailRedirectTo: window.location.href.split('?')[0].split('#')[0],
          data: {
            student_id: verifiedStudent.student_id,
            first_name: verifiedStudent.first_name,
            last_name:  verifiedStudent.last_name,
            department: verifiedStudent.department,
          }
        }
      });

      if (authError) throw authError;

      // Auto-approve the profile since student ID was validated
      const userId = authData.user?.id;
      if (userId) {
        await db.from('profiles').upsert({
          id:             userId,
          student_id:     verifiedStudent.student_id,
          first_name:     verifiedStudent.first_name,
          last_name:      verifiedStudent.last_name,
          department:     verifiedStudent.department,
          email:          gmail,
          account_status: 'approved',
          admin_role:     'student',
        }, { onConflict: 'id' });
      }

      // Show success — ask them to check Gmail
      setLoading(submitBtn, false);
      submitBtn.textContent = '✓ Check your Gmail!';
      submitBtn.style.background = '#16a34a';
      submitBtn.disabled = true;

      const form = document.getElementById('registerForm');
      let successMsg = form.querySelector('.reg-success-msg');
      if (!successMsg) {
        successMsg = document.createElement('p');
        successMsg.className = 'reg-success-msg';
        successMsg.style.cssText = 'color:#166534;font-size:.82rem;text-align:center;margin-top:.5rem;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:.75rem;';
        form.appendChild(successMsg);
      }
      successMsg.innerHTML = `<i class="fas fa-envelope"></i> A verification link was sent to <strong>${gmail}</strong>. Click it to activate your account, then log in.`;

    } catch (err) {
      console.error('Registration error:', err);
      showFormError(form, err.message || 'Registration failed. Please try again.');
      setLoading(submitBtn, false);
    }
  });

  // ── LOGIN — Student ID + password (Gmail used as internal email) ──
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form      = e.target;
    const submitBtn = form.querySelector('.btn-primary');
    clearFormError(form);

    const input    = document.getElementById('loginStudentId').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!input || !password) return showFormError(form, 'Please enter your Student ID and password.');

    setLoading(submitBtn, true);

    try {
      let email = input;

      if (!input.includes('@')) {
        // Student ID entered — look up their Gmail from profiles
        const { data: profileData, error: profileLookupErr } = await db
          .from('profiles')
          .select('email, admin_role')
          .eq('student_id', input)
          .single();

        if (profileLookupErr || !profileData) {
          throw new Error('Student ID not found. Please check your ID or register first.');
        }

        if (profileData.admin_role && profileData.admin_role !== 'student') {
          throw new Error('Please use the admin portal to login.');
        }

        if (!profileData.email) {
          throw new Error('No email linked to this account. Please contact your admin.');
        }

        email = profileData.email;
      }

      const { data: authData, error: authError } = await db.auth.signInWithPassword({ email, password });

      if (authError) {
        if (authError.message.includes('Invalid login') || authError.message.includes('invalid')) {
          throw new Error('Incorrect password. Please try again.');
        }
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please verify your Gmail first. Check your inbox for the verification link.');
        }
        throw authError;
      }

      // Double-check admin role after sign-in
      const { data: profile } = await db
        .from('profiles')
        .select('admin_role')
        .eq('id', authData.user.id)
        .single();

      if (profile?.admin_role && profile.admin_role !== 'student') {
        await db.auth.signOut();
        throw new Error('Please use the admin portal to login. Admins cannot access the student portal.');
      }

      window.location.href = '../campusfeed.html';

    } catch (err) {
      console.error('Login error:', err);
      showFormError(form, err.message || 'Login failed. Please check your credentials.');
      setLoading(submitBtn, false);
    }
  });

})();

