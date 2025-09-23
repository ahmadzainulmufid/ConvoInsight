const HomePage: React.FC = () => {
  return (
    <div className="relative h-screen flex">
      <main className="flex-1 overflow-y-auto pb-40 px-6 md:px-8 py-6 space-y-8 bg-[#1a1b1e]">
        <section>
          <h2 className="text-base font-semibold text-white">
            👋 Welcome to ConvoInsight
          </h2>
          <p className="mt-3 ml-7 text-gray-300">
            ConvoInsight is a smart AI-powered application built to help you
            analyze data whether you upload a file or connect a database. The
            system provides clear, visual, and insightful results such as
            summaries, charts, KPIs, and more.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">
            🚀 How to Use This App:
          </h2>

          <ol className="mt-3 ml-10 text-gray-300 list-decimal">
            <li>
              <p className="mt-1">Start from the Sidebar</p>
              <p className="mt-1">
                On the left sidebar, start by selecting a domain. Once clicked,
                a second sidebar will appear showing, for example:
              </p>
              <ul className="list-disc list-inside mt-2 ml-5">
                <li>Campaign</li>
                <li>Fixed</li>
                <li>Mobile</li>
              </ul>
            </li>

            <li>
              <p className="mt-1">Choose Your Domain</p>
              <p className="mt-1">
                Click on the domain that matches your data or business case.
              </p>
            </li>

            <li>
              <p className="mt-1">Explore the Next Sidebar</p>
              <p className="mt-1">
                Another sidebar will appear with these options:
              </p>
              <ul className="list-disc list-inside mt-2 ml-5">
                <li>Dashboard</li>
                <li>Datasets</li>
                <li>Configuration</li>
              </ul>
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">
            🆕 For New Users, Follow these steps:
          </h2>
          <ol className="mt-3 ml-10 text-gray-300 list-decimal">
            <li>
              <p className="mt-1">Upload or Connect Your Data</p>
              <ul className="list-disc list-inside mt-2 ml-5">
                <li>Go to the Datasets menu.</li>
                <li>
                  Upload a file (e.g., Excel, CSV) or connect your database.
                </li>
                <li>
                  Your data will be displayed in a table, ready for analysis.
                </li>
              </ul>
            </li>

            <li>
              <p className="mt-1">Configure Preferences</p>
              <ul className="list-disc list-inside mt-2 ml-5">
                <li>Head to the Configuration menu.</li>
                <li>
                  You can define:
                  <ul className="list-disc list-inside mt-2 ml-5">
                    <li>What kind of KPIs to show</li>
                    <li>How the AI should reason and generate insights</li>
                  </ul>
                </li>
              </ul>
            </li>

            <li>
              <p className="mt-1">View Insights on the Dashboard</p>
              <ul className="list-disc list-inside mt-2 ml-5">
                <li>Go to Dashboard.</li>
                <li>
                  You’ll see:
                  <ul className="list-disc list-inside mt-2 ml-5">
                    <li>KPI metrics</li>
                    <li>Charts and graphs</li>
                    <li>Key insights</li>
                    <li>Suggested questions</li>
                    <li>
                      And a chat interface at the bottom to ask follow-up
                      questions to the AI
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">
            🔁 For Returning Users:
          </h2>
          <ol className="mt-3 ml-10 text-gray-300 list-decimal">
            <li>Simply go to the Dashboard</li>
            <li>
              On the top-right sidebar, you can access your past analysis
              history
            </li>
            <li>
              From there, just continue like a new user — explore the dashboard,
              ask questions, and gain insights
            </li>
          </ol>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">🙏 Thank You</h2>
          <p className="mt-3 ml-7 text-gray-300">
            We hope you enjoy using ConvoInsight and that it gives you exactly
            the answers and insights you’re looking for. Let the data work for
            you effortlessly.
          </p>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
