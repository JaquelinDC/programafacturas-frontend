<script setup lang="ts">
import { useAiChat } from '@/composables/useAiChat'

definePage({
  meta: {
    title: 'Chat IA',
  },
})

const {
  messages,
  draft,
  filters,
  isSending,
  errorMessage,
  response,
  hasMessages,
  lastAssistant,
  addQuickPrompt,
  resetConversation,
  send,
} = useAiChat()

const route = useRoute()

const scopeOptions = [
  { title: 'Facturas', value: 'facturas' },
  { title: 'Pagos', value: 'pagos' },
  { title: 'Extractos', value: 'extractos' },
  { title: 'Proyecto', value: 'proyecto' },
]

const periodOptions = [
  { title: 'Trimestre actual', value: 'current_quarter' },
  { title: 'Trimestre anterior', value: 'last_quarter' },
  { title: 'Anio en curso', value: 'year_to_date' },
  { title: 'Rango personalizado', value: 'custom' },
]

const quickPrompts = [
  'Resumen trimestral de facturas y pagos',
  'Gasto por proveedor del periodo actual',
  'Facturas pendientes con incidencias',
  'Riesgos operativos que debo revisar',
]

const scopeLabelMap: Record<string, string> = {
  facturas: 'Facturas proveedor',
  pagos: 'Pagos',
  extractos: 'Extractos bancarios',
  proyecto: 'Proyecto completo',
}

const activeScopeLabel = computed(() => scopeLabelMap[filters.scope] ?? 'Facturas proveedor')

async function handleSubmit(question?: string) {
  try {
    await send(typeof question === 'string' ? question : undefined)
  }
  catch {
    // Error state is already exposed in the template.
  }
}

function applyQuickPrompt(prompt: string) {
  addQuickPrompt(prompt)
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#039;')
}

function isMarkdownTableSeparator(line: string) {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*(?:\|\s*)?$/.test(line)
}

function parseMarkdownTable(lines: string[]) {
  const rows = lines
    .filter(line => !isMarkdownTableSeparator(line))
    .map(line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim()))

  if (!rows.length)
    return ''

  const [header, ...body] = rows
  const head = `<thead><tr>${header.map(cell => `<th>${escapeHtml(cell)}</th>`).join('')}</tr></thead>`
  const tableBody = `<tbody>${body.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`

  return `<div class="ai-chat-table-wrap"><table class="ai-chat-table">${head}${tableBody}</table></div>`
}

function renderTextBlock(lines: string[]) {
  const cleanLines = lines.map(line => line.trimEnd()).filter(Boolean)
  if (!cleanLines.length)
    return ''

  if (cleanLines.every(line => /^[-*]\s+/.test(line.trim()))) {
    return `<ul>${cleanLines
      .map(line => `<li>${escapeHtml(line.trim().replace(/^[-*]\s+/, ''))}</li>`)
      .join('')}</ul>`
  }

  if (cleanLines.every(line => /^\d+[.)]\s+/.test(line.trim()))) {
    return `<ol>${cleanLines
      .map(line => `<li>${escapeHtml(line.trim().replace(/^\d+[.)]\s+/, ''))}</li>`)
      .join('')}</ol>`
  }

  return `<p>${cleanLines.map(escapeHtml).join('<br>')}</p>`
}

function renderChatContent(content: string) {
  const lines = content.split('\n')
  const rendered: string[] = []
  let paragraphLines: string[] = []

  function flushParagraph() {
    const block = renderTextBlock(paragraphLines)
    if (block)
      rendered.push(block)
    paragraphLines = []
  }

  for (let i = 0; i < lines.length;) {
    if (lines[i]?.includes('|') && lines[i + 1] && isMarkdownTableSeparator(lines[i + 1])) {
      flushParagraph()

      const tableLines = [lines[i], lines[i + 1]]

      i += 2
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i])
        i++
      }
      rendered.push(parseMarkdownTable(tableLines))
      continue
    }

    if (!lines[i].trim()) {
      flushParagraph()
      i++
      continue
    }

    paragraphLines.push(lines[i])
    i++
  }

  flushParagraph()

  return rendered.join('')
}

onMounted(() => {
  const initialQuestion = route.query.q
  if (typeof initialQuestion === 'string' && initialQuestion.trim())
    draft.value = initialQuestion.trim()
})
</script>

<template>
  <div class="ai-chat-page">
    <VCard class="mb-5 ai-chat-hero">
      <VCardText class="ai-chat-hero__body">
        <div class="d-flex flex-column gap-2">
          <div class="d-flex align-center gap-2 flex-wrap">
            <VChip
              color="primary"
              variant="tonal"
              label
            >
              Asistente operativo
            </VChip>
            <VChip
              color="secondary"
              variant="tonal"
              label
            >
              Solo lectura
            </VChip>
          </div>
          <div>
            <h4 class="text-h4 mb-2">
              Chat IA para facturas, pagos y extractos
            </h4>
            <p class="text-body-1 mb-0 text-medium-emphasis">
              Formula preguntas operativas y obten resumenes basados en datos reales.
            </p>
          </div>
        </div>

        <div class="ai-chat-hero__actions">
          <VBtn
            variant="tonal"
            color="primary"
            :loading="isSending"
            @click="handleSubmit('Hazme un resumen trimestral')"
          >
            Resumen trimestral
          </VBtn>
          <VBtn
            variant="tonal"
            color="secondary"
            @click="resetConversation"
          >
            Nuevo hilo
          </VBtn>
        </div>
      </VCardText>
    </VCard>

    <VRow>
      <VCol
        cols="12"
        lg="8"
      >
        <VCard class="mb-6 ai-chat-console">
          <VCardText class="ai-chat-console__body">
            <div class="ai-chat-prompts">
              <VChip
                v-for="prompt in quickPrompts"
                :key="prompt"
                label
                variant="tonal"
                color="primary"
                class="cursor-pointer"
                @click="applyQuickPrompt(prompt)"
              >
                {{ prompt }}
              </VChip>
            </div>

            <div class="ai-chat-scroll">
              <div
                v-if="!hasMessages && !isSending"
                class="ai-chat-empty"
              >
                <VIcon
                  icon="tabler-message-2"
                  size="42"
                  class="mb-4 text-primary"
                />
                <h5 class="text-h5 mb-2">
                  Empieza con una pregunta
                </h5>
                <p class="text-body-2 text-medium-emphasis mb-0">
                  Pide un resumen trimestral, gasto por proveedor, facturas pendientes o una lectura general de la operativa.
                </p>
              </div>

              <VAlert
                v-if="errorMessage"
                type="error"
                variant="tonal"
                class="mb-4"
                density="comfortable"
              >
                <div class="d-flex flex-wrap align-center justify-space-between gap-3">
                  <div>{{ errorMessage }}</div>
                  <VBtn
                    size="small"
                    variant="text"
                    @click="handleSubmit"
                  >
                    Reintentar
                  </VBtn>
                </div>
              </VAlert>

              <div class="d-flex flex-column gap-4 ai-chat-thread">
                <VCard
                  v-for="message in messages"
                  :key="message.id"
                  :color="message.role === 'user' ? 'primary' : undefined"
                  :variant="message.role === 'user' ? 'tonal' : 'outlined'"
                  class="ai-chat-message"
                >
                  <VCardText class="d-flex flex-column gap-4 ai-chat-message__body">
                    <div class="ai-chat-message__head">
                      <div class="d-flex align-center gap-2 ai-chat-message__identity">
                        <VAvatar
                          size="32"
                          :color="message.role === 'user' ? 'primary' : 'success'"
                          variant="tonal"
                        >
                          <VIcon
                            :icon="message.role === 'user' ? 'tabler-user' : 'tabler-bot'"
                            size="18"
                          />
                        </VAvatar>
                        <div class="ai-chat-message__meta">
                          <div class="text-subtitle-2">
                            {{ message.role === 'user' ? 'Tu pregunta' : 'Asistente' }}
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            {{ formatDateTime(message.createdAt) }}
                          </div>
                        </div>
                      </div>

                      <VChip
                        v-if="message.response"
                        size="small"
                        variant="tonal"
                        color="secondary"
                        class="ai-chat-message__chip"
                      >
                        {{ message.response.scopeLabel }} - {{ message.response.periodLabel }}
                      </VChip>
                    </div>

                    <div
                      class="text-body-1 ai-chat-content"
                      v-html="renderChatContent(message.content)"
                    />

                    <template v-if="message.response">
                      <VDivider />

                      <div>
                        <h6 class="text-subtitle-2 mb-3">
                          Indicadores clave
                        </h6>
                        <VRow class="ai-chat-metrics">
                          <VCol
                            v-for="metric in message.response.metrics"
                            :key="metric.label"
                            cols="12"
                            sm="6"
                            xl="4"
                          >
                            <VCard
                              variant="tonal"
                              class="h-100 ai-chat-metric"
                            >
                              <VCardText class="d-flex flex-column gap-1">
                                <div class="text-caption text-medium-emphasis">
                                  {{ metric.label }}
                                </div>
                                <div class="text-h6">
                                  {{ metric.value }}
                                </div>
                                <div
                                  v-if="metric.detail"
                                  class="text-caption text-medium-emphasis"
                                >
                                  {{ metric.detail }}
                                </div>
                                <div
                                  v-if="metric.trend"
                                  class="text-caption text-success"
                                >
                                  {{ metric.trend }}
                                </div>
                              </VCardText>
                            </VCard>
                          </VCol>
                        </VRow>
                      </div>

                      <div>
                        <h6 class="text-subtitle-2 mb-2">
                          Fuente resumida
                        </h6>
                        <p class="text-body-2 text-medium-emphasis mb-0 ai-chat-soft-text">
                          {{ message.response.sourceSummary }}
                        </p>
                      </div>

                      <div v-if="message.response.dataNotes.length">
                        <h6 class="text-subtitle-2 mb-2">
                          Notas de contexto
                        </h6>
                        <ul class="text-body-2 text-medium-emphasis mb-0 ps-5 ai-chat-soft-text">
                          <li
                            v-for="note in message.response.dataNotes"
                            :key="note"
                          >
                            {{ note }}
                          </li>
                        </ul>
                      </div>

                      <div v-if="message.response.suggestedQuestions.length">
                        <h6 class="text-subtitle-2 mb-2">
                          Siguientes preguntas
                        </h6>
                        <div class="d-flex flex-wrap gap-2">
                          <VChip
                            v-for="suggestion in message.response.suggestedQuestions"
                            :key="suggestion"
                            variant="tonal"
                            color="primary"
                            label
                            class="cursor-pointer ai-chat-suggestion"
                            @click="applyQuickPrompt(suggestion)"
                          >
                            {{ suggestion }}
                          </VChip>
                        </div>
                      </div>
                    </template>
                  </VCardText>
                </VCard>

                <VCard
                  v-if="isSending"
                  variant="tonal"
                  color="primary"
                  class="ai-chat-message"
                >
                  <VCardText class="d-flex align-center gap-3">
                    <VProgressCircular
                      indeterminate
                      size="24"
                      width="2"
                    />
                    <div>
                      <div class="text-subtitle-2">
                        Analizando datos
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        Consultando y generando respuesta con AI.
                      </div>
                    </div>
                  </VCardText>
                </VCard>
              </div>
            </div>

            <VForm
              class="ai-chat-composer"
              @submit.prevent="handleSubmit"
            >
              <AppTextarea
                v-model="draft"
                label="Pregunta"
                placeholder="Ejemplo: resume el trimestre actual y dime que proveedores concentran mas gasto"
                rows="2"
                auto-grow
                :disabled="isSending"
              />

              <div class="ai-chat-composer__footer">
                <div class="ai-chat-composer__chips">
                  <VChip
                    color="primary"
                    variant="tonal"
                    label
                  >
                    Scope: {{ activeScopeLabel }}
                  </VChip>
                  <VChip
                    color="secondary"
                    variant="tonal"
                    label
                  >
                    Periodo: {{ response?.periodLabel || 'Trimestre actual' }}
                  </VChip>
                </div>

                <VBtn
                  type="submit"
                  color="primary"
                  :loading="isSending"
                  :disabled="!draft.trim()"
                  class="ai-chat-submit"
                  @click.prevent="handleSubmit"
                >
                  Enviar pregunta
                </VBtn>
              </div>
            </VForm>
          </VCardText>
        </VCard>
      </VCol>

      <VCol
        cols="12"
        lg="4"
      >
        <div class="ai-chat-sidebar">
          <VCard class="mb-6">
            <VCardText class="d-flex flex-column gap-4">
              <div>
                <h5 class="text-h6 mb-1">
                  Filtros
                </h5>
                <p class="text-body-2 text-medium-emphasis mb-0">
                  Define el alcance antes de preguntar. Se aplica la empresa activa y consulta datos reales.
                </p>
              </div>

              <VSelect
                v-model="filters.scope"
                :items="scopeOptions"
                item-title="title"
                item-value="value"
                label="Scope"
              />

              <VSelect
                v-model="filters.periodPreset"
                :items="periodOptions"
                item-title="title"
                item-value="value"
                label="Periodo"
              />

              <template v-if="filters.periodPreset === 'custom'">
                <VRow>
                  <VCol
                    cols="12"
                    sm="6"
                    lg="12"
                  >
                    <AppTextField
                      v-model="filters.fromDate"
                      type="date"
                      label="Desde"
                      placeholder="YYYY-MM-DD"
                    />
                  </VCol>
                  <VCol
                    cols="12"
                    sm="6"
                    lg="12"
                  >
                    <AppTextField
                      v-model="filters.toDate"
                      type="date"
                      label="Hasta"
                      placeholder="YYYY-MM-DD"
                    />
                  </VCol>
                </VRow>
              </template>

              <!--
                <VAlert
                type="info"
                variant="tonal"
                density="comfortable"
                >
                Las consultas son de solo lectura. No se envia ninguna clave ni dato tecnico al navegador.
                </VAlert>
              -->
            </VCardText>
          </VCard>

          <VCard class="mb-6">
            <VCardText class="d-flex flex-column gap-3">
              <h5 class="text-h6 mb-0">
                Estado del hilo
              </h5>
              <div class="d-flex flex-column gap-2 text-body-2">
                <div class="d-flex justify-space-between gap-3">
                  <span>Mensajes</span>
                  <strong>{{ messages.length }}</strong>
                </div>
                <div class="d-flex justify-space-between gap-3">
                  <span>Ultima respuesta</span>
                  <strong>{{ lastAssistant ? 'Disponible' : 'No aun' }}</strong>
                </div>
                <div class="d-flex justify-space-between gap-3">
                  <span>Scope activo</span>
                  <strong>{{ activeScopeLabel }}</strong>
                </div>
              </div>
            </VCardText>
          </VCard>
        </div>
      </VCol>
    </VRow>
  </div>
</template>

<style scoped lang="scss">
.ai-chat-page {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ai-chat-hero {
  background:
    radial-gradient(circle at top right, rgba(var(--v-theme-primary), 0.12), transparent 28%),
    linear-gradient(135deg, rgba(var(--v-theme-surface), 1), rgba(var(--v-theme-surface-variant), 0.45));
}

.ai-chat-hero__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding-block: 0.9rem;
}

.ai-chat-hero__actions,
.ai-chat-prompts,
.ai-chat-composer__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ai-chat-console {
  overflow: hidden;
}

.ai-chat-console__body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-height: clamp(40rem, calc(100vh - 10rem), 62rem);
  max-height: calc(100vh - 5.5rem);
  padding-block: 1rem;
}

.ai-chat-empty {
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.18);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  background: rgba(var(--v-theme-surface), 0.7);
}

.ai-chat-scroll {
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0.15rem 0.35rem 0.15rem 0;
  scrollbar-gutter: stable;
}

.ai-chat-thread,
.ai-chat-message,
.ai-chat-message__body,
.ai-chat-message__identity,
.ai-chat-message__meta {
  min-width: 0;
}

.ai-chat-message {
  border-radius: 18px;
}

.ai-chat-message :deep(.v-card-text) {
  padding-block: 0.9rem;
}

.ai-chat-message__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  min-width: 0;
}

.ai-chat-message__chip,
.ai-chat-suggestion {
  max-width: 100%;
}

.ai-chat-metric,
.ai-chat-soft-text,
.ai-chat-suggestion {
  overflow-wrap: anywhere;
  word-break: break-word;
}

.ai-chat-content {
  min-width: 0;
  color: rgba(var(--v-theme-on-surface), 0.82);
  line-height: 1.6;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.ai-chat-content :deep(p) {
  margin-block: 0 1rem;
}

.ai-chat-content :deep(p:last-child),
.ai-chat-content :deep(ul:last-child),
.ai-chat-content :deep(ol:last-child) {
  margin-block-end: 0;
}

.ai-chat-content :deep(ul),
.ai-chat-content :deep(ol) {
  margin-block: 0 1rem;
  padding-inline-start: 1.25rem;
}

.ai-chat-content :deep(li) {
  margin-block: 0.2rem;
  padding-inline-start: 0.1rem;
}

.ai-chat-content :deep(.ai-chat-table-wrap) {
  overflow-x: auto;
  margin-block: 0.75rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
}

.ai-chat-content :deep(.ai-chat-table) {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

.ai-chat-content :deep(.ai-chat-table th),
.ai-chat-content :deep(.ai-chat-table td) {
  padding: 0.625rem 0.75rem;
  border-block-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  text-align: start;
}

.ai-chat-content :deep(.ai-chat-table th) {
  background: rgba(var(--v-theme-primary), 0.08);
  font-weight: 600;
}

.ai-chat-composer {
  flex: 0 0 auto;
  border-block-start: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  padding-block-start: 0.75rem;
}

.ai-chat-composer__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-block-start: 0.75rem;
}

.ai-chat-submit {
  flex: 0 0 auto;
}

.ai-chat-sidebar {
  position: sticky;
  top: 1rem;
}

@media (max-width: 1279.98px) {
  .ai-chat-console__body {
    min-height: 48rem;
    max-height: none;
  }

  .ai-chat-sidebar {
    position: static;
  }
}

@media (max-width: 767.98px) {
  .ai-chat-hero__body,
  .ai-chat-message__head,
  .ai-chat-composer__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .ai-chat-hero__actions,
  .ai-chat-submit {
    inline-size: 100%;
  }

  .ai-chat-hero__actions :deep(.v-btn),
  .ai-chat-submit {
    flex: 1 1 auto;
  }

  .ai-chat-console__body {
    min-height: 42rem;
  }
}
</style>
