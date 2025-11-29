import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

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
    <html lang="de">
      <body className="bg-slate-950 text-slate-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
