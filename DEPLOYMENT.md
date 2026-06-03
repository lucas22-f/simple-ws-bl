# Deployment

Guía corta para publicar la tienda en Vercel sin exponer secretos.

## Estado verificado

- Stack: Next.js 15 App Router.
- Provider recomendado: Vercel.
- Build local verificado con `npm run build`.
- No hay configuración especial requerida en `vercel.json`.
- Las imágenes remotas aceptan `https://*.supabase.co` desde `next.config.ts`.

## Variables requeridas en Vercel

Configurar estas variables para `Production` y `Preview`:

| Variable | Tipo | Nota |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Pública | URL pública final de la app. Después del primer deploy, actualizarla al dominio real. |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Pública | Publishable/anon key de Supabase. |
| `SUPABASE_SECRET_KEY` | Secreta | Key privilegiada. Nunca exponer al cliente. |
| `ADMIN_REGISTRATION_SECRET` | Secreta | Secreto privado para crear admins en `/admin/register`. |
| `MP_ACCESS_TOKEN` | Secreta | Access token de Mercado Pago del entorno correcto. |
| `MP_WEBHOOK_SECRET` | Secreta | Secreto del webhook de Mercado Pago. |

Variables opcionales:

| Variable | Nota |
|---|---|
| `NEXT_PUBLIC_META_PIXEL_ID` | Solo si se usa Meta Pixel. |
| `NEXT_PUBLIC_GTM_ID` | Solo si se usa Google Tag Manager. |

No subir `.env.local` a Git.

## Configuración externa post-deploy

1. En Vercel, desplegar el proyecto.
2. Actualizar `NEXT_PUBLIC_SITE_URL` con el dominio final, por ejemplo `https://tu-dominio.vercel.app`.
3. En Mercado Pago, configurar el webhook:
   - `https://tu-dominio.vercel.app/api/mercado-pago/webhook`
4. Si se usa dominio propio, cambiar `NEXT_PUBLIC_SITE_URL` al dominio propio y redeployar.
5. Validar:
   - `/catalog`
   - `/products/<slug>`
   - `/checkout`
   - `/admin/login`
   - creación de preferencia de Mercado Pago
   - recepción de webhook de Mercado Pago

## Comandos locales antes de deploy

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Para una verificación rápida mínima, `npm run build` ya corre compilación, lint y chequeo de tipos dentro del pipeline de Next.
