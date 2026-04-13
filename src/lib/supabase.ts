// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Define the type for patient data
export type PatientData = {
  patient_id: string
  full_name: string
  date_of_birth: string | null
  phone: string | null
  village: string | null
  district: string | null
  blood_group: string | null
  allergies: string | null
  guardian_name: string | null
  guardian_phone: string | null
  is_pregnant: boolean
  registered_at: string
  synced_to_cloud: boolean
}

// These values come from your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to check if Supabase is connected
export async function checkSupabaseConnection() {
  try {
    const { error } = await supabase.from('patients').select('count', { count: 'exact', head: true })
    if (error) throw error
    return { connected: true, error: null }
  } catch (error: unknown) {
    console.error('Supabase connection error:', error)
    let errorMessage = 'Connection failed'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    return { connected: false, error: errorMessage }
  }
}

// Save patient to Supabase (cloud) - NO 'any' type used
export async function savePatientToSupabase(patientData: PatientData) {
  try {
    const { data, error } = await supabase
      .from('patients')
      .insert([patientData])
      .select()
    
    if (error) throw error
    
    console.log('✅ Saved to Supabase cloud:', data)
    return { success: true, data: data, error: null }
  } catch (error: unknown) {
    console.error('❌ Supabase save error:', error)
    let errorMessage = 'Save failed'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    return { success: false, data: null, error: errorMessage }
  }
}