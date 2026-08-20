import type { CSSProperties } from "react";

export function MaritimeShip({ className = "h-12 w-20", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 160 80" fill="none" className={`maritime-ship ${className}`} style={style} aria-hidden="true">
      <path d="M22 50h116l-13 13H42L22 50Z" fill="var(--rams-red)" />
      <path d="M35 48h91l-8-22H49l-14 22Z" fill="var(--navy)" />
      <path d="M59 26V14h25v12M92 26V9h18v17" stroke="var(--navy)" strokeWidth="5" strokeLinecap="round" />
      <path d="M28 69c14-7 28 7 42 0s28-7 42 0 28-7 42 0" stroke="var(--ais-blue)" strokeWidth="4" strokeLinecap="round" />
      <path d="M42 43h76" stroke="white" strokeWidth="3" strokeLinecap="round" opacity=".8" />
      <circle cx="55" cy="34" r="3" fill="var(--rams-red)" />
      <circle cx="68" cy="34" r="3" fill="var(--rams-red)" />
    </svg>
  );
}
