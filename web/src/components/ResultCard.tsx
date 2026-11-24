import { useEffect, useState } from "react";
import { isSpeechSupported, speak, stopSpeaking } from "../speech";
import type { Confidence, Diagnosis, HealthStatus } from "../types";

const STATUS_LABELS: Record<HealthStatus, string> = {
  healthy: "Sana",
  diseased: "Enfermedad",
  pest: "Plaga",
  nutrient_deficiency: "Deficiencia nutricional",
  unknown: "Indeterminado",
};

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

function ListSection({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="result__section">
      <h3>{title}</h3>
      <ul>
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function ResultCard({ result }: { result: Diagnosis }) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Stop the voice if the card is removed (e.g. a new photo is chosen).
  useEffect(() => stopSpeaking, []);

  function toggleSpeech() {
    if (isSpeaking) {
      stopSpeaking();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      speak(result.speechSummary, () => setIsSpeaking(false));
    }
  }

  return (
    <article className="result" aria-live="polite">
      <header className="result__header">
        <div>
          <p className="result__eyebrow">{result.isPlant ? "Planta detectada" : "Sin planta detectada"}</p>
          <h2>{result.isPlant ? result.plantName || "Planta no identificada" : "No es una planta"}</h2>
        </div>
        <div className="result__badges">
          <span className={`badge badge--${result.healthStatus}`}>{STATUS_LABELS[result.healthStatus]}</span>
          <span className="badge badge--neutral">Confianza: {CONFIDENCE_LABELS[result.confidence]}</span>
        </div>
      </header>

      <p className="result__diagnosis">{result.diagnosis}</p>

      {isSpeechSupported() && (
        <button type="button" className="button button--secondary" onClick={toggleSpeech}>
          {isSpeaking ? "⏹ Detener audio" : "🔊 Escuchar diagnóstico"}
        </button>
      )}

      <div className="result__grid">
        <ListSection title="Síntomas observados" items={result.symptoms} />
        <ListSection title="Tratamiento sugerido" items={result.treatment} />
        <ListSection title="Prevención y cuidados" items={result.prevention} />
      </div>
    </article>
  );
}
