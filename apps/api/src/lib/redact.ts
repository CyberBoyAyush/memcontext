// Deterministic secret filter applied before anything is embedded, sent to an LLM, or stored.
// The LLM rewrite step can be skipped for "already clear" content, so it is not a safety net.

export const REDACTED = "[REDACTED_SECRET]";

const TOKEN_PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{10,}/g,
  /\bsk-(?:proj-|ant-|or-v1-|or-)?[A-Za-z0-9_-]{20,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bglpat-[A-Za-z0-9_-]{20,}/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\bsbp_[A-Za-z0-9]{20,}/g,
  /\bmc_[A-Za-z0-9]{24,}/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*/g,
  // Random-looking blobs of 32+ chars with lower, upper and 4+ digits (generic API keys).
  // Hex hashes, UUIDs and camelCase identifiers do not match.
  /\b(?=[A-Za-z0-9_-]{32,}\b)(?=(?:[A-Za-z_-]*\d){4})(?=[A-Za-z0-9_-]*[a-z])(?=[A-Za-z0-9_-]*[A-Z])[A-Za-z0-9_-]{32,}\b/g,
];

// Credentials embedded in connection strings: keep the scheme/host, drop the password.
const URL_CREDENTIALS = /\b((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|rediss|amqp|https?):\/\/[^:\s/@]+:)[^@\s]+@/g;

// "password: hunter2", "pin is 4821", "cvv=417".
const LABELED_SECRET =
  /\b(password|passcode|passwd|pin|otp|cvv|cvc|secret key|api key)\b(\s*(?:is|was|=|:|-)\s*|\s+)(["'`]?)([^\s"'`,;]{3,})\3/gi;
const DIGIT_ONLY_LABELS = new Set(["pin", "otp", "cvv", "cvc"]);

const CARD_CANDIDATE = /\b(?:\d[ -]?){12,18}\d\b/g;
const CARD_CONTEXT = /\b(card|visa|master ?card|amex|credit|debit|cc|rupay)\b/i;
const GROUPED_CARD = /^\d{4}([ -])\d{4}\1\d{4}\1\d{1,7}$/;

function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export interface RedactResult {
  text: string;
  count: number;
}

export function redactSecrets(input: string): RedactResult {
  let count = 0;
  let text = input;

  for (const pattern of TOKEN_PATTERNS) {
    text = text.replace(pattern, () => {
      count++;
      return REDACTED;
    });
  }

  text = text.replace(URL_CREDENTIALS, (_m, prefix: string) => {
    count++;
    return `${prefix}${REDACTED}@`;
  });

  text = text.replace(LABELED_SECRET, (match, label: string, sep: string, _q: string, value: string) => {
    if (value === REDACTED) return match;
    // "password: letmein" is a secret; "the password reset flow" (no explicit separator) is not.
    const looksSecret = DIGIT_ONLY_LABELS.has(label.toLowerCase())
      ? /^\d{3,8}$/.test(value)
      : /[:=]/.test(sep) || /[\d\W_]/.test(value);
    if (!looksSecret) return match;
    count++;
    return `${label}${sep}${REDACTED}`;
  });

  // Card numbers: Luhn-valid AND either grouped like a card or mentioned near a card word.
  text = text.replace(CARD_CANDIDATE, (match, offset: number, whole: string) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19 || !passesLuhn(digits)) return match;
    const nearby = whole.slice(Math.max(0, offset - 40), offset);
    if (!GROUPED_CARD.test(match.trim()) && !CARD_CONTEXT.test(nearby)) return match;
    count++;
    return REDACTED;
  });

  // An unclosed <private> hides everything after it.
  text = text.replace(/<private>[\s\S]*?(?:<\/private>|$)/gi, () => {
    count++;
    return "[PRIVATE]";
  });

  return { text, count };
}

/**
 * True when nothing useful is left after redaction, e.g. "my stripe key is [REDACTED_SECRET]".
 * Short remainders that only talk about the credential itself are not worth remembering.
 */
export function isOnlySecret(text: string): boolean {
  const remainder = text.replaceAll(REDACTED, "").replace(/\[PRIVATE\]/g, "").trim();
  if (remainder.replace(/[^\p{L}\p{N}]/gu, "").length < 3) return true;
  return (
    remainder.length < 32 &&
    /\b(key|keys|token|password|passcode|pin|secret|card|cvv|credentials?)\b/i.test(remainder)
  );
}
