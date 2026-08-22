import { ExploreCampus } from "@/components/explore-campus"
import { BottomNav } from "@/components/bottom-nav"

export default function MyCollegePage() {
  return (
    <div className="relative min-h-dvh bg-[#e8e9e8]">
      <ExploreCampus />
      <BottomNav />
    </div>
  )
}