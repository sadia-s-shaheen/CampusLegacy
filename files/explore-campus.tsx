"use client"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Loader2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { generateCirclePositions } from "@/lib/utils/graph-positions"

const tabs = ["Projects", "Skills", "People"]

export function ExploreCampus() {
  const [activeTab, setActiveTab] = useState("Projects")
  const [nodes, setNodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        let data: any[] = []
        if (activeTab === "Projects") {
          const { data: res } = await supabase.from("projects").select("id, title").eq("visibility", "public").limit(7)
          data = res?.map((r: any) => ({ ...r, label: r.title, href: `/projects/${r.id}` })) || []
        } else if (activeTab === "Skills") {
          const { data: res } = await supabase.from("skills").select("name").limit(7)
          data = res?.map((r: any) => ({ id: r.name, label: r.name, href: null })) || []
        } else {
          const { data: res } = await supabase.from("people").select("id, full_name").limit(7)
          data = res?.map((r: any) => ({ ...r, label: r.full_name, href: `/profile/${r.id}` })) || []
        }

        // Positions are now derived from index, not Math.random() — nodes
        // used to visibly jump to new spots every time this ran.
        const positions = generateCirclePositions(data.length)
        const formattedNodes = data.map((item, index) => ({
          ...item,
          x: positions[index].x,
          y: positions[index].y,
          active: index === 0,
        }))
        setNodes(formattedNodes)
      } catch (error) {
        console.error("Error fetching graph data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeTab])

  const centerNode = nodes.find((n) => n.active) || nodes[0]

  return (
    <main className="relative min-h-dvh bg-[#e8e9e8] px-5 pb-32 pt-10 text-[#22393c] sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,.9),transparent_34%),radial-gradient(circle_at_88%_75%,rgba(196,213,211,.55),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-md">
        <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#668184]">Explore Your Campus</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">My College</h1>
        </motion.header>

        <div className="glass-button glass-neutral mb-6 flex items-center rounded-full p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                activeTab === tab ? "glass-ink text-white shadow-sm" : "text-[#668184] hover:text-[#22393c]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-[400px] items-center justify-center rounded-3xl glass-button glass-aqua">
            <Loader2 className="size-8 animate-spin text-[#668184]" />
          </div>
        ) : (
          <motion.div layout className="glass-button glass-aqua relative h-[400px] w-full overflow-hidden rounded-3xl">
            <svg className="absolute inset-0 h-full w-full pointer-events-none">
              {nodes.map((node) => (
                <line
                  key={`line-${node.id}`}
                  x1={`${centerNode?.x}%`}
                  y1={`${centerNode?.y}%`}
                  x2={`${node.x}%`}
                  y2={`${node.y}%`}
                  stroke="#8a9a7b"
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                />
              ))}
            </svg>

            <AnimatePresence mode="popLayout">
              {nodes.map((node) => {
                const content = (
                  <motion.div
                    key={`${activeTab}-${node.id}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 ${node.href ? "cursor-pointer" : ""}`}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  >
                    <div
                      className={`flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition-transform hover:scale-110 ${
                        node.active ? "glass-button glass-ink text-white" : "glass-button glass-neutral text-[#22393c]"
                      }`}
                    >
                      {node.label}
                    </div>
                  </motion.div>
                )

                if (node.href) {
                  return <Link key={`link-${node.id}`} href={node.href}>{content}</Link>
                }
                return content
              })}
            </AnimatePresence>

            <button className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#22393c] text-white shadow-lg transition-transform hover:scale-105">
              <Plus className="size-5" strokeWidth={2} />
            </button>
          </motion.div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-medium text-[#668184]">
            <span className="font-bold text-[#22393c]">{nodes.length}</span> {activeTab.toLowerCase()}
          </p>
          <button className="text-xs font-semibold uppercase tracking-wider text-[#8a9a7b]">View All</button>
        </div>
      </div>
    </main>
  )
}
