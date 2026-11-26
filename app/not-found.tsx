import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";

export const metadata: Metadata = { title: "Page not found" };

/** Shown for any address the app does not have, so there is always a way back. */
export default function NotFound() {
  return (
    <Screen title="Page not found" width="auth">
      <p className="text-center">There is nothing at this address.</p>
      <Link href="/" className={buttonClass("primary", "mt-4 w-full")}>
        Go to sign in
      </Link>
    </Screen>
  );
}
