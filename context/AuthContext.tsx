"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Rolle aus Firestore laden
        const snap = await getDoc(doc(db, "userRoles", firebaseUser.uid));
        const userRole = snap.exists() ? snap.data().role : "none";

        setRole(userRole);

        // Cookies für Middleware setzen
        document.cookie = `auth=true; Path=/; SameSite=Lax`;
        document.cookie = `role=${userRole}; Path=/; SameSite=Lax`;
      } else {
        setRole(null);

        // Cookies löschen
        document.cookie = "auth=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "role=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const logout = async () => {
    await signOut(auth);

    // Cookies löschen
    document.cookie = "auth=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "role=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);