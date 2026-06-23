import { useEffect, useRef, useState } from "react";

interface Props {
  onPhoto: (dataUrl: string) => void;
  // Report a read failure upward into App's single assertive error channel
  // (the `role="alert"` banner). Mirrors `onPhoto` — same upward-report shape,
  // not a second error mechanism. Used by the FileReader paths in onFile so a
  // failed/non-string read is perceivable instead of silent. See onFile / TKT-125.
  onError: (message: string) => void;
  busy: boolean;
  // Optional hook into App's single polite live region (the `status` channel).
  // Used to announce the transient FileReader "Reading photo…" phase to screen
  // readers without adding a second aria-live region. See onFile / TKT-123.
  onStatus?: (message: string) => void;
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
export default function PhotoCapture({ onPhoto, onError, busy, onStatus }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // The live panel's heading (focused on enter) and the "Open camera" button
  // (focus restored to it on Cancel / camera-open failure) — the two ends of
  // this sub-view's focus management. See the [mode] effect and cancelCamera.
  const liveHeadingRef = useRef<HTMLHeadingElement>(null);
  const openCameraRef = useRef<HTMLButtonElement>(null);

  const [mode, setMode] = useState<Mode>("idle");
  const [reading, setReading] = useState(false); // FileReader in-flight
  const [starting, setStarting] = useState(false); // getUserMedia in-flight
  const [ready, setReady] = useState(false); // live <video> has produced its first frame
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

  // On the idle→live swap: attach the stream (the <video> doesn't exist yet at
  // the moment getUserMedia resolves) and move focus to the live panel's heading
  // so a keyboard/SR user lands in the new sub-view — the "Open camera" button
  // they activated is now unmounted. Mirrors App's phase-change focus pass
  // (TKT-110); focusing the heading also announces the swap (no extra live
  // region needed). Only ever reached via a user action, so it never steals
  // focus on load. cancelCamera handles the reverse (live→idle) focus restore.
  useEffect(() => {
    if (mode !== "live") return;
    setReady(false); // fresh <video> each entry — wait for its first frame again
    const video = videoRef.current;
    if (video && streamRef.current) {
      video.srcObject = streamRef.current;
      video.play().catch(() => {
        /* autoplay rejection is non-fatal; the preview still shows */
      });
    }
    liveHeadingRef.current?.focus();
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
      // The button disabled itself while `starting`, dropping focus to <body>;
      // return it to "Open camera" once it re-enables so the keyboard user
      // isn't stranded (the hint's role="status" announces the failure).
      restoreOpenCameraFocus();
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
    // Restore focus to the control that opened the preview, mirroring Cook
    // Mode's focus-restore (RecipeList.tsx:33-38) — the button remounts on the
    // swap back to idle, so focus it after the commit.
    restoreOpenCameraFocus();
  }

  // Focus "Open camera" on the next frame — after React has remounted the idle
  // panel (the button is unmounted while mode === "live"). rAF, like Cook Mode.
  function restoreOpenCameraFocus() {
    requestAnimationFrame(() => openCameraRef.current?.focus());
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReading(true);
    // a11y (TKT-123): mirror the visible "Reading photo…" button label (below)
    // into App's single polite live region so SR users hear this transient
    // file-read phase, restoring parity (WCAG 2.2 SC 4.1.3). On the success
    // path App.handlePhoto overwrites this with "Looking at your fridge…" the
    // instant the read finishes — so we reuse the ONE region (no new aria-live),
    // set-then-superseded. The other exits clear it to avoid a stale message.
    onStatus?.("Reading photo…");
    const reader = new FileReader();
    reader.onload = () => {
      setReading(false);
      if (typeof reader.result === "string") {
        onPhoto(reader.result);
      } else {
        // Non-string result (null/ArrayBuffer — not expected for readAsDataURL,
        // but possible on a partial/aborted read): the success path won't run, so
        // it would otherwise be silent. Clear the transient "Reading photo…"
        // status, then report through the SAME error channel as a read failure so
        // the user gets real feedback in the role="alert" banner (TKT-125).
        onStatus?.("");
        onError("Couldn't read that image. Please try another photo.");
      }
    };
    // Failed read: handlePhoto never runs, so clear our announcement to avoid a
    // stale "Reading photo…". The error itself is announced separately (TKT-124).
    reader.onerror = () => {
      setReading(false);
      onStatus?.("");
    };
    reader.readAsDataURL(file);
  }

  const disabled = busy || reading || starting;

  return (
    <section className="capture">
      {mode === "live" ? (
        <>
          {/* Focusable heading for the live sub-view: focused on enter so a
              keyboard/SR user lands here (and hears the swap), mirroring the
              per-view <h2 tabIndex={-1}> landmark the phase machine uses. */}
          <h2 className="capture__heading" tabIndex={-1} ref={liveHeadingRef}>
            Camera preview
          </h2>
          <video
            ref={videoRef}
            className="capture__video"
            autoPlay
            playsInline
            muted
            aria-label="Live camera preview"
            // First frame is ready once metadata loads — that's exactly when
            // videoWidth/Height become non-zero, the condition capture() guards on.
            onLoadedMetadata={() => setReady(true)}
          />
          <div className="actions actions--center">
            <button className="btn btn--ghost" onClick={cancelCamera} disabled={disabled}>
              Cancel
            </button>
            <button
              className="btn btn--primary btn--lg"
              onClick={capture}
              // Gate on `ready` so a fast tap before the first frame can't
              // silently no-op (capture()'s !videoWidth guard); Cancel stays
              // enabled so the user is never trapped waiting.
              disabled={disabled || !ready}
            >
              {ready ? "Capture photo" : "Preparing…"}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="capture__art" aria-hidden="true">
            📸🥕🧀🥦
          </div>
          <h2 className="capture__heading" tabIndex={-1}>What's in the fridge?</h2>
          <p className="capture__hint">
            Take a photo of your open refrigerator and we'll spot the ingredients.
          </p>

          {cameraSupported && (
            <button
              ref={openCameraRef}
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
