import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="border-b pb-6">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Let&apos;s Enterprise Control Hub</h1>
        <p className="text-lg text-gray-500 mt-2">Manage your automated WhatsApp logic, campaigns, and lead SLAs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
        
        {/* Logic Builder Card */}
        <Link href="/admin/logic-builder" className="group block">
          <div className="bg-white border rounded-xl p-6 h-full shadow-sm hover:shadow-md hover:border-blue-500 transition-all">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">Visual Logic Builder</h3>
            <p className="text-gray-500 text-sm">
              Design the automated state-machine logic via the React Flow drag-and-drop canvas. Read live by the Rules Engine.
            </p>
          </div>
        </Link>

        {/* SLA Monitor Card */}
        <Link href="/admin/sla-monitor" className="group block">
          <div className="bg-white border rounded-xl p-6 h-full shadow-sm hover:shadow-md hover:red-blue-500 transition-all hover:border-red-400">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-red-600 transition-colors">SLA Escalation Monitor</h3>
            <p className="text-gray-500 text-sm">
              Track hot leads explicitly awaiting a human response. Visualizes ticking and breached SLA deadlines.
            </p>
          </div>
        </Link>

        {/* Campaign Manager Card */}
        <Link href="/admin/campaigns" className="group block">
          <div className="bg-white border rounded-xl p-6 h-full shadow-sm hover:shadow-md hover:border-green-500 transition-all">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">Bulk Campaign Manager</h3>
            <p className="text-gray-500 text-sm">
              Filter leads by segment attributes and bulk launch templates directly into the rate-limited dispatch queue.
            </p>
          </div>
        </Link>

        {/* Analytics Card */}
        <Link href="/admin/analytics" className="group block">
          <div className="bg-white border rounded-xl p-6 h-full shadow-sm hover:shadow-md hover:border-purple-500 transition-all">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">Template Analytics</h3>
            <p className="text-gray-500 text-sm">
              Reply rates, delivery rates, and performance breakdown per WhatsApp template.
            </p>
          </div>
        </Link>

      </div>
    </div>
  );
}
