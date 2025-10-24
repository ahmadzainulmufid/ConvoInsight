import { useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import type { User } from "firebase/auth";
import { auth } from "../utils/firebaseSetup";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export const AuthProvider: React.FC<React.PropsWithChildren<object>> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [init, setInit] = useState(true);
  const navigate = useNavigate();

  // ⏱️ Timeout 15 menit
  const IDLE_TIMEOUT = 15 * 60 * 1000;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resetTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);

    idleTimer = setTimeout(async () => {
      toast.error("Session expired — please log in again.");
      try {
        await auth.signOut();
      } catch (err) {
        console.error("Sign out error:", err);
      }
      navigate("/", { replace: true });
    }, IDLE_TIMEOUT);
  };

  // 🔐 Deteksi login/logout
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setInit(false);
      if (firebaseUser) resetTimer(); // mulai hitung idle
    });

    // 🎯 Event listener untuk aktivitas user
    const events = ["mousemove", "keydown", "click", "scroll"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      unsubscribe();
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [idleTimer, resetTimer]);

  if (init) {
    return (
      <div className="min-h-screen grid place-items-center text-gray-600">
        Checking session...
      </div>
    );
  }

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
};
