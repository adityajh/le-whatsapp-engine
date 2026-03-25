export function isWithin24HourSession(lastInboundAt: string | null | undefined): boolean {
  if (!lastInboundAt) return false;

  const inboundDate = new Date(lastInboundAt);
  const now = new Date();
  
  // Diff in milliseconds
  const diffMs = now.getTime() - inboundDate.getTime();
  
  // 24 hours in milliseconds
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  
  return diffMs <= twentyFourHoursMs;
}

/**
 * Checks if current time is within 6am to 11pm IST (widened window for testing)
 * IST is UTC +5:30.
 */
export function isWithinSendWindow(): boolean {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  
  let istHours = utcHours + 5;
  let istMinutes = utcMinutes + 30;
  
  if (istMinutes >= 60) {
    istHours += 1;
    istMinutes -= 60;
  }
  
  if (istHours >= 24) {
    istHours -= 24;
  }

  // Widened Window for Testing: 6:00 AM to 11:00 PM (23:00)
  // Production will eventually tighten this back to 9-8
  if (istHours >= 6 && istHours < 23) {
    return true;
  }
  
  return false;
}
