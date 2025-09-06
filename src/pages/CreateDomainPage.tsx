// pages/CreateDomainPage.tsx
import React, { useState } from "react";
import { useDomains } from "../hooks/useDomains";
import { NavLink } from "react-router-dom";
import toast from "react-hot-toast";

export default function CreateDomainPage() {
  // set seedDefaultOnEmpty ke true kalau mau otomatis isi 3 default saat koleksi masih kosong
  const { domains, addDomain, removeDomain, uid } = useDomains({
    seedDefaultOnEmpty: false,
  });
  const [name, setName] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await addDomain(name);
    if (res.ok) {
      toast.success("Domain added");
      setName("");
    } else {
      toast.error(res.reason || "Failed to add domain");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await removeDomain(id);
    if (res.ok) toast.success("Domain delete");
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manage Domains</h1>
        <NavLink
          to="/domain"
          className="px-3 py-1.5 rounded bg-[#2A2B32] hover:bg-[#343541] text-sm"
        >
          Back to Domain
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
                  onClick={() => handleDelete(d.id)}
                  className="px-3 py-1.5 text-sm rounded bg-red-600 hover:bg-red-700"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
