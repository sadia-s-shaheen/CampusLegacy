import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    // 1. Generate embedding for the search query
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: query,
        model: "text-embedding-3-small",
      }),
    })

    const embeddingData = await embeddingResponse.json()
    const queryEmbedding = embeddingData.data?.[0]?.embedding

    if (!queryEmbedding) {
      return NextResponse.json({ error: "Failed to generate embedding" }, { status: 500 })
    }

    // 2. Search Supabase using the RPC function we created
    const { data: projects, error } = await supabase
      .rpc("match_projects", {
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // Adjust this (0.0 to 1.0) to make results stricter or looser
        match_count: 10,
      })

    if (error) {
      console.error("Supabase search error:", error)
      return NextResponse.json({ error: "Search failed" }, { status: 500 })
    }

    return NextResponse.json({ results: projects || [] })

  } catch (error: any) {
    console.error("Semantic search error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}