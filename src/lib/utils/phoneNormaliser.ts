/**
 * Normalises an Indian phone number to E.164 format (+919876543210)
 * Allows standard numbers but also common Zoho/web-form misformats.
 */
export function normaliseIndianPhone(input: string): string | null {
  if (!input) return null;

  // 1. Remove all whitespace, dashes, and parentheses 
  let cleaned = input.replace(/[\s\-\(\)]/g, '');

  // 2. If it has a legitimate +91, let's work with the rest
  if (cleaned.startsWith('+91')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('91') && cleaned.length === 12) {
    // Looks like 919876543210
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('+') && !cleaned.startsWith('+91')) {
    // It's an international number not from India. We could either reject or accept.
    // For this engine, we assume all leads are Indian or we reject them.
    return null;
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    // Looks like 09876543210
    cleaned = cleaned.substring(1);
  }

  // 3. Remove any remaining non-digits (just in case there were weird chars)
  cleaned = cleaned.replace(/\D/g, '');

  // 4. Validate length (Indian mobiles are 10 digits)
  if (cleaned.length !== 10) {
    return null; // Invalid length
  }

  // 5. Build final E.164 format
  return `+91${cleaned}`;
}
