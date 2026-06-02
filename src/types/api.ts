// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number // segundos
  username: string
  nombreCompleto: string
  rol: string
}

// ─── Wrappers genéricos ───────────────────────────────────────────────────────

export interface ApiResponse<T> {
  ok: boolean
  message: string
  data: T
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

// ─── Maestros ────────────────────────────────────────────────────────────────

export interface ProveedorDto {
  id: number
  nombre: string
  observaciones?: string
  localidad?: string
}

export interface ProveedorFacturaDto {
  id: number
  cif?: string
  nombre: string
  direccion?: string
  codigoPostal?: string
  localidad?: string
  codigoContable?: string
}

export interface ClienteDto {
  id: number
  cif?: string
  nombre: string
  direccion?: string
  codigoPostal?: string
  localidad?: string
  codigoContable?: string
}

export interface TipoPagoDto {
  id: number
  nombre: string
  orden?: number
  activo: boolean
}

export interface EntidadDto {
  id: number
  nombre: string
  codigo?: string
  ordenVisual?: number
  activo: boolean
}

export interface CodigoCuentaGastoDto {
  id: number
  codigo: string
  descripcion: string
  comun: boolean
}

export interface UsuarioDto {
  id: number
  username: string
  nombreCompleto: string
  rol: string
  activo: boolean
}

// ─── Facturas ────────────────────────────────────────────────────────────────

export interface IvaLineaDto {
  id: number
  porcentajeIva: number
  baseImponible: number
  cuotaIva: number
}

export interface FacturaProveedorDto {
  id: number
  tipo?: string
  tipoFacturaFiscal?: string
  numeroFactura?: string
  fechaFactura?: string
  fechaPeticionFactura?: string
  fechaCreacion?: string
  fechaExportacionContabilidad?: string
  baseImponible?: number
  iva?: number
  irpf?: number
  importeTotal?: number
  facturaEnDolares: boolean
  conceptoGeneral?: string
  incidencias?: string
  incidenciasNotas?: string
  estado?: string
  comentarioPagoCajaOtros?: string
  rutaPdf?: string
  procesadaIa: boolean
  proveedorFacturaId?: number
  proveedorFacturaNombre?: string
  proveedorFacturaCif?: string
  entidadId?: number
  entidadNombre?: string
  tipoPagoId?: number
  tipoPagoNombre?: string
  codigoCuentaGastoId?: number
  codigoCuentaGastoCodigo?: string
  lineasIva: IvaLineaDto[]
}

export interface FacturaEmitidaDto {
  id: number
  numeroFactura?: string
  fechaFactura?: string
  referencia?: string
  formaPago?: string
  importe?: number
  baseImponible?: number
  iva?: number
  clienteId?: number
  clienteNombre?: string
  clienteCif?: string
}

// ─── Extractos ───────────────────────────────────────────────────────────────

export interface ExtractoBancarioDto {
  id: number
  fechaSubida?: string
  banco?: string
  formatoOrigen?: string
  tipoContenidoExtracto?: string
  fechaInicioMovimientos?: string
  fechaFinMovimientos?: string
  nombreFichero?: string
}

export interface ExtractoBancarioMovimientoDto {
  id: number
  extractoBancarioId?: number
  tipoLineaExtracto?: string
  fechaMovimiento?: string
  concepto?: string
  observaciones?: string
  importe?: number
  excluidoConciliacion: boolean
  conceptoNoConciliable: boolean
  pagoId?: number
  facturaProveedorId?: number
  facturaProveedorNumero?: string
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

export interface FacturaFiltrosRequest {
  fechaDesde?: string
  fechaHasta?: string
  preset?: string
  fechaCreacionDesde?: string
  fechaCreacionHasta?: string
  presetCreacion?: string
  fechaPeticionDesde?: string
  fechaPeticionHasta?: string
  proveedorNombre?: string
  importeMin?: number
  importeMax?: number
  entidadId?: number
  tipo?: string
  tipoFiscal?: string
  estado?: string
  soloConIncidencias?: boolean
  contabilidadExportada?: boolean
  conciliadaConExtracto?: boolean
}
