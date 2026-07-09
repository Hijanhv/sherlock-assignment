// Text similarity and normalization used by the identity and roster signals.
// Jaro-Winkler handles typos and short-form names better than raw Levenshtein,
// and a token-set overlap catches reordered or partial names ("Decker, Jon").

export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function emailLocalPart(email?: string): string {
  if (!email) return "";
  const at = email.indexOf("@");
  return normalizeName((at >= 0 ? email.slice(0, at) : email).replace(/[._-]/g, " "));
}

function jaro(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matchWindow = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);

  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, b.length);
    for (let j = start; j < end; j++) {
      if (bMatches[j] || a[i] !== b[j]) continue;
      aMatches[i] = true;
      bMatches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatches[i]) continue;
    while (!bMatches[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (
    (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3
  );
}

/** Jaro-Winkler similarity in [0, 1], with the standard prefix boost. */
export function jaroWinkler(a: string, b: string): number {
  const j = jaro(a, b);
  let prefix = 0;
  const maxPrefix = 4;
  for (let i = 0; i < Math.min(maxPrefix, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return j + prefix * 0.1 * (1 - j);
}

/** Fraction of the shorter token set that appears in the longer one. */
function tokenSetOverlap(a: string, b: string): number {
  const at = new Set(a.split(" ").filter(Boolean));
  const bt = new Set(b.split(" ").filter(Boolean));
  if (at.size === 0 || bt.size === 0) return 0;
  const [small, large] = at.size <= bt.size ? [at, bt] : [bt, at];
  let hits = 0;
  for (const tok of small) {
    if (large.has(tok)) hits++;
    else {
      // allow a near-match on a single token (e.g. "jon" vs "jonathan")
      for (const other of large) {
        if (other.startsWith(tok) || tok.startsWith(other)) {
          if (Math.min(tok.length, other.length) >= 3) {
            hits += 0.7;
            break;
          }
        }
      }
    }
  }
  return hits / small.size;
}

/**
 * Best available similarity between two names in [0, 1]. Blends whole-string
 * Jaro-Winkler with token-set overlap so that both "Jon Decker" vs "Decker"
 * and "MacBook" vs "Macbook Pro" behave sensibly.
 */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const jw = jaroWinkler(na, nb);
  const tok = tokenSetOverlap(na, nb);
  return Math.max(jw, tok);
}

// Common device and placeholder labels that carry no identity information.
const DEVICE_LABELS = [
  "macbook",
  "macbook pro",
  "macbook air",
  "iphone",
  "ipad",
  "android",
  "galaxy",
  "pixel",
  "windows",
  "pc",
  "laptop",
  "guest",
  "user",
  "unknown",
  "participant",
  "call in user",
  "caller",
  "meeting room",
  "conference room",
];

// Strong device tokens: if any of these appears as a whole word the label is a
// device, regardless of possessive prefixes ("Aditya's iPad" -> "aditya s ipad").
const DEVICE_TOKENS = new Set([
  "macbook",
  "iphone",
  "ipad",
  "android",
  "galaxy",
  "pixel",
  "laptop",
]);

/**
 * True when a display name looks like a device or placeholder rather than a
 * person. These names should produce no identity evidence either way.
 */
export function looksLikeDeviceName(raw: string): boolean {
  const n = normalizeName(raw);
  if (!n) return true;
  if (DEVICE_LABELS.includes(n)) return true;
  const tokens = n.split(" ");
  if (tokens.some((t) => DEVICE_TOKENS.has(t))) return true;
  if (/^\+?\d[\d\s]{5,}$/.test(n)) return true; // phone numbers
  if (/^(guest|user|participant|caller)\s*\d*$/.test(n)) return true;
  return false;
}
