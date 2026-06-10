<script setup lang="ts">
import { $api } from '@/utils/api'
import type { ProveedorFacturaDto } from '@/types/api'

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
})

const form = ref(emptyForm())

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
    }
  }
})

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
