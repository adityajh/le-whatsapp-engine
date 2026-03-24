import { createAndLaunchCampaign, CampaignSegmentFilters } from '@/lib/campaigns/manager';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default function CreateCampaignPage() {
  
  async function onSubmit(formData: FormData) {
    'use server';
    
    const name = formData.get('name') as string;
    const templateVariantId = formData.get('templateVariantId') as string;
    
    // Parse segment filters dynamically from form
    const segment: CampaignSegmentFilters = {};
    const leadSource = formData.get('lead_source') as string;
    if (leadSource) segment.lead_source = leadSource;
    
    const waHotness = formData.get('wa_hotness') as string;
    if (waHotness) segment.wa_hotness = waHotness;

    // Trigger Campaign Launcher
    await createAndLaunchCampaign(name, templateVariantId, segment);
    
    redirect('/admin/campaigns');
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Create New Campaign</h1>
        <Link href="/admin/campaigns" className="text-blue-600 hover:underline">
          &larr; Back
        </Link>
      </div>

      <form action={onSubmit} className="bg-white border rounded-lg p-6 shadow-sm space-y-6">
        
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Campaign Name</label>
          <input 
            type="text" 
            name="name" 
            required 
            placeholder="e.g. Meta Let's Enterprise October Batch" 
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Template Variant SID</label>
          <input 
            type="text" 
            name="templateVariantId" 
            required 
            placeholder="HXd3cf40ca8ed1b0fa7bc74cfa9a901887" 
            className="w-full border rounded-md p-2 font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
          />
        </div>

        <div className="pt-4 border-t space-y-4">
          <h3 className="font-semibold text-gray-900">Audience Segment</h3>
          <p className="text-sm text-gray-500">Filters incoming valid leads (Opted-in, Unclosed). Leave blank to match all.</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Lead Source Match</label>
              <input 
                type="text" 
                name="lead_source" 
                placeholder="e.g. Meta Ads" 
                className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Hotness Match</label>
              <select name="wa_hotness" className="w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                <option value="">Any</option>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-md transition-colors"
          >
            Launch Campaign
          </button>
        </div>
      </form>
    </div>
  );
}
