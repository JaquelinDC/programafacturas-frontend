import type { AiChatMessageRequest, AiChatResponse } from '@/types/api'
import { sendAiChatMessage } from '@/utils/ai-chat'

export interface AiChatUiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  response?: AiChatResponse
  createdAt: string
}

export interface AiChatFilters {
  scope: string
  periodPreset: string
  fromDate: string
  toDate: string
}

const MAX_HISTORY_ITEMS = 8

function createMessageId(): string {
  if (globalThis.crypto?.randomUUID)
    return globalThis.crypto.randomUUID()

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function useAiChat() {
  const messages = ref<AiChatUiMessage[]>([])
  const draft = ref('')
  const isSending = ref(false)
  const errorMessage = ref<string | null>(null)
  const response = ref<AiChatResponse | null>(null)

  const filters = reactive<AiChatFilters>({
    scope: 'facturas',
    periodPreset: 'current_quarter',
    fromDate: '',
    toDate: '',
  })

  const hasMessages = computed(() => messages.value.length > 0)
  const lastAssistant = computed(() => [...messages.value].reverse().find(message => message.role === 'assistant')?.response ?? null)

  function resetConversation() {
    messages.value = []
    response.value = null
    errorMessage.value = null
    draft.value = ''
  }

  function addQuickPrompt(prompt: string) {
    draft.value = prompt
  }

  async function send(questionOverride?: string) {
    const question = (questionOverride ?? draft.value).trim()
    if (!question || isSending.value)
      return

    isSending.value = true
    errorMessage.value = null

    const history: AiChatMessageRequest[] = messages.value
      .map(message => ({
        role: message.role,
        content: message.content,
      }))
      .slice(-MAX_HISTORY_ITEMS)

    try {
      const assistantResponse = await sendAiChatMessage({
        question,
        scope: filters.scope,
        periodPreset: filters.periodPreset,
        fromDate: filters.periodPreset === 'custom' && filters.fromDate ? filters.fromDate : undefined,
        toDate: filters.periodPreset === 'custom' && filters.toDate ? filters.toDate : undefined,
        messages: history,
      })

      messages.value = [
        ...messages.value,
        {
          id: createMessageId(),
          role: 'user',
          content: question,
          createdAt: new Date().toISOString(),
        },
        {
          id: createMessageId(),
          role: 'assistant',
          content: assistantResponse.answer,
          response: assistantResponse,
          createdAt: new Date().toISOString(),
        },
      ]
      response.value = assistantResponse
      draft.value = ''
    }
    catch (error: any) {
      errorMessage.value = error?.data?.message || error?.message || 'No se pudo consultar el asistente'
      throw error
    }
    finally {
      isSending.value = false
    }
  }

  return {
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
  }
}
