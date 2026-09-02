import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Fallback values so createClient() never throws "supabaseUrl is required"
// even if the real env vars are missing or not loaded yet.
const FALLBACK_URL = 'https://placeholder.supabase.co'
const FALLBACK_KEY = 'placeholder-anon-key'

const isConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isConfigured && typeof window !== 'undefined') {
  // Only warn in the browser console, don't crash the app.
  console.warn(
    '[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY ' +
    'is missing. Supabase calls will fail until you set them in .env.local ' +
    'and restart the dev server.'
  )
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || FALLBACK_URL,
  supabaseAnonKey || FALLBACK_KEY
)

// Optional helper if you want to guard actual data calls elsewhere.
export const isSupabaseConfigured = isConfigured