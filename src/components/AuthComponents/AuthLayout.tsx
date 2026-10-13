import React from "react";
import { FiBarChart2, FiMessageSquare, FiZap } from "react-icons/fi";
import newLogo from "/newlogo.png";

const highlights = [
  {
    icon: FiMessageSquare,
    title: "Ask in plain language",
    desc: "Chat with your datasets and get answers instantly.",
  },
  {
    icon: FiBarChart2,
    title: "Visual insights",
    desc: "Charts and KPIs generated automatically for you.",
  },
  {
    icon: FiZap,
    title: "Built for speed",
    desc: "Upload CSV, Excel or connect a database in seconds.",
  },
];

/**
 * Presentational wrapper for the Login & Register pages:
 * a brand panel on the left (desktop only) and the form on the right.
 */
const AuthLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <main className="min-h-screen w-full grid lg:grid-cols-2 bg-[#0d1017] overflow-x-hidden">
      {/* Brand panel */}
      <section className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 border-r border-white/5">
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_top_left,black_30%,transparent_75%)]" />
        <div className="absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-indigo-600/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[24rem] w-[24rem] rounded-full bg-fuchsia-600/15 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <img src={newLogo} alt="ConvoInsight Logo" className="h-9 w-9" />
          <span className="text-xl font-semibold tracking-tight text-white">
            Convo<span className="text-gradient">Insight</span>
          </span>
        </div>

        <div className="relative max-w-lg">
          <h1 className="text-4xl xl:text-5xl font-semibold leading-tight tracking-tight text-white">
            Turn your data into{" "}
            <span className="text-gradient">conversations</span>.
          </h1>
          <p className="mt-4 text-gray-400 text-lg leading-relaxed">
            Explore, analyze and visualize your business data simply by asking
            questions.
          </p>

          <ul className="mt-10 space-y-5">
            {highlights.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-4">
                <div className="h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-white/5 ring-1 ring-inset ring-white/10 text-indigo-300">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="font-medium text-gray-100">{title}</p>
                  <p className="text-sm text-gray-400">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-gray-500">
          © {new Date().getFullYear()} ConvoInsight
        </p>
      </section>

      {/* Form panel */}
      <section className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="absolute inset-0 lg:hidden bg-app-glow" />
        <div className="relative w-full flex flex-col items-center">
          <div className="lg:hidden mb-8 flex items-center gap-2.5">
            <img src={newLogo} alt="ConvoInsight Logo" className="h-8 w-8" />
            <span className="text-lg font-semibold tracking-tight text-white">
              Convo<span className="text-gradient">Insight</span>
            </span>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
};

export default AuthLayout;
