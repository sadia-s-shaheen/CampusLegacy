import { ProfileView } from "@/components/profile-view"
import { BottomNav } from "@/components/bottom-nav"

export default function ProfilePage() {
  return (
    <div className="relative min-h-dvh bg-[#e8e9e8]">
      <ProfileView />
      <BottomNav />
    </div>
  )
}