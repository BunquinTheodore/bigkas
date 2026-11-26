import type { HTMLAttributes } from "react";

/** The one page container. The top bar and every page share its edges. */
export function Container({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`mx-auto w-full max-w-[1080px] px-4 sm:px-6 lg:px-8 ${className}`} {...props} />;
}
