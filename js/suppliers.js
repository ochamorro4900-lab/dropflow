// ============================================================
//  DROPFLOW — SUPPLIERS.JS
//  CRUD de proveedores contra Supabase
// ============================================================

let allSuppliers = [];

async function loadSuppliers() {
  try {
    const { data, error } = await supabaseClient
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    allSuppliers = data || [];
    renderSuppliers(allSuppliers);
  } catch (err) {
    console.warn('Suppliers error:', err.message);
    renderSuppliers([]);
  }
}

function renderSuppliers(suppliers) {
  const grid = document.getElementById('suppliersGrid');

  if (!suppliers.length) {
    grid.innerHTML = '<div class="table-empty">No hay proveedores registrados. ¡Agrega el primero!</div>';
    return;
  }

  grid.innerHTML = suppliers.map(s => `
    <div class="supplier-card">
      <div class="supplier-card-header">
        <div class="supplier-avatar">${escHtml(s.name.charAt(0).toUpperCase())}</div>
        <div>
          <div class="supplier-name">${escHtml(s.name)}</div>
          <div class="supplier-country">${escHtml(s.country || 'Colombia')}</div>
        </div>
      </div>
      <div class="supplier-meta">
        <div><span>Email: </span>${s.email ? escHtml(s.email) : '—'}</div>
        <div><span>Tel: </span>${s.phone ? escHtml(s.phone) : '—'}</div>
        ${s.website ? `<div><span>Web: </span><a href="${escHtml(s.website)}" target="_blank" rel="noopener">${escHtml(s.website)}</a></div>` : ''}
      </div>
      <div class="supplier-actions">
        <button class="btn-sm" style="color:var(--red);border-color:rgba(239,68,68,0.2);background:rgba(239,68,68,0.08)" onclick="deleteSupplier('${s.id}')">
          Eliminar
        </button>
      </div>
    </div>
  `).join('');
}

function filterSuppliers() {
  const q = document.getElementById('supplierSearch').value.toLowerCase();
  renderSuppliers(allSuppliers.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (s.country || '').toLowerCase().includes(q)
  ));
}

async function saveSupplier(e) {
  e.preventDefault();
  const name    = document.getElementById('supName').value.trim();
  const email   = document.getElementById('supEmail').value.trim();
  const phone   = document.getElementById('supPhone').value.trim();
  const country = document.getElementById('supCountry').value.trim();
  const website = document.getElementById('supWebsite').value.trim();

  if (!name) return;

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    const { error } = await supabaseClient.from('suppliers').insert({
      name, email, phone, country, website,
      user_id: session.user.id
    });

    if (error) throw error;

    closeModal('supplierModal');
    ['supName','supEmail','supPhone','supCountry','supWebsite'].forEach(id => {
      document.getElementById(id).value = '';
    });

    await loadSuppliers();
    await loadKPIs();
    await populateSupplierSelect();
    showToast('Proveedor guardado correctamente');

  } catch (err) {
    showToast('Error al guardar: ' + err.message, 'error');
  }
}

async function deleteSupplier(id) {
  if (!confirm('¿Eliminar este proveedor?')) return;
  try {
    const { error } = await supabaseClient.from('suppliers').delete().eq('id', id);
    if (error) throw error;
    await loadSuppliers();
    await loadKPIs();
    showToast('Proveedor eliminado');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
