import { createClient } from '@supabase/supabase-js'

// Server-side client with full access (used in API routes only)
export function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
