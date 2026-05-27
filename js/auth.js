// ============================================================
//  DROPFLOW — AUTH.JS
// ============================================================

function setLoading(btnId, state) {
  const btn  = document.getElementById(btnId);
  const text = btn.querySelector('.btn-text');
  const spin = btn.querySelector('.btn-loader');
  btn.disabled = state;
  text.classList.toggle('hidden', state);
  spin.classList.toggle('hidden', !state);
}
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
}
function hideError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}
function switchCard(target) {
  document.getElementById('loginCard').classList.toggle('hidden', target !== 'login');
  document.getElementById('registerCard').classList.toggle('hidden', target !== 'register');
  hideError('loginError');
  hideError('registerError');
  // Limpiar campos al cambiar de tarjeta
  if (target === 'login') {
    document.getElementById('loginEmail').value    = '';
    document.getElementById('loginPassword').value = '';
  } else {
    document.getElementById('registerForm').reset();
  }
}
function togglePassword(inputId, btn) {
  const inp = document.getElementById(inputId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.style.opacity = inp.type === 'text' ? '1' : '0.5';
}

// Limpiar datos al cargar la página de login
window.addEventListener('load', () => {
  sessionStorage.clear();
  localStorage.clear();
  document.getElementById('loginEmail').value    = '';
  document.getElementById('loginPassword').value = '';
});

(async function checkSession() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) window.location.replace('dashboard.html');
  } catch (e) { console.warn('Session check error:', e.message); }
})();

async function handleLogin(e) {
  e.preventDefault();
  hideError('loginError');
  setLoading('loginBtn', true);
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    window.location.replace('dashboard.html');
  } catch (err) {
    let msg = 'Error al iniciar sesión.';
    if (err.message.includes('Invalid login'))       msg = 'Correo o contraseña incorrectos.';
    if (err.message.includes('Email not confirmed')) msg = 'Debes confirmar tu correo antes de iniciar sesión.';
    showError('loginError', msg);
    setLoading('loginBtn', false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  hideError('registerError');
  setLoading('registerBtn', true);
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const role     = document.getElementById('regRole').value;
  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email, password,
      options: { data: { full_name: name, role } }
    });
    if (error) throw error;
    if (data.user) {
      await supabaseClient.from('profiles').upsert({ id: data.user.id, full_name: name, email, role });
    }
    const errEl = document.getElementById('registerError');
    errEl.textContent   = '✓ Cuenta creada exitosamente. Redirigiendo al login...';
    errEl.style.background  = 'rgba(0,229,160,0.1)';
    errEl.style.borderColor = 'rgba(0,229,160,0.3)';
    errEl.style.color       = 'var(--accent)';
    errEl.classList.remove('hidden');
    document.getElementById('registerForm').reset();
    setTimeout(() => switchCard('login'), 2000);
  } catch (err) {
    let msg = 'Error al crear la cuenta.';
    if (err.message.includes('already registered')) msg = 'Este correo ya está registrado.';
    if (err.message.includes('password'))           msg = 'La contraseña debe tener al menos 6 caracteres.';
    showError('registerError', msg);
  } finally {
    setLoading('registerBtn', false);
  }
}
