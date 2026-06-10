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
  empresaId: number | null
  empresaNombre: string | null
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

export interface EmpresaDto {
  id: number
  nombre: string
  cif?: string
  codigoInterno: string
  activa: boolean
  creadaEn?: string
  logoUrl?: string
  emailContacto?: string
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
  proveedorFacturaDireccion?: string
  proveedorFacturaCodigoPostal?: string
  entidadId?: number
  entidadNombre?: string
  tipoPagoId?: number
  tipoPagoNombre?: string
  codigoCuentaGastoId?: number
  codigoCuentaGastoCodigo?: string
  lineasIva: IvaLineaDto[]
}

export interface FacturaConciliacionImporteMovimientoDto {
  movimientoId: number
  extractoId?: number
  extractoEtiqueta?: string
  fechaMovimiento?: string
  concepto?: string
  importe?: number
  conceptoOk: boolean
  facturaProveedorId?: number
  facturaProveedorNumero?: string
}

export interface FacturaConciliacionImporteDto {
  facturaId: number
  facturaNumero?: string
  facturaFecha?: string
  proveedorNombre?: string
  importeTotal?: number
  libreParaConciliacion: boolean
  movimientoConceptoOk: boolean
  movimientos: FacturaConciliacionImporteMovimientoDto[]
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
  rutaDocumento?: string
  clienteId?: number
  clienteNombre?: string
  clienteCif?: string
}

export interface FacturaEmitidaDraftDto {
  numeroFactura?: string
  fechaFactura?: string
  clienteNombre?: string
  clienteCif?: string
  referencia?: string
  formaPago?: string
  importe?: number
  baseImponible?: number
  iva?: number
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
  movimientosConciliados: number
  movimientosTotales: number
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

export interface ConceptoNoConciliableDto {
  id: number
  texto: string
  activo: boolean
}

export interface MovimientoBancarioAdminDto {
  id: number
  extractoId?: number
  banco?: string
  nombreFichero?: string
  fechaSubida?: string
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

export interface PagoDto {
  id: number
  tipoPagoId?: number
  tipoPagoNombre?: string
  fechaPago?: string
  importePago?: number
  facturasProveedorIds: number[]
  facturasProveedorNumeros: string[]
}

export interface RemesaDomiciliacionDto {
  ordenLinea: number
  cifDeudor?: string
  nombreDeudor?: string
  importe?: number
  textoLinea?: string
  numeroFacturaQ19?: string
  facturaEmitidaId?: number
}

export interface ImportacionExtractoResponse {
  ok: boolean
  extractoId: number
  movimientosGuardados: number
  filasIgnoradas: number
  mensaje: string
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
  search?: string
}
