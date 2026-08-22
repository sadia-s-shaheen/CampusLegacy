import { ProjectDetailsView } from "@/components/project-details-view"

type ProjectPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function ProjectPage({
  params,
}: ProjectPageProps) {
  const { id } = await params

  return <ProjectDetailsView projectId={id} />
}