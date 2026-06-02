<script setup lang="ts">
import type { ExtractoBancarioDto } from '@/types/api'
import { $api } from '@/utils/api'

definePage({ meta: { title: 'Extractos Bancarios' } })

const router = useRouter()
const extractos = ref<ExtractoBancarioDto[]>([])
const loading = ref(false)

async function cargar() {
  loading.value = true
  try {
    extractos.value = await $api<ExtractoBancarioDto[]>('/extractos')
  }
  finally {
    loading.value = false
  }
}

const formatDate = (d?: string) => d ? d.substring(0, 10) : '—'
const formatDateTime = (d?: string) => d ? d.substring(0, 16).replace('T', ' ') : '—'

const headers = [
  { title: 'ID', key: 'id', width: 70 },
  { title: 'Banco', key: 'banco', width: 160 },
  { title: 'Fichero', key: 'nombreFichero' },
  { title: 'Desde', key: 'fechaInicioMovimientos', width: 110 },
  { title: 'Hasta', key: 'fechaFinMovimientos', width: 110 },
  { title: 'Subido', key: 'fechaSubida', width: 150 },
  { title: '', key: 'actions', sortable: false, width: 60 },
]

onMounted(cargar)
</script>

<template>
  <div>
    <VCard>
      <VCardItem>
        <VCardTitle>Extractos Bancarios</VCardTitle>
      </VCardItem>

      <VDataTable
        :headers="headers"
        :items="extractos"
        :loading="loading"
        item-value="id"
        hover
        @click:row="(_: any, { item }: any) => router.push(`/extractos/${item.id}`)"
      >
        <template #item.fechaInicioMovimientos="{ item }">{{ formatDate(item.fechaInicioMovimientos) }}</template>
        <template #item.fechaFinMovimientos="{ item }">{{ formatDate(item.fechaFinMovimientos) }}</template>
        <template #item.fechaSubida="{ item }">{{ formatDateTime(item.fechaSubida) }}</template>
        <template #item.actions="{ item }">
          <IconBtn size="small" @click.stop="router.push(`/extractos/${item.id}`)">
            <VIcon icon="tabler-eye" />
          </IconBtn>
        </template>
      </VDataTable>
    </VCard>
  </div>
</template>
