import type { ReactNode } from "react";
import { AppHeader } from "./app-header";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <AppHeader />
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:py-10">{children}</main>
    </div>
  );
}
