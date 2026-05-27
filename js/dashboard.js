// ============================================================
//  DROPFLOW — DASHBOARD.JS
// ============================================================

let currentPage    = 'dashboard';
let currentUser    = null;
let currentProfile = null;
let currentRole    = 'user';

(async function initDashboard() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.replace('index.html'); return; }

    currentUser = session.user;

    const { data: profile } = await supabaseClient
      .from('profiles').select('*').eq('id', currentUser.id).single();

    currentProfile = profile;
    currentRole    = profile?.role || 'user';

    renderUserInfo(profile || { full_name: currentUser.email, role: 'user' });
    applyRolePermissions(currentRole);

    await loadKPIs();
    await loadProducts();
    await loadSuppliers();
    await loadOrders();

    startLiveUpdates();
  } catch (err) {
    console.error('Dashboard init error:', err);
    window.location.replace('index.html');
  }
})();

function applyRolePermissions(role) {
  const isAdmin = role === 'admin';
  const usersNav = document.getElementById('nav-users');
  if (usersNav) usersNav.style.display = isAdmin ? 'flex' : 'none';
  const pageUsers = document.getElementById('page-users');
  if (pageUsers) pageUsers.style.display = isAdmin ? '' : 'none';
  const roleBadge = document.getElementById('roleBadge');
  if (roleBadge) {
    roleBadge.textContent = isAdmin ? 'Admin' : 'Vendedor';
    roleBadge.className   = isAdmin ? 'role-badge role-admin' : 'role-badge role-user';
  }
}

function renderUserInfo(profile) {
  const name   = profile.full_name || profile.email || 'Usuario';
  const role   = profile.role === 'admin' ? 'Administrador' : 'Vendedor';
  const letter = name.charAt(0).toUpperCase();
  document.getElementById('userName').textContent   = name;
  document.getElementById('userRole').textContent   = role;
  document.getElementById('userAvatar').textContent = letter;
}

async function handleLogout() {
  // Limpiar sessionStorage y localStorage
  sessionStorage.clear();
  localStorage.clear();
  await supabaseClient.auth.signOut();
  window.location.replace('index.html');
}

function navigateTo(page) {
  if (page === 'users' && currentRole !== 'admin') {
    showToast('Solo los administradores pueden acceder a esta sección', 'error');
    return;
  }
  document.getElementById('page-' + currentPage).classList.remove('active');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  currentPage = page;
  document.getElementById('page-' + page).classList.add('active');
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  const titles = { dashboard:'Dashboard', products:'Productos', suppliers:'Proveedores', orders:'Pedidos', users:'Usuarios' };
  document.getElementById('pageTitle').textContent = titles[page] || page;
  if (page === 'users' && currentRole === 'admin') loadUsers();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('mainContent').classList.toggle('collapsed');
}

async function loadKPIs() {
  try {
    const isAdmin = currentRole === 'admin';
    let prodQ = supabaseClient.from('products').select('*', { count: 'exact', head: true });
    let supQ  = supabaseClient.from('suppliers').select('*', { count: 'exact', head: true });
    let ordQ  = supabaseClient.from('orders').select('total, status');
    if (!isAdmin) {
      prodQ = prodQ.eq('user_id', currentUser.id);
      supQ  = supQ.eq('user_id', currentUser.id);
      ordQ  = ordQ.eq('user_id', currentUser.id);
    }
    const [{ count: cProd }, { count: cSup }, { data: orders }] = await Promise.all([prodQ, supQ, ordQ]);
    const totalVentas    = (orders || []).reduce((s, o) => s + (o.total || 0), 0);
    const pedidosActivos = (orders || []).filter(o => o.status !== 'entregado').length;
    animateNumber('kpiVentas',      0, totalVentas,    v => '$' + formatNum(v));
    animateNumber('kpiPedidos',     0, pedidosActivos, v => v.toString());
    animateNumber('kpiProductos',   0, cProd || 0,     v => v.toString());
    animateNumber('kpiProveedores', 0, cSup  || 0,     v => v.toString());
    document.getElementById('kpiVentasTrend').textContent      = '+12.4%';
    document.getElementById('kpiPedidosTrend').textContent     = '+5 hoy';
    document.getElementById('kpiProductosTrend').textContent   = (cProd || 0) + ' total';
    document.getElementById('kpiProveedoresTrend').textContent = 'activos';
    if (window.updateOrdersChart) window.updateOrdersChart(orders || []);
    updateLastTime();
  } catch (err) { console.warn('KPI error:', err.message); }
}

async function loadUsers() {
  if (currentRole !== 'admin') return;
  try {
    const { data, error } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    renderUsers(data || []);
  } catch (err) { console.warn('Users error:', err.message); }
}

function renderUsers(users) {
  const tbody = document.getElementById('usersBody');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No hay usuarios registrados.</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:10px">
        <div class="user-avatar" style="width:30px;height:30px;font-size:0.75rem">${(u.full_name||u.email||'?').charAt(0).toUpperCase()}</div>
        <span>${escHtml(u.full_name||'—')}</span></div></td>
      <td>${escHtml(u.email||'—')}</td>
      <td><span class="badge ${u.role==='admin'?'badge-purple':'badge-blue'}">${u.role==='admin'?'Administrador':'Vendedor'}</span></td>
      <td><span style="font-size:0.75rem;color:var(--text-3)">${formatDate(u.created_at)}</span></td>
    </tr>`).join('');
}

function startLiveUpdates() {
  setInterval(async () => {
    await loadKPIs();
    if (window.pushSalesPoint) window.pushSalesPoint();
  }, 30000);
}

function formatNum(n) { return new Intl.NumberFormat('es-CO').format(Math.round(n)); }
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function animateNumber(elId, from, to, fmt) {
  const el = document.getElementById(elId);
  const dur = 800; const start = performance.now();
  function step(now) {
    const t = Math.min((now-start)/dur,1);
    const ease = 1-Math.pow(1-t,3);
    el.textContent = fmt(from+(to-from)*ease);
    if (t<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
function updateLastTime() {
  const now = new Date();
  document.getElementById('lastUpdate').textContent = `Última actualización: ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
}
function openModal(id)  { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function closeModalOutside(e, id) { if (e.target.id === id) closeModal(id); }
function showToast(msg, type='success') {
  const t = document.getElementById('toast');
  t.textContent = type==='success' ? '✓ '+msg : '✕ '+msg;
  t.className = 'toast show toast-'+type;
  setTimeout(() => t.classList.remove('show'), 3000);
}
