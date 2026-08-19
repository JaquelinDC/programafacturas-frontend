<script setup lang="ts">
import { useObjectUrl } from '@vueuse/core'
import type { EmpresaDto } from '@/types/api'
import { $api, apiErrorMessage } from '@/utils/api'
import { MAX_LOGO_HEIGHT, MIN_LOGO_HEIGHT, resolveLogoUrl } from '@/utils/empresaBranding'
import { getReadableOnColor } from '@core/utils/colorConverter'
import { emailValidator, hexColorValidator, requiredValidator, urlValidator } from '@core/utils/validators'
import { staticPrimaryColor } from '@/plugins/vuetify/theme'

export interface EmpresaFormData {
  nombre: string
  cif: string
  emailContacto: string
  logoUrl: string
  colorPrimario: string
  logoAlto: number
}

// logoUploadEndpoint: endpoint de subida (multipart) para esta empresa. Si es null/undefined
// (p.ej. todavía no se ha creado la empresa) se deshabilita la opción de subir archivo.
const props = defineProps<{
  logoUploadEndpoint?: string | null
}>()

const form = defineModel<EmpresaFormData>('form', { required: true })

const logoMode = ref<'url' | 'archivo'>('url')
const logoFile = ref<File | null>(null)
const logoFileUrl = useObjectUrl(logoFile)
const uploading = ref(false)
const uploadError = ref('')

const previewUrl = computed(() => logoFileUrl.value || resolveLogoUrl(form.value.logoUrl))

const pickerColor = computed({
  get: () => form.value.colorPrimario || staticPrimaryColor,
  set: (val: string) => { form.value.colorPrimario = val },
})

const colorPreviewText = computed(() => getReadableOnColor(form.value.colorPrimario || staticPrimaryColor))

async function subirLogo() {
  if (!logoFile.value || !props.logoUploadEndpoint)
    return

  uploading.value = true
  uploadError.value = ''
  try {
    const formData = new FormData()

    formData.append('fichero', logoFile.value)

    const result = await $api<EmpresaDto>(props.logoUploadEndpoint, { method: 'POST', body: formData })

    form.value.logoUrl = result.logoUrl ?? ''
    logoFile.value = null
  }
  catch (e: any) {
    uploadError.value = apiErrorMessage(e, 'No se pudo subir el logo')
  }
  finally {
    uploading.value = false
  }
}
</script>

<template>
  <VRow>
    <VCol
      cols="12"
      sm="6"
    >
      <AppTextField
        v-model="form.nombre"
        label="Nombre *"
        :rules="[requiredValidator]"
      />
    </VCol>
    <VCol
      cols="12"
      sm="6"
    >
      <AppTextField
        v-model="form.cif"
        label="CIF / NIF"
      />
    </VCol>
    <VCol cols="12">
      <slot name="extra-fields" />
    </VCol>
    <VCol
      cols="12"
      sm="6"
    >
      <AppTextField
        v-model="form.emailContacto"
        label="Email de contacto"
        type="email"
        :rules="[emailValidator]"
      />
    </VCol>

    <VCol cols="12">
      <VLabel class="mb-2 text-body-2">
        Logo
      </VLabel>
      <VBtnToggle
        v-model="logoMode"
        density="comfortable"
        mandatory
        color="primary"
        variant="outlined"
        divided
        class="mb-3 d-flex"
      >
        <VBtn
          value="url"
          size="small"
        >
          URL
        </VBtn>
        <VBtn
          value="archivo"
          size="small"
        >
          Subir imagen
        </VBtn>
      </VBtnToggle>

      <div class="d-flex align-center gap-4 flex-wrap">
        <div
          class="d-flex align-center justify-center flex-shrink-0 rounded border"
          style="inline-size: 96px; block-size: 96px; overflow: hidden;"
        >
          <img
            v-if="previewUrl"
            :src="previewUrl"
            alt="Logo"
            :style="{ blockSize: `${form.logoAlto}px`, maxBlockSize: '100%', maxInlineSize: '100%', objectFit: 'contain' }"
          >
          <VIcon
            v-else
            icon="tabler-photo"
            color="disabled"
          />
        </div>

        <div
          class="flex-grow-1"
          style="min-inline-size: 240px;"
        >
          <AppTextField
            v-if="logoMode === 'url'"
            v-model="form.logoUrl"
            label="URL del logo"
            placeholder="https://..."
            :rules="[urlValidator]"
          />
          <template v-else>
            <VFileInput
              v-model="logoFile"
              label="PNG, JPG o WEBP, máx. 3 MB"
              accept="image/png,image/jpeg,image/webp"
              density="comfortable"
              prepend-icon="tabler-upload"
              :disabled="!logoUploadEndpoint"
              hide-details="auto"
            />
            <p
              v-if="!logoUploadEndpoint"
              class="text-caption text-disabled mt-1 mb-0"
            >
              Guarda primero los datos para poder subir un archivo.
            </p>
            <VBtn
              v-if="logoFile && logoUploadEndpoint"
              class="mt-2"
              size="small"
              :loading="uploading"
              @click="subirLogo"
            >
              Subir logo
            </VBtn>
            <p
              v-if="uploadError"
              class="text-caption text-error mt-1 mb-0"
            >
              {{ uploadError }}
            </p>
          </template>
        </div>
      </div>

      <VSlider
        v-model="form.logoAlto"
        class="mt-4"
        :min="MIN_LOGO_HEIGHT"
        :max="MAX_LOGO_HEIGHT"
        :step="2"
        color="primary"
        hide-details
        aria-label="Altura del logo en píxeles"
      >
        <template #prepend>
          <span class="text-body-2 text-disabled">Tamaño</span>
        </template>
        <template #append>
          <span class="text-body-2" style="min-inline-size: 3.5rem;">{{ form.logoAlto }}&nbsp;px</span>
        </template>
      </VSlider>
    </VCol>

    <VCol cols="12">
      <VLabel class="mb-2 text-body-2">
        Color de marca
      </VLabel>
      <div class="d-flex align-center gap-4 flex-wrap">
        <VMenu :close-on-content-click="false">
          <template #activator="{ props: menuProps }">
            <VBtn
              v-bind="menuProps"
              icon
              size="40"
              :style="{ backgroundColor: form.colorPrimario || staticPrimaryColor }"
              aria-label="Elegir color de marca"
            />
          </template>
          <VColorPicker
            v-model="pickerColor"
            mode="hex"
            :modes="['hex']"
          />
        </VMenu>

        <AppTextField
          v-model="form.colorPrimario"
          label="Color primario (hex)"
          placeholder="#0C6FB4"
          style="max-inline-size: 200px;"
          :rules="[hexColorValidator]"
        />

        <VChip
          :style="{ backgroundColor: form.colorPrimario || staticPrimaryColor, color: colorPreviewText }"
          label
        >
          Vista previa
        </VChip>
      </div>
    </VCol>
  </VRow>
</template>
