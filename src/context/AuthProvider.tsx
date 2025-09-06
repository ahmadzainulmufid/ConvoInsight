import { useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import type { User } from "firebase/auth";
import { auth } from "../utils/firebaseSetup";

export const AuthProvider: React.FC<React.PropsWithChildren<object>> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [init, setInit] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
      setInit(false);
    });
    return unsubscribe;
  }, []);

  if (init) {
    return (
      <div className="min-h-screen grid place-items-center text-gray-600">
        Checking session...
      </div>
    );
  }

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
};
