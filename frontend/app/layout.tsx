import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SidebarNav } from "@/components/SidebarNav";
import { HeaderControls } from "@/components/HeaderControls";
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
    default: "UniSOLV — Civic Issue Reporting & Redressal Platform",
  },
  description:
    "Report, track, and resolve civic issues in your community with UniSOLV.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Derive role and auth details from the HttpOnly JWT cookie
  let role: UserRole = "citizen";
  let userInitial = "U";
  let userEmail: string | undefined;
  let isAuthenticated = false;

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
      isAuthenticated = true;
      userEmail = payload.sub;
      const backendRole: string = payload.role ?? "citizen";
      if (["university_admin", "student", "company"].includes(backendRole)) {
        role = "institution";
      } else if (backendRole === "government_officer") {
        role = "government";
      } else {
        role = "citizen";
      }
      if (payload.sub) userInitial = (payload.sub as string)[0].toUpperCase();
    }
  } catch {
    // No token or malformed — guest state
  }

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Shell: sidebar + main content area */}
        <div className="flex min-h-screen">
          <SidebarNav
            role={role}
            isAuthenticated={isAuthenticated}
            userEmail={userEmail}
          />

          {/* Main content */}
          <main className="flex-1 ml-[260px] min-h-screen flex flex-col">
            {/* Dynamic Top bar with Notifications Dropdown and User Profile Menu */}
            <HeaderControls
              isAuthenticated={isAuthenticated}
              userEmail={userEmail}
              role={role}
              userInitial={userInitial}
            />

            {/* Page content */}
            <div className="px-8 py-8 flex-1">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
