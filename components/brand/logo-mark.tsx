type LogoMarkProps = {
  /** Width and height in pixels. */
  size?: number;
  /**
   * `full` is the flask in a hexagon with a small network in the liquid; use it
   * from about 32 px up.
   */
  variant?: 'full' | 'compact';
  /** The square behind the mark (any CSS colour, or a `var(--token)`). */
  background?: string;
  /** The hexagon, flask and network. */
  foreground?: string;
  /** Corner radius of the square, in a 64 unit box; 0 for icons a platform rounds itself. */
  corner?: number;
  className?: string;
  /** Names the mark for assistive technology; without it the mark is decorative. */
  title?: string;
};

/** The brand blue and its pale foreground, used wherever the app's tokens are not around. */
export const BRAND_BACKGROUND = '#0369a1';
export const BRAND_FOREGROUND = '#f0f9ff';

/**
 * The Lab Brain mark: a flask inside a hexagon (a lab, and the lattice of a
 * material) with a small network in the liquid (the brain).
 */
export const LogoMark = ({
  size = 32,
  variant = 'full',
  background = BRAND_BACKGROUND,
  foreground = BRAND_FOREGROUND,
  corner = 14,
  className,
  title
}: LogoMarkProps) => {
  const isFull = variant === 'full';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <rect width="64" height="64" rx={corner} style={{ fill: background }} />
      <path
        d="M32 8l21 12v24L32 56 11 44V20z"
        fill="none"
        strokeWidth="3.2"
        strokeLinejoin="round"
        style={{ stroke: foreground }}
      />
      {/* The flask's outline spans y 10.5 to 55 (rim to base, strokes included), so
        its middle is 32.75; this puts that on the hexagon's middle, y 32. */}
      <g transform="translate(32 32) scale(0.6) translate(-32 -32.75)">
        <path
          d="M27 13h10M29 13v15L18.5 46.5a4 4 0 0 0 3.5 6h20a4 4 0 0 0 3.5-6L35 28V13"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ stroke: foreground }}
        />
        {/* No fragments here: the preview-image renderer only accepts plain
          elements inside an svg. */}
        {isFull && (
          <path
            d="M32 38.5l-6.5 9M32 38.5l6.5 9M26 47.5h12"
            strokeWidth="2.4"
            strokeLinecap="round"
            style={{ stroke: foreground }}
          />
        )}
        {isFull && (
          <circle cx="32" cy="38.5" r="3" style={{ fill: foreground }} />
        )}
        {isFull && (
          <circle cx="25.5" cy="47.5" r="3" style={{ fill: foreground }} />
        )}
        {isFull && (
          <circle cx="38.5" cy="47.5" r="3" style={{ fill: foreground }} />
        )}
        {!isFull && (
          <path
            d="M23.5 44h17"
            strokeWidth="3"
            strokeLinecap="round"
            style={{ stroke: foreground }}
          />
        )}
      </g>
    </svg>
  );
};
