import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/modules/ai/ui/elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/modules/ai/ui/elements/message";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/modules/ai/ui/elements/reasoning";
import { Tool } from "@/modules/ai/ui/elements/tool";
import { HugeiconsIcon } from "@hugeicons/react";
import { SLASH_COMMANDS, TERAX_CMD_RE } from "../engine/slashCommands";
import { Spinner } from "@/modules/core/ui/spinner";
import { memo, useCallback } from "react";
import { AiToolApproval } from "./AiToolApproval";
import type { UIMessage, ChatStatus, UIMessagePart } from "../engine/types";
import { FixedSizeList, type ListChildComponentProps } from "react-window";
import { AutoSizer } from "react-virtualized-auto-sizer";
import { useStickToBottomContext } from "use-stick-to-bottom";

function CommandSnippet({ name }: { name: string }) {
  const meta = SLASH_COMMANDS[name];
  if (!meta) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/40 px-2 py-1 font-mono text-[11px]">
        /{name}
      </div>
    );
  }
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-border/50 bg-muted/40 px-2 py-1">
      <HugeiconsIcon
        icon={meta.icon}
        size={12}
        strokeWidth={1.75}
        className="shrink-0 text-foreground"
      />
      <span className="font-mono text-[11px] text-foreground">
        {meta.invocation}
      </span>
      <span className="truncate text-[11px] text-muted-foreground">
        {meta.label}
      </span>
    </div>
  );
}

type AnyToolPart = Extract<UIMessagePart, { type: "tool-invocation" }>;

type ApprovalArg = {
  id: string;
  approved: boolean;
  reason?: string;
};

type Props = {
  messages: UIMessage[];
  status: ChatStatus;
  error: Error | undefined;
  clearError: () => void;
  addToolApprovalResponse: (arg: ApprovalArg) => void | PromiseLike<void>;
  stop: () => void | PromiseLike<void>;
};

export function AiChatView({
  messages,
  status,
  error,
  clearError,
  addToolApprovalResponse,
}: Props) {
  const isBusy = status === "submitted" || status === "streaming";
  const lastMessage = messages[messages.length - 1];
  const showSpinner = isBusy && lastMessage?.role === "user";

  const onApproval = useCallback(
    (id: string, approved: boolean) =>
      addToolApprovalResponse({ id, approved }),
    [addToolApprovalResponse],
  );

  const { scrollRef, contentRef } = useStickToBottomContext();

  const Row = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const m = messages[index];
      if (!m) return null;
      return (
        <div style={style} className="px-3">
          <RenderedMessage message={m} onApproval={onApproval} />
        </div>
      );
    },
    [messages, onApproval],
  );

  if (messages.length === 0) {
    return (
      <Conversation>
        <ConversationContent>
          <ConversationEmptyState
            title="Ask Terax anything"
            description="Explain command output, fix errors, generate snippets, or run a task."
          />
        </ConversationContent>
      </Conversation>
    );
  }

  // Use a type cast to avoid AutoSizer children type issues
  const AutoSizerComponent = AutoSizer as any;

  return (
    <Conversation className="flex h-full flex-col overflow-hidden">
      <div className="relative min-h-0 flex-1">
        <AutoSizerComponent>
          {({ height, width }: any) => (
            <FixedSizeList
              height={height}
              itemCount={messages.length}
              itemSize={140}
              width={width}
              outerRef={scrollRef}
              innerRef={contentRef}
              className="scrollbar-hide"
            >
              {Row}
            </FixedSizeList>
          )}
        </AutoSizerComponent>
      </div>

      <div className="space-y-3 px-3 pb-3">
        {showSpinner && (
          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <Spinner />
            Thinking…
          </div>
        )}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <div className="font-medium">Something went wrong.</div>
            <div className="mt-0.5 leading-relaxed opacity-90">
              {error.message}
            </div>
            <button
              type="button"
              onClick={clearError}
              className="mt-1 underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
      <ConversationScrollButton />
    </Conversation>
  );
}

const RenderedMessage = memo(function RenderedMessage({
  message,
  onApproval,
}: {
  message: UIMessage;
  onApproval: (id: string, approved: boolean) => void;
}) {
  if (message.role === "user") {
    const rawText = (message.parts || [])
      .filter(
        (p: UIMessagePart): p is Extract<UIMessagePart, { type: "text" }> =>
          p.type === "text",
      )
      .map((p: Extract<UIMessagePart, { type: "text" }>) => p.text)
      .join("\n");

    const cmdMatch = rawText.match(TERAX_CMD_RE);
    const commandName = cmdMatch?.[1] ?? null;
    const text = cmdMatch ? rawText.slice(cmdMatch[0].length) : rawText;

    return (
      <Message from="user">
        <MessageContent>
          {commandName ? <CommandSnippet name={commandName} /> : null}
          {text ? (
            <p className="whitespace-pre-wrap wrap-break-word">{text}</p>
          ) : null}
        </MessageContent>
      </Message>
    );
  }

  const role = message.role === "data" ? "system" : message.role;

  return (
    <Message from={role as "user" | "assistant" | "system"}>
      <MessageContent>
        <div className="flex flex-col gap-3">
          {(message.parts || []).map((part: UIMessagePart, i: number) => (
            <RenderedPart
              key={`${message.id}-${i}`}
              part={part}
              onApproval={onApproval}
            />
          ))}
        </div>
      </MessageContent>
    </Message>
  );
});

const RenderedPart = memo(function RenderedPart({
  part,
  onApproval,
}: {
  part: UIMessagePart;
  onApproval: (id: string, approved: boolean) => void;
}) {
  if (part.type === "text") {
    return (
      <MessageResponse>
        {part.text}
      </MessageResponse>
    );
  }

  if (part.type === "reasoning") {
    return (
      <Reasoning>
        <ReasoningTrigger />
        <ReasoningContent>
          {part.text}
        </ReasoningContent>
      </Reasoning>
    );
  }

  if (part.type === "tool-invocation") {
    return (
      <RenderedTool
        part={part}
        onApproval={onApproval}
      />
    );
  }

  return null;
});

const RenderedTool = memo(function RenderedTool({
  part,
  onApproval,
}: {
  part: AnyToolPart;
  onApproval: (id: string, approved: boolean) => void;
}) {
  const toolName = part.toolName;

  // In our new architecture, we don't have 'approval-requested' state in the part itself
  // yet, but let's keep the UI compatible if we add it.
  // Currently, tool-invocation has state: "call" | "result"
  
  if ((part as any).state === "approval-requested") {
    return (
      <AiToolApproval
        part={part as any}
        toolName={toolName}
        onRespond={(approved) => onApproval((part as any).approval.id, approved)}
      />
    );
  }

  return (
    <Tool
      toolName={toolName}
      state={part.state as any}
      input={part.args}
      output={"result" in part ? part.result : undefined}
      errorText={undefined} // Error handling in tools would populate this
    />
  );
});
