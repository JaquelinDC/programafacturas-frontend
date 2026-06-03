# programafacturas-frontend

Frontend separado para consumir la API REST del backend `programafacturas`.

Proyecto original de referencia: `facturacion original-no tocar`.

## Docs

- `ARCHITECTURE.md`
- `PROJECT_STRUCTURE_GUIDE.md`

## Setup

```sh
pnpm install
```

## Development

```sh
pnpm dev
```

## Production

```sh
pnpm build
```

## Notes

- La API base se configura en `VITE_API_BASE_URL`.
- El token JWT se maneja en `src/stores/auth.ts`.
