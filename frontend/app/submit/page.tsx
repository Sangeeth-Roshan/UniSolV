import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Report an Issue",
  description: "Submit a new civic issue report to UniSOLV.",
};

export default function SubmitPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title">Report an Issue</h1>
        <p className="page-subtitle">
          Describe the civic issue you&apos;ve encountered. Our platform will
          classify and route it to the right department.
        </p>
      </div>

      {/* Placeholder form card */}
      <div className="glass-card p-8">
        <div className="space-y-5">
          {/* Issue title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Issue Title
            </label>
            <div className="h-11 w-full rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">
              Description
            </label>
            <div className="h-28 w-full rounded-xl bg-white/5 border border-white/10 animate-pulse" />
          </div>

          {/* Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Location
              </label>
              <div className="h-11 w-full rounded-xl bg-white/5 border border-white/10 animate-pulse" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Category
              </label>
              <div className="h-11 w-full rounded-xl bg-white/5 border border-white/10 animate-pulse" />
            </div>
          </div>

          {/* Photo upload placeholder */}
          <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
            <p className="text-slate-500 text-sm">
              📷 Photo / video upload — coming soon
            </p>
          </div>

          {/* Submit */}
          <button
            id="btn-submit-issue"
            className="btn-primary w-full justify-center py-3"
            disabled
          >
            Submit Issue
          </button>
        </div>

        <p className="mt-4 text-xs text-slate-600 text-center">
          This is a scaffold placeholder — form logic not yet implemented.
        </p>
      </div>
    </div>
  );
}
