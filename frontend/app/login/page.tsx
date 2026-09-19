import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to UniSOLV to report and manage civic issues.",
};

const ROLES = [
  {
    id: "citizen",
    label: "Citizen",
    icon: "👤",
    desc: "Report and track issues in your area",
  },
  {
    id: "institution",
    label: "Institution Staff",
    icon: "🏛️",
    desc: "Manage and resolve assigned issues",
  },
  {
    id: "government",
    label: "Government Officer",
    icon: "📊",
    desc: "City-wide oversight and analytics",
  },
];

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/30 mb-4 text-3xl">
            🌐
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 text-sm">
            Sign in to continue to UniSOLV
          </p>
        </div>

        {/* Login card */}
        <div className="glass-card p-8 space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-slate-300"
            >
              Email Address
            </label>
            <div className="h-11 w-full rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-300"
            >
              Password
            </label>
            <div className="h-11 w-full rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          </div>

          {/* Role selector */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">Sign in as</p>
            <div className="grid grid-cols-3 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  id={`btn-role-${role.id}`}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all text-center"
                  title={role.desc}
                  disabled
                >
                  <span className="text-xl">{role.icon}</span>
                  <span className="text-xs font-medium text-slate-300">
                    {role.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            id="btn-login"
            className="btn-primary w-full justify-center py-3"
            disabled
          >
            Sign In
          </button>

          <p className="text-xs text-slate-600 text-center">
            Auth is not yet implemented — scaffold only.
          </p>
        </div>
      </div>
    </div>
  );
}
