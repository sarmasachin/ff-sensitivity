/** Top-right decorative cuts — page blue shows through (design only). */
export function LoginCornerCuts() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute top-0 right-0 z-30"
      width="88"
      height="88"
      viewBox="0 0 88 88"
      fill="none"
    >
      {/* Four equal diagonal slots, 45°, even gaps */}
      <path d="M28 0h7L88 53V46L35 0z" fill="#3b7ddd" />
      <path d="M42 0h7L88 39V32L49 0z" fill="#3b7ddd" />
      <path d="M56 0h7L88 25V18L63 0z" fill="#3b7ddd" />
      <path d="M70 0h7L88 11V4L77 0z" fill="#3b7ddd" />
    </svg>
  );
}
