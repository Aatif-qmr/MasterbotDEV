import type { ProviderId } from "@/modules/ai/config";
import {
  ComputerIcon,
  GoogleGeminiIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

const ICON_BY_PROVIDER = {
  google: GoogleGeminiIcon,
  lmstudio: ComputerIcon,
} as const satisfies Record<ProviderId, any>;

type Props = {
  provider: ProviderId;
  size?: number;
  className?: string;
};

export function ProviderIcon({ provider, size = 14, className }: Props) {
  return (
    <HugeiconsIcon
      icon={ICON_BY_PROVIDER[provider as keyof typeof ICON_BY_PROVIDER] || ComputerIcon}
      size={size}
      strokeWidth={1.75}
      className={className}
    />
  );
}
