"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { useSignOut } from "@/components/useSignOut";

/** Shown instead of a blank screen, for example when saved demo data names a retired reading item. */
export default function ErrorPage({ error }: { error: Error }) {
  const signOut = useSignOut();

  useEffect(() => {
    console.error("The page could not be shown", error);
  }, [error]);

  return (
    <Screen title="This page could not load" width="narrow">
      <p className="text-center">
        The saved demo data may be out of date. Reload the page, or go to sign in and use Clear demo data.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button onClick={() => window.location.reload()}>Reload</Button>
        <Button variant="primary" onClick={signOut}>
          Go to sign in
        </Button>
      </div>
    </Screen>
  );
}
