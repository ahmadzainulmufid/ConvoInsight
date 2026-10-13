// src/pages/DomainPage.tsx
import { useDomains } from "../hooks/useDomains";

export default function DomainPage() {
  const { domains } = useDomains();
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md text-center animate-fade-in">
      <div className="mx-auto mb-5 h-14 w-14 grid place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-2xl font-bold text-white shadow-lg shadow-indigo-500/30">
        D
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-white">Domain</h1>
      <p className="mt-2 text-gray-400 leading-relaxed">
        Select one of the domains in the left sidebar
        {domains.length ? ":" : "."}{" "}
        {domains.length ? (
          <b className="text-gray-200">{domains.map((d) => d.name).join(", ")}</b>
        ) : (
          "No domain yet, add it on the Manage Domains page."
        )}
      </p>
      </div>
    </div>
  );
}
