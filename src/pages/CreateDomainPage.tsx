import React, { useState } from "react";
import { useDomains } from "../hooks/useDomains";
import { NavLink } from "react-router-dom";
import toast from "react-hot-toast";
import { addNotification } from "../service/notificationStore";

export default function CreateDomainPage() {
  const { domains, addDomain, removeDomain, uid } = useDomains({
    seedDefaultOnEmpty: false,
  });
  const [name, setName] = useState("");

  const [domainToDelete, setDomainToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uid) {
      toast.error("Please login first before adding domain");
      return;
    }

    const res = await addDomain(name);
    if (res.ok) {
      toast.success("Domain added");

      await addNotification(
        "domain",
        "New Domain Created",
        `Domain "${name}" has been added.`
      );

      setName("");
    } else {
      toast.error(res.reason || "Failed to add domain");
    }
  };

  const confirmDelete = async () => {
    if (!domainToDelete) return;
    const res = await removeDomain(domainToDelete.id);
    if (res.ok) toast.success(`Domain "${domainToDelete.name}" deleted`);
    await addNotification(
      "domain",
      "Domain Deleted",
      `Domain "${domainToDelete.name}" deleted.`
    );
    setDomainToDelete(null);
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manage Domains</h1>
        <NavLink
          to="/home"
          className="px-3 py-1.5 rounded bg-[#2A2B32] hover:bg-[#343541] text-sm"
        >
          Back to Home
        </NavLink>
      </header>

      {!uid && (
        <div className="text-sm text-amber-300">
          You're not logged in. Please log in so your domain information can be
          saved to your account.
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className="bg-[#2A2B32] p-4 rounded-lg space-y-3"
      >
        <label className="block text-sm text-gray-300">New Domain Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Sales, Marketing, Finance"
          className="w-full rounded border border-[#3a3b42] bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!uid}
          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
        >
          Create Domain
        </button>
      </form>

      <section className="bg-[#2A2B32] p-4 rounded-lg">
        <h2 className="text-sm text-gray-300 mb-3">Current Domain</h2>
        {domains.length === 0 ? (
          <p className="text-gray-400 text-sm">There is no domain yet</p>
        ) : (
          <ul className="space-y-2">
            {domains.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between rounded border border-[#3a3b42] px-3 py-2"
              >
                <span>{d.name}</span>
                <button
                  onClick={() => setDomainToDelete({ id: d.id, name: d.name })}
                  className="px-3 py-1.5 text-sm rounded bg-red-600 hover:bg-red-700"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {domainToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#1f2024] text-white p-6 rounded-xl shadow-lg border border-[#3a3b42] w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">Delete Domain?</h2>
            <p className="text-sm text-gray-300">
              Are you sure you want to delete the domain?{" "}
              <span className="font-semibold text-white">
                "{domainToDelete.name}"
              </span>
              ?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDomainToDelete(null)}
                className="px-4 py-1.5 text-sm rounded-md bg-white/10 hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-500 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
