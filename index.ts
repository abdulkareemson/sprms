import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function testBucket() {
  const { data, error } = await supabase.storage.getBucket('medical-documents')

  console.log('Bucket:', data)
  console.log('Error:', error)
}