// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

// Lee las variables de entorno
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("❌ Faltan las variables de entorno de Supabase. Revisa tu archivo .env.local")
}

// Exporta el cliente
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
})

