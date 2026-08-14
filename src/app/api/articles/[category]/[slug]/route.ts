import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { promises as fs } from "fs"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string; slug: string }> }
) {
  try {
    const { category, slug } = await params

    // Construct the file path
    const filePath = path.join(
      process.cwd(),
      "src/content/insights",
      category,
      `${slug}.md`
    )

    // Read the markdown file
    const content = await fs.readFile(filePath, "utf-8")

    // Return the content
    const markdownContent = content

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
