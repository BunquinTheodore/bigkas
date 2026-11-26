"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { getRepository } from "@/lib/store/client";
import { readCurrent } from "@/lib/store/current";
import type { Repository } from "@/lib/store/repository";
import type { Profile, Role } from "@/lib/types";

export interface GuardContext {
  profile: Profile;
  repo: Repository;
}

interface GuardProps {
  role: Role;
  requireConsent?: boolean;
  children: (context: GuardContext) => ReactNode;
}

/** Renders the page only for the signed in role, after consent for participants. */
export function Guard({ role, requireConsent = role === "participant", children }: GuardProps) {
  const router = useRouter();
  const [context, setContext] = useState<GuardContext | null>(null);

  useEffect(() => {
    let active = true;
    async function check() {
      const current = readCurrent();
      if (!current || current.role !== role) return router.replace("/");
      const repo = await getRepository();
      const profile = await repo.getProfile(current.email);
      if (!profile) return router.replace("/");
      if (requireConsent && !profile.consentedAt) return router.replace("/consent");
      if (active) setContext({ profile, repo });
    }
    check().catch((error: unknown) => {
      console.error("Could not check the sign in", error);
      router.replace("/");
    });
    return () => {
      active = false;
    };
  }, [role, requireConsent, router]);

  return context ? <>{children(context)}</> : <PageSkeleton />;
}
