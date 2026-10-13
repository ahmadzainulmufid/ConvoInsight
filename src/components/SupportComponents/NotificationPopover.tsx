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
        className={`relative h-10 w-10 grid place-items-center rounded-xl transition-all duration-200 ${
          open
            ? "bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40"
            : "text-gray-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <FiBell size={19} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 block h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#10131b] animate-pulse"></span>
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
            className="absolute right-full mr-4 top-0 w-80 bg-[#151923]/95 backdrop-blur-xl rounded-2xl 
                       shadow-2xl shadow-black/50 border border-white/10 p-4 text-gray-300 z-50"
          >
            <h3 className="font-semibold text-white mb-3 text-sm tracking-tight">
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
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition"
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
                className="text-gray-500 text-sm py-6 text-center"
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
