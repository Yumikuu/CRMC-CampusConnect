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

  // ── REGISTER ──
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form     = e.target;
    const submitBtn = form.querySelector('.btn-primary');
    clearFormError(form);

    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName  = document.getElementById('regLastName').value.trim();
    const studentId = document.getElementById('regStudentId').value.trim();
    const email     = document.getElementById('regEmail').value.trim();
    const password  = document.getElementById('regPassword').value;
    const dept      = document.getElementById('regDept').value;
    const agreed    = form.querySelector('input[type="checkbox"]').checked;

    // Basic validation
    if (!firstName || !lastName || !studentId || !email || !password || !dept) {
      return showFormError(form, 'Please fill in all fields.');
    }
    if (!agreed) {
      return showFormError(form, 'You must agree to the Terms of Service.');
    }
    if (password.length < 6) {
      return showFormError(form, 'Password must be at least 6 characters.');
    }

    setLoading(submitBtn, true);

    try {
      // 1. Create auth user — pass student info as metadata so the DB trigger can use it
      const { data: authData, error: authError } = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            student_id: studentId,
            first_name: firstName,
            last_name:  lastName,
            department: dept,
          }
        }
      });

      if (authError) throw authError;
      // Profile is created automatically by the DB trigger (handle_new_user)

      // Wait briefly for the session to be established, then redirect
      await new Promise(resolve => setTimeout(resolve, 800));

      // 3. Redirect to campusfeed with their department community active
      const deptSlug = DEPT_COMMUNITY[dept] || 'general';
      window.location.href = `../campusfeed.html?dept=${deptSlug}`;

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

    const emailOrId  = document.getElementById('loginEmail').value.trim();
    const password   = document.getElementById('loginPassword').value;

    if (!emailOrId || !password) {
      return showFormError(form, 'Please enter your email/ID and password.');
    }

    setLoading(submitBtn, true);

    try {
      // Supabase Auth requires an email — if they typed a student ID, look up the email first
      let email = emailOrId;
      if (!emailOrId.includes('@')) {
        const { data: profileData, error: lookupError } = await db
          .from('profiles')
          .select('email')
          .eq('student_id', emailOrId)
          .single();

        if (lookupError || !profileData) {
          throw new Error('Student ID not found. Please use your email address.');
        }
        email = profileData.email;
      }

      const { data: authData, error: authError } = await db.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // Fetch their profile to get department and admin status
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('department, admin_role')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      // Check if this is an admin account
      if (profile.admin_role && profile.admin_role !== 'student') {
        // This is an admin account - redirect to admin portal
        await db.auth.signOut();
        throw new Error('Please use the admin portal to login. Admins cannot access the student portal.');
      }

      // Wait briefly for session to persist, then redirect
      await new Promise(resolve => setTimeout(resolve, 400));

      // Redirect to student feed
      const deptSlug = DEPT_COMMUNITY[profile.department] || 'general';
      window.location.href = `../campusfeed.html?dept=${deptSlug}`;

    } catch (err) {
      console.error('Login error:', err);
      showFormError(form, err.message || 'Login failed. Please check your credentials.');
      setLoading(submitBtn, false);
    }
  });

  // ── FORGOT PASSWORD ──
  const forgotModal = document.getElementById('forgotPasswordModal');

  // Open forgot password modal
  document.getElementById('openForgotPassword').addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(loginModal);
    openModal(forgotModal);
  });

  // Back to login
  document.getElementById('backToLogin').addEventListener('click', (e) => {
    e.preventDefault();
    closeModal(forgotModal);
    openModal(loginModal);
  });

  // Close forgot modal with X button
  forgotModal.querySelector('.modal-close').addEventListener('click', () => {
    closeModal(forgotModal);
  });

  // Close on overlay click
  forgotModal.addEventListener('click', (e) => {
    if (e.target === forgotModal) closeModal(forgotModal);
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal(forgotModal);
  });

  // Handle forgot password form submit
  document.getElementById('forgotPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('.btn-primary');
    clearFormError(form);

    const email = document.getElementById('forgotEmail').value.trim();

    if (!email) {
      return showFormError(form, 'Please enter your email address.');
    }

    if (!email.includes('@')) {
      return showFormError(form, 'Please enter a valid email address (not student ID).');
    }

    setLoading(submitBtn, true);

    try {
      // Build the reset page URL based on current location
      const currentPath = window.location.pathname;
      const basePath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      const resetUrl = window.location.origin + basePath + '/reset-password.html';

      const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: resetUrl,
      });

      if (error) throw error;

      // Show success message
      form.innerHTML = `
        <div style="text-align:center;padding:1rem 0;">
          <div style="width:56px;height:56px;border-radius:50%;background:rgba(34,197,94,.1);display:flex;align-items:center;justify-content:center;margin:0 auto .75rem;font-size:1.3rem;color:#16a34a;">
            <i class="fas fa-check-circle"></i>
          </div>
          <h3 style="font-size:1rem;font-weight:700;margin-bottom:.5rem;color:#1f2937;">Check your email</h3>
          <p style="font-size:.82rem;color:#6b7280;line-height:1.5;">
            We sent a password reset link to <strong>${email}</strong>. Click the link in your email to set a new password.
          </p>
          <p style="font-size:.75rem;color:#9ca3af;margin-top:.75rem;">
            Didn't receive it? Check your spam folder or try again.
          </p>
        </div>
      `;

    } catch (err) {
      console.error('Reset password error:', err);
      showFormError(form, err.message || 'Failed to send reset link. Please try again.');
      setLoading(submitBtn, false);
    }
  });

})();
