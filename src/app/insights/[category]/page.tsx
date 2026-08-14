'use client'

import { useParams } from "next/navigation"
import Link from "next/link"
import { IconArrowLeft, IconClock, IconUser, IconArrowRight } from "@tabler/icons-react"
import fs from "fs"
import path from "path"

// Article metadata mapping
const articleMetadata: Record<string, Record<string, { title: string; description: string; author: string; date: string; readTime: string }>> = {
  "buyer-guides": {
    "how-to-write-rfq": {
      title: "How to Write an RFQ That Attracts Quality Responses",
      description: "Master the anatomy of an effective RFQ with this comprehensive guide. Learn structure, language, requirements, and evaluation criteria.",
      author: "AiForm Procurement Team",
      date: "14 August 2026",
      readTime: "8 minutes",
    },
  },
  "compliance-deep-dives": {
    "bbbee-verification": {
      title: "B-BBEE Verification for Procurement",
      description: "Navigate B-BBEE scoring, verification process, and compliance requirements for South African government and private sector procurement.",
      author: "AiForm Compliance Team",
      date: "16 August 2026",
      readTime: "9 minutes",
    },
  },
  "supplier-tips": {
    "government-tenders": {
      title: "How to Respond to Government Tenders",
      description: "Win government contracts. Learn the legal framework, compliance requirements, bid strategy, and common mistakes to avoid.",
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
  "industry-news": "Industry News",
  "case-studies": "Case Studies",
  "video-guides": "Video Guides",
}

const categoryDescriptions: Record<string, string> = {
  "buyer-guides": "Master the art of procurement. Learn how to write effective RFQs, evaluate suppliers, and negotiate deals.",
  "compliance-deep-dives": "Navigate B-BBEE, tax clearance, and other compliance requirements. Stay ahead of regulatory changes.",
  "supplier-tips": "Win more contracts. Learn how to respond to tenders, build credibility, and grow your government client base.",
  "industry-news": "Stay informed on procurement policy changes, government tenders, and market trends affecting your sector.",
  "case-studies": "Real stories from buyers and suppliers. See how AiForm helped businesses win contracts and streamline procurement.",
  "video-guides": "Learn by watching. Short, practical videos on procurement processes, compliance, and best practices.",
}

export default function CategoryPage() {
  const params = useParams()
  const category = params.category as string

  const categoryLabel = categoryLabels[category] || category
  const categoryDescription = categoryDescriptions[category] || ""
  const articles = articleMetadata[category] || {}

  const articleList = Object.entries(articles).map(([slug, metadata]) => ({
    slug,
    ...metadata,
  }))

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Breadcrumb */}
      <nav className="py-4 px-4 md:px-8 border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex gap-2 text-sm">
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
          <span className="text-slate-400">/</span>
          <Link href="/insights" className="text-blue-600 hover:underline">
            Insights
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600 capitalize">{category.replace("-", " ")}</span>
        </div>
      </nav>

      {/* Header */}
      <section className="py-16 md:py-20 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/insights"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6 group"
          >
            <IconArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Insights
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
            {categoryLabel}
          </h1>
          <p className="text-lg text-slate-600 mb-8">
            {categoryDescription}
          </p>
          {articleList.length > 0 && (
            <div className="text-sm text-slate-500">
              {articleList.length} article{articleList.length !== 1 ? "s" : ""} in this category
            </div>
          )}
        </div>
      </section>

      {/* Articles List */}
      <section className="py-12 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {articleList.length > 0 ? (
            <div className="space-y-6">
              {articleList.map((article) => (
                <Link
                  key={article.slug}
                  href={`/insights/${category}/${article.slug}`}
                  className="block bg-white border-2 border-slate-200 rounded-xl p-6 md:p-8 hover:border-blue-400 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {article.title}
                      </h2>
                      <p className="text-slate-600 mb-4">
                        {article.description}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <IconUser size={16} />
                          {article.author}
                        </div>
                        <div className="flex items-center gap-1">
                          <IconClock size={16} />
                          {article.readTime}
                        </div>
                        <div>{article.date}</div>
                      </div>
                    </div>
                    <div className="hidden md:flex text-blue-600 group-hover:text-blue-700">
                      <IconArrowRight size={24} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-600 text-lg mb-6">
                No articles in this category yet.
              </p>
              <Link
                href="/insights"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Back to All Insights <IconArrowRight size={18} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Related Categories */}
      {articleList.length > 0 && (
        <section className="py-16 px-4 md:px-8 bg-slate-50 border-t border-slate-200">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-8">
              More to Explore
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Link
                href="/insights/compliance-deep-dives"
                className="bg-white border-2 border-slate-200 rounded-lg p-6 hover:border-purple-400 hover:shadow-lg transition-all group"
              >
                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-purple-600 transition-colors">
                  Compliance Deep-Dives
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Navigate B-BBEE, tax clearance, and compliance requirements.
                </p>
                <div className="flex items-center gap-2 text-purple-600 font-semibold text-sm">
                  Explore <IconArrowRight size={16} />
                </div>
              </Link>
              <Link
                href="/insights/supplier-tips"
                className="bg-white border-2 border-slate-200 rounded-lg p-6 hover:border-green-400 hover:shadow-lg transition-all group"
              >
                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-green-600 transition-colors">
                  Supplier Tips
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Win more contracts with proven procurement strategies.
                </p>
                <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                  Explore <IconArrowRight size={16} />
                </div>
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
