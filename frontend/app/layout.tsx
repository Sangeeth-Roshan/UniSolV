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
    <html lang="en">
      <body className={`${jakarta.variable} font-jakarta antialiased bg-slate-50 relative overflow-x-hidden`}>
  {/* Abstract Liquid Glass Blobs for Background */}
  <div className="fixed top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-orange-400/20 blur-[120px] mix-blend-multiply pointer-events-none animate-[spin_20s_linear_infinite]" />
  <div className="fixed bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-green-400/20 blur-[130px] mix-blend-multiply pointer-events-none animate-[spin_25s_linear_infinite_reverse]" />
  <div className="fixed top-[40%] left-[30%] w-[30vw] h-[30vw] rounded-full bg-amber-200/20 blur-[100px] mix-blend-multiply pointer-events-none animate-[ping_10s_ease-in-out_infinite]" />

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
