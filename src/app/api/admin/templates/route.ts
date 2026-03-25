import { NextResponse } from 'next/server';
import { getTwilioTemplates } from '@/lib/twilio/templates';

export async function GET() {
  try {
    const templates = await getTwilioTemplates();
    return NextResponse.json(templates);
  } catch (err: any) {
    console.error('[API] Failed to fetch Twilio templates:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
