import type { ReactNode } from "react";

export default function PublicContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`public-shell px-5 sm:px-8 lg:px-10 min-[1920px]:px-14 ${className}`}
    >
      {children}
    </div>
  );
}
