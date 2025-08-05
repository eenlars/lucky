import { cleanupStaleRecords } from "@core/utils/cleanup/cleanupStaleRecords"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const stats = await cleanupStaleRecords()

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
      { status: 500 }
    )
  }
}
