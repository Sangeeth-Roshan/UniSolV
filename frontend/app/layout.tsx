import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SidebarNav } from "@/components/SidebarNav";
import { HeaderControls } from "@/components/HeaderControls";
import { cookies } from "next/headers";
import type { UserRole } from "@/components/SidebarNav";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
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
      <body className={`${jakarta.variable} font-jakarta antialiased`}>
        <div className="flex min-h-screen">
          <SidebarNav
            role={role}
            isAuthenticated={isAuthenticated}
            userEmail={userEmail}
          />
          <main className="flex-1 ml-[260px] min-h-screen flex flex-col">
            <HeaderControls
              isAuthenticated={isAuthenticated}
              userEmail={userEmail}
              role={role}
              userInitial={userInitial}
            />
            <div className="px-8 py-8 flex-1">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
