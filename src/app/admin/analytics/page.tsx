import { supabase } from '@/lib/supabase';
import { TEMPLATE_SIDS } from '@/lib/constants';

export const revalidate = 0;

// Reverse map: SID → template name
const SID_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(TEMPLATE_SIDS).map(([name, sid]) => [sid, name])
);

type TemplateStats = {
  sid: string;
  name: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  replied: number;
};

export default async function AnalyticsPage() {
  // All outbound messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('template_variant_id, status, lead_id')
    .eq('direction', 'outbound')
    .not('template_variant_id', 'is', null);

  // Leads with reply data (to calculate reply rate per template)
  const { data: leads, error: leadError } = await supabase
    .from('leads')
    .select('wa_last_template, wa_reply_class')
    .not('wa_last_template', 'is', null);

  if (msgError || leadError) {
    return (
      <div className="p-8 text-red-600">
        Error loading analytics: {msgError?.message || leadError?.message}
      </div>
    );
  }

  // Aggregate message stats per template SID
  const statsMap: Record<string, TemplateStats> = {};

  for (const msg of messages || []) {
    const sid = msg.template_variant_id;
    if (!sid) continue;
    if (!statsMap[sid]) {
      statsMap[sid] = {
        sid,
        name: SID_TO_NAME[sid] || sid,
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
        replied: 0,
      };
    }
    statsMap[sid].sent++;
    if (msg.status === 'delivered') statsMap[sid].delivered++;
    if (msg.status === 'read') statsMap[sid].read++;
    if (msg.status === 'failed') statsMap[sid].failed++;
  }

  // Count replies per template name (via wa_last_template on leads)
  for (const lead of leads || []) {
    if (!lead.wa_reply_class || !lead.wa_last_template) continue;
    const sid = TEMPLATE_SIDS[lead.wa_last_template];
    if (sid && statsMap[sid]) {
      statsMap[sid].replied++;
    }
  }

  const stats = Object.values(statsMap).sort((a, b) => b.sent - a.sent);

  const replyRate = (s: TemplateStats) =>
    s.sent > 0 ? ((s.replied / s.sent) * 100).toFixed(1) : '—';

  const deliveryRate = (s: TemplateStats) =>
    s.sent > 0 ? (((s.delivered + s.read) / s.sent) * 100).toFixed(1) : '—';

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Template Performance</h1>
        <p className="text-gray-500 mt-1">Reply and delivery rates per WhatsApp template across all sends.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="Total Sends"
          value={stats.reduce((a, s) => a + s.sent, 0).toLocaleString()}
          color="blue"
        />
        <SummaryCard
          label="Delivered / Read"
          value={stats.reduce((a, s) => a + s.delivered + s.read, 0).toLocaleString()}
          color="green"
        />
        <SummaryCard
          label="Total Replies"
          value={stats.reduce((a, s) => a + s.replied, 0).toLocaleString()}
          color="purple"
        />
        <SummaryCard
          label="Failed"
          value={stats.reduce((a, s) => a + s.failed, 0).toLocaleString()}
          color="red"
        />
      </div>

      {/* Per-Template Table */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-semibold text-gray-700">Template</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Sent</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Delivered</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Read</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Failed</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Replied</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Delivery %</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Reply %</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.sid} className="border-b hover:bg-gray-50/50">
                <td className="p-4">
                  <div className="font-medium text-gray-900">{s.name}</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">{s.sid}</div>
                </td>
                <td className="p-4 text-right text-gray-700">{s.sent}</td>
                <td className="p-4 text-right text-gray-700">{s.delivered}</td>
                <td className="p-4 text-right text-gray-700">{s.read}</td>
                <td className="p-4 text-right">
                  <span className={s.failed > 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                    {s.failed}
                  </span>
                </td>
                <td className="p-4 text-right text-gray-700">{s.replied}</td>
                <td className="p-4 text-right">
                  <RateBadge value={deliveryRate(s)} thresholds={[60, 30]} />
                </td>
                <td className="p-4 text-right">
                  <RateBadge value={replyRate(s)} thresholds={[15, 5]} />
                </td>
              </tr>
            ))}
            {stats.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  No outbound messages recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    red: 'bg-red-50 text-red-700 border-red-100',
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm mt-1 opacity-80">{label}</div>
    </div>
  );
}

function RateBadge({ value, thresholds }: { value: string; thresholds: [number, number] }) {
  if (value === '—') return <span className="text-gray-400">—</span>;
  const num = parseFloat(value);
  const color =
    num >= thresholds[0] ? 'text-green-600' :
    num >= thresholds[1] ? 'text-orange-500' :
    'text-red-500';
  return <span className={`font-semibold ${color}`}>{value}%</span>;
}
