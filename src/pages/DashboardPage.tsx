// pages/dashboardPage.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";

const DashboardPage: React.FC = () => {
  const { section } = useParams();
  const navigate = useNavigate();

  const handleNewChat = () => {
    navigate(`/domain/${section}/dashboard/newchat`);
  };

  return (
    <div className="relative min-h-screen p-6">
      <h2 className="text-2xl font-bold mb-4">Dashboard {section}</h2>

      {/* area chart-chart kamu */}
      <div className="space-y-6">
        {/* contoh chart */}
        <div className="h-64 rounded bg-[#2A2B32] flex items-center justify-center">
          Chart 1
        </div>
        <div className="h-64 rounded bg-[#2A2B32] flex items-center justify-center">
          Chart 2
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={handleNewChat}
        className="fixed bottom-6 right-6 flex items-center gap-2 px-5 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg transition"
      >
        <FiPlus size={20} />
        <span>New Chat</span>
      </button>
    </div>
  );
};

export default DashboardPage;
