"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import { Loader2, ZoomIn, ZoomOut, Maximize2 } from "lucide-react"
import Link from "next/link"
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force"

import { supabase } from "@/lib/supabase/client"

type Tab = "Projects" | "Skills" | "People" | "All"

type GraphNode = SimulationNodeDatum & {
  id: string
  label: string
  type: "project" | "skill" | "person"
  href?: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
  degree?: number
}

type GraphLink = SimulationLinkDatum<GraphNode> & {
  id: string
  source: string | GraphNode
  target: string | GraphNode
  type: "lineage" | "skill-relation" | "following" | "project-skill"
}

const tabs: Tab[] = ["Projects", "Skills", "People", "All"]

const WIDTH = 1000
const HEIGHT = 650

// Helper to calculate node degrees
function calculateNodeDegrees(nodes: GraphNode[], links: GraphLink[]): Map<string, number> {
  const degreeMap = new Map<string, number>()
  
  nodes.forEach(node => {
    degreeMap.set(node.id, 0)
  })
  
  links.forEach(link => {
    const sourceId = typeof link.source === "string" ? link.source : link.source.id
    const targetId = typeof link.target === "string" ? link.target : link.target.id
    
    degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1)
    degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1)
  })
  
  return degreeMap
}

function getNodeRadius(node: GraphNode, degree: number = 0) {
  const baseSize = node.type === "project" ? 12 : node.type === "skill" ? 9 : 10
  const growth = Math.min(degree * 1.5, 10)
  return baseSize + growth
}

function getNodeColor(type: GraphNode["type"]) {
  if (type === "project") return "#22393c"
  if (type === "skill") return "#8a9a7b"
  return "#c88b6a"
}

function getLinkColor(type: GraphLink["type"]) {
  switch (type) {
    case "lineage": return "#8a9a7b"
    case "skill-relation": return "#9eafa0"
    case "following": return "#c88b6a"
    case "project-skill": return "#a8b6aa"
    default: return "#b5c0bb"
  }
}

function getLinkWidth(type: GraphLink["type"]) {
  switch (type) {
    case "lineage": return 2.4
    case "following": return 1.8
    case "skill-relation": return 1.5
    case "project-skill": return 1.2
    default: return 1.4
  }
}

function getLinkOpacity(type: GraphLink["type"]) {
  switch (type) {
    case "lineage": return 0.72
    case "following": return 0.62
    case "skill-relation": return 0.45
    case "project-skill": return 0.35
    default: return 0.4
  }
}

function getLinkDistance(tab: Tab) {
  switch (tab) {
    case "Projects": return 125
    case "Skills": return 105
    case "People": return 115
    case "All": return 145
    default: return 120
  }
}

function getLinkStrength(tab: Tab) {
  switch (tab) {
    case "Projects": return 0.85
    case "Skills": return 0.5
    case "People": return 0.65
    case "All": return 0.5
    default: return 0.6
  }
}

function getChargeStrength(tab: Tab) {
  switch (tab) {
    case "Projects": return -420
    case "Skills": return -300
    case "People": return -360
    case "All": return -500
    default: return -350
  }
}

function removeDuplicateLinks(links: GraphLink[]): GraphLink[] {
  const seen = new Set<string>()

  return links.filter((link) => {
    const source = typeof link.source === "string" ? link.source : link.source.id
    const target = typeof link.target === "string" ? link.target : link.target.id

    const key =
      link.type === "following"
        ? `${link.type}-${source}-${target}`
        : `${link.type}-${[source, target].sort().join("-")}`

    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function LegendDot({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[#22393c]/10 bg-white/80 px-2.5 py-1.5 backdrop-blur">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      <span className="text-[9px] font-semibold text-[#668184]">{label}</span>
    </div>
  )
}

export function ExploreCampus() {
  const [activeTab, setActiveTab] = useState<Tab>("Projects")
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<GraphLink[]>([])
  const [loading, setLoading] = useState(true)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  
  // Hover state for highlighting connections
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const svgRef = useRef<SVGSVGElement | null>(null)
  const simulationRef = useRef<any>(null)

  const dragRef = useRef<{ node: GraphNode | null; pointerId: number | null }>({
    node: null,
    pointerId: null,
  })

  const panRef = useRef<{
    active: boolean
    pointerId: number | null
    startX: number
    startY: number
    originalX: number
    originalY: number
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originalX: 0,
    originalY: 0,
  })

  useEffect(() => {
    let cancelled = false

    const fetchGraph = async () => {
      setLoading(true)
      try {
        if (activeTab === "Projects") {
          await fetchProjectGraph(cancelled)
        } else if (activeTab === "Skills") {
          await fetchSkillGraph(cancelled)
        } else if (activeTab === "People") {
          await fetchPeopleGraph(cancelled)
        } else {
          await fetchAllGraph(cancelled)
        }
      } catch (error) {
        console.error("Graph fetch error:", error)
        if (!cancelled) {
          setNodes([])
          setLinks([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchGraph()

    return () => {
      cancelled = true
      if (simulationRef.current) simulationRef.current.stop()
    }
  }, [activeTab])

  const fetchProjectGraph = async (cancelled: boolean) => {
    const [{ data: projects }, { data: lineages }] = await Promise.all([
      supabase.from("projects").select("id, title, visibility").eq("visibility", "public"),
      supabase.from("project_lineages").select("id, parent_project_id, child_project_id, relationship_type"),
    ])

    if (cancelled) return

    const projectRows = projects || []
    const lineageRows = lineages || []
    const projectIds = new Set(projectRows.map((p: any) => p.id))

    const graphNodes: GraphNode[] = projectRows.map((project: any) => ({
      id: `project-${project.id}`,
      label: project.title,
      type: "project",
      href: `/projects/${project.id}`,
    }))

    const graphLinks: GraphLink[] = lineageRows
      .filter((lineage: any) => lineage.parent_project_id && lineage.child_project_id && lineage.parent_project_id !== lineage.child_project_id)
      .map((lineage: any) => ({
        id: `lineage-${lineage.id}`,
        source: `project-${lineage.parent_project_id}`,
        target: `project-${lineage.child_project_id}`,
        type: "lineage",
      }))

    setNodes(graphNodes)
    setLinks(removeDuplicateLinks(graphLinks))
  }

  const fetchSkillGraph = async (cancelled: boolean) => {
    const { data: projectSkills, error } = await supabase
      .from("project_skills")
      .select(`project_id, skill_id, skills (id, name)`)

    if (error) throw error
    if (cancelled) return

    const rows = projectSkills || []
    const skillMap = new Map<string, string>()

    rows.forEach((row: any) => {
      if (row.skill_id && row.skills?.name) skillMap.set(row.skill_id, row.skills.name)
    })

    const graphNodes: GraphNode[] = Array.from(skillMap.entries()).map(([id, name]) => ({
      id: `skill-${id}`,
      label: name,
      type: "skill",
    }))

    const skillsByProject = new Map<string, string[]>()
    rows.forEach((row: any) => {
      if (!row.project_id || !row.skill_id) return
      if (!skillsByProject.has(row.project_id)) skillsByProject.set(row.project_id, [])
      skillsByProject.get(row.project_id)!.push(row.skill_id)
    })

    const graphLinks: GraphLink[] = []
    skillsByProject.forEach((skillIds) => {
      const uniqueSkills = [...new Set(skillIds)]
      for (let i = 0; i < uniqueSkills.length; i++) {
        for (let j = i + 1; j < uniqueSkills.length; j++) {
          graphLinks.push({
            id: `skill-relation-${uniqueSkills[i]}-${uniqueSkills[j]}`,
            source: `skill-${uniqueSkills[i]}`,
            target: `skill-${uniqueSkills[j]}`,
            type: "skill-relation",
          })
        }
      }
    })

    setNodes(graphNodes)
    setLinks(removeDuplicateLinks(graphLinks))
  }

  const fetchPeopleGraph = async (cancelled: boolean) => {
    const [{ data: people }, { data: connections }] = await Promise.all([
      supabase.from("people").select("id, full_name"),
      supabase.from("connections").select("id, follower_id, following_id, status"),
    ])

    if (cancelled) return

    const peopleRows = people || []
    const connectionRows = connections || []
    const peopleIds = new Set(peopleRows.map((person: any) => person.id))

    const graphNodes: GraphNode[] = peopleRows.map((person: any) => ({
      id: `person-${person.id}`,
      label: person.full_name || "Unknown",
      type: "person",
      href: `/profile/${person.id}`,
    }))

    const graphLinks: GraphLink[] = connectionRows
      .filter((connection: any) => connection.follower_id && connection.following_id && connection.follower_id !== connection.following_id)
      .filter((connection: any) => {
        return (
          connection.status === "accepted" ||
          connection.status === "connected" ||
          connection.status === "following" ||
          !connection.status
        )
      })
      .map((connection: any) => ({
        id: `following-${connection.id}`,
        source: `person-${connection.follower_id}`,
        target: `person-${connection.following_id}`,
        type: "following",
      }))

    setNodes(graphNodes)
    setLinks(removeDuplicateLinks(graphLinks))
  }

  const fetchAllGraph = async (cancelled: boolean) => {
    const [
      { data: projects },
      { data: lineages },
      { data: projectSkills },
      { data: people },
      { data: connections },
    ] = await Promise.all([
      supabase.from("projects").select("id, title, visibility").eq("visibility", "public"),
      supabase.from("project_lineages").select("id, parent_project_id, child_project_id"),
      supabase.from("project_skills").select(`id, project_id, skill_id, skills (id, name)`),
      supabase.from("people").select("id, full_name"),
      supabase.from("connections").select("id, follower_id, following_id, status"),
    ])

    if (cancelled) return

    const projectRows = projects || []
    const lineageRows = lineages || []
    const skillRows = projectSkills || []
    const peopleRows = people || []
    const connectionRows = connections || []

    const graphNodes: GraphNode[] = []
    const graphLinks: GraphLink[] = []

    const projectIds = new Set(projectRows.map((p: any) => p.id))
    projectRows.forEach((project: any) => {
      graphNodes.push({ id: `project-${project.id}`, label: project.title, type: "project", href: `/projects/${project.id}` })
    })

    const skillIds = new Set<string>()
    skillRows.forEach((row: any) => {
      if (row.skill_id && row.skills?.name && !skillIds.has(row.skill_id)) {
        skillIds.add(row.skill_id)
        graphNodes.push({ id: `skill-${row.skill_id}`, label: row.skills.name, type: "skill" })
      }
    })

    const peopleIds = new Set(peopleRows.map((person: any) => person.id))
    peopleRows.forEach((person: any) => {
      graphNodes.push({ id: `person-${person.id}`, label: person.full_name || "Unknown", type: "person", href: `/profile/${person.id}` })
    })

    lineageRows.forEach((lineage: any) => {
      if (lineage.parent_project_id && lineage.child_project_id) {
        graphLinks.push({ id: `lineage-${lineage.id}`, source: `project-${lineage.parent_project_id}`, target: `project-${lineage.child_project_id}`, type: "lineage" })
      }
    })

    skillRows.forEach((row: any) => {
      if (row.project_id && row.skill_id) {
        graphLinks.push({ id: `project-skill-${row.id || `${row.project_id}-${row.skill_id}`}`, source: `project-${row.project_id}`, target: `skill-${row.skill_id}`, type: "project-skill" })
      }
    })

    connectionRows.forEach((connection: any) => {
      if (connection.follower_id && connection.following_id) {
        graphLinks.push({ id: `following-${connection.id}`, source: `person-${connection.follower_id}`, target: `person-${connection.following_id}`, type: "following" })
      }
    })

    const uniqueNodes = Array.from(new Map(graphNodes.map((node) => [node.id, node])).values())
    const uniqueLinks = removeDuplicateLinks(graphLinks)

    setNodes(uniqueNodes)
    setLinks(uniqueLinks)
  }

  useEffect(() => {
    if (loading || nodes.length === 0) return
    if (simulationRef.current) simulationRef.current.stop()

    const degreeMap = calculateNodeDegrees(nodes, links)

    const simulationNodes = nodes.map((node) => ({
      ...node,
      degree: degreeMap.get(node.id) || 0,
      x: node.x ?? WIDTH / 2 + (Math.random() - 0.5) * 250,
      y: node.y ?? HEIGHT / 2 + (Math.random() - 0.5) * 180,
    }))

    const nodeIds = new Set(simulationNodes.map((node) => node.id))
    const simulationLinks = links
      .filter((link) => {
        const sourceId = typeof link.source === "string" ? link.source : link.source.id
        const targetId = typeof link.target === "string" ? link.target : link.target.id
        return nodeIds.has(sourceId) && nodeIds.has(targetId)
      })
      .map((link) => ({ ...link }))

    const simulation = forceSimulation<GraphNode>(simulationNodes)
      .force("link", forceLink<GraphNode, GraphLink>(simulationLinks).id((d) => d.id).distance(getLinkDistance(activeTab)).strength(getLinkStrength(activeTab)))
      .force("charge", forceManyBody<GraphNode>().strength(getChargeStrength(activeTab)).distanceMax(500))
      .force("center", forceCenter(WIDTH / 2, HEIGHT / 2))
      .force("collision", forceCollide<GraphNode>().radius((d) => getNodeRadius(d, d.degree || 0) + 14).strength(0.9))
      .force("x", forceX<GraphNode>(WIDTH / 2).strength(0.035))
      .force("y", forceY<GraphNode>(HEIGHT / 2).strength(0.035))
      .alpha(1)
      .alphaDecay(0.025)

    simulationRef.current = simulation

    simulation.on("tick", () => {
      setNodes(simulationNodes.map((node) => ({ ...node, x: node.x, y: node.y })))
    })

    return () => {
      simulation.stop()
    }
  }, [loading, activeTab, links])

  // Calculate connected nodes for hover highlighting
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>()
    const connected = new Set<string>()
    connected.add(hoveredNodeId)
    links.forEach(link => {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id
      const targetId = typeof link.target === "string" ? link.target : link.target.id
      if (sourceId === hoveredNodeId) connected.add(targetId)
      if (targetId === hoveredNodeId) connected.add(sourceId)
    })
    return connected
  }, [hoveredNodeId, links])

  const zoomIn = () => setScale((current) => Math.min(2.5, current + 0.15))
  const zoomOut = () => setScale((current) => Math.max(0.45, current - 0.15))
  const resetView = () => { setScale(1); setOffset({ x: 0, y: 0 }) }

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.08 : 0.08
    setScale((current) => Math.min(2.5, Math.max(0.45, current + delta)))
  }

  const handleNodePointerDown = (event: React.PointerEvent, node: GraphNode) => {
    event.stopPropagation()
    dragRef.current = { node, pointerId: event.pointerId }
    if (simulationRef.current) simulationRef.current.alphaTarget(0.3).restart()
    node.fx = node.x
    node.fy = node.y
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }

  const handleNodePointerMove = (event: React.PointerEvent) => {
    const node = dragRef.current.node
    if (!node || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * WIDTH
    const y = ((event.clientY - rect.top) / rect.height) * HEIGHT
    node.fx = WIDTH / 2 + (x - WIDTH / 2) / scale - offset.x
    node.fy = HEIGHT / 2 + (y - HEIGHT / 2) / scale - offset.y
  }

  const handleNodePointerUp = (event: React.PointerEvent) => {
    const node = dragRef.current.node
    if (!node) return
    node.fx = null
    node.fy = null
    if (simulationRef.current) simulationRef.current.alphaTarget(0)
    dragRef.current = { node: null, pointerId: null }
    try {
      ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    } catch {}
  }

  const handlePanStart = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current.node) return
    panRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originalX: offset.x,
      originalY: offset.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePanMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!panRef.current.active) return
    const dx = (event.clientX - panRef.current.startX) / 1.2
    const dy = (event.clientY - panRef.current.startY) / 1.2
    setOffset({ x: panRef.current.originalX + dx, y: panRef.current.originalY + dy })
  }

  const handlePanEnd = (event: React.PointerEvent<SVGSVGElement>) => {
    panRef.current.active = false
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {}
  }

  const visibleLinks = useMemo(() => {
    const ids = new Set(nodes.map((n) => n.id))
    return links.filter((link) => {
      const source = typeof link.source === "string" ? link.source : link.source.id
      const target = typeof link.target === "string" ? link.target : link.target.id
      return ids.has(source) && ids.has(target)
    })
  }, [links, nodes])

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])

  const getNode = (endpoint: string | GraphNode) => {
    const id = typeof endpoint === "string" ? endpoint : endpoint.id
    return nodeMap.get(id)
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#edf0ed] px-4 pb-28 pt-8 text-[#22393c] sm:px-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[10%] top-[5%] h-[400px] w-[400px] rounded-full bg-white/80 blur-3xl" />
        <div className="absolute bottom-[5%] right-[5%] h-[350px] w-[350px] rounded-full bg-[#dce6df]/70 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#668184]">Explore Your Campus</p>
          <div className="mt-1 flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">My College</h1>
              <p className="mt-1 text-xs text-[#668184]">Explore the relationships between projects, skills and people.</p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-[#22393c]">{nodes.length} nodes</p>
              <p className="text-[10px] text-[#668184]">{visibleLinks.length} connections</p>
            </div>
          </div>
        </motion.header>

        <div className="mb-4 flex rounded-full border border-[#22393c]/10 bg-white/65 p-1 shadow-sm backdrop-blur-md">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                if (tab !== activeTab) {
                  setScale(1)
                  setOffset({ x: 0, y: 0 })
                }
                setActiveTab(tab)
              }}
              className={`flex-1 rounded-full px-4 py-2.5 text-xs font-semibold transition-all ${
                activeTab === tab ? "bg-[#22393c] text-white shadow-md" : "text-[#668184] hover:bg-white hover:text-[#22393c]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-[#22393c]/10 bg-[#f7f9f6] shadow-[0_20px_70px_rgba(34,57,60,0.10)]">
          <div className="absolute right-4 top-4 z-30 flex gap-2">
            <button onClick={zoomOut} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#22393c]/10 bg-white/85 text-[#22393c] shadow-sm backdrop-blur hover:bg-white" title="Zoom out">
              <ZoomOut className="size-4" />
            </button>
            <button onClick={zoomIn} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#22393c]/10 bg-white/85 text-[#22393c] shadow-sm backdrop-blur hover:bg-white" title="Zoom in">
              <ZoomIn className="size-4" />
            </button>
            <button onClick={resetView} className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#22393c]/10 bg-white/85 text-[#22393c] shadow-sm backdrop-blur hover:bg-white" title="Reset graph">
              <Maximize2 className="size-4" />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 z-30 flex flex-wrap gap-2">
            <LegendDot label="Projects" className="bg-[#22393c]" />
            {(activeTab === "Skills" || activeTab === "All") && <LegendDot label="Skills" className="bg-[#8a9a7b]" />}
            {(activeTab === "People" || activeTab === "All") && <LegendDot label="People" className="bg-[#c88b6a]" />}
          </div>

          {loading ? (
            <div className="flex h-[620px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-[#668184]" />
                <p className="text-xs text-[#668184]">Mapping your campus...</p>
              </div>
            </div>
          ) : nodes.length === 0 ? (
            <div className="flex h-[620px] items-center justify-center">
              <div className="text-center">
                <p className="text-sm font-semibold">Nothing to visualize yet.</p>
                <p className="mt-1 text-xs text-[#668184]">Add some campus data to build the graph.</p>
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="h-[620px] w-full cursor-grab touch-none select-none active:cursor-grabbing"
              onWheel={handleWheel}
              onPointerDown={handlePanStart}
              onPointerMove={handlePanMove}
              onPointerUp={handlePanEnd}
              onPointerCancel={handlePanEnd}
            >
              <defs>
                <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <marker id="followingArrow" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
                  <path d="M0,0 L7,3.5 L0,7" fill="none" stroke="#c88b6a" strokeWidth="1.2" />
                </marker>
              </defs>

              <g transform={`translate(${WIDTH / 2 + offset.x} ${HEIGHT / 2 + offset.y}) scale(${scale}) translate(${-WIDTH / 2} ${-HEIGHT / 2})`}>
                {visibleLinks.map((link) => {
                  const sourceId = typeof link.source === "string" ? link.source : link.source.id
                  const targetId = typeof link.target === "string" ? link.target : link.target.id
                  const source = getNode(link.source)
                  const target = getNode(link.target)

                  if (!source || !target) return null

                  const x1 = source.x ?? WIDTH / 2
                  const y1 = source.y ?? HEIGHT / 2
                  const x2 = target.x ?? WIDTH / 2
                  const y2 = target.y ?? HEIGHT / 2

                  const isLinkHighlighted = hoveredNodeId && (sourceId === hoveredNodeId || targetId === hoveredNodeId)
                  const linkOpacityVal = hoveredNodeId ? (isLinkHighlighted ? 0.9 : 0.05) : getLinkOpacity(link.type)

                  return (
                    <line
                      key={link.id}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={getLinkColor(link.type)}
                      strokeWidth={getLinkWidth(link.type)}
                      strokeOpacity={linkOpacityVal}
                      strokeDasharray={link.type === "project-skill" ? "4 5" : undefined}
                      markerEnd={link.type === "following" ? "url(#followingArrow)" : undefined}
                      style={{ transition: "stroke-opacity 0.2s ease" }}
                    />
                  )
                })}

                {nodes.map((node) => {
                  const x = node.x ?? WIDTH / 2
                  const y = node.y ?? HEIGHT / 2
                  const degree = node.degree || 0
                  const radius = getNodeRadius(node, degree)

                  const isNodeHighlighted = hoveredNodeId ? connectedNodeIds.has(node.id) : true
                  const isMainHovered = hoveredNodeId === node.id
                  const nodeOpacityVal = isNodeHighlighted ? 1 : 0.1

                  const nodeContent = (
                    <g
                      transform={`translate(${x}, ${y})`}
                      onPointerDown={(event) => handleNodePointerDown(event, node)}
                      onPointerMove={handleNodePointerMove}
                      onPointerUp={handleNodePointerUp}
                      onPointerCancel={handleNodePointerUp}
                      onPointerEnter={() => setHoveredNodeId(node.id)}
                      onPointerLeave={() => setHoveredNodeId(null)}
                      className="cursor-pointer"
                      style={{ opacity: nodeOpacityVal, transition: "opacity 0.2s ease" }}
                    >
                      <circle
                        r={radius + (isMainHovered ? 10 : 6)}
                        fill={getNodeColor(node.type)}
                        opacity={isMainHovered ? 0.2 : 0.08}
                        style={{ transition: "r 0.2s ease, opacity 0.2s ease" }}
                      />
                      <circle
                        r={radius}
                        fill="#f7f9f6"
                        stroke={getNodeColor(node.type)}
                        strokeWidth={isMainHovered ? 3 : node.type === "project" ? 2.5 : 2}
                        filter="url(#nodeGlow)"
                        style={{ transition: "stroke-width 0.2s ease" }}
                      />
                      <circle r={Math.max(3, radius * 0.22)} fill={getNodeColor(node.type)} />
                      <foreignObject x={-75} y={radius + 7} width={150} height={42} pointerEvents="none">
                        <div className="text-center">
                          <p
                            className={`overflow-hidden text-ellipsis whitespace-nowrap text-[10px] font-semibold ${isMainHovered ? "text-[#22393c]" : "text-[#22393c]/80"}`}
                            title={node.label}
                            style={{ transition: "color 0.2s ease" }}
                          >
                            {node.label}
                          </p>
                        </div>
                      </foreignObject>
                    </g>
                  )

                  if (node.href) {
                    return (
                      <Link key={node.id} href={node.href}>
                        {nodeContent}
                      </Link>
                    )
                  }

                  return <g key={node.id}>{nodeContent}</g>
                })}
              </g>
            </svg>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between px-1">
          <div>
            <p className="text-sm font-semibold text-[#22393c]">{activeTab} Network</p>
            <p className="text-[10px] text-[#668184]">Drag nodes · Scroll to zoom · Drag empty space to pan</p>
          </div>
          <p className="text-xs font-medium text-[#668184]">
            <span className="font-bold text-[#22393c]">{nodes.length}</span> nodes ·{" "}
            <span className="font-bold text-[#22393c]">{visibleLinks.length}</span> links
          </p>
        </div>
      </div>
    </main>
  )
}