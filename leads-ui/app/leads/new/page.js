import Link from "next/link";

export default function NewLeadPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/leads" className="text-slate-500 hover:text-slate-900">
          ← Back
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Add New Lead</h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="Lead name"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="lead@example.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Message / Details
            </label>
            <textarea
              placeholder="Enter lead details..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Source
            </label>
            <select className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900">
              <option value="manual">Manual</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="website">Website</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-white font-medium hover:bg-slate-800"
            >
              Create Lead
            </button>
            <Link
              href="/leads"
              className="rounded-md border border-slate-300 px-4 py-2 text-slate-900 font-medium hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>

      <p className="text-sm text-slate-500 mt-6">
        Note: Form submission is not yet connected to the database. For now, leads are captured automatically via email.
      </p>
    </div>
  );
}
