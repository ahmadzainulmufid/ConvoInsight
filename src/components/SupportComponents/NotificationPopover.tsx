import { useEffect, useState } from "react";
import { FiBell } from "react-icons/fi";
import { listenNotifications } from "../../service/notificationStore";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string | number;
  title: string;
  message: string;
  read: boolean;
}

export default function NotificationPopover({
  isActive,
  onToggle,
}: {
  isActive: boolean;
  onToggle: () => void;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const open = isActive; // controlled by parent

  useEffect(() => {
    const unsub = listenNotifications((list) =>
      setNotifications(
        list
          .filter((item) => item.id !== undefined)
          .map((item) => ({
            id: item.id as string | number,
            title: item.title,
            message: item.message,
            read: item.read ?? false,
          }))
      )
    );
    return () => unsub?.();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`relative p-3 rounded-xl transition-colors duration-200 ${
          open
            ? "bg-blue-800/60 text-white shadow-inner shadow-blue-900/30"
            : "bg-[#2B2C31] text-gray-400 hover:text-white hover:bg-[#35363b]"
        }`}
      >
        <FiBell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="notif-panel"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute right-full mr-4 top-0 w-80 bg-[#2d2e30] rounded-lg 
                       shadow-lg border border-gray-700 p-3 text-gray-300 z-50"
          >
            <h3 className="font-semibold text-white mb-2 text-sm">
              Notifications
            </h3>

            {notifications.length > 0 ? (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <motion.li
                    key={n.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-2 rounded bg-[#1f2022] hover:bg-[#2a2b2d] transition"
                  >
                    <p className="text-sm text-gray-200 font-medium">
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-400">{n.message}</p>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-500 text-sm italic"
              >
                No notifications yet
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
