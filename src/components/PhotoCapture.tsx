import { useRef, useState } from "react";

interface Props {
  onPhoto: (dataUrl: string) => void;
  onSample: () => void;
  busy: boolean;
}

/**
 * Foundation capture: a file input with `capture="environment"` so phones open
 * the rear camera and desktops open a file picker. (A live getUserMedia preview
 * is a tracked enhancement — see the backlog.)
 */
export default function PhotoCapture({ onPhoto, onSample, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  function pick() {
    inputRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setReading(false);
      if (typeof reader.result === "string") onPhoto(reader.result);
    };
    reader.onerror = () => setReading(false);
    reader.readAsDataURL(file);
  }

  const disabled = busy || reading;

  return (
    <section className="capture">
      <div className="capture__art" aria-hidden="true">
        📸🥕🧀🥦
      </div>
      <h2 className="capture__heading">What's in the fridge?</h2>
      <p className="capture__hint">
        Take a photo of your open refrigerator and we'll spot the ingredients.
      </p>
      <button className="btn btn--primary btn--lg" onClick={pick} disabled={disabled}>
        {disabled ? "Reading photo…" : "Take / choose a photo"}
      </button>
      <button className="btn btn--ghost" onClick={onSample} disabled={disabled}>
        Try a sample fridge
      </button>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFile}
        aria-label="Fridge photo"
      />
    </section>
  );
}
