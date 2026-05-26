// ============================================================
//  DROPFLOW — CHARTS.JS
//  Gráficas en tiempo real con Chart.js + Flujo de pedido
// ============================================================

// ---- Paleta ----
const C_GREEN  = '#00e5a0';
const C_BLUE   = '#3b82f6';
const C_ORANGE = '#f97316';
const C_RED    = '#ef4444';
const C_PURPLE = '#a855f7';

// ---- CHART 1: Ventas en tiempo real (línea) ----
let salesChart;
let salesLabels = [];
let salesData   = [];

function initSalesChart() {
  const ctx = document.getElementById('salesChart').getContext('2d');

  // Generar datos de "historial" simulado para los últimos 12 puntos
  const now = Date.now();
  for (let i = 11; i >= 0; i--) {
    const t = new Date(now - i * 5000);
    salesLabels.push(t.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
    salesData.push(Math.floor(Math.random() * 800000 + 200000));
  }

  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: salesLabels,
      datasets: [{
        label: 'Ventas (COP)',
        data: salesData,
        borderColor: C_GREEN,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: C_GREEN,
        pointBorderColor: 'transparent',
        fill: true,
        backgroundColor: (ctx2) => {
          const gradient = ctx2.chart.ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0,   'rgba(0,229,160,0.18)');
          gradient.addColorStop(1,   'rgba(0,229,160,0)');
          return gradient;
        },
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: { duration: 400 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1d2433',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          titleColor: '#8a95a3',
          bodyColor: '#f0f4f8',
          callbacks: {
            label: ctx2 => ' $' + new Intl.NumberFormat('es-CO').format(ctx2.parsed.y)
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#4a5568', font: { size: 10 }, maxTicksLimit: 6 }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#4a5568',
            font: { size: 10 },
            callback: v => '$' + new Intl.NumberFormat('es-CO').format(v)
          }
        }
      }
    }
  });
}

// Agregar punto nuevo (llamado cada 30s por dashboard.js)
window.pushSalesPoint = function() {
  const now = new Date();
  const label = now.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  const value = Math.floor(Math.random() * 1200000 + 150000);

  salesLabels.push(label);
  salesData.push(value);

  if (salesLabels.length > 20) {
    salesLabels.shift();
    salesData.shift();
  }

  salesChart.data.labels  = salesLabels;
  salesChart.data.datasets[0].data = salesData;
  salesChart.update('active');
};

// ---- CHART 2: Donut estado de pedidos ----
let ordersChart;

function initOrdersChart() {
  const ctx = document.getElementById('ordersChart').getContext('2d');
  ordersChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pendiente', 'Procesando', 'Enviado', 'Entregado'],
      datasets: [{
        data: [1, 1, 1, 1],
        backgroundColor: [C_ORANGE, C_BLUE, C_PURPLE, C_GREEN],
        borderColor: '#0f1117',
        borderWidth: 3,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#8a95a3',
            font: { size: 11 },
            padding: 12,
            usePointStyle: true,
            pointStyleWidth: 8,
          }
        },
        tooltip: {
          backgroundColor: '#1d2433',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          callbacks: {
            label: ctx2 => ` ${ctx2.label}: ${ctx2.parsed} pedidos`
          }
        }
      },
      animation: { animateRotate: true, duration: 600 }
    }
  });
}

window.updateOrdersChart = function(orders) {
  if (!ordersChart) return;
  const counts = {
    pendiente:  0,
    procesando: 0,
    enviado:    0,
    entregado:  0,
  };
  orders.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
  const total = orders.length;
  ordersChart.data.datasets[0].data = [
    counts.pendiente, counts.procesando, counts.enviado, counts.entregado
  ];
  ordersChart.update('active');
  document.getElementById('donutTotal').textContent = total;
};

// ---- FLUJO DE PEDIDO animado ----
let flowRunning = false;
let flowTimer   = null;

function resetFlow() {
  [0,1,2,3].forEach(i => {
    document.getElementById('flow-' + i).classList.remove('active','done');
  });
  [0,1,2].forEach(i => {
    document.getElementById('arrow-' + i).classList.remove('filled');
  });
  document.getElementById('flowProgress').style.width = '0%';
  document.getElementById('flowStatusText').textContent = 'Esperando pedido...';
}

window.simulateOrderFlow = function() {
  if (flowRunning) return;
  flowRunning = true;
  resetFlow();

  const steps = [
    { label: 'Cliente realizó el pedido',    progress: '12%'  },
    { label: 'DropFlow procesando orden...',  progress: '37%'  },
    { label: 'Proveedor confirmó el stock',   progress: '62%'  },
    { label: '¡Pedido enviado al cliente!',   progress: '100%' },
  ];

  let step = 0;

  function advance() {
    if (step > 0) {
      document.getElementById('flow-' + (step-1)).classList.remove('active');
      document.getElementById('flow-' + (step-1)).classList.add('done');
      if (step - 1 < 3) {
        document.getElementById('arrow-' + (step-1)).classList.add('filled');
      }
    }

    if (step < steps.length) {
      document.getElementById('flow-' + step).classList.add('active');
      document.getElementById('flowProgress').style.width  = steps[step].progress;
      document.getElementById('flowStatusText').textContent = steps[step].label;
      step++;
      flowTimer = setTimeout(advance, 1400);
    } else {
      flowRunning = false;
      setTimeout(resetFlow, 3000);
    }
  }

  advance();
};

// ---- Init cuando el DOM esté listo ----
document.addEventListener('DOMContentLoaded', () => {
  initSalesChart();
  initOrdersChart();
  // Simular flujo automáticamente la primera vez tras 2s
  setTimeout(() => window.simulateOrderFlow(), 2000);
  // Repetir flujo cada 15s
  setInterval(() => { if (!flowRunning) window.simulateOrderFlow(); }, 15000);
});
