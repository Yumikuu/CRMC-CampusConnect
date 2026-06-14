// ═══════════════════════════════════════════════════════════════
// ADMIN LOGIN — Authentication & Role Detection
// ═══════════════════════════════════════════════════════════════

// Debug: Check if supabase is loaded
console.log('Login.js loaded');
console.log('Supabase client available:', typeof supabase !== 'undefined');
console.log('Supabase auth available:', typeof supabase !== 'undefined' && supabase && supabase.auth);

if (typeof supabase === 'undefined') {
  console.error('❌ Supabase client not available in login.js!');
  alert('System error: Supabase not loaded. Please refresh the page.');
}

// Check if already logged in as admin
checkExistingSession();

// Toggle password visibility
document.getElementById('togglePassword').addEventListener('click', function() {
  const passwordInput = document.getElementById('password');
  const icon = this.querySelector('i');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    passwordInput.type = 'password';
    icon.classList.remove('fa-eye-slash');
    icon.classList.add('fa-eye');
  }
});

// Handle login form submission
document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const loginBtn = document.getElementById('loginBtn');
  const btnText = loginBtn.querySelector('.btn-text');
  
  // Disable button and show loading
  loginBtn.disabled = true;
  btnText.textContent = 'Authenticating...';
  
  try {
    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (authError) throw authError;
    
    // Check if user has admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('admin_role, first_name, last_name, department')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) throw profileError;
    
    // Validate admin role
    if (!profile.admin_role || profile.admin_role === 'student') {
      // Not an admin account
      showAlert('error', 'Access Denied: This account does not have administrator privileges.');
      
      // Sign out the user
      await supabase.auth.signOut();
      
      loginBtn.disabled = false;
      btnText.textContent = 'Login to Dashboard';
      return;
    }
    
    // Success - redirect based on role
    showAlert('success', `Welcome back, ${profile.first_name}! Redirecting to dashboard...`);
    
    setTimeout(() => {
      if (profile.admin_role === 'SSG') {
        window.location.href = 'main-dashboard.html';
      } else if (profile.admin_role === 'SSG_OFFICER') {
        window.location.href = 'ssg-officer-dashboard.html';
      } else {
        window.location.href = 'dept-dashboard.html';
      }
    }, 1000);
    
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      fullError: error
    });
    
    let errorMessage = 'Login failed. Please try again.';
    
    if (error.message.includes('Invalid login credentials')) {
      errorMessage = 'Invalid email or password. Please try again.';
    } else if (error.message.includes('Email not confirmed')) {
      errorMessage = 'Please verify your email address before logging in.';
    } else {
      // Show actual error for debugging
      errorMessage = `Login failed: ${error.message}`;
    }
    
    showAlert('error', errorMessage);
    
    loginBtn.disabled = false;
    btnText.textContent = 'Login to Dashboard';
  }
});

// Check if user is already logged in
async function checkExistingSession() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    // User is logged in, check their role
    const { data: profile } = await supabase
      .from('profiles')
      .select('admin_role')
      .eq('id', session.user.id)
      .single();
    
    if (profile && profile.admin_role && profile.admin_role !== 'student') {
      // Already logged in as admin, redirect to dashboard
      if (profile.admin_role === 'SSG') {
        window.location.href = 'main-dashboard.html';
      } else if (profile.admin_role === 'SSG_OFFICER') {
        window.location.href = 'ssg-officer-dashboard.html';
      } else {
        window.location.href = 'dept-dashboard.html';
      }
    }
  }
}

// Show alert message
function showAlert(type, message) {
  const alertBox = document.getElementById('alertBox');
  alertBox.className = `alert ${type}`;
  alertBox.textContent = message;
  alertBox.style.display = 'block';
  
  // Auto-hide after 5 seconds for error messages
  if (type === 'error') {
    setTimeout(() => {
      alertBox.style.display = 'none';
    }, 5000);
  }
}

// Clear alert when typing
document.getElementById('email').addEventListener('input', () => {
  document.getElementById('alertBox').style.display = 'none';
});

document.getElementById('password').addEventListener('input', () => {
  document.getElementById('alertBox').style.display = 'none';
});
