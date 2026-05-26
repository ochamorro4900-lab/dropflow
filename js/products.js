// ============================================================
//  DROPFLOW — PRODUCTS.JS
//  CRUD de productos contra Supabase
// ============================================================

let allProducts = [];

async function loadProducts() {
  try {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*, suppliers(name)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    allProducts = data || [];
    renderProducts(allProducts);
    populateSupplierSelect();
  } catch (err) {
    console.warn('Products error:', err.message);
    renderProducts([]);
  }
}

function renderProducts(products) {
  const tbody = document.getElementById('productsBody');

  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No hay productos registrados. ¡Crea el primero!</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(p => `
    <tr>
      <td>${escHtml(p.name)}</td>
      <td>${p.suppliers ? escHtml(p.suppliers.name) : '<span style="color:var(--text-3)">—</span>'}</td>
      <td>$${formatNum(p.price || 0)}</td>
      <td>
        <span class="${p.stock > 10 ? 'badge badge-green' : p.stock > 0 ? 'badge badge-orange' : 'badge badge-red'}">
          ${p.stock || 0} uds
        </span>
      </td>
      <td><span class="badge ${p.active ? 'badge-green' : 'badge-gray'}">${p.active ? 'Activo' : 'Inactivo'}</span></td>
      <td>
        <button class="btn-sm" onclick="deleteProduct('${p.id}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          Eliminar
        </button>
      </td>
    </tr>
  `).join('');
}

function filterProducts() {
  const q = document.getElementById('productSearch').value.toLowerCase();
  renderProducts(allProducts.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.suppliers?.name || '').toLowerCase().includes(q)
  ));
}

async function saveProduct(e) {
  e.preventDefault();
  const name        = document.getElementById('prodName').value.trim();
  const description = document.getElementById('prodDesc').value.trim();
  const price       = parseFloat(document.getElementById('prodPrice').value) || 0;
  const stock       = parseInt(document.getElementById('prodStock').value)   || 0;
  const supplier_id = document.getElementById('prodSupplier').value || null;

  if (!name) return;

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    const { error } = await supabaseClient.from('products').insert({
      name, description, price, stock, supplier_id,
      active: true,
      user_id: session.user.id
    });

    if (error) throw error;

    closeModal('productModal');
    document.getElementById('prodName').value  = '';
    document.getElementById('prodDesc').value  = '';
    document.getElementById('prodPrice').value = '';
    document.getElementById('prodStock').value = '';

    await loadProducts();
    await loadKPIs();
    showToast('Producto guardado correctamente');

  } catch (err) {
    showToast('Error al guardar: ' + err.message, 'error');
  }
}

async function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  try {
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) throw error;
    await loadProducts();
    await loadKPIs();
    showToast('Producto eliminado');
  } catch (err) {
    showToast('Error al eliminar: ' + err.message, 'error');
  }
}

async function populateSupplierSelect() {
  try {
    const { data } = await supabaseClient.from('suppliers').select('id, name').order('name');
    const sel = document.getElementById('prodSupplier');
    const existing = Array.from(sel.options).map(o => o.value);
    (data || []).forEach(s => {
      if (!existing.includes(s.id)) {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        sel.appendChild(opt);
      }
    });
  } catch (e) { /* ignore */ }
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
