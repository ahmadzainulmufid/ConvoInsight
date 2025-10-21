import { useEffect } from "react";
import { auth } from "../utils/firebaseSetup";

export function useAutoResetNotifications() {
  useEffect(() => {
    const checkAndReset = async () => {
      const user = auth.currentUser;
      if (!user) return;

      const lastReset = localStorage.getItem("notif_last_reset");
      const today = new Date().toISOString().split("T")[0];

      // Kalau hari sudah ganti, reset notifikasi user di backend
      if (lastReset !== today) {
        try {
          const res = await fetch(
            "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app/notifications/reset-user",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.uid }),
            }
          );

          const data = await res.json();
          if (data.ok) {
            localStorage.setItem("notif_last_reset", today);
            console.log(
              `✅ Notifications auto-cleared for ${user.uid} (${
                data.deleted || 0
              } deleted)`
            );
          } else {
            console.error("⚠️ Failed to reset notifications:", data.error);
          }
        } catch (err) {
          console.error("❌ Error calling reset-user API:", err);
        }
      }
    };

    checkAndReset();
  }, []);
}
