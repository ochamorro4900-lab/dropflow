// ============================================================
//  DROPFLOW — PRODUCTS.JS + CARRITO
// ============================================================

let allProducts = [];
let cart = [];

async function loadProducts() {
  try {
    const { data, error } = await supabaseClient
      .from('products').select('*, suppliers(name)').order('created_at', { ascending: false });
    if (error) throw error;
    allProducts = data || [];
    renderProducts(allProducts);
    populateSupplierSelect();
  } catch (err) { console.warn('Products error:', err.message); renderProducts([]); }
}

function renderProducts(products) {
  const tbody = document.getElementById('productsBody');
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No hay productos. ¡Crea el primero!</td></tr>';
    return;
  }
  tbody.innerHTML = products.map(p => `
    <tr>
      <td>${escHtml(p.name)}</td>
      <td>${p.suppliers ? escHtml(p.suppliers.name) : '<span style="color:var(--text-3)">—</span>'}</td>
      <td>$${formatNum(p.price||0)}</td>
      <td><span class="${p.stock>10?'badge badge-green':p.stock>0?'badge badge-orange':'badge badge-red'}">${p.stock||0} uds</span></td>
      <td><span class="badge ${p.active?'badge-green':'badge-gray'}">${p.active?'Activo':'Inactivo'}</span></td>
      <td>
        <button class="btn-sm" onclick="addToCart('${p.id}')" ${p.stock<=0?'disabled style="opacity:0.4"':''}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>
          ${p.stock<=0?'Sin stock':'Añadir'}
        </button>
      </td>
      <td>
        <button class="btn-sm" style="color:var(--red);border-color:rgba(239,68,68,0.2);background:rgba(239,68,68,0.08)" onclick="deleteProduct('${p.id}')">Eliminar</button>
      </td>
    </tr>`).join('');
}

function filterProducts() {
  const q = document.getElementById('productSearch').value.toLowerCase();
  renderProducts(allProducts.filter(p =>
    p.name.toLowerCase().includes(q) || (p.suppliers?.name||'').toLowerCase().includes(q)
  ));
}

// ---- CARRITO ----
function addToCart(productId) {
  const prod = allProducts.find(p => p.id === productId);
  if (!prod) return;
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ id: prod.id, name: prod.name, price: prod.price, qty: 1 });
  }
  renderCart();
  // Mostrar carrito automáticamente
  const panel = document.getElementById('cartPanel');
  if (panel.classList.contains('hidden')) toggleCart();
  showToast(prod.name + ' añadido al carrito');
}

function removeFromCart(productId) {
  cart = cart.filter(i => i.id !== productId);
  renderCart();
}

function updateCartQty(productId, delta) {
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cartItems');
  const countEl   = document.getElementById('cartCount');
  const totalItems = cart.reduce((s,i) => s + i.qty, 0);
  countEl.textContent = totalItems;
  countEl.style.display = totalItems > 0 ? 'inline-flex' : 'none';

  if (!cart.length) {
    container.innerHTML = '<div class="table-empty" style="padding:20px">El carrito está vacío</div>';
    document.getElementById('cartSubtotal').textContent = '$0';
    document.getElementById('cartTotal').textContent    = '$15.000';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-info">
        <span class="cart-item-name">${escHtml(item.name)}</span>
        <span class="cart-item-price">$${formatNum(item.price)}</span>
      </div>
      <div class="cart-item-controls">
        <button class="qty-btn-sm" onclick="updateCartQty('${item.id}',-1)">−</button>
        <span class="cart-item-qty">${item.qty}</span>
        <button class="qty-btn-sm" onclick="updateCartQty('${item.id}',1)">+</button>
        <button class="qty-btn-sm" style="color:var(--red)" onclick="removeFromCart('${item.id}')">✕</button>
      </div>
      <span class="cart-item-total">$${formatNum(item.price * item.qty)}</span>
    </div>`).join('');

  const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
  const total    = subtotal + 15000;
  document.getElementById('cartSubtotal').textContent = '$' + formatNum(subtotal);
  document.getElementById('cartTotal').textContent    = '$' + formatNum(total);
}

function toggleCart() {
  const panel  = document.getElementById('cartPanel');
  const layout = document.getElementById('productsLayout');
  panel.classList.toggle('hidden');
  layout.classList.toggle('cart-open');
}

function proceedCheckout() {
  if (!cart.length) { showToast('El carrito está vacío', 'error'); return; }
  const terms = document.getElementById('cartTerms');
  if (!terms.checked) { showToast('Debes aceptar los términos y condiciones', 'error'); return; }
  const notes = document.getElementById('cartNotes').value;
  // Guardar carrito en sessionStorage para checkout
  sessionStorage.setItem('df_cart',  JSON.stringify(cart));
  sessionStorage.setItem('df_notes', notes);
  window.location.href = 'checkout.html';
}

// ---- CRUD productos ----
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
      name, description, price, stock, supplier_id, active: true, user_id: session.user.id
    });
    if (error) throw error;
    closeModal('productModal');
    ['prodName','prodDesc','prodPrice','prodStock'].forEach(id => document.getElementById(id).value='');
    await loadProducts(); await loadKPIs();
    showToast('Producto guardado correctamente');
  } catch (err) { showToast('Error al guardar: ' + err.message, 'error'); }
}

async function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;
  try {
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) throw error;
    await loadProducts(); await loadKPIs();
    showToast('Producto eliminado');
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function populateSupplierSelect() {
  try {
    const { data } = await supabaseClient.from('suppliers').select('id, name').order('name');
    const sel = document.getElementById('prodSupplier');
    while (sel.options.length > 1) sel.remove(1);
    (data || []).forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.name;
      sel.appendChild(opt);
    });
  } catch (e) {}
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
