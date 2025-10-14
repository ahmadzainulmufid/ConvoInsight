import { FiHelpCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function HelpPopover({
  isActive,
  onToggle,
}: {
  isActive: boolean;
  onToggle: () => void;
}) {
  const open = isActive;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`p-3 rounded-xl transition-colors duration-200 ${
          open
            ? "bg-blue-800/60 text-white shadow-inner shadow-blue-900/30"
            : "bg-[#2B2C31] text-gray-400 hover:text-white hover:bg-[#35363b]"
        }`}
      >
        <FiHelpCircle size={22} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="help-panel"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute right-full mr-4 top-0 w-[460px] max-h-[80vh] overflow-y-auto 
                       bg-[#2d2e30] rounded-lg shadow-lg border border-gray-700 p-5 text-gray-300 z-50"
          >
            <h2 className="text-lg font-semibold text-white mb-4">
              How to Use ConvoInsight
            </h2>

            <div className="space-y-8 text-sm leading-relaxed">
              {/* === SECTION 1 === */}
              <section>
                <h2 className="text-base font-semibold text-white">
                  🚀 How to Use This App:
                </h2>
                <ol className="mt-3 ml-6 list-decimal space-y-2">
                  <li>
                    <p>Start from the Sidebar</p>
                    <p className="text-gray-400 mt-1">
                      On the left sidebar, start by selecting a domain. Once
                      clicked, a second sidebar will appear showing options such
                      as:
                    </p>
                    <ul className="list-disc ml-6 mt-2 text-gray-400">
                      <li>Campaign</li>
                      <li>Fixed</li>
                      <li>Mobile</li>
                    </ul>
                  </li>
                  <li>
                    <p>Choose Your Domain</p>
                    <p className="text-gray-400 mt-1">
                      Click on the domain that matches your data or business
                      case.
                    </p>
                  </li>
                  <li>
                    <p>Explore the Next Sidebar</p>
                    <p className="text-gray-400 mt-1">
                      You’ll find Dashboard, Datasets, and Configuration menus.
                    </p>
                  </li>
                </ol>
              </section>

              {/* === SECTION 2 === */}
              <section>
                <h2 className="text-base font-semibold text-white">
                  🆕 For New Users, Follow these steps:
                </h2>
                <ol className="mt-3 ml-6 list-decimal space-y-2">
                  <li>
                    <p>Upload or Connect Your Data</p>
                    <ul className="list-disc ml-6 mt-1 text-gray-400">
                      <li>Go to the Datasets menu</li>
                      <li>Upload CSV/Excel or connect your database</li>
                      <li>Your data will be shown in a table for analysis</li>
                    </ul>
                  </li>
                  <li>
                    <p>Configure Preferences</p>
                    <ul className="list-disc ml-6 mt-1 text-gray-400">
                      <li>Head to Configuration</li>
                      <li>
                        Define KPIs and how the AI should generate insights
                      </li>
                    </ul>
                  </li>
                  <li>
                    <p>View Insights on the Dashboard</p>
                    <ul className="list-disc ml-6 mt-1 text-gray-400">
                      <li>
                        See KPI metrics, charts, and AI-generated insights
                      </li>
                      <li>Ask follow-up questions in the chat at the bottom</li>
                    </ul>
                  </li>
                </ol>
              </section>

              {/* === SECTION 3 === */}
              <section>
                <h2 className="text-base font-semibold text-white">
                  🔁 For Returning Users:
                </h2>
                <ol className="mt-3 ml-6 list-decimal space-y-2">
                  <li>Go to your Dashboard</li>
                  <li>Access past analysis from the sidebar</li>
                  <li>
                    Continue exploring insights or start new questions with the
                    AI
                  </li>
                </ol>
              </section>

              {/* === SECTION 4 === */}
              <section>
                <h2 className="text-base font-semibold text-white">
                  🙏 Thank You
                </h2>
                <p className="mt-2 ml-2 text-gray-400">
                  We hope you enjoy using ConvoInsight and gain meaningful
                  insights effortlessly. Let your data work for you.
                </p>
              </section>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
