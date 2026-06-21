import { useRef, useState } from "react";

interface Props {
  onPhoto: (dataUrl: string) => void;
  busy: boolean;
}

/**
 * Foundation capture: a file input with `capture="environment"` so phones open
 * the rear camera and desktops open a file picker. (A live getUserMedia preview
 * is a tracked enhancement — see the backlog.)
 */
export default function PhotoCapture({ onPhoto, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  // a11y (TKT-123): the transient "Reading photo…" state below is intentionally
  // NOT announced to screen readers. Reading a local file with FileReader is
  // sub-perceptual (~<100ms); a polite live-region message that brief is
  // coalesced/superseded by App's immediately-following "Analyzing photo…"
  // announcement (TKT-117), so it would add churn, not information — the
  // meaningful status ("working on your photo") is already covered there.
  // Announcing it here would also require a second, competing live region,
  // which CLAUDE.md forbids. Decision recorded in TKT-123 (intentionally silent).
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
