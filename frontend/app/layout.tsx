import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SidebarNav } from "@/components/SidebarNav";
import { cookies } from "next/headers";
import type { UserRole } from "@/components/SidebarNav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    template: "%s | UniSOLV",
    default: "UniSOLV — Civic Issue Reporting Platform",
  },
  description:
    "Report, track, and resolve civic issues in your community with UniSOLV.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Derive role from the HttpOnly JWT cookie (server component — safe to do here)
  let role: UserRole = "citizen";
  let userInitial = "U";
  try {
    const token = cookies().get("token")?.value;
    if (token) {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(
        decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        )
      );
      const backendRole: string = payload.role ?? "citizen";
      if (["university_admin", "student", "company"].includes(backendRole)) {
        role = "institution";
      } else if (backendRole === "government_officer") {
        role = "government";
      } else {
        role = "citizen";
      }
      // Use email first letter as avatar initial
      if (payload.sub) userInitial = (payload.sub as string)[0].toUpperCase();
    }
  } catch {
    // No token or malformed — stay as citizen
  }

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Shell: sidebar + main content area */}
        <div className="flex min-h-screen">
          <SidebarNav role={role} />

          {/* Main content */}
          <main className="flex-1 ml-[260px] min-h-screen">
            {/* Top bar */}
            <header className="sticky top-0 z-30 flex items-center justify-between px-8 py-4 bg-slate-950/80 backdrop-blur-sm border-b border-white/5">
              <div className="flex items-center gap-3">
                {/* Breadcrumb placeholder */}
                <span className="text-sm text-slate-500">UniSOLV</span>
                <span className="text-slate-700">/</span>
                <span className="text-sm text-slate-300 font-medium">
                  Platform
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Notification bell placeholder */}
                <button
                  id="btn-notifications"
                  aria-label="Notifications"
                  className="relative flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  🔔
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 border border-slate-950" />
                </button>

                {/* Avatar */}
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-violet-500/20">
                  {userInitial}
                </div>
              </div>
            </header>

            {/* Page content */}
            <div className="px-8 py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
