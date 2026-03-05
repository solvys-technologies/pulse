export interface ExtractedChatContent {
  text: string;
  reasoning: string;
}

export function extractChatTextAndReasoning(message: any): ExtractedChatContent {
  const parts = Array.isArray(message?.parts) ? message.parts : [];
  const textFromParts = parts
    .filter((part: any) => part?.type === 'text')
    .map((part: any) => part?.text ?? '')
    .join('');
  const reasoningFromParts = parts
    .filter((part: any) => part?.type === 'reasoning')
    .map((part: any) => part?.text ?? '')
    .join('');

  const fallbackText = typeof message?.content === 'string'
    ? message.content
    : typeof message?.text === 'string'
      ? message.text
      : '';

  return {
    text: String(textFromParts || fallbackText || ''),
    reasoning: String(reasoningFromParts || ''),
  };
}

export function normalizeChatMessages(messages: any[]): Array<{
  id: string;
  role: 'user' | 'assistant';
  text: string;
  reasoning: string;
}> {
  return (messages || [])
    .filter((m: any) => m?.role !== 'system')
    .map((m: any) => {
      const extracted = extractChatTextAndReasoning(m);
      return {
        id: String(m?.id ?? ''),
        role: m?.role === 'user' ? 'user' : 'assistant',
        text: extracted.text,
        reasoning: extracted.reasoning,
      };
    });
}
