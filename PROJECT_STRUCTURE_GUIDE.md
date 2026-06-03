# Project Structure Guide

Guía práctica de estructura y buenas prácticas para `programafacturas-frontend`.

## Folder Guide

- `src/pages`: pantallas y rutas.
- `src/components`: componentes reutilizables.
- `src/composables`: lógica compartida por composición.
- `src/stores`: stores de Pinia.
- `src/utils`: cliente API, helpers y utilidades.
- `src/types`: tipos TypeScript compartidos.
- `src/layouts`: layouts y componentes de layout.

## Module Rules

- Cada módulo funcional debe tener su propia pantalla o conjunto de pantallas.
- El acceso a API debe estar centralizado.
- El estado de autenticación debe vivir en un único store.
- Las tablas, formularios y modales deben ser reutilizables.

## Naming Conventions

- Usa nombres de módulo consistentes con el backend.
- Mantén rutas de frontend alineadas con recursos reales:
  - `facturas`
  - `facturas-emitidas`
  - `extractos`
  - `proveedores`
  - `clientes`
  - `usuarios`
  - `tipos-pago`

## Good Practices

- Usa un cliente HTTP único.
- Maneja errores 401 de forma centralizada.
- No copies lógica de negocio del backend.
- Mantén los componentes de página lo más simples posible.
- Usa stores solo para estado compartido.

## What To Avoid

- Llamadas a API repetidas en múltiples componentes.
- Lógica de permisos repartida por muchas pantallas.
- Formularios acoplados a la estructura interna del backend.
- Mezclar helpers de dominio con componentes visuales.

## Quick Checklist

- [ ] `src/utils/api.ts` es el único punto de salida HTTP.
- [ ] `src/stores/auth.ts` controla la sesión.
- [ ] Las páginas están separadas por módulo.
- [ ] Los componentes reutilizables no tienen lógica de negocio.
- [ ] Las rutas coinciden con las necesidades del backend.
