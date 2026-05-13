import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePreferencesStore } from "@/modules/settings/preferences";
import {
  setGeminiNativeEnabled,
  setGeminiSkillsEnabled,
} from "@/modules/settings/store";
import { SectionHeader } from "../components/SectionHeader";

export function GeminiSection() {
  const nativeEnabled = usePreferencesStore((s) => s.geminiNativeEnabled);
  const skillsEnabled = usePreferencesStore((s) => s.geminiSkillsEnabled);

  return (
    <div className="flex flex-col gap-7">
      <SectionHeader
        title="Native Gemini Integration"
        description="Deeply integrate Google Gemini as the sole AI agent with full control over the workspace."
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <Label className="text-[13px]">Enable Native Gemini Mode</Label>
            <span className="text-[11px] leading-relaxed text-muted-foreground">
              When enabled, Gemini CLI becomes the primary agent with direct access to your filesystem and shell.
              Note: This bypasses the multi-provider selection.
            </span>
          </div>
          <Switch
            checked={nativeEnabled}
            onCheckedChange={(v) => void setGeminiNativeEnabled(v)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <Label className="text-[13px]">Skills System</Label>
            <span className="text-[11px] leading-relaxed text-muted-foreground">
              Allow Gemini to load and use custom skills defined in your workspace.
            </span>
          </div>
          <Switch
            disabled={!nativeEnabled}
            checked={skillsEnabled}
            onCheckedChange={(v) => void setGeminiSkillsEnabled(v)}
          />
        </div>
      </div>

      {!nativeEnabled && (
        <div className="rounded-md border border-info/20 bg-info/5 p-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Native mode provides a more powerful experience with persistent sessions and specialized skills, 
            optimized for local software engineering tasks.
          </p>
        </div>
      )}
    </div>
  );
}
