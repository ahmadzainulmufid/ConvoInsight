import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import ProjectCard from "./ProjectCard";
import { useAuthUser } from "../../utils/firebaseSetup";
import { useDomains } from "../../hooks/useDomains";
import { useChatHistory } from "../../hooks/useChatHistory";

type DashboardItem = {
  id: string;
  prompt?: string;
  createdAt?: number;
  section?: string;
};

export default function HomeContent() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const userName = user?.displayName || user?.email?.split("@")[0] || "User";

  // 🔥 ambil domain dari Firestore
  const { domains, uid } = useDomains({ seedDefaultOnEmpty: false });

  // 🔹 ambil chat history lokal
  const { all: allChats } = useChatHistory();
  const lastChat = allChats.length > 0 ? allChats[0] : null;

  // 🔹 ambil dashboard terakhir dari localStorage
  const [lastDashboard, setLastDashboard] = useState<DashboardItem | null>(
    null
  );

  useEffect(() => {
    if (!uid) return; // pastikan user sudah login

    try {
      const dashboards: DashboardItem[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        // 🔒 hanya ambil dashboard milik user aktif
        if (key && key.startsWith(`dashboard_items_${uid}`)) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;

          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            dashboards.push(...arr);
          }
        }
      }

      if (dashboards.length > 0) {
        dashboards.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setLastDashboard(dashboards[0]);
      } else {
        setLastDashboard(null);
      }
    } catch (err) {
      console.error("Failed to parse dashboard history:", err);
    }
  }, [uid]);

  useEffect(() => {
    try {
      const dashboards: DashboardItem[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("dashboard_items_")) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            dashboards.push(...arr);
          }
        }
      }
      if (dashboards.length > 0) {
        dashboards.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setLastDashboard(dashboards[0]);
      }
    } catch (err) {
      console.error("Failed to parse dashboard history:", err);
    }
  }, []);

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
      title: "Configuration User",
      desc: "Configure your user settings, preferences, and account details to personalize your experience",
      to: "/configuser",
    },
  ];

  // 💡 LOGIC: cek user baru atau lama
  const isNewUser =
    domains.length === 0 && !lastDashboard && allChats.length === 0;

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

        {isNewUser ? (
          // 🌱 UI untuk user baru
          <section className="flex flex-col items-center justify-center text-center mt-20">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Let’s get started!
            </h2>
            <p className="text-gray-400 max-w-md mb-6">
              It looks like you’re new here. Start by creating your first domain
              to begin exploring ConvoInsight’s features.
            </p>
            <button
              onClick={() => navigate("/domain/new")}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg transition"
            >
              Create New Domain
            </button>
          </section>
        ) : (
          <>
            {/* 🚀 Section Get Started + Domains sejajar */}
            <section>
              <div className="grid grid-cols-1 md:grid-cols-2 items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Get started
                </h2>
                <h2 className="text-xl font-semibold text-white ml-5">
                  Domains
                </h2>
              </div>

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

            {/* 🧠 History Section */}
            <section className="mb-16 pb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">
                History ConvoInsight in Domains
              </h2>

              <div className="space-y-4">
                {/* 📊 Dashboard terakhir */}
                {lastDashboard ? (
                  <div
                    onClick={() =>
                      navigate(
                        `/domain/${
                          lastDashboard.section || domains[0]?.name || "default"
                        }/dashboard`
                      )
                    }
                    className="bg-[#1E1E1E] border border-gray-800 p-5 rounded-lg hover:bg-[#2A2A2A] cursor-pointer transition"
                  >
                    <h3 className="font-semibold text-white">
                      {lastDashboard.prompt
                        ? lastDashboard.prompt.slice(0, 80) + "..."
                        : "Recent dashboard update"}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Last updated:{" "}
                      {lastDashboard.createdAt
                        ? new Date(lastDashboard.createdAt).toLocaleString(
                            "id-ID",
                            { dateStyle: "medium", timeStyle: "short" }
                          )
                        : "Recently"}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-3">
                    No dashboard activity yet
                  </p>
                )}

                {/* 💬 Chat terakhir */}
                {lastChat ? (
                  <div
                    onClick={() =>
                      navigate(
                        `/domain/${
                          lastChat.section || "default"
                        }/dashboard/newchat?id=${lastChat.id}`
                      )
                    }
                    className="bg-[#1E1E1E] border border-gray-800 p-5 rounded-lg hover:bg-[#2A2A2A] cursor-pointer transition"
                  >
                    <h3 className="font-semibold text-white">
                      {lastChat.title || "Untitled Chat"}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Last updated:{" "}
                      {new Date(lastChat.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-3">
                    No chat history yet
                  </p>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
