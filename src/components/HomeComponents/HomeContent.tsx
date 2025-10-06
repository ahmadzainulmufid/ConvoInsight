import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import ProjectCard from "./ProjectCard";
import { useAuthUser } from "../../utils/firebaseSetup";
import { useDomains } from "../../hooks/useDomains";

export default function HomeContent() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const userName = user?.displayName || user?.email?.split("@")[0] || "User";

  // 🔥 ambil domain dari Firestore
  const { domains, uid } = useDomains({ seedDefaultOnEmpty: false });

  // filter realtime dari Firestore data
  const filtered = domains.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStartedItems = [
    {
      title: "Create a new Domain",
      desc: "Add your domain to start managing datasets and building apps",
      to: "/domain/new",
    },
    {
      title: "Start upload datasets",
      desc: "Upload your datasets to your domain to start building AI-powered applications",
      to:
        domains.length > 0
          ? `/domain/${domains[0].name}/datasets`
          : "/domain/new",
    },
    {
      title: "Configuration User",
      desc: "Configure your user settings, preferences, and account details to personalize your experience",
      to: "/configuser",
    },
  ];

  return (
    <main className="min-h-screen text-gray-100 transition-all duration-300 px-6 md:px-12 mt-24 md:mt-20">
      <div className="flex flex-col space-y-12">
        {/* 🧍‍♂️ Greeting */}
        <header>
          {!loading ? (
            <>
              <h1 className="text-3xl font-bold text-gray-100">
                Hello, <span className="text-indigo-400">{userName}</span>
              </h1>
              <p className="text-gray-400 mt-2 text-base">
                Welcome back to ConvoInsight!
              </p>
            </>
          ) : (
            <div className="h-8 w-40 bg-gray-800 animate-pulse rounded"></div>
          )}
        </header>

        {/* 🚀 Section Get Started + Domains sejajar */}
        <section>
          {/* 🔹 Heading sejajar */}
          <div className="grid grid-cols-1 md:grid-cols-2 items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Get started</h2>
            <h2 className="text-xl font-semibold text-white ml-5">Domains</h2>
          </div>

          {/* 🔹 Konten dua kolom */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 🧭 Kiri: Get Started Cards */}
            <div className="space-y-4">
              {getStartedItems.map((item) => (
                <div
                  key={item.title}
                  onClick={() => navigate(item.to)}
                  className="bg-[#1E1E1E] border border-gray-800 p-5 rounded-lg hover:bg-[#2A2A2A] cursor-pointer transition"
                >
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* 📦 Kanan: Search + ProjectCard */}
            <div className="bg-[#1E1E1E] border border-gray-800 p-5 rounded-lg">
              {/* 🔍 Search Bar */}
              <div className="flex items-center gap-2 mb-5 border-b border-gray-700 pb-2">
                <FiSearch className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search all domains"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent flex-1 outline-none text-gray-300 placeholder-gray-500"
                />
              </div>

              {/* 🔹 List ProjectCard */}
              {!uid ? (
                <p className="text-sm text-amber-400 text-center py-6">
                  Please log in to view your domains
                </p>
              ) : filtered.length > 0 ? (
                <div className="space-y-3 overflow-y-auto max-h-[240px] pr-2 custom-scrollbar">
                  {filtered.map((d) => (
                    <ProjectCard key={d.id} name={d.name} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-6">
                  No domains found
                </p>
              )}
            </div>
          </div>
        </section>

        {/* 🧪 Sample Apps */}
        <section>
          <h2 className="text-xl font-semibold mb-4 text-white">
            Histroy ConvoInsight in Domains
          </h2>
          <div className="space-y-4">
            {[
              {
                title: "Dashboard",
                desc: "1 jam yang lalu.",
              },
              {
                title: "Try an AI-powered trip planner app",
                desc: "Deploy a sample app using Firestore, Authentication, and multimodal input.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-[#1E1E1E] border border-gray-800 p-5 rounded-lg hover:bg-[#2A2A2A] cursor-pointer transition"
              >
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
