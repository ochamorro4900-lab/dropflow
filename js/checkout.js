// ============================================================
//  DROPFLOW — CHECKOUT.JS
// ============================================================

const CITIES = {
  antioquia:        ['Medellín','Bello','Itagüí','Envigado','Rionegro','Apartadó','Turbo','Caucasia'],
  atlantico:        ['Barranquilla','Soledad','Malambo','Sabanalarga','Baranoa'],
  bolivar:          ['Cartagena','Magangué','Turbaco','El Carmen de Bolívar'],
  boyaca:           ['Tunja','Duitama','Sogamoso','Chiquinquirá','Paipa'],
  caldas:           ['Manizales','Villamaría','La Dorada','Chinchiná','Riosucio'],
  cauca:            ['Popayán','Santander de Quilichao','Puerto Tejada','Patía'],
  cordoba:          ['Montería','Cereté','Lorica','Sahagún','Montelíbano'],
  cundinamarca:     ['Bogotá','Soacha','Facatativá','Zipaquirá','Chía','Fusagasugá','Mosquera','Madrid'],
  huila:            ['Neiva','Pitalito','Garzón','La Plata','Campoalegre'],
  magdalena:        ['Santa Marta','Ciénaga','Fundación','El Banco'],
  meta:             ['Villavicencio','Acacías','Granada','San Martín','Puerto López'],
  narino:           ['Pasto','Tumaco','Ipiales','Túquerres','La Unión'],
  norte_santander:  ['Cúcuta','Ocaña','Pamplona','Villa del Rosario','Los Patios'],
  risaralda:        ['Pereira','Dosquebradas','Santa Rosa de Cabal','La Virginia'],
  santander:        ['Bucaramanga','Floridablanca','Girón','Piedecuesta','Barrancabermeja'],
  tolima:           ['Ibagué','Espinal','Honda','Melgar','Chaparral'],
  valle:            ['Cali','Buenaventura','Palmira','Tuluá','Buga','Cartago','Jamundí'],
};

const PROMO_CODE    = '324567';
const PROMO_DISCOUNT = 0.5;

let cart         = [];
let promoApplied = false;

// ---- Cargar carrito desde sessionStorage ----
window.addEventListener('load', async () => {
  // Guard de sesión
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.replace('index.html'); return; }
  } catch(e) {}

  const raw = sessionStorage.getItem('df_cart');
  if (!raw) { window.location.replace('dashboard.html'); return; }

  cart = JSON.parse(raw);
  renderOrderItems();
  updateSummary();
});

function renderOrderItems() {
  const container = document.getElementById('orderItems');
  container.innerHTML = cart.map(item => `
    <div class="order-item">
      <div class="order-item-thumb">📦</div>
      <div class="order-item-info">
        <div class="order-item-name">${escHtml(item.name)}</div>
        <div class="order-item-qty">Cantidad: ${item.qty}</div>
      </div>
      <div class="order-item-price">$${formatNum(item.price * item.qty)}</div>
    </div>`).join('');
}

function updateSummary() {
  const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
  const discount = promoApplied ? subtotal * PROMO_DISCOUNT : 0;
  const total    = subtotal - discount + 15000;
  const items    = cart.reduce((s,i) => s + i.qty, 0);

  document.getElementById('summaryItemsLabel').textContent = `Artículos (${items})`;
  document.getElementById('summarySubtotal').textContent   = '$' + formatNum(subtotal);
  document.getElementById('summaryTotal').textContent      = '$' + formatNum(total);

  const discLine = document.getElementById('discountLine');
  if (promoApplied) {
    discLine.style.display = 'flex';
    document.getElementById('summaryDiscount').textContent = '-$' + formatNum(discount);
  } else {
    discLine.style.display = 'none';
  }
}

// ---- Ciudades por departamento ----
function updateCities() {
  const dept = document.getElementById('deptSelect').value;
  const sel  = document.getElementById('citySelect');
  sel.innerHTML = '<option value="">Selecciona ciudad</option>';
  (CITIES[dept] || []).forEach(city => {
    const opt = document.createElement('option');
    opt.value = city; opt.textContent = city;
    sel.appendChild(opt);
  });
}

// ---- Código promocional ----
function applyPromo() {
  const code  = document.getElementById('promoCode').value.trim();
  const msgEl = document.getElementById('promoMsg');
  msgEl.classList.remove('hidden','promo-success','promo-error');

  if (code === PROMO_CODE) {
    promoApplied = true;
    msgEl.textContent = '✓ Código aplicado — 50% de descuento';
    msgEl.classList.add('promo-success');
    updateSummary();
  } else {
    promoApplied = false;
    msgEl.textContent = '✕ Código no válido';
    msgEl.classList.add('promo-error');
    updateSummary();
  }
  msgEl.classList.remove('hidden');
}

// ---- Formateo de tarjeta ----
function formatCard(input) {
  let v = input.value.replace(/\D/g,'').slice(0,16);
  input.value = v.replace(/(.{4})/g,'$1 ').trim();
}
function formatExpiry(input) {
  let v = input.value.replace(/\D/g,'').slice(0,4);
  if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
  input.value = v;
}

// ---- Tabs de pago ----
function switchPayTab(tab, btn) {
  document.querySelectorAll('.pay-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.pay-panel').forEach(p => p.classList.add('hidden'));
  btn.classList.add('active');
  document.getElementById('panel-' + tab).classList.remove('hidden');
}

// ---- Simular pago ----
function simulatePayment() {
  // Validaciones básicas
  const email = document.getElementById('contactEmail').value.trim();
  const dept  = document.getElementById('deptSelect').value;
  const city  = document.getElementById('citySelect').value;
  const name  = document.getElementById('firstName').value.trim();
  const addr  = document.getElementById('address').value.trim();
  const phone = document.getElementById('phone').value.trim();

  if (!email || !dept || !city || !name || !addr || !phone) {
    alert('Por favor completa todos los campos obligatorios de entrega.');
    return;
  }

  // Guardar pedido en Supabase
  saveOrderToSupabase();

  // Mostrar modal de éxito
  document.getElementById('successModal').classList.remove('hidden');

  // Limpiar carrito
  sessionStorage.removeItem('df_cart');
  sessionStorage.removeItem('df_notes');
}

async function saveOrderToSupabase() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    const subtotal = cart.reduce((s,i) => s + i.price * i.qty, 0);
    const discount = promoApplied ? subtotal * PROMO_DISCOUNT : 0;
    const total    = subtotal - discount + 15000;

    // Insertar un pedido por cada item del carrito
    for (const item of cart) {
      await supabaseClient.from('orders').insert({
        user_id:       session.user.id,
        product_name:  item.name,
        customer_name: document.getElementById('firstName').value + ' ' + document.getElementById('lastName').value,
        customer_email:document.getElementById('contactEmail').value,
        quantity:      item.qty,
        total:         item.price * item.qty,
        status:        'procesando',
        notes:         sessionStorage.getItem('df_notes') || ''
      });
    }
  } catch(e) { console.warn('Order save error:', e); }
}

// ---- Helpers ----
function formatNum(n) { return new Intl.NumberFormat('es-CO').format(Math.round(n)); }
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
