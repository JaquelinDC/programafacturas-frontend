export interface EstadoStats {
  count: number
  importe: number
}

export interface GastoPorMes {
  mes: string
  base: number
  iva: number
  total: number
}

export interface FacturacionEmitidaPorMes {
  mes: string
  total: number
  cobrado: number
}

export interface TopProveedor {
  nombre: string
  importe: number
  count: number
}

export interface FacturaResumen {
  id: number
  proveedor: string
  importe: number
  estado: string
  incidencia: string
  fechaFactura: string
}

export interface MovimientoResumen {
  id: number
  fecha: string
  concepto: string
  importe: number
}

export interface DashboardResumen {
  facturasPorEstado: Record<string, EstadoStats>
  totalConIncidencias: number
  sinExportarContabilidad: EstadoStats
  movimientosSinConciliar: number
  gastoPorMes: GastoPorMes[]
  facturacionEmitidaPorMes: FacturacionEmitidaPorMes[]
  topProveedores: TopProveedor[]
  ultimasFacturasConIncidencias: FacturaResumen[]
  movimientosPendientesRecientes: MovimientoResumen[]
}
