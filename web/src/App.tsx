import { useEffect, useState } from "react";
import { diagnosePlant, validateImage } from "./api";
import { ImagePicker } from "./components/ImagePicker";
import { ResultCard } from "./components/ResultCard";
import type { Diagnosis } from "./types";

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<Diagnosis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Free the preview URL from memory when it changes or the page closes.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileSelected(selected: File) {
    setResult(null);
    const validationError = validateImage(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setError(null);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  }

  async function handleDiagnose() {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await diagnosePlant(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>🌱 Plant Doctor AI</h1>
        <p>Sube una foto de tu planta y recibe un diagnóstico orientativo con recomendaciones, también por voz.</p>
      </header>

      <main className="layout">
        <section className="panel">
          <ImagePicker previewUrl={previewUrl} disabled={isLoading} onFileSelected={handleFileSelected} />

          <button
            type="button"
            className="button button--primary"
            onClick={handleDiagnose}
            disabled={!file || isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner" aria-hidden="true" /> Analizando la foto…
              </>
            ) : (
              "Diagnosticar"
            )}
          </button>

          {file && !isLoading && <p className="file-name">{file.name}</p>}
          {error && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
        </section>

        <section className="panel panel--result">
          {result ? (
            <ResultCard result={result} />
          ) : (
            <div className="placeholder">
              {isLoading ? (
                <p>Nuestro asistente está revisando hojas, tallos y manchas. Esto tarda unos segundos…</p>
              ) : (
                <>
                  <h2>¿Cómo funciona?</h2>
                  <ol>
                    <li>Toma una foto nítida de la hoja o planta afectada, con buena luz.</li>
                    <li>Súbela aquí y presiona “Diagnosticar”.</li>
                    <li>Lee o escucha el diagnóstico con síntomas, tratamiento y prevención.</li>
                  </ol>
                </>
              )}
            </div>
          )}
        </section>
      </main>

      <footer className="disclaimer">
        ⚠️ El diagnóstico es <strong>orientativo</strong> y lo genera una inteligencia artificial que puede
        equivocarse. <strong>No sustituye a un especialista</strong> (agrónomo o fitopatólogo). Antes de aplicar
        cualquier producto químico, consulta a un profesional y sigue las indicaciones de la etiqueta.
      </footer>
    </div>
  );
}
