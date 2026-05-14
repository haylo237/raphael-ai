import "./globals.css";
import Shell from "../components/Shell";
import { AuthProvider } from "../lib/auth";

export const metadata = {
  title: "Raphael AI — Admin",
  description: "Raphael AI network-aware healthcare admin dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <AuthProvider>
          <Shell>{children}</Shell>
        </AuthProvider>
      </body>
    </html>
  );
}
