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
    <motion.nav
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.6, duration: 0.5, ease: "easeOut" }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="glass-button glass-neutral flex items-center gap-1 rounded-full px-2 py-2 shadow-lg">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex flex-col items-center justify-center rounded-full px-4 py-2 transition-all ${
                isActive ? "bg-[#22393c]/10" : "hover:bg-[#22393c]/5"
              }`}
            >
              <item.icon
                className={`size-5 ${isActive ? "text-[#22393c]" : "text-[#668184]"}`}
                strokeWidth={1.8}
              />
              <span
                className={`mt-1 whitespace-nowrap text-[10px] font-medium ${
                  isActive ? "text-[#22393c]" : "text-[#668184]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </motion.nav>
  )
}