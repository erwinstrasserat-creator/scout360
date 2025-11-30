"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
  user: any;
  role: string | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: any) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Rolle holen
        const roleDoc = await getDoc(doc(db, "userRoles", firebaseUser.uid));
        const userRole = roleDoc.exists()
          ? roleDoc.data().role
          : "none";

        setRole(userRole);

        // 🔥 Cookie setzen (für Middleware)
        document.cookie = `auth=true; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `role=${userRole}; path=/; max-age=86400; SameSite=Lax`;
      } else {
        setRole(null);

        // 🔥 Cookies löschen
        document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    // Erst Firebase-Logout
    await signOut(auth);

    // Dann Cookies löschen
    document.cookie = "auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);