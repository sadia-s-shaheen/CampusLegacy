"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase/client"

export type ProfileOption = {
  id: string
  name: string
}

function useOptions(table: "departments" | "skills") {
  const [options, setOptions] = useState<ProfileOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadOptions = async () => {
      const { data } = await supabase
        .from(table)
        .select("id, name")
        .order("name")

      setOptions(data || [])
      setLoading(false)
    }

    loadOptions()
  }, [table])

  return { options, loading }
}

export function useDepartments() {
  return useOptions("departments")
}

export function useSkills() {
  return useOptions("skills")
}
