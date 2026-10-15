/** The − or + of a control that steps a number by one. */
export function StepGlyph({ isIncrease = false }: { isIncrease?: boolean }) {
  return (
    <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M5 12H19" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      {isIncrease ? (
        <path d="M12 5V19" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      ) : null}
    </svg>
  );
}
