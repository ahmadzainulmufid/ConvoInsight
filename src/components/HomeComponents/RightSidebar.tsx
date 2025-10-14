"use client";

import { useState, useMemo } from "react";
import { FiHelpCircle, FiLogOut } from "react-icons/fi";
import { useAuthUser } from "../../utils/firebaseSetup";
import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebaseSetup";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import NotificationPopover from "../SupportComponents/NotificationPopover";

/** 🎨 Daftar warna yang dipilih agar kontras di dark mode */
const avatarColors = [
  "#8B5CF6",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#14B8A6",
  "#F43F5E",
  "#6366F1",
];

export default function RightSidebar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const { user } = useAuthUser();

  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const email = user?.email || "No email";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  // 🧠 Generate warna avatar berdasarkan hash dari displayName
  const avatarColor = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < displayName.length; i++) {
      hash = displayName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % avatarColors.length;
    return avatarColors[index];
  }, [displayName]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out successfully");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error(error);
      toast.error("Failed to sign out, please try again");
    }
  };

  return (
    <aside className="fixed top-0 right-0 h-screen w-16 bg-[#202124] border-l border-gray-700 flex flex-col items-center justify-between py-4 z-50">
      <div className="flex flex-col items-center gap-6">
        {/* Avatar dengan warna dinamis */}
        <div className="relative">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-blue-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#202124] focus:ring-white transition"
            style={{ backgroundColor: avatarColor }}
          >
            {avatarLetter}
          </button>

          {/* Menu Popover */}
          {isMenuOpen && (
            <div className="absolute right-full mr-4 top-0 w-64 bg-[#2d2e30] rounded-lg shadow-lg p-4 border border-gray-700">
              <div className="flex items-center gap-3 mb-4 min-w-0">
                <div
                  className="flex-shrink-0 h-10 aspect-square rounded-full 
               flex items-center justify-center text-white 
               font-semibold text-lg"
                  style={{ backgroundColor: avatarColor }}
                >
                  {avatarLetter}
                </div>

                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-sm text-gray-400 truncate">{email}</p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition"
              >
                <FiLogOut />
                Sign Out
              </button>
            </div>
          )}
        </div>

        {/* Ikon lainnya */}
        <NotificationPopover />
        <FiHelpCircle
          size={24}
          className="text-gray-400 hover:text-white cursor-pointer"
        />
      </div>
    </aside>
  );
}
