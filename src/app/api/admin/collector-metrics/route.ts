import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get("days") || "7", 10)

    // Fetch metrics from the last N days
    const { data, error } = await supabase
      .from("collector_metrics")
      .select("*")
      .gte("created_at", new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Failed to fetch collector metrics:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    interface SourceSummary {
      imported: number
      rejected: number
      incomplete: number
      runs: number
      lastRun: string | null
      status: string
    }

    // Calculate summary stats
    const summary = {
      totalRuns: data?.length || 0,
      successfulRuns: data?.filter((m) => m.status === "success").length || 0,
      failedRuns: data?.filter((m) => m.status === "failed").length || 0,
      totalImported: data?.reduce((sum, m) => sum + (m.imported || 0), 0) || 0,
      totalRejected: data?.reduce((sum, m) => sum + (m.rejected || 0), 0) || 0,
      totalIncomplete: data?.reduce((sum, m) => sum + (m.incomplete || 0), 0) || 0,
      bySource: {} as Record<string, SourceSummary>,
    }

    // Group by source
    data?.forEach((metric) => {
      if (!summary.bySource[metric.source_name]) {
        summary.bySource[metric.source_name] = {
          imported: 0,
          rejected: 0,
          incomplete: 0,
          runs: 0,
          lastRun: null,
          status: "unknown",
        }
      }
      summary.bySource[metric.source_name].imported += metric.imported || 0
      summary.bySource[metric.source_name].rejected += metric.rejected || 0
      summary.bySource[metric.source_name].incomplete += metric.incomplete || 0
      summary.bySource[metric.source_name].runs += 1
      summary.bySource[metric.source_name].lastRun = metric.created_at
      summary.bySource[metric.source_name].status = metric.status
    })

    return NextResponse.json({
      summary,
      metrics: data || [],
      days,
    })
  } catch (error) {
    console.error("Collector metrics endpoint error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
