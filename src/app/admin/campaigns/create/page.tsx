import { createAndLaunchCampaign, CampaignSegmentFilters } from '@/lib/campaigns/manager';
import { getApprovedTemplates } from '@/lib/twilio/templates';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CreateCampaignPage() {
  const templates = await getApprovedTemplates().catch(() => []);

  async function onSubmit(formData: FormData) {
    'use server';

    const name             = formData.get('name') as string;
    const templateSid      = formData.get('templateSid') as string;
    const templateName     = formData.get('templateName') as string;

    const segment: CampaignSegmentFilters = {};
    const leadSource = formData.get('lead_source') as string;
    if (leadSource) segment.lead_source = leadSource;
    const waHotness = formData.get('wa_hotness') as string;
    if (waHotness) segment.wa_hotness = waHotness;

    await createAndLaunchCampaign(name, templateSid, templateName, segment);
    redirect('/admin/campaigns');
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Create Campaign</h1>
        <Link href="/admin/campaigns" className="text-sm text-gray-500 hover:text-gray-800">
          ← Back
        </Link>
      </div>

      <form action={onSubmit} className="bg-white border rounded-lg p-6 shadow-sm space-y-6">

        {/* Campaign name */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Campaign Name</label>
          <input
            type="text"
            name="name"
            required
            placeholder="e.g. Meta Leads Re-engagement March"
            className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-gray-300 outline-none"
          />
        </div>

        {/* Template dropdown */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-gray-700">Template</label>
          {templates.length === 0 ? (
            <p className="text-sm text-red-500">
              No approved templates found. Go to{' '}
              <Link href="/admin/templates" className="underline">Templates</Link>{' '}
              and hit Refresh.
            </p>
          ) : (
            <select
              name="templateSid"
              required
              className="w-full border rounded-md p-2 text-sm bg-white focus:ring-2 focus:ring-gray-300 outline-none"
              onChange={undefined}
            >
              <option value="">— Select a template —</option>
              {templates.map((t) => (
                <option key={t.sid} value={t.sid} data-name={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          {/* Hidden field for templateName — populated client-side via script */}
          <input type="hidden" name="templateName" id="templateNameField" />
          <script dangerouslySetInnerHTML={{ __html: `
            document.querySelector('[name="templateSid"]')?.addEventListener('change', function() {
              const opt = this.options[this.selectedIndex];
              document.getElementById('templateNameField').value = opt.dataset.name || opt.text;
            });
          `}} />
          <p className="text-xs text-gray-400">Only approved Twilio templates are shown.</p>
        </div>

        {/* Audience segment */}
        <div className="pt-2 border-t space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">Audience Segment</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Filters opted-in, non-dead leads. Leave blank to target all.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Lead Source</label>
              <input
                type="text"
                name="lead_source"
                placeholder="e.g. Meta Ads"
                className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-gray-300 outline-none"
              />
              <p className="text-xs text-gray-400">Partial match — "Meta" matches "Meta Ads"</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Hotness</label>
              <select
                name="wa_hotness"
                className="w-full border rounded-md p-2 text-sm bg-white focus:ring-2 focus:ring-gray-300 outline-none"
              >
                <option value="">Any</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-2 bg-amber-50 border border-amber-100 rounded-md p-3 text-xs text-amber-700">
          Campaign messages are rate-limited to 30/min via the campaign queue.
          Messages go out only within the 9am–8pm IST send window.
        </div>

        <button
          type="submit"
          className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold py-3 rounded-md transition-colors text-sm"
        >
          Launch Campaign
        </button>
      </form>
    </div>
  );
}
