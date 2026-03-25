'use server';

import { supabase } from '@/lib/supabase';
import { invalidateClassifierCache } from '@/lib/engine/classifier';

export async function saveKeywords(cls: string, keywords: string[]) {
  const cleaned = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);

  const { error } = await supabase
    .from('classification_rules')
    .update({ keywords: cleaned, updated_at: new Date().toISOString() })
    .eq('class', cls);

  if (error) throw new Error(error.message);

  await invalidateClassifierCache();
}
