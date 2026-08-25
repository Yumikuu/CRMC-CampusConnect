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
  const googleLinkModal = document.getElementById('googleLinkModal');

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
    [loginModal, registerModal, googleLinkModal].forEach(m => closeModal(m));
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
  [loginModal, registerModal, googleLinkModal].forEach(modal => {
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

  document.querySelectorAll('.modal-form .btn-primary, .btn-google').forEach(btn => {
    btn.dataset.label = btn.textContent.trim();
  });

  // ── DEPARTMENT → community slug map ──
  const DEPT_COMMUNITY = {
    'College of Business Education (CBE)':              'cbe',
    'College of Criminal Justice Education (CCJE)':     'ccje',
    'College of Computer Studies (CSS)':                'css',
    'College of Teacher Education (CTE)':               'cte',
    'Psychology (PSYCH)':                               'psych',
  };

  // ════════════════════════════════════════════════════════
  // GOOGLE OAUTH
  // ════════════════════════════════════════════════════════

  async function signInWithGoogle() {
    try {
      const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Google sign-in error:', err);
      alert('Could not start Google sign-in. Please try again.');
    }
  }

  document.getElementById('loginWithGoogle').addEventListener('click', signInWithGoogle);
  document.getElementById('registerWithGoogle').addEventListener('click', signInWithGoogle);

  // ── Handle OAuth redirect callback ──
  // Supabase puts the session in the URL hash after OAuth — we pick it up here
  async function handleOAuthCallback() {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return; // not coming from OAuth

    // Check if this Google user already has a linked profile
    const { data: profile } = await db
      .from('profiles')
      .select('id, account_status, admin_role')
      .eq('id', session.user.id)
      .single();

    if (profile) {
      // Existing user — block admins from student portal
      if (profile.admin_role && profile.admin_role !== 'student') {
        await db.auth.signOut();
        openModal(loginModal);
        showFormError(document.getElementById('loginForm'), 'Please use the admin portal to login.');
        return;
      }
      // All good — redirect to feed
      window.location.href = '../campusfeed.html';
      return;
    }

    // New Google user — needs to link their student ID
    openModal(googleLinkModal);
    const emailEl = document.getElementById('googleLinkEmail');
    if (emailEl) {
      emailEl.textContent = session.user.email || session.user.user_metadata?.email || '';
      document.getElementById('googleLinkUserInfo').style.display = 'block';
    }
  }

  // Run callback handler on page load
  handleOAuthCallback();

  // ── Google Link Modal: verify student ID then create profile ──
  let googleVerifiedStudent = null;

  document.getElementById('googleLinkStudentId').addEventListener('blur', async () => {
    const studentId = document.getElementById('googleLinkStudentId').value.trim();
    if (!studentId) return;

    const { data, error } = await db
      .from('students_master')
      .select('student_id, first_name, last_name, department')
      .eq('student_id', studentId)
      .single();

    if (!error && data) {
      googleVerifiedStudent = data;
      document.getElementById('googleLinkAutoName').textContent = `${data.first_name} ${data.last_name}`;
      document.getElementById('googleLinkAutoDept').textContent = data.department;
      document.getElementById('googleLinkAutoFill').style.display = 'block';
    } else {
      googleVerifiedStudent = null;
      document.getElementById('googleLinkAutoFill').style.display = 'none';
    }
  });

  document.getElementById('googleLinkForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = document.getElementById('googleLinkSubmit');
    clearFormError(form);

    const studentId = document.getElementById('googleLinkStudentId').value.trim();
    const agreed = document.getElementById('googleLinkAgree').checked;

    if (!studentId) return showFormError(form, 'Please enter your Student ID.');
    if (!agreed) return showFormError(form, 'You must agree to the Terms of Service.');

    setLoading(submitBtn, true, 'Linking…');

    try {
      const { data: { session } } = await db.auth.getSession();
      if (!session) throw new Error('Session expired. Please try signing in again.');

      // Verify student ID against master list
      const { data: masterData, error: masterError } = await db
        .from('students_master')
        .select('student_id, first_name, last_name, department')
        .eq('student_id', studentId)
        .single();

      if (masterError || !masterData) {
        throw new Error('Student ID not found in the master list. Please check your ID or contact your department admin.');
      }

      // Check if this student ID is already taken by another account
      const { data: existingProfile } = await db
        .from('profiles')
        .select('id')
        .eq('student_id', studentId)
        .single();

      if (existingProfile) {
        throw new Error('This Student ID is already linked to another account. Please contact your admin.');
      }

      // Create/update the profile for this Google user with student data
      const { error: upsertError } = await db
        .from('profiles')
        .upsert({
          id:             session.user.id,
          student_id:     masterData.student_id,
          first_name:     masterData.first_name,
          last_name:      masterData.last_name,
          department:     masterData.department,
          account_status: 'approved',
          admin_role:     'student',
        }, { onConflict: 'id' });

      if (upsertError) throw upsertError;

      window.location.href = '../campusfeed.html';

    } catch (err) {
      console.error('Google link error:', err);
      showFormError(form, err.message || 'Linking failed. Please try again.');
      setLoading(submitBtn, false);
    }
  });

  // ════════════════════════════════════════════════════════
  // STUDENT ID REGISTRATION (existing flow)
  // ════════════════════════════════════════════════════════

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

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!verifiedStudent) return;

    const form = e.target;
    const submitBtn = form.querySelector('#regPasswordSection .btn-primary');
    clearFormError(form);

    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regPasswordConfirm').value;
    const agreed = form.querySelector('input[type="checkbox"]').checked;

    if (!password || !confirmPassword) return showFormError(form, 'Please fill in both password fields.');
    if (password.length < 6) return showFormError(form, 'Password must be at least 6 characters.');
    if (password !== confirmPassword) return showFormError(form, 'Passwords do not match.');
    if (!agreed) return showFormError(form, 'You must agree to the Terms of Service.');

    setLoading(submitBtn, true);

    try {
      const email = `${verifiedStudent.student_id.replace(/\s+/g, '')}@crmc.student.local`;

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

      const userId = authData.user?.id;
      if (userId) {
        await db.from('profiles').update({ account_status: 'approved' }).eq('id', userId);
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      window.location.href = '../campusfeed.html';

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

    if (!input || !password) return showFormError(form, 'Please enter your Student ID/email and password.');

    setLoading(submitBtn, true);

    try {
      let email = input;
      if (!input.includes('@')) {
        email = `${input.replace(/\s+/g, '')}@crmc.student.local`;
      }

      const { data: authData, error: authError } = await db.auth.signInWithPassword({ email, password });

      if (authError) {
        if (authError.message.includes('Invalid login') || authError.message.includes('invalid')) {
          throw new Error('Invalid Student ID or password. Please try again.');
        }
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the verification link first.');
        }
        throw authError;
      }

      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('department, admin_role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.admin_role && profile.admin_role !== 'student') {
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
