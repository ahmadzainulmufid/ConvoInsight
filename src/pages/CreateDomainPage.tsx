// pages/CreateDomainPage.tsx
import React, { useState } from "react";
import { useDomains } from "../hooks/useDomains";
import { NavLink } from "react-router-dom";
import toast from "react-hot-toast";

export default function CreateDomainPage() {
  const { domains, addDomain, removeDomain } = useDomains();
  const [name, setName] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const res = addDomain(name);
    if (res.ok) {
      toast.success("Domain ditambahkan");
      setName(""); // tetap di halaman ini, tidak navigate
    } else {
      toast.error(res.reason || "Gagal menambah domain");
    }
  };

  const handleDelete = (d: string) => {
    removeDomain(d);
    toast.success("Domain dihapus");
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

      <form
        onSubmit={handleAdd}
        className="bg-[#2A2B32] p-4 rounded-lg space-y-3"
      >
        <label className="block text-sm text-gray-300">Nama Domain Baru</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Sales, Marketing, Finance"
          className="w-full rounded border border-[#3a3b42] bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
        >
          Tambah Domain
        </button>
      </form>

      <section className="bg-[#2A2B32] p-4 rounded-lg">
        <h2 className="text-sm text-gray-300 mb-3">Domain Saat Ini</h2>
        {domains.length === 0 ? (
          <p className="text-gray-400 text-sm">Belum ada domain.</p>
        ) : (
          <ul className="space-y-2">
            {domains.map((d) => (
              <li
                key={d}
                className="flex items-center justify-between rounded border border-[#3a3b42] px-3 py-2"
              >
                <span>{d}</span>
                <button
                  onClick={() => handleDelete(d)}
                  className="px-3 py-1.5 text-sm rounded bg-red-600 hover:bg-red-700"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
