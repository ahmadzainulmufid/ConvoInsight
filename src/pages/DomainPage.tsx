// pages/DomainPage.tsx
import { useDomains } from "../hooks/useDomains";

export default function DomainPage() {
  const { domains } = useDomains();
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Domain</h1>
      <p className="mt-2 text-gray-300">
        Select one of the domains in the left sidebar
        {domains.length ? ":" : "."}{" "}
        {domains.length ? (
          <b>{domains.map((d) => d.name).join(", ")}</b>
        ) : (
          "No domain yet, add it on the Manage Domains page."
        )}
      </p>
    </div>
  );
}
