
import type { SVGProps } from 'react';

export function LogoCC(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Outer C: Centered at (18,18), Radius 14, Stroke 4, ~60-degree opening on the right */}
      <path
        d="M 30.124 25 A 14 14 0 1 1 30.124 11"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Inner C: Centered at (18,18), Radius 8, Stroke 3, ~90-degree opening on the right */}
      <path
        d="M 23.657 23.657 A 8 8 0 1 1 23.657 12.343"
        stroke="hsl(var(--accent))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

