import { NextResponse } from 'next/server';
import { redisClient } from '@/lib/queue/client';
import { syncTemplatesToSupabase } from '@/lib/twilio/templates';

export async function POST() {
  try {
    await redisClient.del('le:twilio:templates');
    const templates = await syncTemplatesToSupabase();
    return NextResponse.json({ refreshed: true, count: templates.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
