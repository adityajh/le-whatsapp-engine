import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');

  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) return NextResponse.json({ value: true }); // Default to true if not found

  return NextResponse.json({ value: data.value?.value ?? true });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { key, value } = body;

  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const { error } = await supabase
    .from('system_settings')
    .upsert({ key, value: { value }, updated_at: new Date().toISOString() });

  if (error) {
    console.error(`[Settings API] Upsert error:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
