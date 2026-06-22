import { useEffect, useRef, useState } from "react";

interface Props {
  onPhoto: (dataUrl: string) => void;
  busy: boolean;
}

type Mode = "idle" | "live";

/**
 * Capture step. Offers a live rear-camera preview via getUserMedia and grabs a
 * still to a JPEG data URL on the capture button; when the camera API is
 * unavailable or permission is denied it degrades to the OS file picker
 * (`<input capture>`). Either path produces the same `onPhoto(dataUrl)` the
 * analyze flow consumes — the contract App.tsx depends on is unchanged.
 *
 * The camera is only ever requested on a user action (never on mount), so the
 * app loads with zero console errors when no camera/permission exists.
 */
export default function PhotoCapture({ onPhoto, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<Mode>("idle");
  const [reading, setReading] = useState(false); // FileReader in-flight
  const [starting, setStarting] = useState(false); // getUserMedia in-flight
  const [hint, setHint] = useState<string | null>(null); // fallback notice

  const cameraSupported =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function";

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Stop the camera when the component unmounts — leaving the capture phase
  // unmounts PhotoCapture (App.tsx renders it only while phase === "capture"),
  // so this is the no-hot-camera guard on every phase transition.
  useEffect(() => stopStream, []);

  // Attach the stream once the <video> has actually rendered (mode flips to
  // "live"); the element doesn't exist yet at the moment getUserMedia resolves.
  useEffect(() => {
    const video = videoRef.current;
    if (mode === "live" && video && streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {
        /* autoplay rejection is non-fatal; the preview still shows */
      });
    }
  }, [mode]);

  function pick() {
    inputRef.current?.click();
  }

  async function openCamera() {
    if (!cameraSupported) {
      setHint("Camera isn't available here — choose a photo instead.");
      pick();
      return;
    }
    setStarting(true);
    setHint(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setMode("live");
    } catch {
      // Denied / no device / in use — degrade to the file picker, no console noise.
      stopStream();
      setMode("idle");
      setHint("Couldn't open the camera — choose a photo instead.");
    } finally {
      setStarting(false);
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return; // stream not warmed up yet
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    stopStream();
    setMode("idle");
    onPhoto(dataUrl);
  }

  function cancelCamera() {
    stopStream();
    setMode("idle");
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

  const disabled = busy || reading || starting;

  return (
    <section className="capture">
      {mode === "live" ? (
        <>
          <video
            ref={videoRef}
            className="capture__video"
            autoPlay
            playsInline
            muted
            aria-label="Live camera preview"
          />
          <div className="actions actions--center">
            <button className="btn btn--ghost" onClick={cancelCamera} disabled={disabled}>
              Cancel
            </button>
            <button className="btn btn--primary btn--lg" onClick={capture} disabled={disabled}>
              Capture photo
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="capture__art" aria-hidden="true">
            📸🥕🧀🥦
          </div>
          <h2 className="capture__heading">What's in the fridge?</h2>
          <p className="capture__hint">
            Take a photo of your open refrigerator and we'll spot the ingredients.
          </p>

          {cameraSupported && (
            <button
              className="btn btn--primary btn--lg"
              onClick={openCamera}
              disabled={disabled}
            >
              {starting ? "Opening camera…" : "Open camera"}
            </button>
          )}
          <button
            className={cameraSupported ? "btn btn--ghost" : "btn btn--primary btn--lg"}
            onClick={pick}
            disabled={disabled}
          >
            {reading ? "Reading photo…" : cameraSupported ? "Choose a photo" : "Take / choose a photo"}
          </button>

          {hint && (
            <p className="capture__hint" role="status">
              {hint}
            </p>
          )}
        </>
      )}

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
