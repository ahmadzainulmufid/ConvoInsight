import { useEffect, useRef } from "react";
import CardStat, {
  InfoCard,
  CardSuggestion,
} from "../components/SupportComponents/Card";
import { FiHelpCircle } from "react-icons/fi";
import { useOutletContext } from "react-router-dom";
// import ChatDock from "../components/ChatComponents/ChatDock";
// import type { ChatDockHandle } from "../components/ChatComponents/ChatDock";

type Ctx = { userName: string };

const suggestions = [
  "What caused this month’s revenue growth?",
  "Show top performing products this week",
  "Compare revenue trends last 3 months",
  "Analyze customer acquisition costs",
];

const DashboardPage: React.FC = () => {
  const { userName } = useOutletContext<Ctx>();
  // const chatRef = useRef<ChatDockHandle>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

  // Saat sentinel di bagian bawah terlihat, kirim greet sekali.
  useEffect(() => {
    if (!sentinelRef.current) return;
    const node = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !greetedRef.current) {
            greetedRef.current = true;
            // chatRef.current?.injectAssistant("Hi, this is DataInsight!");
          }
        });
      },
      { root: null, threshold: 0.2 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  // const ask = (q: string) => chatRef.current?.ask(q);

  return (
    <div className="relative h-screen flex">
      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto pb-40 px-6 md:px-8 py-6 space-y-8 bg-[#1a1b1e]">
        {/* Section header */}
        <section>
          <h2 className="text-base font-semibold text-white">
            Welcome to the Dashboard, {userName}!
          </h2>
          <p className="mt-3 text-gray-300">
            This is your personalized dashboard where you can manage your
            business data.
          </p>
        </section>

        {/* Stat Cards */}
        <section className="bg-[#1a1b1e] rounded-xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CardStat
              title="Total Revenue"
              value="$2.4M"
              change="+17%"
              type="revenue"
            />
            <CardStat
              title="Active Users"
              value="45.2K"
              change="+8%"
              type="users"
            />
            <CardStat
              title="Conversion Rate"
              value="3.2%"
              change="-2%"
              type="conversion"
            />
            <CardStat
              title="Avg Order Value"
              value="$127"
              change="+5%"
              type="order"
            />
          </div>
        </section>

        {/* Insights */}
        <section>
          <InfoCard
            title="Key Insights Summary"
            description="Revenue increased 12% this month, with the top-selling product being the Electronics category. However, conversion rates dropped 2%, necessitating funnel optimization. Total orders increased significantly by 15%, indicating high-quality traffic."
          />
        </section>

        <hr className="border-t border-gray-700 my-6" />

        {/* Suggestions */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-white flex items-center space-x-2">
            <FiHelpCircle className="text-blue-400 w-4 h-4" />
            <span>Question Suggestions</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((title, idx) => (
              <div
                key={idx}
                // onClick={() => ask(title)}
                className="cursor-pointer"
              >
                <CardSuggestion title={title} />
              </div>
            ))}
          </div>
        </section>

        {/* Sentinel: saat terlihat -> greet */}
        <div ref={sentinelRef} className="h-8" />
      </div>

      {/* Chat dock fixed di bawah */}
      {/* <ChatDock
        ref={chatRef}
        apiPath="https://ml-bi-pipeline-api-819767094904.asia-southeast2.run.app/analyze"
        requestShape="query"
      /> */}
    </div>
  );
};

export default DashboardPage;
