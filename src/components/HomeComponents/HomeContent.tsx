import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiSearch,
  FiPlus,
  FiSettings,
  FiArrowRight,
  FiLayout,
  FiMessageSquare,
} from "react-icons/fi";
import ProjectCard from "./ProjectCard";
import { db, useAuthUser } from "../../utils/firebaseSetup";
import { useDomains } from "../../hooks/useDomains";
import { useChatHistory } from "../../hooks/useChatHistory";
import {
  collectionGroup,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  where,
} from "firebase/firestore";
import { backfillOwnerUidForCurrentUser } from "../../service/dashboardStore";

type DashboardItem = {
  id: string;
  prompt?: string;
  createdAt?: number;
  section?: string; // domain name
};

type FsDashboardItem = {
  prompt?: string;
  createdAt?: number | Timestamp;
  ownerUid?: string;
};

export default function HomeContent() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const userName = user?.displayName || user?.email?.split("@")[0] || "User";

  const { domains, uid } = useDomains({ seedDefaultOnEmpty: false });

  const { all: allChats } = useChatHistory();
  const lastChat = allChats.length > 0 ? allChats[0] : null;

  const [recentDashboards, setRecentDashboards] = useState<DashboardItem[]>([]);
  const [loadingDash, setLoadingDash] = useState<boolean>(true);

  const toMillis = (v?: number | Timestamp): number => {
    if (typeof v === "number") return v;
    if (v instanceof Timestamp) return v.toMillis();
    return 0;
  };

  useEffect(() => {
    const load = async () => {
      if (!uid) {
        setRecentDashboards([]);
        setLoadingDash(false);
        return;
      }
      setLoadingDash(true);

      try {
        // Query collectionGroup dengan filter yang diwajibkan rules
        const q = query(
          collectionGroup(db, "items"),
          where("ownerUid", "==", uid),
          orderBy("createdAt", "desc"),
          limit(5)
        );
        const snap = await getDocs(q);

        // Cache domain name agar tidak getDoc berulang2
        const domainNameCache = new Map<string, string>();
        const items: DashboardItem[] = [];

        for (const docSnap of snap.docs) {
          const data = docSnap.data() as FsDashboardItem;
          if (data.ownerUid !== uid) continue;

          // Path: users/{uid}/domains/{domainDocId}/group/{groupId}/items/{itemId}
          const segments = docSnap.ref.path.split("/");
          const domainIdx = segments.findIndex((s) => s === "domains");
          const domainDocId =
            domainIdx >= 0 && segments.length > domainIdx + 1
              ? segments[domainIdx + 1]
              : "";

          let domainName = domainNameCache.get(domainDocId);
          if (!domainName) {
            if (domainDocId) {
              const dRef = doc(db, "users", uid, "domains", domainDocId);
              const dSnap = await getDoc(dRef);
              domainName =
                (dSnap.exists() && (dSnap.data() as { name?: string }).name) ||
                domainDocId;
            } else {
              domainName = "default";
            }
            domainNameCache.set(domainDocId, domainName);
          }

          items.push({
            id: docSnap.id,
            prompt: data.prompt ?? "",
            createdAt: toMillis(data.createdAt),
            section: domainName,
          });
        }

        setRecentDashboards(items);
      } catch (err) {
        console.error("Failed to load dashboard history:", err);
        setRecentDashboards([]);
      } finally {
        setLoadingDash(false);
      }
    };

    void load();
  }, [uid]);

  useEffect(() => {
    if (uid) {
      console.log(`[Backfill] Memulai backfill untuk uid: ${uid}`);
      backfillOwnerUidForCurrentUser()
        .then(() => {
          console.log(" [Backfill] Selesai!");
        })
        .catch((err) => {
          console.error("[Backfill] GAGAL:", err.message);
        });
    } else {
      console.log("[Backfill] Menunggu uid untuk memulai backfill...");
    }
  }, [uid]);

  const lastDashboard = recentDashboards[0] ?? null;

  const filtered = domains.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const getStartedItems = [
    {
      title: "Create a new Domain",
      desc: "Add your domain to start managing datasets and building apps",
      to: "/domain/new",
      className: "home-create-domain",
      icon: FiPlus,
    },
    {
      title: "Configuration User",
      desc: "Configure your user settings, preferences, and account details to personalize your experience",
      to: "/configuser",
      className: "home-config-user",
      icon: FiSettings,
    },
  ];

  const isNewUser =
    domains.length === 0 && !lastDashboard && allChats.length === 0;

  return (
    <main className="w-full max-w-6xl min-h-screen text-gray-100 transition-all duration-300 px-6 md:px-12 pt-10 md:pt-14 pb-16">
      <div className="flex flex-col space-y-10 animate-fade-in">
        <header>
          {!loading ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                Dashboard
              </span>
              <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tight text-gray-100">
                Hello, <span className="text-gradient">{userName}</span>
              </h1>
              <p className="text-gray-400 mt-2 text-base">
                Welcome back to ConvoInsight!
              </p>
            </>
          ) : (
            <div className="h-9 w-56 bg-gray-800 animate-pulse rounded-lg"></div>
          )}
        </header>

        {isNewUser ? (
          <section className="relative overflow-hidden flex flex-col items-center justify-center text-center mt-6 rounded-3xl border border-white/10 bg-[#151923]/80 bg-grid px-6 py-16 shadow-[var(--shadow-card)]">
            <div className="mb-6 h-14 w-14 grid place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-lg shadow-indigo-500/30">
              <FiPlus size={26} />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white mb-2">
              Let’s get started!
            </h2>
            <p className="text-gray-400 max-w-md mb-6">
              It looks like you’re new here. Start by creating your first domain
              to begin exploring ConvoInsight’s features.
            </p>
            <button
              onClick={() => navigate("/domain/new")}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-indigo-600/25 transition"
            >
              <FiPlus />
              Create New Domain
            </button>
          </section>
        ) : (
          <>
            <section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Get started
                  </h2>
                  {getStartedItems.map((item) => (
                    <div
                      key={item.title}
                      onClick={() => navigate(item.to)}
                      className={`${item.className} group flex items-start gap-4 bg-[#151923] border border-white/5 p-5 rounded-2xl hover:border-indigo-500/40 hover:bg-[#1b2030] hover:-translate-y-0.5 cursor-pointer transition-all duration-200 shadow-[var(--shadow-card)]`}
                    >
                      <div className="h-11 w-11 shrink-0 grid place-items-center rounded-xl bg-indigo-500/10 text-indigo-300 ring-1 ring-inset ring-indigo-500/25 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                        <item.icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white">
                          {item.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                      <FiArrowRight className="mt-1 text-gray-600 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition" />
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Domains
                </h2>
                <div className="home-domains bg-[#151923] border border-white/5 p-4 rounded-2xl shadow-[var(--shadow-card)]">
                  <div className="flex items-center gap-2 mb-4 rounded-xl border border-white/10 bg-[#0d1017] px-3 py-2.5 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 transition">
                    <FiSearch className="text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search all domains"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="bg-transparent flex-1 outline-none text-sm text-gray-200 placeholder-gray-500 transition"
                    />
                  </div>

                  {!uid ? (
                    <p className="text-sm text-amber-400 text-center py-6">
                      Please log in to view your domains
                    </p>
                  ) : filtered.length > 0 ? (
                    <div className="space-y-2 overflow-y-auto max-h-[240px] pr-1 custom-scrollbar">
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
              </div>
            </section>

            <section className="home-history mb-16 pb-8">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
                History ConvoInsight in Domains
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loadingDash ? (
                  <p className="text-sm text-gray-500 text-center py-8 rounded-2xl border border-dashed border-white/10">
                    Loading dashboard history…
                  </p>
                ) : lastDashboard ? (
                  <div
                    onClick={() =>
                      navigate(
                        `/domain/${
                          lastDashboard.section || domains[0]?.name || "default"
                        }/dashboard`
                      )
                    }
                    className="group flex items-start gap-4 bg-[#151923] border border-white/5 p-5 rounded-2xl hover:border-indigo-500/40 hover:bg-[#1b2030] cursor-pointer transition-all duration-200 shadow-[var(--shadow-card)]"
                  >
                    <div className="h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-sky-500/10 text-sky-300 ring-1 ring-inset ring-sky-500/25">
                      <FiLayout size={18} />
                    </div>
                    <div className="min-w-0">
                    <h3 className="font-semibold text-white line-clamp-2">
                      {lastDashboard.prompt
                        ? lastDashboard.prompt.slice(0, 80) + "..."
                        : "Recent dashboard update"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1.5">
                      Last updated:{" "}
                      {lastDashboard.createdAt
                        ? new Date(lastDashboard.createdAt).toLocaleString(
                            "id-ID",
                            { dateStyle: "medium", timeStyle: "short" }
                          )
                        : "Recently"}
                    </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8 rounded-2xl border border-dashed border-white/10">
                    No dashboard activity yet
                  </p>
                )}

                {lastChat ? (
                  <div
                    onClick={() =>
                      navigate(
                        `/domain/${
                          lastChat.section || "default"
                        }/dashboard/newchat?id=${lastChat.id}`
                      )
                    }
                    className="group flex items-start gap-4 bg-[#151923] border border-white/5 p-5 rounded-2xl hover:border-indigo-500/40 hover:bg-[#1b2030] cursor-pointer transition-all duration-200 shadow-[var(--shadow-card)]"
                  >
                    <div className="h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/25">
                      <FiMessageSquare size={18} />
                    </div>
                    <div className="min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {lastChat.title || "Untitled Chat"}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1.5">
                      Last updated:{" "}
                      {new Date(lastChat.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-8 rounded-2xl border border-dashed border-white/10">
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
