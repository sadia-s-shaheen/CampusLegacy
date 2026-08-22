"use client"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

export default function TestDb() {
  const [result, setResult] = useState("Testing...")

  useEffect(() => {
    const test = async () => {
      // Sign in anonymously first
      const { data: { user }, error: authError } = await supabase.auth.signInAnonymously()
      
      if (authError || !user) {
        setResult("❌ Auth failed: " + authError?.message)
        return
      }

      // Now try to query departments
      const { data, error } = await supabase
        .from("departments")
        .select("*")
        .limit(1)

      if (error) {
        setResult("❌ " + error.message + "\n\n💡 Did you run the SQL schema?")
      } else if (data?.length) {
        setResult(`✅ Success! Found ${data.length} department(s):\n${JSON.stringify(data[0], null, 2)}`)
      } else {
        setResult("️ Connected but no departments found. Run the seed data!")
      }
    }
    
    test()
  }, [])

  return (
    <div className="min-h-screen p-8 bg-[#e8e9e8]">
      <pre className="glass-button glass-neutral p-6 rounded-2xl text-sm whitespace-pre-wrap">
        {result}
      </pre>
    </div>
  )
}