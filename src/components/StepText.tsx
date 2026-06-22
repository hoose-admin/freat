import { Fragment, useEffect, useState } from "react";
import type { ReactNode } from "react";

// A duration phrase inside a recipe step: "10 minutes", "20 min", "1 hour",
// "2 hrs", "45 sec", "30 seconds". Plurals + common abbreviations; the leading
// integer is captured. Bare single letters (h/m/s) are intentionally excluded —
// they false-match ordinary words ("a", "to", "in", …).
const DURATION_RE = /\b(\d+)\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/gi;

function unitToSeconds(n: number, unit: string): number {
  const u = unit[0].toLowerCase(); // h | m | s — unambiguous given the regex
  const mult = u === "h" ? 3600 : u === "m" ? 60 : 1;
  return n * mult;
}

function fmt(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Haptic feedback on completion. Feature-detected; a throw (some browsers reject
// vibrate outside a user gesture) is swallowed so the timer never breaks the app.
function buzz(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([200, 100, 200]);
    } catch {
      /* no-op where vibrate is present but rejects */
    }
  }
}

/**
 * One tappable countdown chip for a single duration. Idle → shows the matched
 * phrase ("10 min"); tap → counts down MM:SS on a 1s tick; at 0 → haptic buzz +
 * a visible flash; tap-again on a running chip stops/resets it. Each chip owns
 * its own state, so many can run at once.
 */
function TimerChip({ seconds, label }: { seconds: number; label: string }) {
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(seconds);
  const [done, setDone] = useState(false);

  // Tick once a second while running.
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  // Completion: fires exactly once on the running→0 transition (deps flip
  // `running` to false, so it can't re-fire).
  useEffect(() => {
    if (!running || remaining > 0) return;
    setRunning(false);
    setDone(true);
    buzz();
  }, [running, remaining]);

  // Auto-clear the "done" flash after it has played.
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setDone(false), 4000);
    return () => window.clearTimeout(id);
  }, [done]);

  function toggle() {
    if (running) {
      setRunning(false);
      setRemaining(seconds);
      setDone(false);
    } else {
      setRemaining(seconds);
      setDone(false);
      setRunning(true);
    }
  }

  const state = running ? "running" : done ? "done" : "idle";
  const display = running || done ? fmt(remaining) : label;
  const aria =
    state === "running"
      ? `Timer, ${fmt(remaining)} remaining, tap to stop`
      : state === "done"
        ? `${label} timer finished, tap to restart`
        : `Start ${label} timer`;

  return (
    <button
      type="button"
      className={`step-timer step-timer--${state}`}
      onClick={toggle}
      aria-label={aria}
    >
      <span aria-hidden="true" className="step-timer__icon">
        {state === "done" ? "🔔" : "⏱"}
      </span>
      <span className="step-timer__text">{display}</span>
    </button>
  );
}

/**
 * Renders a recipe step string with any embedded duration turned into a tappable
 * countdown {@link TimerChip}. Steps with no duration render as unchanged plain
 * text. Pure client-side (regex over the existing `Recipe.steps` strings) — no
 * network, no Gemini, no contract change. Reusable: Cook Mode's single-step view
 * can render the same component over its step text.
 */
export default function StepText({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  // Fresh regex per call — DURATION_RE is global/stateful via lastIndex.
  const re = new RegExp(DURATION_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>);
    }
    nodes.push(
      <TimerChip key={key++} seconds={unitToSeconds(parseInt(m[1], 10), m[2])} label={m[0]} />,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>);
  }
  return <>{nodes}</>;
}
