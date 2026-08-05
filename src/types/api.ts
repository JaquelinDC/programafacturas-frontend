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
  tenantKey: string | null
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

export type TipoFacturaConciliacion = 'PROVEEDOR' | 'EMITIDA'

export interface ConciliacionResumenDto {
  facturasProveedorPendientes: number
  facturasEmitidasPendientes: number
  movimientosPendientes: number
}

export interface ConciliacionFacturaDto {
  tipo: TipoFacturaConciliacion
  id: number
  numero?: string
  tercero?: string
  fecha?: string
  importe?: number
  estado?: string
  conciliada: boolean
  movimientoIds: number[]
}

export interface ConciliacionFacturaRefDto {
  tipo: TipoFacturaConciliacion
  id: number
  numero?: string
}

export interface ConciliacionMovimientoDto {
  id: number
  extractoId?: number
  banco?: string
  fecha?: string
  concepto?: string
  observaciones?: string
  importe?: number
  estado: 'PENDIENTE' | 'CONCILIADO' | 'PAGO' | 'EXCLUIDO' | 'NO_CONCILIABLE'
  facturas: ConciliacionFacturaRefDto[]
}

export interface ConciliacionCoincidenciaDto {
  diferenciaImporte?: number
  diferenciaDias?: number
  coincideImporte: boolean
  coincideFecha: boolean
  coincideTexto: boolean
  requiereConfirmacion: boolean
  avisos: string[]
}

export interface ConciliacionCandidatoMovimientoDto {
  movimiento: ConciliacionMovimientoDto
  coincidencia: ConciliacionCoincidenciaDto
  descartado: boolean
}

export interface ConciliacionCandidatoFacturaDto {
  factura: ConciliacionFacturaDto
  coincidencia: ConciliacionCoincidenciaDto
  descartado: boolean
}

export interface ConciliacionEnlaceRequest {
  tipoFactura: TipoFacturaConciliacion
  facturaIds: number[]
  movimientoIds: number[]
  confirmarManual: boolean
}

export interface ConciliacionDesenlaceRequest {
  tipoFactura: TipoFacturaConciliacion
  facturaId: number
  movimientoId: number
}

export interface ConciliacionDescarteRequest {
  tipoFactura: TipoFacturaConciliacion
  facturaId: number
  movimientoId: number
  motivo?: string
}

export interface ConciliacionDescarteParDto {
  facturaId: number
  movimientoId: number
}

export interface ConciliacionDescarteLoteRequest {
  tipoFactura: TipoFacturaConciliacion
  pares: ConciliacionDescarteParDto[]
  motivo?: string
}

export interface ConciliacionResultadoDto {
  ok: boolean
  enlacesAfectados: number
  mensaje: string
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
  tipoFacturacion?: string
  codigoCuentaGastoId?: number
  codigoCuentaGastoCodigo?: string
}

export interface ConceptoMovimientoConciliacionDto {
  id: number
  texto: string
  textoNormalizado: string
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
  empresaId?: number | null
  empresaNombre?: string | null
  tenantKey?: string | null
}

export interface EmpresaDto {
  id: number
  nombre: string
  cif?: string
  codigoInterno: string
  slug?: string
  activa: boolean
  creadaEn?: string
  createdAt?: string
  updatedAt?: string
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
  fechaTrimestre?: string
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
  observaciones?: string
  importe?: number
  conceptoOk: boolean
  score: number
  confidence?: string
  reasons: string[]
  facturaProveedorId?: number
  facturaProveedorNumero?: string
}

export interface FacturaProveedorResumenDto {
  id?: number
  numeroFactura?: string
}

export interface FacturaConciliacionImporteDto {
  facturaId: number
  facturaNumero?: string
  facturaFecha?: string
  proveedorNombre?: string
  proveedorFacturaId?: number
  importeTotal?: number
  libreParaConciliacion: boolean
  movimientoConceptoOk: boolean
  rutaPdf?: string
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
  facturasProveedor: FacturaProveedorResumenDto[]
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
  facturasProveedor: FacturaProveedorResumenDto[]
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
  anio?: number
  trimestre?: number
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

// â”€â”€â”€ AI chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface AiChatMessageRequest {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AiChatRequest {
  question: string
  scope?: string
  periodPreset?: string
  fromDate?: string
  toDate?: string
  messages?: AiChatMessageRequest[]
}

export interface AiChatMetricDto {
  label: string
  value: string
  detail?: string
  trend?: string
}

export interface AiChatResponse {
  answer: string
  sourceSummary: string
  scopeLabel: string
  periodLabel: string
  metrics: AiChatMetricDto[]
  suggestedQuestions: string[]
  dataNotes: string[]
}
