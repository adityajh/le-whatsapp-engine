import React from 'react';

export default function ZohoMappingPage() {
  const mappings = [
    { internal: 'zoho_lead_id', zoho: '${Leads.Lead Id}', description: 'Mandatory for writeback syncing', required: true },
    { internal: 'mobile', zoho: '${Leads.Mobile}', description: 'Primary WhatsApp number (checked first)', required: true },
    { internal: 'phone', zoho: '${Leads.Phone}', description: 'Secondary/Fallback number', required: false },
    { internal: 'first_name', zoho: '${Leads.First Name}', description: 'Lead greeting', required: false },
    { internal: 'last_name', zoho: '${Leads.Last Name}', description: 'Lead identity', required: false },
    { internal: 'email', zoho: '${Leads.Email}', description: 'Contact fallback', required: false },
    { internal: 'program', zoho: '${Leads.Program}', description: 'Determines routing logic (e.g., Storysells)', required: false },
    { internal: 'persona', zoho: '${Leads.You are interested as?}', description: 'Determines template tone (Parent vs Student)', required: false },
    { internal: 'relocate_to_pune', zoho: '${Leads.If selected, would you be comfortable relocating ?}', description: 'Eligibility filter for BBA BATCH', required: false },
  ];

  const zohoJson = `{
  "zoho_lead_id": "\${Leads.Lead Id}",
  "first_name": "\${Leads.First Name}",
  "last_name": "\${Leads.Last Name}",
  "mobile": "\${Leads.Mobile}",
  "phone": "\${Leads.Phone}",
  "email": "\${Leads.Email}",
  "program": "\${Leads.Program}",
  "persona": "\${Leads.You are interested as?}",
  "relocate_to_pune": "\${Leads.If selected, would you be comfortable relocating ?}"
}`;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Zoho Field Mapping</h2>
        <p className="text-gray-500 mt-1">Configure your Zoho CRM webhook to match these internal engine keys.</p>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden mb-8">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Internal Key</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Zoho Merge Tag</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Purpose</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Required</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mappings.map((m) => (
              <tr key={m.internal}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">{m.internal}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{m.zoho}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{m.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {m.required ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">MANDATORY</span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">OPTIONAL</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Recommended Zoho Payload (JSON)</h3>
        <p className="text-sm text-gray-600">Copy and paste this into your Zoho Webhook "Raw JSON" body section.</p>
        <div className="relative group">
          <pre className="bg-gray-900 text-gray-100 p-6 rounded-xl font-mono text-xs overflow-x-auto shadow-inner leading-relaxed">
            {zohoJson}
          </pre>
          <div className="absolute top-4 right-4 text-[10px] text-gray-500 font-mono uppercase tracking-widest bg-gray-800 px-2 py-1 rounded">
            JSON Body
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-4 items-start">
        <div className="bg-blue-600 p-2 rounded-lg text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-blue-900">Smart Mapping Pro-Tip</h4>
          <p className="text-xs text-blue-800 mt-1 leading-relaxed">
            The engine is designed with "Fuzzy Mapping". If you use <span className="font-mono">Phone Number</span> instead of <span className="font-mono">phone</span>, the engine will still try to find it! However, following the JSON above ensures maximum predictability.
          </p>
        </div>
      </div>
    </div>
  );
}
