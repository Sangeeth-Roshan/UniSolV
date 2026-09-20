import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "UniSOLV — Civic Issue Reporting & Redressal Platform",
  description:
    "AI-powered civic intelligence connecting citizens, academic institutions, and municipal authorities to solve community challenges.",
};

interface HealthResponse {
  status: string;
  version: string;
}

async function getHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch("http://localhost:8000/health", {
      cache: "no-store",
    });
    if (res.ok) {
      return res.json();
    }
  } catch {
    // backend not reached
  }
  return null;
}

export default async function HomePage() {
  const health = await getHealth();
  const token = cookies().get("token")?.value;

  let userRole: string | null = null;
  let userEmail: string | null = null;

  if (token) {
    try {
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
      userRole = payload.role;
      userEmail = payload.sub;
    } catch {
      // ignore
    }
  }

  const isBackendOnline = health?.status === "ok";

  return (
    <div className="max-w-6xl mx-auto space-y-16 pb-12">
      {/* ── Top Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-4">
        {/* Glow ambient background effects */}
        <div className="absolute -top-16 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-1/3 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium mb-6 backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>AI-Powered Civic Intelligence &amp; Autonomous Routing</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
            Transform Civic Issues into{" "}
            <span className="gradient-text">Redressed Solutions.</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed font-normal mb-8">
            UniSOLV bridges citizens with academic institutions and municipal
            authorities. Using Whisper voice transcription, PostGIS spatial
            clustering, and algorithmic reputation-weighted dispatch, community
            problems find the right solvers — with guaranteed public-good licensing.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/submit"
              className="btn-primary px-6 py-3.5 text-base font-semibold shadow-lg shadow-indigo-600/25"
            >
              <span>📝</span>
              <span>Report an Issue</span>
            </Link>

            {userRole === "government_officer" ? (
              <Link
                href="/dashboard/government"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-base font-semibold transition-all backdrop-blur-md"
              >
                <span>📊</span>
                <span>Government Overview</span>
              </Link>
            ) : ["university_admin", "student", "company"].includes(userRole || "") ? (
              <Link
                href="/dashboard/institution"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-base font-semibold transition-all backdrop-blur-md"
              >
                <span>🏛️</span>
                <span>Institution Dashboard</span>
              </Link>
            ) : userRole === "citizen" ? (
              <Link
                href="/my-tickets"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-base font-semibold transition-all backdrop-blur-md"
              >
                <span>🎫</span>
                <span>My Submitted Tickets</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-base font-semibold transition-all backdrop-blur-md"
              >
                <span>🔑</span>
                <span>Sign In / Demo Access</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Personalized Greeting (if authenticated) ────────────────────────── */}
      {userEmail && (
        <section className="glass-card p-5 border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-slate-900/50 to-purple-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-lg">
              👋
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                Welcome back, <span className="text-indigo-300">{userEmail}</span>
              </p>
              <p className="text-xs text-slate-400 capitalize">
                Signed in with active role:{" "}
                <span className="font-mono text-emerald-400 font-medium">
                  {userRole?.replace(/_/g, " ")}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userRole === "citizen" && (
              <Link
                href="/my-tickets"
                className="text-xs px-3.5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-all"
              >
                View My Tickets →
              </Link>
            )}
            {userRole === "government_officer" && (
              <Link
                href="/dashboard/government"
                className="text-xs px-3.5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-all"
              >
                Go to Government Dashboard →
              </Link>
            )}
            {["university_admin", "student", "company"].includes(userRole || "") && (
              <Link
                href="/dashboard/institution"
                className="text-xs px-3.5 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-all"
              >
                Go to Institution Portal →
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── Live System Health Telemetry ────────────────────────────────────── */}
      <section className="glass-card p-5">
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            System Telemetry &amp; Service Health
          </span>
          <span className="text-xs text-slate-500 font-mono">
            API v{health?.version || "0.1.0"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-2.5 text-sm">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isBackendOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400"
              }`}
            />
            <div>
              <p className="text-xs font-semibold text-slate-200">FastAPI Backend</p>
              <p className="text-[11px] text-slate-500">
                {isBackendOnline ? "Online & Healthy" : "Offline / Connecting"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <p className="text-xs font-semibold text-slate-200">PostGIS Spatial</p>
              <p className="text-[11px] text-slate-500">Postgres 16 + GiST Index</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
            <div>
              <p className="text-xs font-semibold text-slate-200">ML Vector Engine</p>
              <p className="text-[11px] text-slate-500">MiniLM-L6 (384-dim)</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <div>
              <p className="text-xs font-semibold text-slate-200">APScheduler Daemon</p>
              <p className="text-[11px] text-slate-500">Hotspots &amp; SLA Monitor</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3 Stakeholder Gateways ─────────────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Role-Based Civic Gateways
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Dedicated operational interfaces tailored to each stakeholder in the
            civic redressal ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Citizen Card */}
          <div className="glass-card p-6 flex flex-col justify-between hover:border-indigo-500/40 hover:bg-white/[0.07] transition-all duration-300 group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/25 mb-5 group-hover:scale-110 transition-transform">
                📝
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Citizen Reporting Portal
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Submit community problems through text, image upload, or Whisper
                voice notes. Every submission defaults to open/public-good licensing.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Audio transcription &amp; domain detection
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Precise GPS geotagging &amp; maps
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Real-time ticket history &amp; audit trail
                </li>
              </ul>
            </div>
            <Link
              href="/submit"
              className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all text-xs font-semibold"
            >
              <span>Submit a Report</span>
              <span>→</span>
            </Link>
          </div>

          {/* Institution Card */}
          <div className="glass-card p-6 flex flex-col justify-between hover:border-emerald-500/40 hover:bg-white/[0.07] transition-all duration-300 group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/25 mb-5 group-hover:scale-110 transition-transform">
                🏛️
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                University &amp; Research Portal
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                Empower students and engineering departments to take on real-world civic
                tickets, submit solution proposals, and build institutional reputation.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Reputation scoring by domain
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Co-developed industry proposals
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Fair IP &amp; attribution governance
                </li>
              </ul>
            </div>
            <Link
              href="/dashboard/institution"
              className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all text-xs font-semibold"
            >
              <span>Manage Institution Tickets</span>
              <span>→</span>
            </Link>
          </div>

          {/* Government Card */}
          <div className="glass-card p-6 flex flex-col justify-between hover:border-amber-500/40 hover:bg-white/[0.07] transition-all duration-300 group">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/25 mb-5 group-hover:scale-110 transition-transform">
                📊
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Government Oversight &amp; Ops
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">
                City-wide visibility into recurring hotspots, SLA breach auto-escalations,
                cross-institutional leaderboards, and turn-around analytics.
              </p>
              <ul className="text-xs text-slate-400 space-y-1.5 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Interactive PostGIS hotspot cluster maps
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> SLA auto-escalation engine
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span> Resolution rate &amp; turnaround charts
                </li>
              </ul>
            </div>
            <Link
              href="/dashboard/government"
              className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600 hover:text-white transition-all text-xs font-semibold"
            >
              <span>Open Government Overview</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works Pipeline ───────────────────────────────────────────── */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Autonomous Redressal Pipeline
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            How a complaint traverses from citizen ingestion to verified resolution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 relative overflow-hidden">
            <span className="text-xs font-mono font-bold text-indigo-400 mb-2 block">
              STEP 01
            </span>
            <div className="text-2xl mb-3">🎙️</div>
            <h4 className="font-semibold text-white text-base mb-1">
              Multimodal Ingestion
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Citizens submit reports using voice recording, images, or text with
              automatic Whisper speech transcription and GPS coordinates.
            </p>
          </div>

          <div className="glass-card p-5 relative overflow-hidden">
            <span className="text-xs font-mono font-bold text-violet-400 mb-2 block">
              STEP 02
            </span>
            <div className="text-2xl mb-3">🧠</div>
            <h4 className="font-semibold text-white text-base mb-1">
              Semantic &amp; Spatial Grouping
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Reports are vectorized using MiniLM embeddings and spatially clustered
              within a 500m PostGIS radius to isolate duplicate complaints into hotspots.
            </p>
          </div>

          <div className="glass-card p-5 relative overflow-hidden">
            <span className="text-xs font-mono font-bold text-cyan-400 mb-2 block">
              STEP 03
            </span>
            <div className="text-2xl mb-3">🎯</div>
            <h4 className="font-semibold text-white text-base mb-1">
              Reputation-Weighted Routing
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              The engine ranks shortlisted universities and technical partners by
              domain expertise, active load, and historic resolution quality.
            </p>
          </div>

          <div className="glass-card p-5 relative overflow-hidden">
            <span className="text-xs font-mono font-bold text-emerald-400 mb-2 block">
              STEP 04
            </span>
            <div className="text-2xl mb-3">📜</div>
            <h4 className="font-semibold text-white text-base mb-1">
              Resolution &amp; IP Lineage
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Institutions propose and implement fixes. SLA monitoring ensures swift
              action or re-routes, while attributing IP or public-good credit.
            </p>
          </div>
        </div>
      </section>

      {/* ── Key Technology Pillars Grid ─────────────────────────────────────── */}
      <section className="glass-card p-8">
        <h3 className="text-xl font-bold text-white mb-6">
          Architectural Highlights
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="text-indigo-400 text-lg">⚡ Sentence Transformers</div>
            <h4 className="text-sm font-semibold text-slate-200">
              Cosine Similarity Clustering
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              384-dimensional dense semantic representations classify issues across
              domains and merge semantically identical civic reports.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-cyan-400 text-lg">🌐 PostGIS Spatial Geography</div>
            <h4 className="text-sm font-semibold text-slate-200">
              ST_DWithin Spatial Radius
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hardware-accelerated spatial calculations with GIST indexing detect
              neighborhood-scale problem clusters within seconds.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-violet-400 text-lg">⏱️ Auto-Escalation Engine</div>
            <h4 className="text-sm font-semibold text-slate-200">
              SLA Breach Detection
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              When an assigned institution fails to accept or resolve a ticket before
              the SLA deadline, it is re-dispatched to the next best partner.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-emerald-400 text-lg">🏆 Algorithmic Reputation</div>
            <h4 className="text-sm font-semibold text-slate-200">
              Domain-Specific Scoring
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Institutions earn domain-specific standing (e.g. water management vs
              road repairs) based on citizen ratings and turnaround metrics.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-amber-400 text-lg">🤝 Public-Good IP Licensing</div>
            <h4 className="text-sm font-semibold text-slate-200">
              Attribution Governance
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              All civic solutions protect community rights with default open
              licensing while providing fair IP attribution for breakthroughs.
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-pink-400 text-lg">🔔 Real-Time Event Audit Trail</div>
            <h4 className="text-sm font-semibold text-slate-200">
              Live Notifications
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Immutable audit events trigger live notifications across the platform
              whenever tickets are accepted, routed, escalated, or closed.
            </p>
          </div>
        </div>
      </section>

      {/* ── Demo Accounts Quick-Access Section ──────────────────────────────── */}
      <section className="glass-card p-8 border-indigo-500/20 bg-indigo-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">
              Instant Demo Access Accounts
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pre-seeded accounts ready to test every stakeholder workflow. Password
              for all accounts is <span className="font-mono text-indigo-300 font-semibold">demo123</span>.
            </p>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all self-start sm:self-auto"
          >
            Go to Login Page →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
            <span className="text-xs font-medium text-amber-400">Government Officer</span>
            <p className="text-xs font-mono text-slate-200 truncate">admin@gov.in</p>
            <p className="text-[11px] text-slate-500">Overview, Analytics &amp; Routing</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
            <span className="text-xs font-medium text-emerald-400">Citizen Reporter</span>
            <p className="text-xs font-mono text-slate-200 truncate">citizen@test.com</p>
            <p className="text-[11px] text-slate-500">Report issue &amp; track my tickets</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
            <span className="text-xs font-medium text-violet-400">University Admin</span>
            <p className="text-xs font-mono text-slate-200 truncate">uni@centraltech.edu</p>
            <p className="text-[11px] text-slate-500">Central Tech University portal</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-1">
            <span className="text-xs font-medium text-purple-400">Industry Partner</span>
            <p className="text-xs font-mono text-slate-200 truncate">company@healthcorp.com</p>
            <p className="text-[11px] text-slate-500">HealthCorp Partner proposals</p>
          </div>
        </div>
      </section>
    </div>
  );
}
