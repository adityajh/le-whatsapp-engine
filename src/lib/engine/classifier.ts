import { supabase } from '../supabase';
import { redisClient } from '../queue/client';

const CACHE_KEY = 'le:classification:rules';
const CACHE_TTL = 1800; // 30 minutes

export type ReplyClass = 'interested' | 'fee_question' | 'not_now' | 'wrong_number' | 'stop' | 'other';

export type ClassificationRule = {
  class: ReplyClass;
  keywords: string[];
  hotness: string;
  opt_out: boolean;
};

export type ClassificationResult = {
  replyClass: ReplyClass;
  hotness: string;
  optOut: boolean;
};

async function getRules(): Promise<ClassificationRule[]> {
  const cached = await redisClient.get<ClassificationRule[]>(CACHE_KEY);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('classification_rules')
    .select('class, keywords, hotness, opt_out')
    .order('class');

  if (error || !data?.length) {
    console.warn('[Classifier] Failed to load rules from DB, using hardcoded fallback:', error?.message);
    return FALLBACK_RULES;
  }

  await redisClient.set(CACHE_KEY, data, { ex: CACHE_TTL });
  return data as ClassificationRule[];
}

export async function classifyReply(body: string): Promise<ClassificationResult> {
  const rules = await getRules();
  const lower = body.toLowerCase().trim();

  // stop always takes priority
  const stopRule = rules.find((r) => r.class === 'stop');
  if (stopRule?.keywords.some((kw) => lower.includes(kw))) {
    return { replyClass: 'stop', hotness: 'dead', optOut: true };
  }

  // Check remaining rules in priority order
  const priority: ReplyClass[] = ['interested', 'fee_question', 'not_now', 'wrong_number', 'other'];
  for (const cls of priority) {
    const rule = rules.find((r) => r.class === cls);
    if (!rule) continue;
    if (rule.keywords.length === 0 && cls === 'other') {
      return { replyClass: 'other', hotness: rule.hotness, optOut: rule.opt_out };
    }
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { replyClass: cls, hotness: rule.hotness, optOut: rule.opt_out };
    }
  }

  return { replyClass: 'other', hotness: 'warm', optOut: false };
}

export async function invalidateClassifierCache() {
  await redisClient.del(CACHE_KEY);
}

// Hardcoded fallback if DB is unreachable
const FALLBACK_RULES: ClassificationRule[] = [
  { class: 'stop',         keywords: ['stop', 'unsubscribe'],                   hotness: 'dead', opt_out: true },
  { class: 'interested',   keywords: ['yes', 'interested', 'more'],             hotness: 'hot',  opt_out: false },
  { class: 'fee_question', keywords: ['fee', 'price', 'cost'],                  hotness: 'warm', opt_out: false },
  { class: 'not_now',      keywords: ['busy', 'not now', 'later'],              hotness: 'cold', opt_out: false },
  { class: 'wrong_number', keywords: ['wrong number', 'not me'],                hotness: 'dead', opt_out: false },
  { class: 'other',        keywords: [],                                         hotness: 'warm', opt_out: false },
];
