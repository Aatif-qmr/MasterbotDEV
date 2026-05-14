import { native } from '../ai/bridge/native';

export interface DesignToken {
  name: string;
  value: string;
  type: 'color' | 'spacing' | 'fontSize' | 'component';
}

export class DesignEngine {
  async extractTokens(componentPath: string): Promise<DesignToken[]> {
    try {
      const r = await native.readFile(componentPath);
      if (r.kind !== 'text') return [];
      
      const content = r.content;
      const tokens: DesignToken[] = [];

      // Extract colors (hex, rgb, hsl, oklch)
      const colorMatches = content.match(/#[0-9a-fA-F]{3,6}|rgba?\(.*?\)|hsla?\(.*?\)|oklch\(.*?\)/g);
      if (colorMatches) {
        colorMatches.forEach((val: string) => {
          tokens.push({ name: 'color', value: val, type: 'color' });
        });
      }

      // Extract spacing (tailwnd patterns or px/rem)
      const spacingMatches = content.match(/\b(m|p)[xytrbl]?-\d+\b|\d+(px|rem|em)\b/g);
      if (spacingMatches) {
        spacingMatches.forEach((val: string) => {
          tokens.push({ name: 'spacing', value: val, type: 'spacing' });
        });
      }

      return tokens;
    } catch (e) {
      console.error('Token extraction failed:', e);
      return [];
    }
  }

  /**
   * Validates if a string is a valid OKLCH color format.
   * Format: oklch(L C H) or oklch(L C H / A)
   */
  isValidOKLCH(value: string): boolean {
    const oklchRegex = /^oklch\(\s*([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+(?:deg|rad|grad|turn)?%?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/;
    return oklchRegex.test(value);
  }

  /**
   * Generates a system prompt snippet that enforces the "Impeccable" editorial voice.
   */
  getEditorialVoiceSnippet(): string {
    return `Editorial Voice: Impeccable Integration
Rules:
1. The One Voice Rule: Maintain absolute consistency in tone and visual language across all components.
2. Flat-by-default: Prefer clean, flat designs; use depth, shadows, or gradients only where they serve a clear functional purpose.
3. Impeccable execution: Zero tolerance for sloppy spacing, inconsistent alignments, or stray colors.
4. OKLCH preferred: Use oklch() for all new color definitions to ensure perceptual uniformity and accessible contrast.
5. Surgical updates: When modifying existing code, preserve the established aesthetic while applying these rules.`;
  }

  async getComponentSchema(componentName: string): Promise<string> {
    return `interface ${componentName}Props {
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}`;
  }
}
