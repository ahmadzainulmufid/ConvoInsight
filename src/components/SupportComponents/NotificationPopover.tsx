// src/SupportComponents/NotificationPopover.tsx
import { useEffect, useState } from "react";
import { FiBell } from "react-icons/fi";
import { listenNotifications } from "../../service/notificationStore";

interface Notification {
  id: string | number;
  title: string;
  message: string;
  read: boolean;
}

export default function NotificationPopover() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

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
      {/* 🔔 Icon dengan badge merah */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-3 bg-blue-900/50 rounded-full hover:bg-blue-800 transition"
      >
        <FiBell size={22} className="text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 block h-2.5 w-2.5 rounded-full bg-red-500"></span>
        )}
      </button>

      {/* 🔽 Popover */}
      {open && (
        <div className="absolute right-full mr-4 top-0 w-80 bg-[#2d2e30] rounded-lg shadow-lg border border-gray-700 p-3 z-50">
          <h3 className="font-semibold text-white mb-2 text-sm">
            Notifications
          </h3>

          {notifications.length > 0 ? (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className="p-2 rounded bg-[#1f2022] hover:bg-[#2a2b2d] transition"
                >
                  <p className="text-sm text-gray-200 font-medium">{n.title}</p>
                  <p className="text-xs text-gray-400">{n.message}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm italic">No notifications yet</p>
          )}
        </div>
      )}
    </div>
  );
}
