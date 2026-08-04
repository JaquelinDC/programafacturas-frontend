// Selector global de año + trimestre: aplica a todas las pantallas que filtran por periodo
// (Facturas proveedor, Dashboard, Facturas emitidas). Se persiste en cookie (por navegador,
// no por usuario) para recordar la última selección al volver a entrar.

function trimestreDeFecha(fecha: Date): number {
  return Math.floor(fecha.getMonth() / 3) + 1
}

function inicioTrimestre(anio: number, trimestre: number): Date {
  return new Date(anio, (trimestre - 1) * 3, 1)
}

function finTrimestre(anio: number, trimestre: number): Date {
  return new Date(anio, (trimestre - 1) * 3 + 3, 0)
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const usePeriodoStore = defineStore('periodo', () => {
  const hoy = new Date()

  const anio = useCookie<number>('periodoAnio', { default: () => hoy.getFullYear() })
  // 1-4 = trimestre concreto; 0 = año completo.
  const trimestre = useCookie<number>('periodoTrimestre', { default: () => trimestreDeFecha(hoy) })

  const anios = computed(() => {
    const actual = hoy.getFullYear()
    return Array.from({ length: 6 }, (_, i) => actual - i)
  })

  const trimestreOptions = [
    { title: 'Año completo', value: 0 },
    { title: 'T1 (enero - marzo)', value: 1 },
    { title: 'T2 (abril - junio)', value: 2 },
    { title: 'T3 (julio - septiembre)', value: 3 },
    { title: 'T4 (octubre - diciembre)', value: 4 },
  ]

  const fechaDesde = computed(() =>
    toIsoDate(trimestre.value >= 1 && trimestre.value <= 4
      ? inicioTrimestre(anio.value, trimestre.value)
      : new Date(anio.value, 0, 1)),
  )

  const fechaHasta = computed(() =>
    toIsoDate(trimestre.value >= 1 && trimestre.value <= 4
      ? finTrimestre(anio.value, trimestre.value)
      : new Date(anio.value, 11, 31)),
  )

  function setPeriodo(nuevoAnio: number, nuevoTrimestre: number) {
    anio.value = nuevoAnio
    trimestre.value = nuevoTrimestre
  }

  return {
    anio,
    trimestre,
    anios,
    trimestreOptions,
    fechaDesde,
    fechaHasta,
    setPeriodo,
  }
})
