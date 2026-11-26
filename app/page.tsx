"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ClearDemoData } from "@/components/ClearDemoData";
import { Screen } from "@/components/ui/Screen";
import { Segmented } from "@/components/ui/Segmented";
import { getRepository, storageAvailable } from "@/lib/store/client";
import { writeCurrent } from "@/lib/store/current";
import type { Role } from "@/lib/types";

const ROLES = [
  { value: "participant", label: "Participant" },
  { value: "researcher", label: "Researcher" },
] as const;

const BLOCKED = "This browser is blocking storage, so the demo cannot run. Leave private mode or allow site data.";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("participant");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    storageAvailable().then((available) => setError(available ? null : BLOCKED));
  }, []);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    try {
      const repo = await getRepository();
      const profile = await repo.signIn(email, role);
      writeCurrent({ email: profile.email, role });
      const participantPage = profile.consentedAt ? "/sessions" : "/consent";
      router.push(role === "researcher" ? "/research" : participantPage);
    } catch (failure) {
      console.error("Sign in failed", failure);
      setError(BLOCKED);
    }
  }

  return (
    <Screen title="bigkas" width="auth">
      <p className="-mt-4 text-center text-[15px] text-secondary">Calibrated read aloud speech scoring</p>
      <form onSubmit={signIn} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-[15px] font-semibold">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-11 w-full rounded-xl bg-fill px-4 text-[17px] font-normal"
          />
        </label>
        <Segmented label="Role" value={role} options={ROLES} onChange={setRole} />
        <Button type="submit" variant="primary" className="w-full" disabled={error === BLOCKED}>
          Continue
        </Button>
        {error && (
          <p role="alert" className="text-center text-[15px] text-danger">
            {error}
          </p>
        )}
      </form>
      <ClearDemoData />
      <p className="mt-4 text-center text-[13px] text-secondary">Demo. Nothing is sent anywhere.</p>
    </Screen>
  );
}
