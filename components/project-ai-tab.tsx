"use client"
import { motion } from "framer-motion"
import { Award, Brain, Sparkles, TrendingUp, Zap } from "lucide-react"

type ProjectAITabProps = {
  projectId: string
  recommendedTeammates: any[]
  onShowAIExtensions: () => void
}

export function ProjectAITab({ projectId, recommendedTeammates, onShowAIExtensions }: ProjectAITabProps) {
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="size-5 text-[#8a9a7b]" />
          <h3 className="text-lg font-semibold">AI Recommendations</h3>
        </div>
        <button onClick={onShowAIExtensions} className="flex items-center gap-2 rounded-full bg-[#8a9a7b] px-4 py-2 text-xs font-semibold text-white">
          <Sparkles className="size-4" /> View All
        </button>
      </div>

      <div className="space-y-3">
        <div className="glass-button glass-aqua rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <TrendingUp className="mt-1 size-5 shrink-0 text-[#8a9a7b]" />
            <div>
              <h4 className="mb-1 text-sm font-bold">Skill Gap Analysis</h4>
              <p className="text-xs text-[#22393c]/80">
                {recommendedTeammates.length > 0
                  ? `${recommendedTeammates.length} teammate${recommendedTeammates.length > 1 ? "s" : ""} could fill your team's missing skills — see the Overview tab.`
                  : "Your team currently covers every required skill."}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-button glass-lilac rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <Zap className="mt-1 size-5 shrink-0 text-[#8a9a7b]" />
            <div>
              <h4 className="mb-1 text-sm font-bold">Project Insights</h4>
              <p className="text-xs text-[#22393c]/80">Project velocity and progress insights can be generated from project activity.</p>
            </div>
          </div>
        </div>

        <div className="glass-button glass-peach rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <Award className="mt-1 size-5 shrink-0 text-[#8a9a7b]" />
            <div className="flex-1">
              <h4 className="mb-1 text-sm font-bold">Potential Extensions</h4>
              <p className="text-xs text-[#22393c]/80">Continue this work as a child project from the Overview tab's lineage section.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}