/**
 * Voice output abstraction.
 *
 * Today it uses the browser's Web Speech API (free, no backend needed).
 * The rest of the app only calls speak() / stopSpeaking(), so it can later be
 * swapped for an Amazon Polly endpoint on the server without touching the UI.
 */

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Prefer a Mexican Spanish voice, then any Spanish voice. */
function pickSpanishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang.toLowerCase() === "es-mx") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("es-us")) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("es"))
  );
}

export function speak(text: string, onEnd?: () => void): void {
  if (!isSpeechSupported()) return;

  window.speechSynthesis.cancel(); // stop anything that is still playing
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-MX";
  const voice = pickSpanishVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}
