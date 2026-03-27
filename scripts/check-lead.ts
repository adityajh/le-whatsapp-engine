import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkLead() {
  const phone = '+919890969261';
  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('phone_normalised', phone)
    .single();

  if (error) {
    console.error('Error fetching lead:', error);
    return;
  }

  console.log('--- LEAD STATE ---');
  console.log('Name:', lead.name);
  console.log('State:', lead.wa_state);
  console.log('Reply Class:', lead.wa_reply_class);
  console.log('Hotness:', lead.wa_hotness);
  console.log('Last Inbound:', lead.wa_last_inbound_at);
  console.log('Last Outbound:', lead.wa_last_outbound_at);
  console.log('SLA Due At:', lead.wa_human_response_due_at);
  console.log('Opt-In:', lead.wa_opt_in);

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('phone_normalised', phone)
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n--- RECENT MESSAGES ---');
  messages?.forEach(m => {
    console.log(`${m.direction} | ${m.status} | ${m.body} | ${m.created_at || m.sent_at}`);
  });
}

checkLead();
