import { supabase } from '@/lib/supabase';
import { getApprovedTemplates } from '@/lib/twilio/templates';
import Link from 'next/link';

export const revalidate = 0;

// ── Error code reference ──────────────────────────────────────────────────────
const ERROR_LABELS: Record<string, string> = {
  '63049': 'Meta: marketing category rejected',
  '63032': 'User opted out (STOP)',
  '21211': 'Invalid / non-WhatsApp number',
  '63016': 'Template not approved',
  '63033': 'WhatsApp not enabled on number',
  '30008': 'Unknown carrier error',
  '63003': 'Channel configuration error',
};

// ── Types ─────────────────────────────────────────────────────────────────────
type TemplateStats = {
  sid: string;
  name: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  replied: number;
  errorCodes: Record<string, number>;
};

type MsgRow = {
  id: string;
  direction: string | null;
  phone_normalised: string | null;
  template_id: string | null;
  template_variant_id: string | null;
  content: string | null;
  status: string | null;
  error_code: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  leads: { name: string | null } | null;
};

type Props = {
  searchParams: Promise<{ tab?: string; filter?: string }>;
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function AnalyticsPage({ searchParams }: Props) {
  const { tab = 'performance', filter = 'all' } = await searchParams;

  // Build SID ↔ name lookup from live Twilio templates (Supabase-persisted)
  const liveTemplates = await getApprovedTemplates().catch(() => []);
  const SID_TO_NAME: Record<string, string> = Object.fromEntries(liveTemplates.map((t) => [t.sid, t.name]));
  const NAME_TO_SID: Record<string, string> = Object.fromEntries(liveTemplates.map((t) => [t.name, t.sid]));

  // ── TAB 2: MESSAGE LOG ────────────────────────────────────────────────────
  if (tab === 'messages') {
    let query = supabase
      .from('messages')
      .select('id, direction, phone_normalised, template_id, template_variant_id, content, status, error_code, sent_at, delivered_at, read_at, leads!lead_id(name)')
      .order('sent_at', { ascending: false })
      .limit(200);

    if (filter === 'inbound') {
      query = query.eq('direction', 'inbound');
    } else if (filter !== 'all') {
      query = query.eq('direction', 'outbound').eq('status', filter);
    }

    const { data, error } = await query;
    if (error) {
      return <div className="p-8 text-red-600">Error loading messages: {error.message}</div>;
    }

    const rows = (data || []) as unknown as MsgRow[];
    const failedCount  = rows.filter((r) => r.direction === 'outbound' && r.status === 'failed').length;
    const inboundCount = rows.filter((r) => r.direction === 'inbound').length;

    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <PageHeader tab={tab} />

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 items-center">
          {(['all', 'inbound', 'failed', 'delivered', 'read', 'sent'] as const).map((f) => (
            <Link
              key={f}
              href={`/admin/analytics?tab=messages&filter=${f}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                filter === f
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'failed' && failedCount > 0 && filter !== 'failed' && (
                <span className="ml-1 text-red-400">({failedCount})</span>
              )}
              {f === 'inbound' && inboundCount > 0 && filter !== 'inbound' && (
                <span className="ml-1 text-indigo-400">({inboundCount})</span>
              )}
            </Link>
          ))}
          <span className="ml-auto text-sm text-gray-400">
            Showing {rows.length} most recent
          </span>
        </div>

        {/* Message log table */}
        <div className="bg-white border rounded-lg overflow-x-auto shadow-sm">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Lead</th>
                <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Template / Message</th>
                <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Error</th>
                <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Time</th>
                <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Delivered</th>
                <th className="p-3 font-semibold text-gray-600 whitespace-nowrap">Read</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isInbound = row.direction === 'inbound';
                return (
                  <tr key={row.id} className={`border-b hover:bg-gray-50/50 ${isInbound ? 'bg-indigo-50/30' : ''}`}>
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{row.leads?.name || '—'}</div>
                      <div className="text-xs text-gray-400 font-mono">
                        {row.phone_normalised
                          ? row.phone_normalised.slice(0, 6) + '••••' + row.phone_normalised.slice(-4)
                          : '—'}
                      </div>
                    </td>
                    <td className="p-3 max-w-[260px]">
                      {isInbound ? (
                        <div className="text-gray-700 text-sm italic truncate" title={row.content ?? ''}>
                          {row.content || '—'}
                        </div>
                      ) : (
                        <>
                          <div className="text-gray-800">
                            {row.template_id || SID_TO_NAME[row.template_variant_id || ''] || '—'}
                          </div>
                          {row.template_variant_id && (
                            <div className="text-xs text-gray-400 font-mono">
                              {row.template_variant_id.slice(0, 14)}…
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="p-3">
                      {isInbound
                        ? <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">inbound</span>
                        : <StatusBadge status={row.status} />
                      }
                    </td>
                    <td className="p-3">
                      {row.error_code ? (
                        <span className="text-xs text-orange-600 font-medium">
                          {row.error_code}
                          <span className="text-orange-400 font-normal">
                            {' '}— {ERROR_LABELS[row.error_code] ?? 'Unknown'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                      {row.sent_at ? formatTime(row.sent_at) : '—'}
                    </td>
                    <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                      {row.delivered_at ? formatTime(row.delivered_at) : '—'}
                    </td>
                    <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                      {row.read_at ? formatTime(row.read_at) : '—'}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    No messages found{filter !== 'all' ? ` with filter "${filter}"` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ErrorLegend />
      </div>
    );
  }

  // ── TAB 1: TEMPLATE PERFORMANCE ───────────────────────────────────────────
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('template_variant_id, status, error_code')
    .eq('direction', 'outbound')
    .not('template_variant_id', 'is', null);

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

  // Aggregate per SID
  const statsMap: Record<string, TemplateStats> = {};

  for (const msg of messages || []) {
    const sid = msg.template_variant_id;
    if (!sid) continue;
    if (!statsMap[sid]) {
      statsMap[sid] = {
        sid,
        name: SID_TO_NAME[sid] || sid,
        sent: 0, delivered: 0, read: 0, failed: 0, replied: 0,
        errorCodes: {},
      };
    }
    statsMap[sid].sent++;
    if (msg.status === 'delivered') statsMap[sid].delivered++;
    if (msg.status === 'read')      statsMap[sid].read++;
    if (msg.status === 'failed') {
      statsMap[sid].failed++;
      if (msg.error_code) {
        statsMap[sid].errorCodes[msg.error_code] =
          (statsMap[sid].errorCodes[msg.error_code] || 0) + 1;
      }
    }
  }

  // Reply attribution via wa_last_template on leads
  for (const lead of leads || []) {
    if (!lead.wa_reply_class || !lead.wa_last_template) continue;
    const sid = NAME_TO_SID[lead.wa_last_template];
    if (sid && statsMap[sid]) statsMap[sid].replied++;
  }

  const stats = Object.values(statsMap).sort((a, b) => b.sent - a.sent);

  const topError = (s: TemplateStats): string | null => {
    const entries = Object.entries(s.errorCodes);
    if (!entries.length) return null;
    const [code] = entries.sort((a, b) => b[1] - a[1])[0];
    return `${code} — ${ERROR_LABELS[code] ?? 'Unknown'}`;
  };

  const deliveryRate = (s: TemplateStats) =>
    s.sent > 0 ? (((s.delivered + s.read) / s.sent) * 100).toFixed(1) : '—';

  const replyRate = (s: TemplateStats) =>
    s.sent > 0 ? ((s.replied / s.sent) * 100).toFixed(1) : '—';

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader tab={tab} />

      {/* Summary cards */}
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

      {/* Per-template table */}
      <div className="bg-white border rounded-lg overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-semibold text-gray-700">Template</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Sent</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Delivered</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Read</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Replied</th>
              <th className="p-4 font-semibold text-gray-700 text-right">Failed</th>
              <th className="p-4 font-semibold text-gray-700">Top Error</th>
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
                <td className="p-4 text-right text-gray-700">{s.replied}</td>
                <td className="p-4 text-right">
                  <span className={s.failed > 0 ? 'text-red-600 font-medium' : 'text-gray-700'}>
                    {s.failed}
                  </span>
                </td>
                <td className="p-4 max-w-[220px]">
                  {topError(s) ? (
                    <span className="text-xs text-orange-600 font-medium leading-snug">
                      {topError(s)}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
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
                <td colSpan={9} className="p-8 text-center text-gray-500">
                  No outbound messages recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ErrorLegend />
    </div>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────

function PageHeader({ tab }: { tab: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Analytics</h1>
      <p className="text-gray-500 mt-1">Message delivery and template performance.</p>
      <div className="flex gap-1 mt-4 border-b">
        {[
          { key: 'performance', label: 'Template Performance' },
          { key: 'messages',    label: 'Message Log' },
        ].map((t) => (
          <Link
            key={t.key}
            href={`/admin/analytics?tab=${t.key}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    sent:      'bg-gray-100 text-gray-600',
    delivered: 'bg-blue-100 text-blue-700',
    read:      'bg-green-100 text-green-700',
    failed:    'bg-red-100 text-red-700',
  };
  const s = status ?? 'unknown';
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
        styles[s] ?? 'bg-gray-100 text-gray-500'
      }`}
    >
      {s}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50   text-blue-700   border-blue-100',
    green:  'bg-green-50  text-green-700  border-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    red:    'bg-red-50    text-red-700    border-red-100',
  };
  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm mt-1 opacity-80">{label}</div>
    </div>
  );
}

function RateBadge({
  value,
  thresholds,
}: {
  value: string;
  thresholds: [number, number];
}) {
  if (value === '—') return <span className="text-gray-400">—</span>;
  const num = parseFloat(value);
  const color =
    num >= thresholds[0] ? 'text-green-600' :
    num >= thresholds[1] ? 'text-orange-500' :
    'text-red-500';
  return <span className={`font-semibold ${color}`}>{value}%</span>;
}

function ErrorLegend() {
  return (
    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
      <p className="text-sm font-semibold text-amber-800 mb-2">Error Code Reference</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1 text-xs text-amber-700">
        {Object.entries(ERROR_LABELS).map(([code, label]) => (
          <div key={code}>
            <span className="font-mono font-semibold">{code}</span> — {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata' }) +
    ' ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })
  );
}
