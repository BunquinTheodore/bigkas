import type { ReactNode } from "react";
import { Card } from "./Card";
import { Container } from "./Container";

interface ScreenProps {
  title: string;
  /** "auth" and "narrow" are single centred cards. "full" uses the whole container. */
  width?: "auth" | "narrow" | "full";
  children: ReactNode;
}

const CENTRED = { auth: "max-w-[400px]", narrow: "max-w-[560px]" };

export function Screen({ title, width = "full", children }: ScreenProps) {
  if (width === "full") {
    return (
      <main>
        <Container className="pt-6 pb-12">
          <h1 className="text-[30px] leading-tight font-bold tracking-tight sm:text-[34px]">{title}</h1>
          <div className="mt-6">{children}</div>
        </Container>
      </main>
    );
  }
  // The sign in card has no top bar, so it sits in the middle of the screen.
  const middle = width === "auth";
  return (
    <main className={middle ? "flex min-h-dvh items-center" : ""}>
      <Container className={`flex justify-center ${middle ? "py-8" : "py-12"}`}>
        <div className={`w-full ${CENTRED[width]}`}>
          <Card>
            <h1 className="text-center text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
            <div className="mt-6">{children}</div>
          </Card>
        </div>
      </Container>
    </main>
  );
}
