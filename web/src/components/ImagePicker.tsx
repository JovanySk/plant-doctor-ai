import { useRef, useState, type DragEvent } from "react";

interface Props {
  previewUrl: string | null;
  disabled: boolean;
  onFileSelected: (file: File) => void;
}

/** Drop zone + hidden file input. Shows the selected photo as a preview. */
export function ImagePicker({ previewUrl, disabled, onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onFileSelected(file);
  }

  return (
    <div
      className={`dropzone${isDragging ? " dropzone--active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !disabled) inputRef.current?.click();
      }}
      aria-label="Seleccionar o arrastrar una foto de la planta"
    >
      {previewUrl ? (
        <img className="dropzone__preview" src={previewUrl} alt="Vista previa de la foto seleccionada" />
      ) : (
        <div className="dropzone__hint">
          <span className="dropzone__icon" aria-hidden="true">📷</span>
          <strong>Arrastra aquí una foto de tu planta</strong>
          <span>o haz clic para elegir un archivo</span>
          <small>JPG, PNG o WEBP · máximo 5 MB</small>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = ""; // allow picking the same file again
        }}
      />
    </div>
  );
}
