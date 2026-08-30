import { supabase } from "@/lib/supabase/client"

export type CollaborationEventType =
  | "message_sent"
  | "task_created"
  | "task_completed"
  | "task_blocked"
  | "task_reopened"
  | "decision_created"
  | "decision_updated"
  | "document_uploaded"
  | "member_joined"
  | "member_left"
  | "handover_created"
  | "handover_viewed"
  | "milestone_created"
  | "milestone_completed"

interface CollaborationEvent {
  projectId: string
  userId?: string | null
  eventType: CollaborationEventType
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, any>
}

export async function logCollaborationEvent({
  projectId,
  userId,
  eventType,
  entityType,
  entityId,
  metadata = {},
}: CollaborationEvent) {
  if (!projectId) {
    console.warn(
      "[CampusLegacy] Cannot log collaboration event without projectId"
    )
    return
  }

  try {
    const { error } = await supabase
      .from("collaboration_events")
      .insert({
        project_id: projectId,
        user_id: userId ?? null,
        event_type: eventType,
        entity_type: entityType ?? null,
        entity_id: entityId ?? null,
        metadata,
      })

    if (error) {
      console.error(
        "[CampusLegacy] Collaboration event error:",
        error
      )
    }
  } catch (error) {
    console.error(
      "[CampusLegacy] Collaboration event exception:",
      error
    )
  }
}