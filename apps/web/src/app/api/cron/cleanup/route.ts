import { ensureCoreInit } from "@/lib/ensure-core-init"
import { createPersistence } from "@lucky/adapter-supabase"
import { cleanupStaleRecords } from "@lucky/core/utils/cleanup/cleanupStaleRecords"
import { NextResponse } from "next/server"

export async function GET() {
  // Ensure core is initialized
  ensureCoreInit()

  try {
    // Auto-detects from USE_MOCK_PERSISTENCE env var, falls back to in-memory if Supabase not configured
    const persistence = createPersistence()
    const stats = await cleanupStaleRecords(persistence)

    return NextResponse.json({
      success: true,
      message: "cleanup completed successfully",
      stats,
    })
  } catch (error) {
    console.error("cleanup cron job failed:", error)

    return NextResponse.json(
      {
        success: false,
        message: "cleanup failed",
        error: error instanceof Error ? error.message : "unknown error",
      },
      { status: 500 },
    )
  }
}
