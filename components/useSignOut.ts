"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { clearCurrent } from "@/lib/store/current";

export function useSignOut() {
  const router = useRouter();
  return useCallback(() => {
    clearCurrent();
    router.replace("/");
  }, [router]);
}
