"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);
    setError(null);

    try {
      await logout();
      router.push("/login");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-gray-900">NoteBeat</span>
            <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
              <Link href="/dashboard/emotions" className="hover:text-gray-900">
                Emotions
              </Link>
              <Link href="/dashboard/notes" className="hover:text-gray-900">
                Notes
              </Link>
              <Link href="/dashboard/chat" className="hover:text-gray-900">
                Chat
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {error && <span className="text-xs text-red-600">{error}</span>}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-sm font-semibold text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
