export default [
  {
    title: 'Inicio',
    to: { name: 'root' },
    icon: { icon: 'tabler-smart-home' },
  },
  {
    title: 'Facturas',
    to: { name: 'facturas' },
    icon: { icon: 'tabler-file-invoice' },
  },
  {
    title: 'Pagos',
    to: { name: 'pagos' },
    icon: { icon: 'tabler-receipt-2' },
  },
  {
    title: 'Extractos',
    to: { name: 'extractos' },
    icon: { icon: 'tabler-building-bank' },
  },
  {
    title: 'Maestros',
    icon: { icon: 'tabler-database' },
    children: [
      { title: 'Proveedores', to: { name: 'proveedores' } },
      { title: 'Clientes', to: { name: 'clientes' } },
      { title: 'Entidades', to: { name: 'entidades' } },
      { title: 'Tipos de Pago', to: { name: 'tipos-pago' } },
      { title: 'Cuentas de Gasto', to: { name: 'codigos-cuenta-gasto' } },
    ],
  },
  {
    title: 'Administración',
    icon: { icon: 'tabler-shield-lock' },
    children: [
      { title: 'Usuarios', to: { name: 'usuarios' } },
    ],
  },
]
