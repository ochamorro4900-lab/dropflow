// ============================================================
//  DROPFLOW — ORDERS.JS
// ============================================================

let allOrders = [];
let qtyHoldTimer = null;
let qtyHoldInterval = null;

async function loadOrders() {
  try {
    const { data, error } = await supabaseClient.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    allOrders = data || [];
    renderOrders(allOrders);
    populateProductSelect();
  } catch (err) { console.warn('Orders error:', err.message); renderOrders([]); }
}

function renderOrders(orders) {
  const tbody = document.getElementById('ordersBody');
  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No hay pedidos registrados. ¡Crea el primero!</td></tr>';
    return;
  }
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><span style="font-family:var(--font-head);font-size:0.8rem;color:var(--text-3)">#${String(o.id).slice(0,8).toUpperCase()}</span></td>
      <td>${escHtml(o.customer_name||'Cliente')}</td>
      <td>${escHtml(o.product_name||'—')}</td>
      <td>$${formatNum(o.total||0)}</td>
      <td>${statusBadge(o.status)}</td>
      <td><span style="font-size:0.78rem;color:var(--text-3)">${formatDate(o.created_at)}</span></td>
      <td><button class="btn-sm" style="color:var(--red);border-color:rgba(239,68,68,0.2);background:rgba(239,68,68,0.08)" onclick="deleteOrder('${o.id}')">Eliminar</button></td>
    </tr>`).join('');
}

function filterOrders() {
  const filter = document.getElementById('orderFilter').value;
  renderOrders(filter ? allOrders.filter(o => o.status === filter) : allOrders);
}

async function saveOrder(e) {
  e.preventDefault();
  const customer_name  = document.getElementById('ordCustomer').value.trim();
  const customer_email = document.getElementById('ordEmail').value.trim();
  const productSel     = document.getElementById('ordProduct');
  const product_name   = productSel.options[productSel.selectedIndex]?.text.split(' —')[0] || '';
  const product_id     = productSel.value || null;
  const quantity       = parseInt(document.getElementById('ordQty').value) || 1;
  const total          = parseFloat(document.getElementById('ordTotal').value) || 0;
  const status         = document.getElementById('ordStatus').value;
  const notes          = document.getElementById('ordNotes').value.trim();
  if (!customer_name || !product_id) return;
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const { error } = await supabaseClient.from('orders').insert({
      customer_name, customer_email, product_id, product_name, quantity, total, status, notes,
      user_id: session.user.id
    });
    if (error) throw error;
    closeModal('orderModal');
    ['ordCustomer','ordEmail','ordTotal','ordNotes'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('ordQty').value = '1';
    document.getElementById('ordProduct').selectedIndex = 0;
    document.getElementById('ordStatus').selectedIndex  = 0;
    await loadOrders();
    await loadKPIs();
    showToast('Pedido creado correctamente');
  } catch (err) { showToast('Error al guardar: ' + err.message, 'error'); }
}

async function deleteOrder(id) {
  if (!confirm('¿Eliminar este pedido?')) return;
  try {
    const { error } = await supabaseClient.from('orders').delete().eq('id', id);
    if (error) throw error;
    await loadOrders(); await loadKPIs();
    showToast('Pedido eliminado');
  } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

// ---- Cantidad progresiva al mantener presionado ----
function startQtyHold(direction) {
  let holdTime = 0;
  let step = 1;

  function increment() {
    const input = document.getElementById('ordQty');
    let val = parseInt(input.value) || 1;
    val = Math.max(1, val + step * direction);
    input.value = val;
    calcOrderTotal();
  }

  increment(); // primer click inmediato

  qtyHoldTimer = setTimeout(() => {
    // Después de 1 segundo empieza a subir de 10 en 10
    step = 10;
    qtyHoldInterval = setInterval(() => {
      holdTime += 200;
      // Después de 3 segundos sube de 100 en 100
      if (holdTime >= 3000) step = 100;
      increment();
    }, 200);
  }, 1000);
}

function stopQtyHold() {
  clearTimeout(qtyHoldTimer);
  clearInterval(qtyHoldInterval);
  qtyHoldTimer = null;
  qtyHoldInterval = null;
}

function calcOrderTotal() {
  const productSel = document.getElementById('ordProduct');
  const qty        = parseInt(document.getElementById('ordQty').value) || 1;
  const selectedId = productSel.value;
  if (!selectedId || typeof allProducts === 'undefined') return;
  const prod = allProducts.find(p => p.id === selectedId);
  if (prod) document.getElementById('ordTotal').value = (prod.price * qty).toFixed(0);
}

async function populateProductSelect() {
  try {
    const { data } = await supabaseClient.from('products').select('id, name, price').eq('active', true).order('name');
    const sel = document.getElementById('ordProduct');
    while (sel.options.length > 1) sel.remove(1);
    (data || []).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} — $${formatNum(p.price)}`;
      opt.dataset.price = p.price;
      sel.appendChild(opt);
    });
    sel.onchange = calcOrderTotal;
  } catch (e) {}
}

function statusBadge(status) {
  const map = { pendiente:['badge-orange','Pendiente'], procesando:['badge-blue','Procesando'], enviado:['badge-purple','Enviado'], entregado:['badge-green','Entregado'], cancelado:['badge-red','Cancelado'] };
  const [cls, label] = map[status] || ['badge-gray', status || '—'];
  return `<span class="badge ${cls}">${label}</span>`;
}
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
}
