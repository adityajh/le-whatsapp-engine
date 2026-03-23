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
 * Checks if current time is within 9am to 8pm IST (Indian Standard Time)
 * IST is UTC +5:30.
 */
export function isWithinSendWindow(): boolean {
  // Get current UTC time
  const now = new Date();
  
  // Calculate IST hours (quick math for IST = UTC + 5:30)
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

  // Window is 9:00 AM to 8:00 PM (20:00)
  if (istHours >= 9 && istHours < 20) {
    return true;
  }
  
  return false;
}
