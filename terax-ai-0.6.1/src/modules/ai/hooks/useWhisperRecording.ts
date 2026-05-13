import { useState, useCallback } from "react";

/**
 * Simplified replacement for Whisper recording.
 * In the real "Gemini Only" vision, we would use Gemini Multi-modal or a separate native service.
 */
export function useWhisperRecording(_options: { onResult: (text: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const toggle = useCallback(() => {
    // No-op for now
    console.log("Voice recording toggled");
  }, []);
  
  const start = useCallback(() => {
    setRecording(true);
  }, []);
  
  const stop = useCallback(() => {
    setRecording(false);
    setTranscribing(true);
    setTimeout(() => setTranscribing(false), 1000);
  }, []);

  return {
    recording,
    transcribing,
    toggle,
    supported: false,
    hasKey: true,
    start,
    stop,
  };
}
