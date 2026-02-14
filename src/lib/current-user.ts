import { cookies } from "next/headers";
import { DEMO_USER_ID } from "./constants";

const COOKIE_NAME = "qc_user_id";

/**
 * Get the current user ID from the cookie (server-side only).
 * Falls back to DEMO_USER_ID if not set.
 */
export async function getCurrentUserId(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value || DEMO_USER_ID;
}
