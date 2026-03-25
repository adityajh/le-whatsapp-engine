import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 0; // Disable static rendering for this admin page

export default async function CampaignsPage() {
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="p-8 text-red-500">Error loading campaigns: {error.message}</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Campaign Manager</h1>
        <Link
          href="/admin/campaigns/create"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-semibold text-gray-700">Name</th>
              <th className="p-4 font-semibold text-gray-700">Variant SID</th>
              <th className="p-4 font-semibold text-gray-700">Segment</th>
              <th className="p-4 font-semibold text-gray-700">Status</th>
              <th className="p-4 font-semibold text-gray-700">Created At</th>
            </tr>
          </thead>
          <tbody>
            {campaigns?.map((camp) => (
              <tr key={camp.id} className="border-b hover:bg-gray-50/50">
                <td className="p-4 font-medium">{camp.name}</td>
                <td className="p-4 text-sm text-gray-600 font-mono">{camp.template_variant_id}</td>
                <td className="p-4 text-sm text-gray-600">
                  {JSON.stringify(camp.segment_filters)}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium uppercase tracking-wider
                    ${camp.status === 'completed' ? 'bg-green-100 text-green-800' : 
                      camp.status === 'running' ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-800'}`}
                  >
                    {camp.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-500">
                  {new Date(camp.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {(!campaigns || campaigns.length === 0) && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No campaigns found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
