import filter from "leo-profanity";

/**
 * Check text fields for profanity.
 * Returns the name of the first field that fails, or null if all clean.
 */
export function checkProfanity(
  fields: Record<string, string | null | undefined>
): string | null {
  for (const [name, value] of Object.entries(fields)) {
    if (value && filter.check(value)) {
      return name;
    }
  }
  return null;
}
