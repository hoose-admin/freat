import { useRef, useState } from "react";

interface Props {
  onPhoto: (dataUrl: string) => void;
  onError: (message: string) => void;
  busy: boolean;
}

/**
 * Foundation capture: a file input with `capture="environment"` so phones open
 * the rear camera and desktops open a file picker. (A live getUserMedia preview
 * is a tracked enhancement — see the backlog.)
 */
export default function PhotoCapture({ onPhoto, onError, busy }: Props) {
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
    // A failed/corrupt read must not be silent — route it through App's existing
    // assertive role="alert" banner (TKT-124) so sighted AND screen-reader users
    // get feedback. Mirrors how onPhoto reports the success path upward.
    reader.onerror = () => {
      setReading(false);
      onError("Couldn't read that image. Please try another photo.");
    };
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
