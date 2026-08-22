import { ProjectsView } from "@/components/projects-view"
import { BottomNav } from "@/components/bottom-nav"

export default function ProjectsPage() {
  return (
    <div className="relative min-h-dvh bg-[#e8e9e8]">
      <ProjectsView />
      <BottomNav />
    </div>
  )
}