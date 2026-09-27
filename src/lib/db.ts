import { supabase } from "@/integrations/supabase/client";

/** Loosely typed client used by the generic data grids and forms. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as any;

export const DEMO_TENANT_ID = "11111111-1111-1111-1111-111111111111";

/**
 * Restricts a query to the active company. Super admins (no tenant) are left
 * unfiltered and still see only what RLS allows.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function scope(q: any, tenantId?: string | null) {
  return tenantId ? q.eq("tenant_id", tenantId) : q;
}
