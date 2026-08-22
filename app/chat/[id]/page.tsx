import { ChatView } from "@/components/chat-view"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase/client"

async function getContactName(id: string) {
  const { data } = await supabase.from("people").select("full_name").eq("id", id).single()
  return data?.full_name || "Unknown User"
}

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15+: params must be awaited
  const resolvedParams = await params
  const contactName = await getContactName(resolvedParams.id)

  return (
    <div className="relative min-h-dvh bg-[#e8e9e8] dark:bg-[#16241f]">
      <ChatView contactId={resolvedParams.id} contactName={contactName} />
      <BottomNav />
    </div>
  )
}