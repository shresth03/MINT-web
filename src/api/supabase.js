import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tables live outside `public` now, split by feature area.
// Auth/storage/realtime channel subscriptions stay on the default `supabase` client.
export const contentDb = supabase.schema('content')
export const identityDb = supabase.schema('identity')
export const mediaDb = supabase.schema('media')
export const moderationDb = supabase.schema('moderation')
export const socialDb = supabase.schema('social')
