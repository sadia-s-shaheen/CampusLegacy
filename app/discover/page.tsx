export const dynamic = 'force-dynamic'


import { DiscoverView } from "@/components/discover-view"
import { BottomNav } from "@/components/bottom-nav"

export default function DiscoverPage() {
  return (
    <div className="relative min-h-dvh bg-[#e8e9e8]">
      <DiscoverView />
      <BottomNav />
    </div>
  )
}