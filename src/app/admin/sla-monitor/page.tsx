import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 0; // Disable static rendering

export default async function SLAMonitorPage() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, phone_normalised, zoho_lead_id, wa_state, wa_hotness, owner_email, wa_human_response_due_at')
    .not('wa_human_response_due_at', 'is', null)
    .neq('wa_state', 'wa_closed')
    .order('wa_human_response_due_at', { ascending: true });

  if (error) {
    return <div className="p-8 text-red-500">Error loading SLA data: {error.message}</div>;
  }

  const now = new Date().getTime();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">SLA Monitor Dashboard</h1>
        <Link 
          href="/admin/campaigns" 
          className="text-blue-600 hover:underline"
        >
          View Campaigns &rarr;
        </Link>
      </div>
      <p className="text-gray-500">
        Review leads awaiting a human response. Any lead highlighted in red has breached their SLA and triggered an escalation.
      </p>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-semibold text-gray-700">Lead Phone</th>
              <th className="p-4 font-semibold text-gray-700">Zoho ID</th>
              <th className="p-4 font-semibold text-gray-700">Assigned To</th>
              <th className="p-4 font-semibold text-gray-700">Priority</th>
              <th className="p-4 font-semibold text-gray-700">Time Remaining</th>
            </tr>
          </thead>
          <tbody>
            {leads?.map((lead) => {
              const due = new Date(lead.wa_human_response_due_at!).getTime();
              const isBreached = now > due;
              
              const diffMinutes = Math.floor(Math.abs(due - now) / 60000);
              const remainingStr = isBreached 
                ? `Breached by ${diffMinutes} min` 
                : `${diffMinutes} min left`;

              return (
                <tr key={lead.id} className={`border-b hover:bg-gray-50/50 ${isBreached ? 'bg-red-50/30' : ''}`}>
                  <td className="p-4 font-medium font-mono text-sm">{lead.phone_normalised}</td>
                  <td className="p-4 text-sm text-gray-600 font-mono">{lead.zoho_lead_id || 'unassigned'}</td>
                  <td className="p-4 text-sm font-medium text-gray-800">
                    {lead.owner_email || <span className="text-orange-500">Unassigned</span>}
                  </td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${lead.wa_hotness === 'hot' ? 'bg-red-100 text-red-800' : 
                        lead.wa_hotness === 'warm' ? 'bg-orange-100 text-orange-800' : 
                        'bg-gray-100 text-gray-800'}`}
                    >
                      {lead.wa_hotness?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`font-semibold ${isBreached ? 'text-red-600' : 'text-green-600'}`}>
                      {remainingStr}
                    </span>
                  </td>
                </tr>
              )
            })}
            {(!leads || leads.length === 0) && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No active SLAs to monitor. Everything is caught up!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
