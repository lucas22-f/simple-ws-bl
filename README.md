# Tienda web simple moderna

Bazar Online fullstack con Next.js 15 App Router, TypeScript strict, Tailwind v4, Supabase, Mercado Pago Checkout Pro y Vercel.

## Quick path

```bash
npm install
cp .env.example .env.local
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

> CompletÃƒÂ¡ `.env.local` antes de levantar la app. No pegues tokens ni secrets en el README, issues o commits.

## Scripts

| Comando | QuÃƒÂ© verifica o ejecuta |
|---|---|
| `npm run dev` | Levanta Next.js local. |
| `npm run lint` | Ejecuta ESLint. |
| `npm run typecheck` | Valida TypeScript sin emitir archivos. |
| `npm test` | Ejecuta unit/integration tests con Vitest. |
| `npm run test:e2e` | Ejecuta Playwright; levanta Next en `http://127.0.0.1:3100`. |
| `npm run build` | Compila la app para producciÃƒÂ³n. |
| `npm run supabase:start` | Levanta Supabase local con Docker. |
| `npm run supabase:db:reset` | Aplica migraciones locales y `supabase/seed.sql`. |
| `npm run supabase:db:lint` | Valida schema local. |
| `npm run supabase:stop` | Detiene Supabase local. |

## Variables de entorno

| Variable | Alcance | DescripciÃƒÂ³n |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Cliente/servidor | URL pÃƒÂºblica de la app para callbacks y links. |
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente/servidor | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Cliente/servidor | Publishable/anon key para lecturas pÃƒÂºblicas y auth de admin. |
| `SUPABASE_SECRET_KEY` | Servidor | Secret key para operaciones privilegiadas. Nunca exponer al cliente. |
| `MP_ACCESS_TOKEN` | Servidor | Token privado de Mercado Pago para preferencias y consultas de pago. |
| `MP_WEBHOOK_SECRET` | Servidor | Secreto para verificar webhooks de Mercado Pago. |
| `NEXT_PUBLIC_META_PIXEL_ID` | Cliente | ID opcional de Meta Pixel; se renderiza solo si es vÃƒÂ¡lido. |
| `NEXT_PUBLIC_GTM_ID` | Cliente | ID opcional de Google Tag Manager; se renderiza solo si es vÃƒÂ¡lido. |
| `E2E_MERCADO_PAGO_CHECKOUT_URL` | Tests | URL mock usada por Playwright para no llamar a Mercado Pago real. |
| `ADMIN_E2E_EMAIL` / `ADMIN_E2E_PASSWORD` | Tests manuales | Credenciales opcionales para smoke E2E autenticado de admin. |


## Supabase CLI local

Requisitos y límites:

- Necesitás Docker Desktop corriendo para `npm run supabase:start`, `npm run supabase:db:reset` y `npm run supabase:db:lint`.
- Si ves `Access is denied` leyendo `C:\Users\<usuario>\.docker\config.json`, corregí permisos/Docker Desktop antes de usar la DB local.
- Para remoto, usá `supabase login` y `supabase link` fuera del repo.
- Remote project credentials: guardalas en Supabase/Vercel o variables locales, nunca en Git.
- Do not commit secrets.
## Supabase: migraciÃƒÂ³n y seed

| Entorno | Comando recomendado | Nota |
|---|---|---|
| Local | `npm run supabase:start` Ã¢â€ â€™ `npm run supabase:db:reset` | Requiere Docker Desktop. Aplica `supabase/migrations/0001_init.sql` y `supabase/seed.sql`. |
| Remoto vinculado | `supabase db push --include-seed` | UsÃƒÂ¡ `supabase login`/`supabase link` fuera de Git y sin exponer tokens. |
| VerificaciÃƒÂ³n | `npm run supabase:db:lint` | Corre contra la DB local levantada. |

Seed actual esperado para smoke storefront:

- `mate-ceramico-artesanal`
- `set-cucharas-madera`

No uses `supabase db reset --linked`; es destructivo para el remoto.

## Mercado Pago y webhook

1. En Mercado Pago, configurÃƒÂ¡ Checkout Pro con `MP_ACCESS_TOKEN` del entorno correcto.
2. ConfigurÃƒÂ¡ la URL de webhook: `https://<tu-dominio>/api/mercado-pago/webhook`.
3. GuardÃƒÂ¡ el secreto en `MP_WEBHOOK_SECRET`.
4. Las pÃƒÂ¡ginas `/payment/success`, `/payment/failure` y `/payment/pending` son informativas: el pago se confirma solo por webhook firmado.
5. Para E2E, Playwright usa `E2E_MERCADO_PAGO_CHECKOUT_URL` y no realiza llamadas reales a Mercado Pago.

## Deploy en Vercel

Checklist mÃƒÂ­nimo:

- [ ] Crear proyecto en Vercel apuntando a este repo.
- [ ] Configurar todas las variables de entorno de producciÃƒÂ³n.
- [ ] Definir `NEXT_PUBLIC_SITE_URL` con la URL final HTTPS.
- [ ] Aplicar migraciones/seed en Supabase remoto antes del primer release.
- [ ] Configurar el webhook de Mercado Pago contra `/api/mercado-pago/webhook`.
- [ ] Ejecutar `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` y `npm run build` antes de promover.

## Admin

- Supabase Auth se usa solo para administradores.
- `/admin/*` estÃƒÂ¡ protegido por middleware y por guards en server actions.
- El smoke E2E autenticado necesita un usuario real con perfil `admin`; si no seteÃƒÂ¡s `ADMIN_E2E_EMAIL`/`ADMIN_E2E_PASSWORD`, Playwright verifica guard/login y saltea ese smoke.

## Analytics

Meta Pixel y GTM son opcionales. La app no renderiza snippets vacÃƒÂ­os, placeholders ni IDs malformados.