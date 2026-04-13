// src/lib/connectionTest.ts

export async function testSupabaseConnection(): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing environment variables')
    return false
  }
  
  try {
    // Use the auth endpoint instead - this always exists
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    })
    
    // 200 or 401 both mean the server is reachable
    // 404 means the endpoint doesn't exist
    return response.status !== 404
  } catch (error) {
    console.error('❌ Connection failed:', error)
    return false
  }
}

export async function getConnectionStatus(): Promise<{
  isFullyOnline: boolean
}> {
  const isFullyOnline = await testSupabaseConnection()
  return { isFullyOnline }
}