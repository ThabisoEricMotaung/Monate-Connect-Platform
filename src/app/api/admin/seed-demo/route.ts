import { generateDemoData } from "@/lib/demoSeed"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    await generateDemoData()
    return NextResponse.json({
      success: true,
      message: "Demo data seeded successfully",
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    )
  }
}
