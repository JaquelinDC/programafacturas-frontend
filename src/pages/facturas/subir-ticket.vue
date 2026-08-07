<script setup lang="ts">
import type { EntidadDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Subir Ticket' } })

const MAX_DIMENSION = 1920
const JPEG_QUALITY = 0.75

const router = useRouter()
const entidades = ref<EntidadDto[]>([])
const entidadId = ref<number | null>(null)
const fichero = ref<File | null>(null)
const subiendo = ref(false)
const snackbar = ref(false)
const snackbarMsg = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

// Previsualización / rotación / compresión de imágenes
const archivoOriginal = ref<File | null>(null)
const imagenOriginal = ref<HTMLImageElement | null>(null)
const previewUrl = ref<string | null>(null)
const rotacion = ref(0)
const esImagen = ref(false)
const esPdf = ref(false)
const pesoOriginal = ref(0)
const pesoFinal = ref(0)
const procesando = ref(false)

const entidadesItems = computed(() => entidades.value.map(e => ({ title: e.nombre, value: e.id })))

function showMsg(msg: string, color: 'success' | 'error' = 'success') {
  snackbarMsg.value = msg
  snackbarColor.value = color
  snackbar.value = true
}

function formatBytes(bytes: number) {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(0)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function resetPreview() {
  if (previewUrl.value)
    URL.revokeObjectURL(previewUrl.value)

  previewUrl.value = null
  imagenOriginal.value = null
  archivoOriginal.value = null
  rotacion.value = 0
  esImagen.value = false
  esPdf.value = false
  pesoOriginal.value = 0
  pesoFinal.value = 0
}

function cargarImagenOriginal(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

async function procesarImagen() {
  const img = imagenOriginal.value
  const original = archivoOriginal.value
  if (!img || !original)
    return

  procesando.value = true
  try {
    let width = img.naturalWidth
    let height = img.naturalHeight

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      const escala = MAX_DIMENSION / Math.max(width, height)
      width = Math.round(width * escala)
      height = Math.round(height * escala)
    }

    const rotado90 = rotacion.value % 180 !== 0
    const canvas = document.createElement('canvas')
    canvas.width = rotado90 ? height : width
    canvas.height = rotado90 ? width : height

    const ctx = canvas.getContext('2d')
    if (!ctx)
      throw new Error('Canvas no soportado')

    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotacion.value * Math.PI) / 180)
    ctx.drawImage(img, -width / 2, -height / 2, width, height)

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob)
      throw new Error('No se pudo procesar la imagen')

    const nombre = original.name.replace(/\.[^./\\]+$/, '') || 'ticket'
    const procesado = new File([blob], `${nombre}.jpg`, { type: 'image/jpeg' })

    if (previewUrl.value)
      URL.revokeObjectURL(previewUrl.value)

    previewUrl.value = URL.createObjectURL(procesado)
    pesoFinal.value = procesado.size
    fichero.value = procesado
  }
  catch (e: any) {
    showMsg(e?.message || 'No se pudo procesar la imagen', 'error')
  }
  finally {
    procesando.value = false
  }
}

function rotar(grados: number) {
  rotacion.value = (rotacion.value + grados + 360) % 360
  procesarImagen()
}

async function onFileChange(file: File | File[] | null) {
  const nuevo = Array.isArray(file) ? file[0] ?? null : file

  resetPreview()

  if (!nuevo) {
    fichero.value = null
    return
  }

  pesoOriginal.value = nuevo.size

  if (nuevo.type === 'application/pdf' || /\.pdf$/i.test(nuevo.name)) {
    esPdf.value = true
    archivoOriginal.value = nuevo
    fichero.value = nuevo
    return
  }

  if (nuevo.type.startsWith('image/')) {
    esImagen.value = true
    archivoOriginal.value = nuevo
    fichero.value = nuevo
    try {
      imagenOriginal.value = await cargarImagenOriginal(nuevo)
      await procesarImagen()
    }
    catch (e: any) {
      showMsg(e?.message || 'No se pudo leer la imagen', 'error')
      esImagen.value = false
    }
    return
  }

  // Tipo desconocido: se sube tal cual, sin preview
  fichero.value = nuevo
}

async function subir() {
  if (!entidadId.value) {
    showMsg('Selecciona una entidad', 'error')
    return
  }
  if (!fichero.value) {
    showMsg('Selecciona un archivo', 'error')
    return
  }

  subiendo.value = true
  try {
    const form = new FormData()
    form.append('entidadId', String(entidadId.value))
    form.append('fichero', fichero.value)
    const result = await $api<{ ok: boolean; mensaje: string; id?: number }>('/facturas/subir-ticket', {
      method: 'POST',
      body: form,
    })
    showMsg(result.mensaje, 'success')
    if (result.id) {
      router.push(`/facturas/${result.id}`)
    } else {
      router.push('/facturas')
    }
  }
  catch (e: any) {
    showMsg(e?.data?.message || 'No se pudo subir el ticket', 'error')
  }
  finally {
    subiendo.value = false
  }
}

onMounted(async () => {
  entidades.value = await $api<EntidadDto[]>('/entidades?todas=true')
})
</script>

<template>
  <VCard>
    <VCardTitle class="pa-4">Subir ticket / factura</VCardTitle>
    <VCardText>
      <VRow>
        <VCol cols="12" md="6">
          <AppSelect v-model="entidadId" :items="entidadesItems" label="Entidad" clearable />
        </VCol>
        <VCol cols="12" md="6">
          <VFileInput
            label="Archivo PDF o imagen"
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*,application/pdf"
            prepend-icon="tabler-file-upload"
            :disabled="subiendo || procesando"
            @update:model-value="onFileChange"
          />
        </VCol>
      </VRow>

      <!-- Previsualización de imagen con rotación -->
      <VRow v-if="esImagen" class="mt-2">
        <VCol cols="12">
          <div class="d-flex flex-column align-center gap-2">
            <div class="preview-container d-flex align-center justify-center">
              <VProgressCircular v-if="procesando" indeterminate color="primary" />
              <img v-else-if="previewUrl" :src="previewUrl" alt="Previsualización del ticket" class="preview-img">
            </div>
            <div class="d-flex align-center gap-2">
              <VBtn
                icon="tabler-rotate-2"
                variant="tonal"
                size="small"
                :disabled="procesando || subiendo"
                @click="rotar(-90)"
              />
              <VBtn
                icon="tabler-rotate-clockwise-2"
                variant="tonal"
                size="small"
                :disabled="procesando || subiendo"
                @click="rotar(90)"
              />
            </div>
            <p v-if="pesoFinal" class="text-caption text-medium-emphasis mb-0">
              {{ formatBytes(pesoOriginal) }} → {{ formatBytes(pesoFinal) }}
            </p>
          </div>
        </VCol>
      </VRow>

      <!-- PDF: solo info del archivo -->
      <VRow v-else-if="esPdf" class="mt-2">
        <VCol cols="12">
          <p class="text-body-2 text-medium-emphasis">
            {{ archivoOriginal?.name }} ({{ formatBytes(pesoOriginal) }})
          </p>
        </VCol>
      </VRow>

      <!-- Indicador de procesado con IA -->
      <div v-if="subiendo" class="mt-4">
        <VProgressLinear indeterminate color="primary" rounded />
        <p class="text-center text-body-2 mt-2 text-medium-emphasis">
          Estamos leyendo tu factura con IA...
        </p>
      </div>
    </VCardText>
    <VCardActions class="pa-4">
      <VBtn variant="tonal" :disabled="subiendo" @click="router.push('/facturas')">Cancelar</VBtn>
      <VSpacer />
      <VBtn color="primary" :loading="subiendo" :disabled="subiendo || procesando" @click="subir">Subir</VBtn>
    </VCardActions>
  </VCard>

  <VSnackbar v-model="snackbar" :color="snackbarColor" timeout="4000">
    {{ snackbarMsg }}
  </VSnackbar>
</template>

<style scoped>
.preview-container {
  width: 100%;
  min-height: 120px;
  max-height: 300px;
  overflow: hidden;
}

.preview-img {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
}
</style>
