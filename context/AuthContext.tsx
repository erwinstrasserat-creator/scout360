"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // User ist ausgeloggt
        setUser(null);
        setRole(null);

        document.cookie = "auth=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        document.cookie = "role=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

        setLoading(false);
        return;
      }

      // User gesetzt
      setUser(firebaseUser);

      // Wichtig: Rolle zuerst laden
      const snap = await getDoc(doc(db, "userRoles", firebaseUser.uid));
      const userRole = snap.exists() ? snap.data().role : "none";

      setRole(userRole);

      // Cookies für Middleware
      document.cookie = `auth=true; Path=/; SameSite=Lax`;
      document.cookie = `role=${userRole}; Path=/; SameSite=Lax`;

      setLoading(false);

      // Wenn man direkt von /admin/login kommt → weiterleiten ins Dashboard
      if (window.location.pathname.includes("/login")) {
        router.push("/admin");
      }
    });

    return () => unsub();
  }, [router]);

  const logout = async () => {
    await signOut(auth);

    // Cookies löschen
    document.cookie = "auth=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    document.cookie = "role=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

    router.push("/admin/login");
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {/* WICHTIG: Erst rendern wenn Rolle geladen */}
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);