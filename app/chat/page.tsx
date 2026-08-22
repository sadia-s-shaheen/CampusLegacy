import { redirect } from "next/navigation"

export default function ChatPage() {
  // Redirect to dashboard if no specific chat is selected
  redirect("/dashboard")
}