import { UserProfileView } from "@/components/user-profile-view"
import { BottomNav } from "@/components/bottom-nav"

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  return (
    <div className="relative min-h-dvh bg-[#e8e9e8]">
      <UserProfileView userId={resolvedParams.id} />
      <BottomNav />
    </div>
  )
}