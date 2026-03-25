import { supabase } from '@/lib/supabase';
import ClassificationEditor from '@/components/admin/ClassificationEditor';

export const revalidate = 0;

const CLASS_META: Record<string, { label: string; description: string; color: string }> = {
  interested:   { label: 'Interested',    description: 'Lead wants to know more — triggers hot alert & 2h SLA',      color: 'green'  },
  fee_question: { label: 'Fee Question',  description: 'Lead is asking about price or fees — assigned to counsellor', color: 'blue'   },
  not_now:      { label: 'Not Now',       description: 'Lead is busy or wants to be contacted later — paused',         color: 'yellow' },
  wrong_number: { label: 'Wrong Number',  description: 'Lead says this is the wrong person — marked dead',             color: 'gray'   },
  stop:         { label: 'Stop / Opt-out','description': 'Lead wants no more messages — opts out immediately',         color: 'red'    },
  other:        { label: 'Other',         description: 'Catch-all — escalated to counsellor for human review',         color: 'orange' },
};

const ORDER = ['interested', 'fee_question', 'not_now', 'wrong_number', 'stop', 'other'];

export default async function ClassificationPage() {
  const { data: rules, error } = await supabase
    .from('classification_rules')
    .select('class, keywords, hotness, opt_out');

  if (error) {
    return <div className="p-8 text-red-600">Error loading rules: {error.message}</div>;
  }

  const ruleMap = Object.fromEntries((rules || []).map((r) => [r.class, r]));

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reply Classification Rules</h1>
        <p className="text-gray-500 mt-1">
          Keywords are matched against incoming WhatsApp replies (case-insensitive, substring match).
          Changes take effect within 30 minutes, or immediately after saving.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {ORDER.map((cls) => {
          const rule = ruleMap[cls];
          const meta = CLASS_META[cls];
          if (!rule || !meta) return null;
          return (
            <ClassificationEditor
              key={cls}
              cls={cls}
              label={meta.label}
              description={meta.description}
              color={meta.color}
              hotness={rule.hotness}
              optOut={rule.opt_out}
              initialKeywords={rule.keywords}
            />
          );
        })}
      </div>
    </div>
  );
}
