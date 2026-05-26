-- ============================================================
--  DROPFLOW — SCHEMA SQL PARA SUPABASE
--  Ejecuta este script completo en:
--  Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ---- Habilitar extensiones ----
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: profiles
-- Almacena datos extra del usuario (nombre, rol)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  email       TEXT,
  role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- TABLA: suppliers (proveedores)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  country     TEXT DEFAULT 'Colombia',
  website     TEXT,
  api_url     TEXT,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_suppliers_updated
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: cada usuario solo ve sus propios proveedores
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own suppliers"
  ON public.suppliers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins ven todo
CREATE POLICY "Admins see all suppliers"
  ON public.suppliers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- TABLA: products (productos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id  UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  price        NUMERIC(12,2) DEFAULT 0 CHECK (price >= 0),
  stock        INTEGER DEFAULT 0 CHECK (stock >= 0),
  sku          TEXT,
  image_url    TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Índice para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON public.products(supplier_id);

-- RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own products"
  ON public.products FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins see all products"
  ON public.products FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- TABLA: orders (pedidos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id     UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name   TEXT,
  customer_name  TEXT NOT NULL DEFAULT 'Cliente',
  customer_email TEXT,
  customer_phone TEXT,
  quantity       INTEGER DEFAULT 1 CHECK (quantity > 0),
  total          NUMERIC(12,2) DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'pendiente'
                 CHECK (status IN ('pendiente','procesando','enviado','entregado','cancelado')),
  notes          TEXT,
  tracking_code  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_orders_updated
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON public.orders(status);

-- RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own orders"
  ON public.orders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins see all orders"
  ON public.orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================
-- DATOS DE EJEMPLO (opcional — útil para probar el dashboard)
-- IMPORTANTE: primero crea un usuario desde la app, luego
-- reemplaza 'TU_USER_ID_AQUI' con tu UUID de auth.users
-- ============================================================

-- Descomenta y personaliza si quieres datos de prueba:

/*
DO $$
DECLARE
  uid UUID := 'TU_USER_ID_AQUI';  -- Reemplaza con tu UUID
  sup1 UUID; sup2 UUID;
  prod1 UUID; prod2 UUID;
BEGIN

  -- Proveedores
  INSERT INTO public.suppliers (id, user_id, name, email, phone, country, website)
  VALUES
    (uuid_generate_v4(), uid, 'TechSupply Colombia', 'contacto@techsupply.co', '+57 300 111 2222', 'Colombia', 'https://techsupply.co'),
    (uuid_generate_v4(), uid, 'ImportExpress SAS',   'ventas@importexpress.co','+57 310 333 4444', 'Colombia', 'https://importexpress.co')
  RETURNING id INTO sup1;

  -- Productos
  INSERT INTO public.products (id, user_id, name, description, price, stock, active)
  VALUES
    (uuid_generate_v4(), uid, 'Auriculares Bluetooth Pro', 'Auriculares inalámbricos con cancelación de ruido', 189900, 45, TRUE),
    (uuid_generate_v4(), uid, 'Smartwatch Serie 5',        'Reloj inteligente con GPS y monitor cardíaco',       320000, 12, TRUE),
    (uuid_generate_v4(), uid, 'Cargador Inalámbrico 20W',  'Carga rápida compatible con iOS y Android',          79900,   0, FALSE)
  RETURNING id INTO prod1;

  -- Pedidos de ejemplo
  INSERT INTO public.orders (user_id, product_name, customer_name, customer_email, quantity, total, status)
  VALUES
    (uid, 'Auriculares Bluetooth Pro', 'María García',    'maria@gmail.com',   1, 189900, 'entregado'),
    (uid, 'Smartwatch Serie 5',        'Carlos Rodríguez','carlos@gmail.com',  1, 320000, 'enviado'),
    (uid, 'Auriculares Bluetooth Pro', 'Ana Martínez',    'ana@hotmail.com',   2, 379800, 'procesando'),
    (uid, 'Cargador Inalámbrico 20W',  'Luis Peña',       'luis@gmail.com',    1, 79900,  'pendiente');

END $$;
*/

-- ============================================================
-- VERIFICAR TABLAS CREADAS
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
