'use client'

import { useParams } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft, IconClock, IconUser, IconShare2, IconArrowRight } from "@tabler/icons-react"
import { useEffect, useState } from "react"

// Article metadata mapping
const articleMetadata: Record<string, Record<string, { title: string; author: string; date: string; readTime: string }>> = {
  "buyer-guides": {
    "how-to-write-rfq": {
      title: "How to Write an RFQ That Attracts Quality Responses",
      author: "AiForm Procurement Team",
      date: "14 August 2026",
      readTime: "8 minutes",
    },
  },
  "compliance-deep-dives": {
    "bbbee-verification": {
      title: "B-BBEE Verification for Procurement",
      author: "AiForm Compliance Team",
      date: "16 August 2026",
      readTime: "9 minutes",
    },
  },
  "supplier-tips": {
    "government-tenders": {
      title: "How to Respond to Government Tenders",
      author: "AiForm Procurement Expert",
      date: "21 August 2026",
      readTime: "10 minutes",
    },
  },
}

const categoryLabels: Record<string, string> = {
  "buyer-guides": "Buyer Guides",
  "compliance-deep-dives": "Compliance Deep-Dives",
  "supplier-tips": "Supplier Tips",
}

// Simple markdown to HTML converter
function parseMarkdown(content: string): string {
  let html = content

  // Headings
  html = html.replace(/^### (.*?)$/gm, '<h3 class="text-xl font-bold text-slate-900 mt-8 mb-4">$1</h3>')
  html = html.replace(/^## (.*?)$/gm, '<h2 class="text-2xl font-bold text-slate-900 mt-10 mb-6">$1</h2>')
  html = html.replace(/^# (.*?)$/gm, '<h1 class="text-4xl font-bold text-slate-900 mb-6">$1</h1>')

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>')

  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline">$1</a>')

  // Code blocks (backticks)
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-100 px-2 py-1 rounded font-mono text-sm">$1</code>')

  // Code blocks (triple backticks)
  html = html.replace(/```([^`]*?)```/g, '<pre class="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto my-4"><code>$1</code></pre>')

  // Lists (unordered)
  html = html.replace(/^\- (.*?)$/gm, '<li class="ml-4">$1</li>')
  html = html.replace(/(<li.*?<\/li>)/s, '<ul class="list-disc space-y-2 my-4">$1</ul>')

  // Lists (ordered)
  html = html.replace(/^\d+\. (.*?)$/gm, '<li class="ml-4">$1</li>')

  // Tables (simple)
  html = html.replace(/\| (.*?) \|/g, '<td class="px-4 py-2 border border-slate-200">$1</td>')

  // Blockquotes
  html = html.replace(/^> (.*?)$/gm, '<blockquote class="border-l-4 border-blue-500 pl-4 italic text-slate-700 my-4">$1</blockquote>')

  // Line breaks
  html = html.replace(/\n\n/g, '</p><p class="mb-4">')

  // Wrap in paragraphs
  html = `<p class="mb-4 text-slate-700 leading-relaxed">${html}</p>`

  return html
}

export default function ArticlePage() {
  const params = useParams()
  const category = params.category as string
  const slug = params.slug as string

  const metadata = articleMetadata[category]?.[slug]
  const categoryLabel = categoryLabels[category] || category

  const [content, setContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadArticle = async () => {
      try {
        const response = await fetch(`/api/articles/${category}/${slug}`)
        if (response.ok) {
          const data = await response.json()
          setContent(data.content)
        } else {
          setContent("<p class='text-red-600'>Article not found. Please check the URL and try again.</p>")
        }
      } catch (error) {
        console.error("Error loading article:", error)
        setContent("<p class='text-red-600'>Error loading article. Please try again later.</p>")
      } finally {
        setIsLoading(false)
      }
    }

    loadArticle()
  }, [category, slug])

  if (!metadata) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto py-16 px-4">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-red-900 mb-4">Article Not Found</h1>
            <p className="text-red-700 mb-6">The article you're looking for doesn't exist.</p>
            <Link
              href="/insights"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Back to Insights <IconArrowRight size={18} />
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Breadcrumb */}
      <nav className="py-4 px-4 md:px-8 border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex gap-2 text-sm">
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
          <span className="text-slate-400">/</span>
          <Link href="/insights" className="text-blue-600 hover:underline">
            Insights
          </Link>
          <span className="text-slate-400">/</span>
          <Link href={`/insights/${category}`} className="text-blue-600 hover:underline capitalize">
            {category.replace("-", " ")}
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600 capitalize">{slug.replace("-", " ")}</span>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto py-12 px-4 md:px-8">
        {/* Article Header */}
        <div className="mb-12 border-b border-slate-200 pb-8">
          <Link
            href={`/insights/${category}`}
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6 group"
          >
            <IconArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to {categoryLabel}
          </Link>

          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
            {metadata.title}
          </h1>

          <div className="flex flex-wrap gap-6 text-slate-600 mb-6">
            <div className="flex items-center gap-2">
              <IconUser size={18} />
              <span>{metadata.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <IconClock size={18} />
              <span>{metadata.readTime}</span>
            </div>
            <div className="text-sm">{metadata.date}</div>
          </div>

          <div className="flex gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors">
              <IconShare2 size={18} />
              Share
            </button>
          </div>
        </div>

        {/* Article Content */}
        <div className="prose prose-slate max-w-none mb-16">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-full mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              </div>
            </div>
          ) : (
            <div className="article-content space-y-4 text-slate-700 leading-relaxed">
              {content.split("\n\n").map((paragraph, i) => {
                if (paragraph.startsWith("#")) {
                  // Handle headings
                  const level = paragraph.match(/^#+/)?.[0].length || 1
                  const text = paragraph.replace(/^#+\s/, "")
                  const headingClasses =
                    level === 2
                      ? "text-2xl font-bold text-slate-900 mt-8 mb-4"
                      : level === 3
                        ? "text-xl font-bold text-slate-900 mt-6 mb-3"
                        : "text-4xl font-bold text-slate-900 mb-6"
                  const HeadingTag = (`h${level}` as any) as React.ElementType
                  return (
                    <HeadingTag key={i} className={headingClasses}>
                      {text}
                    </HeadingTag>
                  )
                }
                if (paragraph.startsWith("|")) {
                  // Handle tables
                  return (
                    <div key={i} className="overflow-x-auto my-6">
                      <table className="w-full border-collapse border border-slate-300">
                        <tbody>
                          {paragraph.split("\n").map((row, ri) => (
                            <tr key={ri} className="border border-slate-300">
                              {row.split("|").map((cell, ci) => (
                                <td
                                  key={ci}
                                  className="px-4 py-2 border border-slate-300 text-sm"
                                >
                                  {cell.trim()}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
                if (paragraph.startsWith(">")) {
                  return (
                    <blockquote
                      key={i}
                      className="border-l-4 border-blue-500 pl-4 italic text-slate-700 my-4"
                    >
                      {paragraph.replace(/^>\s/, "")}
                    </blockquote>
                  )
                }
                if (paragraph.startsWith("- ") || paragraph.match(/^\d+\./)) {
                  // Handle lists
                  const items = paragraph.split("\n").filter((l) => l.trim())
                  return (
                    <ul key={i} className="list-disc pl-6 space-y-2 my-4">
                      {items.map((item, li) => (
                        <li key={li}>{item.replace(/^[-\d+.]\s/, "").trim()}</li>
                      ))}
                    </ul>
                  )
                }
                return (
                  <p key={i} className="mb-4 text-slate-700 leading-relaxed">
                    {paragraph.split("**").map((part, idx) =>
                      idx % 2 === 1 ? (
                        <strong key={idx}>{part}</strong>
                      ) : (
                        part.split("*").map((subpart, subidx) =>
                          subidx % 2 === 1 ? (
                            <em key={subidx}>{subpart}</em>
                          ) : (
                            subpart.split("[").map((link, lidx) => {
                              if (lidx === 0) return link
                              const [text, href] = link.split("](")
                              if (!href) return link
                              const [url] = href.split(")")
                              return (
                                <span key={lidx}>
                                  <a
                                    href={url}
                                    className="text-blue-600 hover:underline"
                                    target={url.startsWith("http") ? "_blank" : undefined}
                                    rel={url.startsWith("http") ? "noopener noreferrer" : undefined}
                                  >
                                    {text}
                                  </a>
                                  {href.substring(url.length + 1)}
                                </span>
                              )
                            })
                          ),
                        ),
                      ),
                    )}
                  </p>
                )
              })}
            </div>
          )}
        </div>

        {/* Related Articles */}
        <section className="border-t border-slate-200 pt-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            Related Articles
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {category === "buyer-guides" && (
              <>
                <Link
                  href="/insights/compliance-deep-dives/bbbee-verification"
                  className="bg-white border-2 border-slate-200 rounded-lg p-6 hover:border-purple-400 hover:shadow-lg transition-all group"
                >
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors line-clamp-2">
                    B-BBEE Verification for Procurement
                  </h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    Navigate B-BBEE scoring and compliance requirements.
                  </p>
                  <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm">
                    Read <IconArrowRight size={16} />
                  </div>
                </Link>
                <Link
                  href="/insights/supplier-tips/government-tenders"
                  className="bg-white border-2 border-slate-200 rounded-lg p-6 hover:border-green-400 hover:shadow-lg transition-all group"
                >
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-green-600 transition-colors line-clamp-2">
                    How to Respond to Government Tenders
                  </h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    Win government contracts with proven strategies.
                  </p>
                  <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                    Read <IconArrowRight size={16} />
                  </div>
                </Link>
              </>
            )}
            {category === "compliance-deep-dives" && (
              <>
                <Link
                  href="/insights/buyer-guides/how-to-write-rfq"
                  className="bg-white border-2 border-slate-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-lg transition-all group"
                >
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                    How to Write an RFQ That Attracts Quality Responses
                  </h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    Master the anatomy of an effective RFQ.
                  </p>
                  <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                    Read <IconArrowRight size={16} />
                  </div>
                </Link>
                <Link
                  href="/insights/supplier-tips/government-tenders"
                  className="bg-white border-2 border-slate-200 rounded-lg p-6 hover:border-green-400 hover:shadow-lg transition-all group"
                >
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-green-600 transition-colors line-clamp-2">
                    How to Respond to Government Tenders
                  </h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    Win government contracts with proven strategies.
                  </p>
                  <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                    Read <IconArrowRight size={16} />
                  </div>
                </Link>
              </>
            )}
            {category === "supplier-tips" && (
              <>
                <Link
                  href="/insights/buyer-guides/how-to-write-rfq"
                  className="bg-white border-2 border-slate-200 rounded-lg p-6 hover:border-blue-400 hover:shadow-lg transition-all group"
                >
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                    How to Write an RFQ That Attracts Quality Responses
                  </h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    Master the anatomy of an effective RFQ.
                  </p>
                  <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                    Read <IconArrowRight size={16} />
                  </div>
                </Link>
                <Link
                  href="/insights/compliance-deep-dives/bbbee-verification"
                  className="bg-white border-2 border-slate-200 rounded-lg p-6 hover:border-purple-400 hover:shadow-lg transition-all group"
                >
                  <h3 className="font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors line-clamp-2">
                    B-BBEE Verification for Procurement
                  </h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                    Navigate B-BBEE scoring and compliance requirements.
                  </p>
                  <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm">
                    Read <IconArrowRight size={16} />
                  </div>
                </Link>
              </>
            )}
          </div>
        </section>
      </article>
    </main>
  )
}
