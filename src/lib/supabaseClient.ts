// src/lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to check connection
export async function isSupabaseReachable(): Promise<boolean> {
  try {
    const { error } = await supabase.from('patients').select('id', { count: 'exact', head: true })
    return !error
  } catch {
    return false
  }
}