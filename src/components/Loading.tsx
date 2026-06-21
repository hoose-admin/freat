interface Props {
  /** What the app is busy doing, e.g. "Looking at your fridge…". */
  label: string;
}

/**
 * Inline busy indicator for the analyze and recipe calls. Lives in the main
 * flow (not a load-time element) so it only ever appears on a user action —
 * the smoke gate's `/` render stays spinner-free with no key configured.
 */
export default function Loading({ label }: Props) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="loading__label">{label}</span>
    </div>
  );
}
