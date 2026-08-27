"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Map, Search, FolderGit2, User } from "lucide-react"
import { motion } from "framer-motion"

const navItems = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "My College", href: "/my-college", icon: Map },
  { label: "Search", href: "/discover", icon: Search },
  { label: "Projects", href: "/projects", icon: FolderGit2 },
  { label: "Profile", href: "/profile", icon: User },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-button glass-neutral border-t border-[#22393c]/10 px-2 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:rounded-t-3xl">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-0.5 px-3 py-1">
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  isActive ? "bg-[#22393c] text-white" : "text-[#668184]"
                }`}
              >
                <item.icon className="size-4" strokeWidth={isActive ? 2.2 : 1.8} />
              </motion.div>
              <span className={`text-[9px] font-semibold transition-colors ${isActive ? "text-[#22393c]" : "text-[#668184]"}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}