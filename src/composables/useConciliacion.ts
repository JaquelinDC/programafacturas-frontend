import type {
  ConciliacionCandidatoFacturaDto,
  ConciliacionCandidatoMovimientoDto,
  ConciliacionDescarteLoteRequest,
  ConciliacionDescarteRequest,
  ConciliacionDesenlaceRequest,
  ConciliacionEnlaceRequest,
  ConciliacionFacturaDto,
  ConciliacionMovimientoDto,
  ConciliacionResultadoDto,
  ConciliacionResumenDto,
  FacturaProveedorDto,
  PageResponse,
  ProveedorFacturaDto,
  TipoFacturaConciliacion,
} from '@/types/api'
import { $api } from '@/utils/api'

export interface ConciliacionBusqueda {
  q?: string
  fechaDesde?: string
  fechaHasta?: string
  importe?: number
  proveedorId?: number
  page?: number
  size?: number
}

function params(busqueda: ConciliacionBusqueda, extra: Record<string, unknown> = {}) {
  return {
    q: busqueda.q || undefined,
    fechaDesde: busqueda.fechaDesde || undefined,
    fechaHasta: busqueda.fechaHasta || undefined,
    importe: busqueda.importe ?? undefined,
    proveedorId: busqueda.proveedorId ?? undefined,
    page: busqueda.page ?? 0,
    size: busqueda.size ?? 20,
    ...extra,
  }
}

export function useConciliacion() {
  const resumen = () => $api<ConciliacionResumenDto>('/conciliacion/resumen')

  const buscarFacturas = (
    tipo: TipoFacturaConciliacion,
    busqueda: ConciliacionBusqueda,
    incluirConciliadas = false,
  ) => $api<PageResponse<ConciliacionFacturaDto>>('/conciliacion/facturas', {
    params: params(busqueda, { tipo, incluirConciliadas }),
  })

  const buscarMovimientos = (
    busqueda: ConciliacionBusqueda,
    incluirConciliados = false,
  ) => $api<PageResponse<ConciliacionMovimientoDto>>('/conciliacion/movimientos', {
    params: params(busqueda, { incluirConciliados }),
  })

  const candidatosMovimientos = (
    tipoFactura: TipoFacturaConciliacion,
    facturaId: number,
    busqueda: ConciliacionBusqueda,
    incluirDescartados = false,
  ) => $api<PageResponse<ConciliacionCandidatoMovimientoDto>>('/conciliacion/candidatos/movimientos', {
    params: params(busqueda, { tipoFactura, facturaId, incluirConciliados: true, incluirDescartados }),
  })

  const candidatosFacturas = (
    movimientoId: number,
    tipoFactura: TipoFacturaConciliacion,
    busqueda: ConciliacionBusqueda,
    incluirDescartados = false,
  ) => $api<PageResponse<ConciliacionCandidatoFacturaDto>>('/conciliacion/candidatos/facturas', {
    params: params(busqueda, { movimientoId, tipoFactura, incluirConciliadas: true, incluirDescartados }),
  })

  const enlazar = (body: ConciliacionEnlaceRequest) =>
    $api<ConciliacionResultadoDto>('/conciliacion/enlaces', { method: 'POST', body })

  const desenlazar = (body: ConciliacionDesenlaceRequest) =>
    $api<ConciliacionResultadoDto>('/conciliacion/enlaces', { method: 'DELETE', body })

  const descartar = (body: ConciliacionDescarteRequest) =>
    $api<ConciliacionResultadoDto>('/conciliacion/descartes', { method: 'POST', body })

  const deshacerDescarte = (body: ConciliacionDescarteRequest) =>
    $api<ConciliacionResultadoDto>('/conciliacion/descartes', { method: 'DELETE', body })

  const descartarLote = (body: ConciliacionDescarteLoteRequest) =>
    $api<ConciliacionResultadoDto>('/conciliacion/descartes/lote', { method: 'POST', body })

  const marcarCaja = (facturaId: number, comentario?: string) =>
    $api<FacturaProveedorDto>(`/facturas/${facturaId}/marcar-caja`, { method: 'POST', body: { comentario } })

  const proveedores = () => $api<ProveedorFacturaDto[]>('/proveedores-factura')

  return {
    resumen,
    buscarFacturas,
    buscarMovimientos,
    candidatosMovimientos,
    candidatosFacturas,
    enlazar,
    desenlazar,
    descartar,
    deshacerDescarte,
    descartarLote,
    marcarCaja,
    proveedores,
  }
}
