import { DashboardView } from "@/components/dashboard-view"
import { BottomNav } from "@/components/bottom-nav"

export default function DashboardPage() {
  return (
    <div className="relative min-h-dvh bg-[#e8e9e8]">
      <DashboardView />
      <BottomNav />
    </div>
  )
}