import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy-initialize to avoid "supabaseUrl is required" during Next.js static prerendering.
// The client is created on first access, not at module load time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabase: SupabaseClient<any, any, any> | null = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: SupabaseClient<any, any, any> = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_supabase) {
      _supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_supabase as any)[prop]
  },
})
