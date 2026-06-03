# Architecture

Proyecto original de referencia: `facturacion original-no tocar`.
Objetivo: consumir la API REST del backend `programafacturas` desde este frontend separado.

## Frontend Stack

- Vue 3
- Vite
- TypeScript
- Vuetify
- Pinia
- Vue Router

## Structure

### Recommended folders

- `src/pages`
  - Pantallas y rutas.
- `src/components`
  - Componentes reutilizables.
- `src/composables`
  - Lógica reutilizable por composición.
- `src/stores`
  - Estado global, auth y sesión de UI.
- `src/utils`
  - Cliente API, constantes y helpers.
- `src/types`
  - Tipos compartidos y contratos API.
- `src/layouts`
  - Layouts de aplicación.

### Current project pattern

- Pages are feature-oriented.
- API access is centralized in `src/utils/api.ts`.
- Auth state is centralized in `src/stores/auth.ts`.
- Route-level pages live in `src/pages`.

## Rules

- Keep HTTP calls out of random UI components.
- Centralize backend access in `src/utils` or `src/composables`.
- Keep pages thin and focused on composition.
- Reuse table, form and dialog components.
- Use backend as the source of truth for filtering and validation.

## API Integration

- Base URL comes from `VITE_API_BASE_URL`.
- JWT token is stored in cookie `accessToken`.
- Requests automatically include `Authorization: Bearer <token>`.
- On `401`, the app clears auth and redirects to `/login`.

## Feature Areas

- `auth`
- `dashboard`
- `facturas`
- `facturas-emitidas`
- `extractos`
- `proveedores`
- `clientes`
- `usuarios`
- `tipos-pago`

## Best Practices

- Keep API DTOs aligned with backend DTOs.
- Avoid duplicating business rules in the frontend.
- Build reusable filters for list screens.
- Handle loading and error states consistently.
- Prefer explicit domain stores when state is shared.

## Anti-Patterns

- Calling the backend directly from templates.
- Mixing route logic, API logic and UI logic in the same file.
- Duplicating auth logic across pages.
- Hardcoding backend URLs in views.
