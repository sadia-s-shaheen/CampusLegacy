import { RequestsView } from "@/components/requests-view"
import { BottomNav } from "@/components/bottom-nav"

export default function RequestsPage() {
  return (
    <div className="relative min-h-dvh bg-[#e8e9e8]">
      <RequestsView />
      <BottomNav />
    </div>
  )
}