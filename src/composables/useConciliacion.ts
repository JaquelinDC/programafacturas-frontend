import type {
  ConciliacionCandidatoFacturaDto,
  ConciliacionCandidatoMovimientoDto,
  ConciliacionDesenlaceRequest,
  ConciliacionEnlaceRequest,
  ConciliacionFacturaDto,
  ConciliacionMovimientoDto,
  ConciliacionResultadoDto,
  ConciliacionResumenDto,
  PageResponse,
  TipoFacturaConciliacion,
} from '@/types/api'
import { $api } from '@/utils/api'

export interface ConciliacionBusqueda {
  q?: string
  fechaDesde?: string
  fechaHasta?: string
  importe?: number
  page?: number
  size?: number
}

function params(busqueda: ConciliacionBusqueda, extra: Record<string, unknown> = {}) {
  return {
    q: busqueda.q || undefined,
    fechaDesde: busqueda.fechaDesde || undefined,
    fechaHasta: busqueda.fechaHasta || undefined,
    importe: busqueda.importe ?? undefined,
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
  ) => $api<PageResponse<ConciliacionCandidatoMovimientoDto>>('/conciliacion/candidatos/movimientos', {
    params: params(busqueda, { tipoFactura, facturaId, incluirConciliados: true }),
  })

  const candidatosFacturas = (
    movimientoId: number,
    tipoFactura: TipoFacturaConciliacion,
    busqueda: ConciliacionBusqueda,
  ) => $api<PageResponse<ConciliacionCandidatoFacturaDto>>('/conciliacion/candidatos/facturas', {
    params: params(busqueda, { movimientoId, tipoFactura, incluirConciliadas: true }),
  })

  const enlazar = (body: ConciliacionEnlaceRequest) =>
    $api<ConciliacionResultadoDto>('/conciliacion/enlaces', { method: 'POST', body })

  const desenlazar = (body: ConciliacionDesenlaceRequest) =>
    $api<ConciliacionResultadoDto>('/conciliacion/enlaces', { method: 'DELETE', body })

  return {
    resumen,
    buscarFacturas,
    buscarMovimientos,
    candidatosMovimientos,
    candidatosFacturas,
    enlazar,
    desenlazar,
  }
}
