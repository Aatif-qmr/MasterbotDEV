import { useEffect, useState, useCallback } from 'react';
import { Chat } from '../store/chatStore';
import type { UIMessage } from '../engine/types';

export type UseChatOptions = {
  chat: Chat;
};

/**
 * Local replacement for @ai-sdk/react's useChat
 */
export function useChat(options: UseChatOptions) {
  const { chat } = options;
  const [messages, setMessages] = useState<UIMessage[]>(chat.messages);
  const [status, setStatus] = useState(chat.status);
  const [error, setError] = useState(chat.error);

  useEffect(() => {
    const unsubscribe = chat.subscribe(() => {
      setMessages([...chat.messages]);
      setStatus(chat.status);
      setError(chat.error);
    });
    return () => {
      unsubscribe();
    };
  }, [chat]);

  const addToolApprovalResponse = useCallback(
    async (args: { id: string; approved: boolean }) => {
      // Implement tool approval logic if needed
      console.log('Tool approval:', args);
    },
    []
  );

  const clearError = useCallback(() => {
    chat.clearError();
  }, [chat]);

  return {
    messages,
    status,
    error,
    clearError,
    addToolApprovalResponse,
    append: (message: { content: string; role: 'user' }) => chat.sendMessage({ text: message.content }),
    stop: () => chat.stop(),
    setMessages: (messages: UIMessage[]) => {
      chat.messages = messages;
      setMessages([...messages]);
    },
  };
}
