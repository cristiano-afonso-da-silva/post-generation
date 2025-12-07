'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function submitLead(formData: FormData) {
  const email = formData.get('email') as string
  
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { error: 'Please provide a valid email address' }
  }

  try {
    const { error } = await supabase
      .from('leads')
      .insert({ 
        email,
        source: 'agency_onboarding'
      })

    if (error) {
      if (error.code === '23505') { // Unique violation
        return { success: true, message: "You're already on the list!" }
      }
      console.error('Supabase error:', error)
      return { error: 'Something went wrong. Please try again.' }
    }

    return { success: true, message: "Thanks! We'll be in touch." }
  } catch (err) {
    console.error('Submission error:', err)
    return { error: 'Something went wrong. Please try again.' }
  }
}










