<script setup lang="ts">
import { $api } from '@/utils/api'
import type { CodigoCuentaGastoDto, ConceptoMovimientoConciliacionDto, ProveedorFacturaDto } from '@/types/api'

interface Props {
  modelValue: boolean
  proveedor?: ProveedorFacturaDto | null
}

const props = withDefaults(defineProps<Props>(), { proveedor: null })

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [proveedor: ProveedorFacturaDto]
}>()

const dialog = computed({
  get: () => props.modelValue,
  set: val => emit('update:modelValue', val),
})

const saving = ref(false)
const errorMsg = ref<string | null>(null)

const emptyForm = () => ({
  cif: '',
  nombre: '',
  direccion: '',
  codigoPostal: '',
  localidad: '',
  codigoContable: '',
  tipoFacturacion: '',
  codigoCuentaGastoId: null as number | null,
})

const form = ref(emptyForm())

const tiposFacturacion = [
  { title: 'Indeterminada', value: 'INDETERMINADA' },
  { title: 'Factura', value: 'FACTURA' },
  { title: 'Ticket', value: 'TICKET' },
  { title: 'Proforma', value: 'PROFORMA' },
]

const codigosCuenta = ref<CodigoCuentaGastoDto[]>([])
const codigosCuentaItems = computed(() =>
  codigosCuenta.value.map(c => ({ title: `${c.codigo} — ${c.descripcion}`, value: c.id }))
)

async function cargarCodigosCuenta() {
  try {
    codigosCuenta.value = await $api<CodigoCuentaGastoDto[]>('/codigos-cuenta-gasto')
  }
  catch {
    codigosCuenta.value = []
  }
}

watch(() => props.modelValue, open => {
  if (open) {
    errorMsg.value = null
    form.value = {
      cif: props.proveedor?.cif ?? '',
      nombre: props.proveedor?.nombre ?? '',
      direccion: props.proveedor?.direccion ?? '',
      codigoPostal: props.proveedor?.codigoPostal ?? '',
      localidad: props.proveedor?.localidad ?? '',
      codigoContable: props.proveedor?.codigoContable ?? '',
      tipoFacturacion: props.proveedor?.tipoFacturacion ?? '',
      codigoCuentaGastoId: props.proveedor?.codigoCuentaGastoId ?? null,
    }
    conceptos.value = []
    nuevoConcepto.value = ''
    if (!codigosCuenta.value.length)
      cargarCodigosCuenta()
    if (props.proveedor?.id)
      cargarConceptos(props.proveedor.id)
  }
})

const conceptos = ref<ConceptoMovimientoConciliacionDto[]>([])
const nuevoConcepto = ref('')
const gestionandoConcepto = ref(false)

async function cargarConceptos(proveedorId: number) {
  try {
    conceptos.value = await $api<ConceptoMovimientoConciliacionDto[]>(`/proveedores-factura/${proveedorId}/conceptos-conciliacion`)
  }
  catch {
    conceptos.value = []
  }
}

async function anadirConcepto() {
  if (!props.proveedor?.id || !nuevoConcepto.value.trim()) return
  gestionandoConcepto.value = true
  errorMsg.value = null
  try {
    const concepto = await $api<ConceptoMovimientoConciliacionDto>(`/proveedores-factura/${props.proveedor.id}/conceptos-conciliacion`, {
      method: 'POST', body: { texto: nuevoConcepto.value },
    })
    if (!conceptos.value.some(item => item.id === concepto.id)) conceptos.value.push(concepto)
    nuevoConcepto.value = ''
  }
  catch (e: any) {
    errorMsg.value = e?.data?.message || 'No se pudo añadir el concepto'
  }
  finally {
    gestionandoConcepto.value = false
  }
}

async function eliminarConcepto(conceptoId: number) {
  if (!props.proveedor?.id) return
  gestionandoConcepto.value = true
  try {
    await $api(`/proveedores-factura/${props.proveedor.id}/conceptos-conciliacion/${conceptoId}`, { method: 'DELETE' })
    conceptos.value = conceptos.value.filter(item => item.id !== conceptoId)
  }
  catch (e: any) {
    errorMsg.value = e?.data?.message || 'No se pudo eliminar el concepto'
  }
  finally {
    gestionandoConcepto.value = false
  }
}

async function save() {
  if (!form.value.nombre.trim()) {
    errorMsg.value = 'El nombre es obligatorio'
    return
  }
  saving.value = true
  errorMsg.value = null
  try {
    let result: ProveedorFacturaDto
    if (props.proveedor?.id) {
      result = await $api<ProveedorFacturaDto>(`/proveedores-factura/${props.proveedor.id}`, {
        method: 'PUT',
        body: form.value,
      })
    }
    else {
      result = await $api<ProveedorFacturaDto>('/proveedores-factura', {
        method: 'POST',
        body: form.value,
      })
    }
    emit('saved', result)
    dialog.value = false
  }
  catch (e: any) {
    errorMsg.value = e?.data?.message || (e?.status ? `Error ${e.status} al guardar` : 'Error al guardar')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <VDialog v-model="dialog" max-width="560" persistent>
    <VCard :title="proveedor ? 'Editar proveedor de factura' : 'Nuevo proveedor de factura'">
      <DialogCloseBtn @click="dialog = false" />
      <VCardText>
        <VAlert v-if="errorMsg" type="error" variant="tonal" density="compact" class="mb-4">
          {{ errorMsg }}
        </VAlert>
        <VForm @submit.prevent="save">
          <VRow>
            <VCol cols="12" sm="6">
              <AppTextField v-model="form.cif" label="CIF" />
            </VCol>
            <VCol v-if="proveedor" cols="12" sm="6">
              <AppTextField v-model="form.codigoContable" label="Código Contable" />
            </VCol>
            <VCol cols="12">
              <AppTextField v-model="form.nombre" label="Nombre *" required />
            </VCol>
            <VCol cols="12">
              <AppTextField v-model="form.direccion" label="Dirección" />
            </VCol>
            <VCol cols="12" sm="4">
              <AppTextField v-model="form.codigoPostal" label="C.P." />
            </VCol>
            <VCol cols="12" sm="8">
              <AppTextField v-model="form.localidad" label="Localidad" />
            </VCol>
            <VCol cols="12" sm="6">
              <AppSelect
                v-model="form.tipoFacturacion"
                label="Tipo facturación (por defecto)"
                :items="tiposFacturacion"
                clearable
              />
            </VCol>
            <VCol cols="12" sm="6">
              <AppSelect
                v-model="form.codigoCuentaGastoId"
                label="Cód. cuenta gasto (por defecto)"
                :items="codigosCuentaItems"
                clearable
              />
            </VCol>
            <VCol v-if="proveedor" cols="12">
              <div class="text-subtitle-2 mb-2">Conceptos aprendidos de movimientos</div>
              <div class="d-flex gap-2 mb-2">
                <AppTextField v-model="nuevoConcepto" label="Concepto u observación" hide-details @keyup.enter="anadirConcepto" />
                <VBtn :loading="gestionandoConcepto" @click="anadirConcepto">Añadir</VBtn>
              </div>
              <div v-if="conceptos.length" class="d-flex flex-wrap gap-2">
                <VChip v-for="concepto in conceptos" :key="concepto.id" closable @click:close="eliminarConcepto(concepto.id)">
                  {{ concepto.texto }}
                </VChip>
              </div>
              <div v-else class="text-disabled text-body-2">Todavía no hay conceptos asociados.</div>
            </VCol>
          </VRow>
        </VForm>
      </VCardText>
      <VCardActions class="justify-end pt-0 pb-4 px-6">
        <VBtn variant="tonal" @click="dialog = false">Cancelar</VBtn>
        <VBtn :loading="saving" @click="save">Guardar</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
