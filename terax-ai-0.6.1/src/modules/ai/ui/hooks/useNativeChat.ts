import { useState, useCallback, useRef } from 'react';
import { GeminiSession, createTeraxGeminiAgent } from '../../engine/session';
import { GeminiEventType } from '../../engine/gemini_types';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'data';
  content: string;
  parts?: any[];
};

export type ChatStatus = 'idle' | 'streaming' | 'submitted' | 'error';

export function useNativeChat(options: { sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<Error | undefined>();
  const agentRef = useRef(createTeraxGeminiAgent());
  const sessionRef = useRef<GeminiSession | null>(null);

  const append = useCallback(async (message: { content: string; role: 'user' }) => {
    if (!sessionRef.current) {
      sessionRef.current = agentRef.current.session(options.sessionId);
      await sessionRef.current.initialize();
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message.content,
    };

    setMessages(prev => [...prev, userMessage]);
    setStatus('submitted');
    setError(undefined);

    let assistantMessage: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: '',
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      setStatus('streaming');
      for await (const event of sessionRef.current.sendStream(message.content)) {
        if (event.type === GeminiEventType.Content) {
          assistantMessage.content += event.value;
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { ...assistantMessage };
            return next;
          });
        } else if (event.type === GeminiEventType.Finish) {
          setStatus('idle');
        } else if (event.type === GeminiEventType.Error) {
          throw new Error(String(event.value));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus('error');
    }
  }, [options.sessionId]);

  return {
    messages,
    status,
    error,
    append,
    setMessages,
    stop: () => {},
    reload: () => {},
  };
}
