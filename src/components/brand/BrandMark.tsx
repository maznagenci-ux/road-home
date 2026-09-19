import { cn } from '@/lib/utils';

/** Crisp vector house + RH mark — sharp at any sidebar size. */
export function BrandMark({
  size = 40,
  className,
  onDark = false,
}: {
  size?: number;
  className?: string;
  onDark?: boolean;
}) {
  const stroke = onDark ? '#ffffff' : '#0f2744';
  const fill = onDark ? '#ffffff' : '#0f2744';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      {/* House outline */}
      <path
        d="M32 8 L54 28 V52 C54 54.2 52.2 56 50 56 H14 C11.8 56 10 54.2 10 52 V28 Z"
        stroke={stroke}
        strokeWidth="3.2"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Roof peak overhang */}
      <path
        d="M8 30 L32 8 L56 30"
        stroke={stroke}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Door */}
      <path
        d="M28 56 V44 C28 41.8 29.8 40 32 40 C34.2 40 36 41.8 36 44 V56"
        stroke={stroke}
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* RH monogram */}
      <text
        x="32"
        y="36.5"
        textAnchor="middle"
        fill={fill}
        fontFamily="system-ui, Segoe UI, Arial, sans-serif"
        fontSize="15"
        fontWeight="700"
        letterSpacing="-0.5"
      >
        RH
      </text>
    </svg>
  );
}
