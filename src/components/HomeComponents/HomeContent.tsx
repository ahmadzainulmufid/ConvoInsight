import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
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
    },
    {
      title: "Configuration User",
      desc: "Configure your user settings, preferences, and account details to personalize your experience",
      to: "/configuser",
      className: "home-config-user",
    },
  ];

  const isNewUser =
    domains.length === 0 && !lastDashboard && allChats.length === 0;

  return (
    <main className="min-h-screen text-gray-100 transition-all duration-300 px-6 md:px-12 mt-24 md:mt-20">
      <div className="flex flex-col space-y-12">
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
                <div className="space-y-4">
                  {getStartedItems.map((item) => (
                    <div
                      key={item.title}
                      onClick={() => navigate(item.to)}
                      className={`${item.className} bg-[#1E1E1E] border border-gray-800 p-5 rounded-lg hover:bg-[#2A2A2A] cursor-pointer transition`}
                    >
                      <h3 className="font-semibold text-white">{item.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="home-domains bg-[#1E1E1E] border border-gray-800 p-5 rounded-lg">
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

            <section className="home-history mb-16 pb-8">
              <h2 className="text-xl font-semibold mb-4 text-white">
                History ConvoInsight in Domains
              </h2>

              <div className="space-y-4">
                {loadingDash ? (
                  <p className="text-sm text-gray-500 text-center py-3">
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
