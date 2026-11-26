import type { ComponentPropsWithRef } from "react";

export type ButtonVariant = "primary" | "tinted" | "plain";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-tint bg-linear-to-b from-tint to-[#0064cc] text-white shadow-primary disabled:shadow-none",
  tinted: "bg-fill text-tint-text",
  plain: "bg-transparent text-tint-text",
};

/** Shared with links that must look like buttons. */
export function buttonClass(variant: ButtonVariant = "tinted", className = "") {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold whitespace-nowrap transition active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 ${VARIANTS[variant]} ${className}`;
}

type ButtonProps = ComponentPropsWithRef<"button"> & { variant?: ButtonVariant };

export function Button({ variant = "tinted", className = "", type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
