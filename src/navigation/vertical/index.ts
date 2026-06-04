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

  // ─── Bancario ──────────────────────────────────────────────────────────────
  { heading: 'Bancario' },
  {
    title: 'Pagos',
    to: { name: 'pagos' },
    icon: { icon: 'tabler-receipt-2' },
  },
  {
    title: 'Extractos Bancarios',
    to: { name: 'extractos' },
    icon: { icon: 'tabler-building-bank' },
  },
  {
    title: 'Conceptos No Conciliables',
    to: { name: 'pagos-conciliacion-conceptos' },
    icon: { icon: 'tabler-ban' },
  },
  {
    title: 'Movimientos Bancarios',
    to: { name: 'pagos-movimientos-bancarios' },
    icon: { icon: 'tabler-list-search' },
  },

  // ─── Maestros ──────────────────────────────────────────────────────────────
  { heading: 'Maestros' },
  {
    title: 'Proveedores',
    to: { name: 'proveedores' },
    icon: { icon: 'tabler-truck' },
  },
  {
    title: 'Proveedores Factura',
    to: { name: 'proveedores-factura' },
    icon: { icon: 'tabler-building-warehouse' },
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
