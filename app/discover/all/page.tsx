// app/discover/all/page.tsx

import { Suspense } from "react"
import DiscoverAllClient from "./discover-all-client"

export const dynamic = "force-dynamic"

export default function DiscoverAllPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          Loading...
        </div>
      }
    >
      <DiscoverAllClient />
    </Suspense>
  )
}