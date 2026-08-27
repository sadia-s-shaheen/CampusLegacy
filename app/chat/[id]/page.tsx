import { ChatView } from "@/components/chat-view"
import { BottomNav } from "@/components/bottom-nav"
import { supabase } from "@/lib/supabase/client"

async function getContactName(id: string) {
  // 1. Try to fetch from the 'people' table
  const { data: person } = await supabase
    .from("people")
    .select("full_name, email")
    .eq("id", id)
    .single()

  // If we found a name, return it
  if (person?.full_name) return person.full_name
  
  // If we found an email but no name, return the part before the '@'
  if (person?.email) return person.email.split("@")[0]

  // 2. Fallback if they aren't in the people table at all
  return `User (${id.substring(0, 6)}...)`
}

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15 requires awaiting params
  const resolvedParams = await params
  
  const contactName = await getContactName(resolvedParams.id)

  return (
    <div className="relative min-h-dvh bg-[#e8e9e8]">
      <ChatView contactId={resolvedParams.id} contactName={contactName} />
      <BottomNav />
    </div>
  )
}