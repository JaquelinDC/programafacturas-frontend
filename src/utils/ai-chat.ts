import type { AiChatRequest, AiChatResponse } from '@/types/api'
import { $api } from '@/utils/api'

export function sendAiChatMessage(payload: AiChatRequest) {
  return $api<AiChatResponse>('/ai/chat', {
    method: 'POST',
    body: payload,
  })
}
