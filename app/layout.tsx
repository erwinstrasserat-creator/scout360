import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

// 🔥 Firebase global initialisieren (muss VOR React passieren)
import "@/lib/firebase";

export const metadata = {
  title: "Scout360",
  description: "Internes Scouting-Tool",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        {/* Mobile & Safari MUST HAVE Fixes */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>

      <body className="bg-slate-950 text-slate-50 min-h-screen">
        {/* Auth Provider = Client Side */}
        <AuthProvider>
          <main className="min-h-screen">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}