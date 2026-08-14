import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"

export async function GET(
  request: NextRequest,
  { params }: { params: { category: string; slug: string } }
) {
  try {
    const { category, slug } = params

    // Construct the file path
    const filePath = path.join(
      process.cwd(),
      "src/content/insights",
      category,
      `${slug}.md`
    )

    // Read the markdown file
    const content = await fs.readFile(filePath, "utf-8")

    // Extract metadata from the front of the file (after the # heading)
    const lines = content.split("\n")
    let markdownContent = content

    // Return the content
    return NextResponse.json({
      content: markdownContent,
      category,
      slug,
    })
  } catch (error) {
    console.error("Error reading article:", error)
    return NextResponse.json(
      { error: "Article not found" },
      { status: 404 }
    )
  }
}
