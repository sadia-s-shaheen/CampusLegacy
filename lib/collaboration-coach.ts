import { supabase } from "@/lib/supabase/client"

type CoachSeverity =
  | "low"
  | "medium"
  | "high"

type CoachIntervention = {
  projectId: string
  userId?: string | null
  type: string
  severity: CoachSeverity
  title: string
  message: string
  triggerData?: Record<string, any>
}

export async function createCoachIntervention({
  projectId,
  userId = null,
  type,
  severity,
  title,
  message,
  triggerData = {},
}: CoachIntervention) {
  try {
    if (!projectId) {
      return null
    }

    // ----------------------------------------------------------
    // Prevent duplicate active interventions
    // ----------------------------------------------------------

    const {
      data: existing,
      error: existingError,
    } = await supabase
      .from("ai_interventions")
      .select("id")
      .eq("project_id", projectId)
      .eq("intervention_type", type)
      .eq("target_user_id", userId)
      .eq("is_dismissed", false)
      .eq("is_actioned", false)
      .limit(1)

    if (existingError) {
      console.error(
        "[Coach] Existing intervention lookup failed:",
        existingError
      )
    }

    if (
      existing &&
      existing.length > 0
    ) {
      return null
    }

    // ----------------------------------------------------------
    // Create intervention
    // ----------------------------------------------------------

    const {
      data,
      error,
    } = await supabase
      .from("ai_interventions")
      .insert({
        project_id: projectId,
        intervention_type: type,
        title,
        message,
        severity,
        trigger_data: triggerData,
        target_user_id: userId,
        is_dismissed: false,
        is_actioned: false,
      })
      .select()
      .single()

    if (error) {
      console.error(
        "[Coach] Failed to create intervention:",
        error
      )

      return null
    }

    return data
  } catch (error) {
    console.error(
      "[Coach] Intervention exception:",
      error
    )

    return null
  }
}