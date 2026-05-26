# DropFlow — Plataforma de Gestión Dropshipping

Plataforma web para gestión integral de tiendas dropshipping con autenticación de usuarios, módulos de productos, proveedores, pedidos y **dashboard con métricas en tiempo real**.

---

## Estructura del proyecto

```
dropshipping-app/
├── index.html          ← Página de login / registro
├── dashboard.html      ← Dashboard principal (protegido)
├── css/
│   ├── main.css        ← Variables globales, botones, modales
│   ├── auth.css        ← Estilos del login
│   └── dashboard.css   ← Sidebar, KPIs, tablas, gráficas
├── js/
│   ├── config.js       ← Credenciales de Supabase ← EDITAR AQUÍ
│   ├── auth.js         ← Login, registro, sesión
│   ├── dashboard.js    ← Guard de sesión, KPIs, navegación
│   ├── products.js     ← CRUD de productos
│   ├── suppliers.js    ← CRUD de proveedores
│   ├── orders.js       ← Listado y filtrado de pedidos
│   └── charts.js       ← Gráficas en tiempo real + flujo animado
└── supabase/
    └── schema.sql      ← Script SQL para crear todas las tablas
```

---

## Paso 1 — Crear proyecto en Supabase

1. Ve a **https://supabase.com** y crea una cuenta gratuita.
2. Haz clic en **"New project"**.
3. Elige un nombre (ej: `dropflow`), una contraseña de base de datos y la región **South America (São Paulo)**.
4. Espera ~2 minutos a que el proyecto se inicialice.

---

## Paso 2 — Crear las tablas (ejecutar SQL)

1. En tu proyecto de Supabase, ve al menú lateral → **SQL Editor**.
2. Haz clic en **"New query"**.
3. Copia todo el contenido del archivo `supabase/schema.sql` y pégalo en el editor.
4. Haz clic en **"Run"** (▶).
5. Verifica que aparezcan las tablas: `profiles`, `suppliers`, `products`, `orders`.

---

## Paso 3 — Configurar credenciales en el proyecto

1. En Supabase, ve a **Settings → API**.
2. Copia los valores de:
   - **Project URL** (ej: `https://xxxx.supabase.co`)
   - **anon public** key (empieza con `eyJhbGciOiJIUzI1NiIs...`)
3. Abre el archivo `js/config.js` y reemplaza:

```javascript
const SUPABASE_URL  = 'https://TU-PROYECTO.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## Paso 4 — Configurar autenticación en Supabase

1. Ve a **Authentication → Settings** en Supabase.
2. En **"Email confirmation"**, puedes desactivarla temporalmente para pruebas (toggle OFF).
3. En **"Site URL"**, escribe la URL donde corre tu app (ej: `http://localhost:5500` si usas Live Server, o la URL de tu hosting).

---

## Paso 5 — Ejecutar la aplicación

### Opción A — Abrir localmente (sin servidor)

> Nota: Los módulos ES y Supabase funcionan mejor con un servidor local.

**Con VS Code:**
1. Instala la extensión **"Live Server"** de Ritwick Dey.
2. Haz clic derecho en `index.html` → **"Open with Live Server"**.
3. Se abre en `http://localhost:5500`.

**Con Python (si lo tienes instalado):**
```bash
cd dropshipping-app
python -m http.server 5500
# Abre: http://localhost:5500
```

**Con Node.js:**
```bash
npx serve dropshipping-app
```

### Opción B — Subir a GitHub Pages

1. Sube el proyecto a GitHub (sin la `anon key` si es repositorio público).
2. Ve a Settings → Pages → Branch: `main` / root.
3. Actualiza la **Site URL** en Supabase con la URL de GitHub Pages.

---

## Paso 6 — Crear primer usuario

1. Abre `http://localhost:5500` en el navegador.
2. Haz clic en **"Regístrate gratis"**.
3. Llena el formulario y selecciona rol **Administrador**.
4. Si desactivaste la confirmación de email, puedes iniciar sesión inmediatamente.
5. Si está activada, revisa tu correo y confirma.

---

## Datos de prueba (opcional)

Para ver el dashboard con datos de ejemplo:

1. Primero crea tu usuario y copia tu **UUID** desde:
   - Supabase → Authentication → Users → tu usuario → copia el UUID.
2. Abre `supabase/schema.sql`, ve al final y descomenta el bloque `/* DO $$ ... */`.
3. Reemplaza `'TU_USER_ID_AQUI'` por tu UUID real.
4. Ejecuta solo ese bloque en el SQL Editor.

---

## Módulos disponibles

| Módulo | Funcionalidad |
|---|---|
| **Autenticación** | Registro, login, logout con roles admin/user |
| **Dashboard** | KPIs en tiempo real, gráfica de ventas LIVE, donut de pedidos |
| **Flujo de pedido** | Animación del ciclo proveedor → DropFlow → cliente |
| **Productos** | Crear, listar, buscar, eliminar productos con stock |
| **Proveedores** | Crear, listar, buscar, eliminar proveedores |
| **Pedidos** | Listar y filtrar por estado |

---

## Tecnologías utilizadas

- **Frontend:** HTML5 / CSS3 / JavaScript vanilla
- **Base de datos:** Supabase (PostgreSQL + Auth + RLS)
- **Gráficas:** Chart.js 4.4
- **Fuentes:** Syne + DM Sans (Google Fonts)
- **Control de versiones:** Git / GitHub

---

## Autor

**Oscar Andrés Chamorro Vallejo**
Proyecto: Plataforma web de gestión dropshipping
