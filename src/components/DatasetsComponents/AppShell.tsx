import type { PropsWithChildren } from "react";

type AppShellProps = PropsWithChildren<{
  userName: string;
  containerClassName?: string;
  contentPadding?: string;
}>;

export default function AppShell({
  children,
  containerClassName = "w-full",
  contentPadding = "px-6 md:px-8 py-6",
}: AppShellProps) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <div className="fixed inset-0 z-0 bg-[#1a1b1e]" />
      <main className="relative z-10 min-h-screen">
        <div className={`${containerClassName} ${contentPadding}`}>
          {children}
        </div>
      </main>
    </div>
  );
}
