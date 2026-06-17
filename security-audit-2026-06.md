# Auditoría de Seguridad — Tienda Simple Moderna

**Fecha**: 2026-06-17  
**Tipo**: Auditoría ofensiva con 3 exploradores  
**Stack**: Next.js 15 App Router, Supabase SSR, MercadoPago, React 19, Zod, Zustand

---

## Resumen de Riesgos

| Nivel | Cantidad |
|-------|----------|
| 🔴 **CRÍTICO** | 1 |
| 🟠 **ALTO** | 3 |
| 🟡 **MEDIO** | 5 |
| ⚠️ **BAJO** | 5 |
| ℹ️ **INFORMATIVO** | 1 |

**Puntaje general**: 7.5 / 10 — Sólido en arquitectura y defensa en profundidad, pero con agujeros concretos que corregir antes de producción.

---

## 🔴 CRÍTICO

### C1 — Webhook de MercadoPago no llega nunca

| Campo | Detalle |
|-------|---------|
| **Archivo** | `src/server/checkout/create-preference.ts:27-38` |
| **Riesgo** | 🔴 **CRÍTICO** |
| **Problema** | Se llama a `gateway.createPreference()` sin pasar `notificationUrl`. El campo existe en `PreferenceRequest`, pero ningún llamador lo completa. MP no sabe a dónde enviar el webhook. |
| **Explotabilidad** | El flujo de pago completo está roto: la orden queda `pending` para siempre, el stock se reserva y expira a los 30 min, `PaymentReturnCartSync` hace retry 12 veces y falla. |
| **Fix** | Pasar `notification_url` armado con la URL base del sitio + `/api/mercado-pago/webhook` antes de crear la preferencia. |

---

## 🟠 ALTO

### A1 — Login de admin sin rate limiting

| Campo | Detalle |
|-------|---------|
| **Archivo** | `src/server/admin/actions/login.ts:66` |
| **Riesgo** | 🟠 **ALTO** |
| **Problema** | `executeAdminLogin` llama a `supabase.auth.signInWithPassword()` sin ningún rate limiter a nivel aplicación. Ya existe infraestructura (`consume_rate_limit`) usada en checkout y registro, pero no en login. |
| **Explotabilidad** | Un atacante que conozca el email de un admin (ej: visible en `/admin/register`) puede force-brutear passwords. Supabase Auth tiene rate limiting a nivel infra pero puede ser muy permisivo para ataque focalizado. |
| **Fix** | Agregar rate limiter por IP y por email al login action, similar a `ADMIN_REGISTRATION_IP_RATE_LIMIT` en `register.ts:101-115`. |

---

### A2 — `order_id` en URL pública sin autenticación

| Campo | Detalle |
|-------|---------|
| **Archivo** | `src/app/api/orders/payment-return/route.ts:4-22` + `src/server/orders/payment-return.ts:40-55` |
| **Riesgo** | 🟠 **ALTO** |
| **Problema** | `GET /api/orders/payment-return?order_id=<uuid>` usa `createSupabaseAdminClient()` (service_role, bypass RLS) y no tiene verificación de autenticación. Cualquiera con un UUID de orden obtiene `paymentStatus` e `items`. |
| **Explotabilidad** | El `order_id` se expone en URLs de retorno de MP (`/payment/success?order_id=X`). Si un usuario comparte esa URL o se filtra por referrer header, cualquiera consulta el estado de pago. Posible enumeración si se consiguen UUIDs válidos. |
| **Fix** | (a) Migrar a `createSupabaseServerClient()` con anon key + RLS policy, o (b) agregar rate limiting (`5 req/min/IP`) al endpoint. |

---

### A3 — Secrets débiles en `.env.local`

| Campo | Detalle |
|-------|---------|
| **Archivo** | `.env.local` |
| **Riesgo** | 🟠 **ALTO** |
| **Problema** | `ADMIN_REGISTRATION_SECRET=clavehypermegasecret`, `SUPABASE_DB_PASSWORD` sin schema/complejidad definida, credenciales E2E hardcodeadas. |
| **Explotabilidad** | Un secret débil permite a un atacante registrarse como admin si descubre la clave. Credenciales E2E en el repo son un riesgo de fuga. |
| **Fix** | Rotar todos los secrets usando `openssl rand -hex 32`. No hardcodear credenciales E2E — usar variables de entorno separadas. |

---

## 🟡 MEDIO

### M1 — Stock decrementado antes de confirmar preferencia MP

| Campo | Detalle |
|-------|---------|
| **Archivo** | `supabase/migrations/0004_inventory_reservations.sql:165-169` |
| **Riesgo** | 🟡 **MEDIO** |
| **Problema** | `create_pending_order` decrementa `stock_quantity` antes de guardar el `mercado_pago_preference_id`. Si el servidor crashea entre ambos pasos, la orden queda huérfana con stock consumido. |
| **Explotabilidad** | Un atacante que spamee checkout (~5 req/min por rate limit) y fuerce errores posteriores podría agotar stock sin órdenes válidas. |
| **Fix** | Mover `setOrderPreference` DENTRO del mismo RPC `create_pending_order`, o agregar job que libere stock de órdenes sin preferencia tras N minutos. |

---

### M2 — Rate limit insuficiente en checkout público

| Campo | Detalle |
|-------|---------|
| **Archivo** | `src/server/security/rate-limit.ts:41-45` |
| **Riesgo** | 🟡 **MEDIO** |
| **Problema** | 5 requests/minuto por IP solamente. Sin autenticación requerida para checkout. Cada request exitosa reserva stock. |
| **Explotabilidad** | Ataque distribuido (~50 IPs) → 250 órdenes/minuto → 12,500 unidades reservadas en una hora en productos sin límite de stock explícito. |
| **Fix** | Agregar segundo bucket de rate limit por email (además de IP). |

---

### M3 — Error leakage en APIs

| Campo | Detalle |
|-------|---------|
| **Archivo** | Varias API routes (`checkout/`, `payment-return/`) |
| **Riesgo** | 🟡 **MEDIO** |
| **Problema** | Errores internos (stack traces, mensajes de Supabase crudos) se devuelven al cliente en ciertos endpoints. |
| **Explotabilidad** | Un atacante obtiene información interna sobre estructura de DB, validaciones y lógica de negocio. |
| **Fix** | Sanitizar errores antes de responder. Usar `NEXT_PUBLIC_VERCEL_ENV` para logging detallado solo en desarrollo. |

---

### M4 — `enable_signup = true` + `enable_confirmations = false`

| Campo | Detalle |
|-------|---------|
| **Archivo** | `supabase/config.toml:51-57` |
| **Riesgo** | 🟡 **MEDIO** |
| **Problema** | `enable_signup = true` y `enable_confirmations = false`. Si se aplica al proyecto linked, cualquiera puede registrar cuenta vía API directa sin confirmación de email. |
| **Explotabilidad** | Un atacante obtiene sesión autenticada con rol `customer`. No accede a admin, pero existe como usuario verificado. Problemático para compliance. |
| **Fix** | En producción: deshabilitar `enable_signup` público o activar `enable_confirmations`. Documentar que estos valores son solo para dev local. |

---

### M5 — Webhook almacena payload completo (posible PII)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `src/server/payments/webhook.ts` |
| **Riesgo** | 🟡 **MEDIO** |
| **Problema** | El handler del webhook almacena el payload completo de MercadoPago en `payment_events`, potencialmente con datos del comprador. |
| **Explotabilidad** | Si la tabla `payment_events` no tiene RLS estricto o hay breach, queda expuesta información personal de clientes. Problemático para GDPR/LOPD. |
| **Fix** | Almacenar solo los campos necesarios (payment_id, status, amount), no el payload crudo. |

---

## ⚠️ BAJO

### B1 — Sin CSRF tokens en server actions de admin

| Campo | Detalle |
|-------|---------|
| **Archivo** | `approvals.ts`, `products.ts`, `orders.ts`, `settings.ts` |
| **Riesgo** | ⚠️ **BAJO** |
| **Problema** | Las server actions de admin no tienen tokens CSRF explícitos. |
| **Mitigación** | SameSite=Lax en cookie de sesión mitiga CSRF cross-site estándar. Riesgo solo desde subdominio comprometido o extensión maliciosa. |
| **Fix** | Verificar el `Origin` header contra `NEXT_PUBLIC_SITE_URL` en cada server action. |

---

### B2 — `unitPriceCents` aceptado del cliente (aunque no usado)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `src/server/checkout/schema.ts:15` |
| **Riesgo** | ⚠️ **BAJO** |
| **Problema** | El schema de checkout acepta `unitPriceCents` como `optional()`. El servidor no lo usa (lo sobreescribe con `product.priceCents` de la DB), pero es un vector de confusión. |
| **Fix** | Eliminar `unitPriceCents` del schema del checkout input. No debería estar en el contrato de la API si el servidor no lo usa. |

---

### B3 — Sin CSRF en endpoint checkout (riesgo teórico)

| Campo | Detalle |
|-------|---------|
| **Archivo** | `src/app/api/checkout/preferences/route.ts` |
| **Riesgo** | ⚠️ **BAJO** |
| **Problema** | El endpoint no tiene token CSRF ni verificación de origen. |
| **Mitigación** | Requiere JSON (no form-urlencoded, no atacable con `<form>` POST), CORS bloquea cross-origin con JSON. Sin sesión de usuario, no hay nada que secuestrar. |
| **Fix** | No urgente hoy. Documentar para futuro si se agrega autenticación. |

---

### B4 — Sin rate limiting en `/api/orders/payment-return`

| Campo | Detalle |
|-------|---------|
| **Archivo** | `src/app/api/orders/payment-return/route.ts` |
| **Riesgo** | ⚠️ **BAJO** |
| **Problema** | Endpoint público que retorna datos de órdenes sin rate limiting. Relacionado con hallazgo A2. |
| **Fix** | Agregar rate limit de 5 req/min/IP. |

---

### B5 — Middleware solo protege `/admin/*`

| Campo | Detalle |
|-------|---------|
| **Archivo** | `src/middleware.ts:54` |
| **Riesgo** | ⚠️ **BAJO** (Informativo) |
| **Problema** | El middleware solo intercepta `/admin/:path*`. No hay validación de sesión en rutas de cliente. |
| **Contexto** | Por diseño (tienda pública con guest checkout). No es bug, pero limita la capacidad de agregar rutas protegidas para customers en el futuro. |
| **Fix** | Documentado. Si se agregan rutas de customer, agregar validación en middleware o en cada server action. |

---

## ✅ Lo que está BIEN (prácticas correctas confirmadas)

| Práctica | Evidencia |
|----------|-----------|
| `"server-only"` en admin client | `admin.ts:1` — evita import accidental desde cliente |
| `supabase.auth.getUser()` (no `getSession()`) | `middleware.ts:34-35`, `auth.ts:15` — verifica JWT contra servidor |
| RLS en TODAS las tablas | `0001_init.sql:221-228` — 7 tablas con RLS activado |
| `is_admin()` chequea `admin_status = 'approved'` | `0006_admin_approval.sql:24` — bloquea admins pendientes |
| Privileged mutations por service_role RPC | `0002_privilege_boundary.sql:17-22` — `create_pending_order` solo service_role |
| Rate limiting en checkout y registro | `rate-limit.ts:41-57` — IP y email limits |
| Timing-safe comparison para secret | `register.ts:61-62` — `timingSafeEqual` + SHA-256 |
| Zod validation en TODOS los inputs | `env.ts`, `products.ts:11-23`, `settings.ts:13-25` |
| `.env` y `.env*.local` en .gitignore | `.gitignore:22-23` |
| Refresh token rotation habilitado | `config.toml:53` — `enable_refresh_token_rotation = true` |
| Concurrencia controlada en PL/pgSQL | `0004_inventory_reservations.sql:59-66` — `for update` lock |
| Precios desde DB (no confía en cliente) | `calculateCheckout` ignora precio del cliente, usa `product.priceCents` |
| Firma de webhook MP | HMAC-SHA256 con `timingSafeEqual` |
| Idempotencia en payment_events | `provider_event_id` con `ON CONFLICT DO NOTHING` |
| Expiración de reserva de stock | `reservation_expires_at = now() + 30 min` |

---

## Prioridades de Acción

| Prioridad | Hallazgo | Esfuerzo estimado |
|-----------|----------|-------------------|
| 🔴 **1. Ayer** | C1 — Arreglar `notification_url` del webhook MP | 15 min |
| 🟠 **2. Ya** | A1 — Rate limiting en login admin | 30 min |
| 🟠 **3. Ya** | A3 — Rotar secrets débiles | 15 min |
| 🟠 **4. Pronto** | A2 — Payment-return con auth o rate limit | 1 hr |
| 🟡 **5. Esta semana** | M1 — Stock decrement antes de confirmar preferencia | 2-3 hr |
| 🟡 **6. Esta semana** | M2 — Rate limit checkout por email | 30 min |
| 🟡 **7. Esta semana** | M3 — Error leakage en APIs | 1 hr |
| 🟡 **8. Esta semana** | M4 — Config.toml para producción | 30 min |
| 🟡 **9. Esta semana** | M5 — Webhook payload sanitization | 30 min |
| ⚠️ **10. Cuando puedas** | B1-B5 — CSRF, schema cleanup, etc. | 2-3 hr |

---

*Generado por 3 exploradores de seguridad ofensiva sobre el código fuente.*
