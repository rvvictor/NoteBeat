"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout, getCurrentUser, ApiError } from "@/lib/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((user) => setUsername(user.username))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          router.push("/login");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const isEmotions = pathname?.startsWith("/dashboard/emotions");
  const isNotes = pathname?.startsWith("/dashboard/notes");
  const isChat = pathname?.startsWith("/dashboard/chat");

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <Image
            src="/brand/logoSOscuro.svg"
            alt="NoteBeat"
            width={180}
            height={48}
            className="dashboard-logo"
            priority
          />
        </div>

        <nav className="dashboard-nav">
          <Link
            href="/dashboard/emotions"
            className={`dashboard-nav-link${isEmotions ? " active" : ""}`}
            aria-current={isEmotions ? "page" : undefined}
          >
            <svg
              className="dashboard-nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M12 21a9 9 0 1 0-9-9 9 9 0 0 0 9 9Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M9 10h.01M15 10h.01"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M8.5 14.5c1 1 2.2 1.5 3.5 1.5s2.5-.5 3.5-1.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            Emotions
          </Link>
          <Link
            href="/dashboard/notes"
            className={`dashboard-nav-link${isNotes ? " active" : ""}`}
            aria-current={isNotes ? "page" : undefined}
          >
            <svg
              className="dashboard-nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 4h7l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M14 4v4h4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M8 13h8M8 17h6"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            Notes
          </Link>
          <Link
            href="/dashboard/chat"
            className={`dashboard-nav-link${isChat ? " active" : ""}`}
            aria-current={isChat ? "page" : undefined}
          >
            <svg
              className="dashboard-nav-icon"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H9l-5 4v-4a3 3 0 0 1-3-3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path
                d="M8 10h8M8 13.5h5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
            Chat
          </Link>
        </nav>

        <div className="dashboard-sidebar-footer">
          {error && <span className="dashboard-error">{error}</span>}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="dashboard-logout"
          >
            {isLoggingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="dashboard-topbar-label">Dashboard</p>
            <h2 className="dashboard-topbar-title">
              Welcome back{username && `, ${username}`}
            </h2>
          </div>
          <div className="dashboard-topbar-actions">
            <Link href="/dashboard/notes" className="btn-primary btn-small">
              New note
            </Link>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
