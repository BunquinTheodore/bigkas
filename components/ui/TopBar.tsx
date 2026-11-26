import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Container } from "./Container";

interface TopBarProps {
  title: string;
  back?: { label: string; href: string };
  onSignOut?: () => void;
}

export function TopBar({ title, back, onSignOut }: TopBarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-separator bg-bar shadow-bar backdrop-blur-xl backdrop-saturate-150">
      <Container className="flex min-h-[60px] items-center justify-between gap-3 short:min-h-12">
        <div data-testid="bar-title" className="flex min-w-0 items-center gap-4">
          {back && (
            <Link href={back.href} className="flex min-h-11 items-center gap-1 text-tint-text">
              <ChevronLeft aria-hidden className="size-5 shrink-0" />
              {back.label}
            </Link>
          )}
          <span className="text-[17px] font-semibold">{title}</span>
        </div>
        {onSignOut && (
          <button data-testid="bar-action" type="button" onClick={onSignOut} className="min-h-11 shrink-0 text-tint-text">
            Sign out
          </button>
        )}
      </Container>
    </header>
  );
}
