export default [
  // ─── General ──────────────────────────────────────────────────────────────
  {
    title: 'Inicio',
    to: { name: 'root' },
    icon: { icon: 'tabler-smart-home' },
  },

  // ─── Facturas recibidas ────────────────────────────────────────────────────
  { heading: 'Facturas' },
  {
    title: 'Facturas Proveedores',
    to: { name: 'facturas' },
    icon: { icon: 'tabler-file-invoice' },
  },
  {
    title: 'Facturas Emitidas',
    to: { name: 'facturas-emitidas' },
    icon: { icon: 'tabler-file-text' },
  },

  // ─── Extractos ─────────────────────────────────────────────────────────────
  { heading: 'Bancario' },
  {
    title: 'Extractos Bancarios',
    to: { name: 'extractos' },
    icon: { icon: 'tabler-building-bank' },
  },

  // ─── Maestros ──────────────────────────────────────────────────────────────
  { heading: 'Maestros' },
  {
    title: 'Proveedores',
    to: { name: 'proveedores' },
    icon: { icon: 'tabler-truck' },
  },
  {
    title: 'Clientes',
    to: { name: 'clientes' },
    icon: { icon: 'tabler-users' },
  },
  {
    title: 'Entidades',
    to: { name: 'entidades' },
    icon: { icon: 'tabler-building' },
  },
  {
    title: 'Tipos de Pago',
    to: { name: 'tipos-pago' },
    icon: { icon: 'tabler-credit-card' },
  },
  {
    title: 'Cuentas de Gasto',
    to: { name: 'codigos-cuenta-gasto' },
    icon: { icon: 'tabler-report-money' },
  },

  // ─── Administración (solo ADMINISTRADOR) ───────────────────────────────────
  { heading: 'Administración' },
  {
    title: 'Usuarios',
    to: { name: 'usuarios' },
    icon: { icon: 'tabler-user-cog' },
  },
]
