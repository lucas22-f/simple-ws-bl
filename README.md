# Tienda web simple moderna

Bazar Online fullstack — catálogo público, carrito, checkout con Mercado Pago, panel de administración y pagos vía webhook.

**Stack**: Next.js 15 App Router · TypeScript strict · Tailwind CSS v4 · Supabase (Auth + PostgreSQL + RLS) · Mercado Pago Checkout Pro · Zustand · Radix UI · CVA · Zod · Lucide

---

## Índice

- [Quick start](#quick-start)
- [Scripts](#scripts)
- [Variables de entorno](#variables-de-entorno)
- [Arquitectura](#arquitectura)
- [Storefront](#storefront)
- [Admin](#admin)
- [Pagos y webhook](#pagos-y-webhook)
- [Supabase CLI local](#supabase-cli-local)
- [Testing](#testing)
- [CI](#ci)
- [Deploy](#deploy)

---

## Quick start

```bash
npm install
cp .env.example .env.local
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Completá `.env.local` antes de levantar la app. No pegues tokens ni secrets en el README, issues o commits.

---

## Scripts

| Comando | Qué verifica o ejecuta |
|---|---|
| `npm run dev` | Levanta Next.js local. |
| `npm run lint` | Ejecuta ESLint. |
| `npm run typecheck` | Valida TypeScript sin emitir archivos. |
| `npm run env:check` | Verifica que los archivos de entorno no tengan BOM UTF-8. |
| `npm test` | Ejecuta unit/integration tests con Vitest. |
| `npm run test:watch` | Vitest en modo watch. |
| `npm run test:e2e` | Ejecuta Playwright; levanta Next en `http://127.0.0.1:3100`. |
| `npm run build` | Compila la app para producción. |
| `npm run start` | Servidor Node de producción local. |
| `npm run supabase:start` | Levanta Supabase local con Docker. |
| `npm run supabase:stop` | Detiene Supabase local. |
| `npm run supabase:db:reset` | Aplica migraciones locales y seed. |
| `npm run supabase:db:test` | Ejecuta tests pgTAP contra la DB local. |
| `npm run supabase:db:lint` | Valida schema local (`--fail-on warning`). |

---

## Variables de entorno

| Variable | Alcance | Descripción |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Cliente/servidor | URL pública de la app para callbacks y links. |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente/servidor | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente/servidor | Publishable/anon key para lecturas públicas y auth de admin. |
| `SUPABASE_SECRET_KEY` | Servidor | Secret key para operaciones privilegiadas. Nunca exponer al cliente. |
| `ADMIN_REGISTRATION_SECRET` | Servidor | Secreto privado para crear cuentas admin desde `/admin/register`. Usá un valor largo aleatorio; no lo compartas ni lo commitees. |
| `MP_ACCESS_TOKEN` | Servidor | Token privado de Mercado Pago para crear preferencias y consultar pagos. |
| `MP_WEBHOOK_SECRET` | Servidor | Secreto para verificar webhooks de Mercado Pago. |
| `NEXT_PUBLIC_META_PIXEL_ID` | Cliente | ID opcional de Meta Pixel; se renderiza solo si es válido. |
| `NEXT_PUBLIC_GTM_ID` | Cliente | ID opcional de Google Tag Manager; se renderiza solo si es válido. |
| `ADMIN_E2E_EMAIL` / `ADMIN_E2E_PASSWORD` | Tests manuales | Credenciales opcionales para smoke E2E autenticado de admin. |

---

## Arquitectura

```
src/
├── app/
│   ├── (store)/            # Storefront: catálogo, producto, checkout, pago
│   ├── admin/              # Panel admin: login, productos, órdenes, configuración
│   ├── api/                # API routes: checkout, webhook MP, órdenes
│   ├── layout.tsx          # Layout raíz con providers
│   ├── loading.tsx         # Suspense boundary global
│   └── globals.css         # Estilos globales Tailwind v4
├── components/
│   ├── admin/              # Componentes del panel admin
│   ├── analytics/          # Meta Pixel y GTM
│   ├── cart/               # Carrito (drawer, item, resumen)
│   ├── store/              # Storefront: cards, galería, filtros
│   └── ui/                 # Atoms: Button, Input, Badge, Skeleton, etc.
├── lib/                    # Utilidades: money, pagination, form-state, etc.
├── server/                 # Lógica del servidor
│   ├── admin/              # Server actions de admin
│   ├── auth/               # Autenticación Supabase
│   ├── checkout/           # Lógica de checkout
│   ├── orders/             # Órdenes
│   ├── payments/           # Integración con Mercado Pago
│   ├── products/           # Productos
│   ├── security/           # Rate limiting, validación
│   ├── settings/           # Configuración de tienda
│   └── supabase/           # Cliente Supabase server-side
├── stores/
│   └── cart-store.ts       # Zustand store del carrito con persistencia
└── middleware.ts            # Protección de rutas admin
```

Principios:

- **App Router** con layouts anidados y group routes.
- **Server Actions** para mutations del lado admin y checkout.
- **Supabase RLS** para seguridad a nivel base de datos.
- **Middleware** protege `/admin/*` redirigiendo a `/admin/login` si no hay sesión.
- **Zustand + `persist`** para el carrito del lado cliente.
- **Zod** para validación de inputs tanto en cliente como servidor.

---

## Storefront

| Ruta | Descripción |
|---|---|
| `/` | Home con productos destacados. |
| `/catalog` | Catálogo completo. |
| `/products/[slug]` | Detalle de producto con imágenes y precio. |
| `/checkout` | Resumen del carrito y formulario de pago. |
| `/payment/success` | Confirmación de pago exitoso. |
| `/payment/failure` | Error en el pago. |
| `/payment/pending` | Pago pendiente. |

El carrito usa **Zustand** con persistencia en `localStorage`. Los estados de pago son informativos: la confirmación real llega por webhook firmado de Mercado Pago.

---

## Admin

El panel de administración está protegido por Supabase Auth:

| Ruta | Descripción |
|---|---|
| `/admin` | Dashboard principal con resumen. |
| `/admin/login` | Login de administradores. |
| `/admin/register` | Registro inicial (requiere `ADMIN_REGISTRATION_SECRET`). |
| `/admin/products` | Gestión de productos con búsqueda. |
| `/admin/orders` | Órdenes recibidas con búsqueda. |
| `/admin/settings` | Configuración de la tienda. |

- Supabase Auth se usa exclusivamente para administradores.
- El middleware y los guards en server actions protegen todas las rutas `/admin/*`.
- El registro inicial requiere `ADMIN_REGISTRATION_SECRET` configurado en `.env.local`. Una vez creado el primer admin, podés deshabilitar o rotar ese secreto.
- Productos y órdenes incluyen búsqueda con debounce vía `AdminSearchInput`.

---

## Pagos y webhook

1. En Mercado Pago, configurá Checkout Pro con `MP_ACCESS_TOKEN` del entorno correcto (producción vs desarrollo).
2. Configurá la URL de webhook: `https://<tu-dominio>/api/mercado-pago/webhook`.
3. Guardá el secreto en `MP_WEBHOOK_SECRET`.
4. Las páginas `/payment/success`, `/payment/failure` y `/payment/pending` son informativas: el pago se confirma solo por webhook firmado.
5. Para E2E, Playwright intercepta `/api/checkout/preferences`; la app no tiene bypass de checkout por variable de entorno.

---

## Supabase CLI local

Requisitos y límites:

- Necesitás **Docker Desktop** corriendo para `npm run supabase:start`, `npm run supabase:db:reset` y `npm run supabase:db:lint`.
- Si ves `Access is denied` leyendo `C:\Users\<usuario>\.docker\config.json`, corregí permisos / reiniciá Docker Desktop antes de usar la DB local.
- Para remoto, usá `supabase login` y `supabase link` fuera del repo.
- Remote project credentials: guardalas en Supabase/Vercel o variables locales, nunca en Git. Do not commit secrets.

### Migración y seed

| Entorno | Comando recomendado | Nota |
|---|---|---|
| Local | `npm run supabase:start` → `npm run supabase:db:reset` | Requiere Docker Desktop. Aplica migraciones y `supabase/seed.sql`. |
| Remoto vinculado | `supabase db push --include-seed` | Usá `supabase login`/`supabase link` fuera de Git y sin exponer tokens. |
| Verificación | `npm run supabase:db:lint` | Corre contra la DB local levantada. |

Seed actual esperado para smoke storefront:

- `mate-ceramico-artesanal`
- `set-cucharas-madera`

No uses `supabase db reset --linked`; es destructivo para el remoto.

---

## Testing

Tres capas de tests:

### Unit (`tests/unit/`)

Pruebas con **Vitest** para componentes, stores, utilidades y server actions. Sin DOM simulado (entorno `node`).

### Integration (`tests/integration/`)

Pruebas que ejercitan server actions, RLS, rate limiting, webhooks y flujos de pago. Dependen de Supabase local levantado.

### E2E (`tests/e2e/`)

Pruebas con **Playwright** en un navegador real. Playwright intercepta las llamadas a Mercado Pago para no requerir credenciales reales.

```bash
# Unit + integration
npm test

# E2E (levanta servidor automáticamente)
npm run test:e2e
```

Ver también: `playwright.config.ts` y `vitest.config.ts`.

---

## CI

El pipeline de CI en GitHub Actions (`.github/workflows/ci.yml`) ejecuta en cada PR y push a `main`:

1. `npm ci`
2. `env:check` — verifica encoding de archivos `.env`
3. `lint` — ESLint
4. `typecheck` — TypeScript
5. `test` — Vitest (unit + integration)
6. `supabase start` + `db reset` + `db:test` + `db:lint`
7. `test:e2e` — Playwright
8. `build` — `next build`

---

## Deploy

Ver [`DEPLOYMENT.md`](./DEPLOYMENT.md) para la guía de deploy en Vercel.

Checklist mínimo:

- [ ] Crear proyecto en Vercel apuntando a este repo.
- [ ] Configurar todas las variables de entorno de producción.
- [ ] Definir `NEXT_PUBLIC_SITE_URL` con la URL final HTTPS.
- [ ] Aplicar migraciones/seed en Supabase remoto antes del primer release.
- [ ] Configurar el webhook de Mercado Pago contra `/api/mercado-pago/webhook`.
- [ ] Ejecutar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` y `npm run build` antes de promover.
