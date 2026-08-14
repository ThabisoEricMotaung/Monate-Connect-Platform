import {
  IconBook,
  IconBriefcase,
  IconCheckCircle,
  IconGavel,
  IconTrendingUp,
  IconUsers,
  IconArrowRight,
} from "@tabler/icons-react"
import Link from "next/link"

export const metadata = {
  title: "Insights - AiForm Procure | Procurement Guides & Compliance Articles",
  description: "Expert guides on RFQs, government tenders, B-BBEE verification, and supplier best practices for South African procurement.",
  keywords: "procurement, RFQ, government tenders, B-BBEE, compliance, supplier guides, South Africa",
  openGraph: {
    title: "Insights - AiForm Procure",
    description: "Expert procurement guides and compliance articles for South Africa",
    url: "https://aiformprocure.co.za/insights",
  },
}

const categories = [
  {
    id: "buyer-guides",
    title: "Buyer Guides",
    description: "Master the art of procurement. Learn how to write effective RFQs, evaluate suppliers, and negotiate deals.",
    icon: IconBriefcase,
    color: "bg-blue-50",
    borderColor: "border-blue-200",
    href: "/insights/buyer-guides",
    articles: 1,
  },
  {
    id: "compliance-deep-dives",
    title: "Compliance Deep-Dives",
    description: "Navigate B-BBEE, tax clearance, and other compliance requirements. Stay ahead of regulatory changes.",
    icon: IconGavel,
    color: "bg-purple-50",
    borderColor: "border-purple-200",
    href: "/insights/compliance-deep-dives",
    articles: 1,
  },
  {
    id: "supplier-tips",
    title: "Supplier Tips",
    description: "Win more contracts. Learn how to respond to tenders, build credibility, and grow your government client base.",
    icon: IconTrendingUp,
    color: "bg-green-50",
    borderColor: "border-green-200",
    href: "/insights/supplier-tips",
    articles: 1,
  },
  {
    id: "industry-news",
    title: "Industry News",
    description: "Stay informed on procurement policy changes, government tenders, and market trends affecting your sector.",
    icon: IconBook,
    color: "bg-amber-50",
    borderColor: "border-amber-200",
    href: "/insights/industry-news",
    articles: 0,
  },
  {
    id: "case-studies",
    title: "Case Studies",
    description: "Real stories from buyers and suppliers. See how AiForm helped businesses win contracts and streamline procurement.",
    icon: IconCheckCircle,
    color: "bg-emerald-50",
    borderColor: "border-emerald-200",
    href: "/insights/case-studies",
    articles: 0,
  },
  {
    id: "video-guides",
    title: "Video Guides",
    description: "Learn by watching. Short, practical videos on procurement processes, compliance, and best practices.",
    icon: IconUsers,
    color: "bg-rose-50",
    borderColor: "border-rose-200",
    href: "/insights/video-guides",
    articles: 0,
  },
]

export default function InsightsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
            Procurement Expertise
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 leading-tight">
            Learn Procurement Best Practices
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Expert guides on RFQs, government tenders, compliance, and supplier strategies. Master the procurement landscape in South Africa.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/insights/buyer-guides"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              Browse Buyer Guides <IconArrowRight size={18} />
            </Link>
            <Link
              href="/insights/supplier-tips"
              className="px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-semibold hover:bg-slate-300 transition-colors inline-flex items-center gap-2"
            >
              Supplier Resources <IconArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-16 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-12 text-center">
            Explore Our Insights
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <Link
                  key={category.id}
                  href={category.href}
                  className={`${category.color} ${category.borderColor} border-2 rounded-xl p-6 transition-all hover:shadow-lg hover:-translate-y-1 group cursor-pointer`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <Icon className="text-slate-700" size={32} />
                    {category.articles > 0 && (
                      <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full font-semibold">
                        {category.articles} article{category.articles !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {category.title}
                  </h3>
                  <p className="text-slate-700 text-sm leading-relaxed mb-4">
                    {category.description}
                  </p>
                  <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm group-hover:gap-3 transition-all">
                    Learn more <IconArrowRight size={16} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 md:px-8 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Need Expert Help?
          </h2>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl mx-auto">
            Our procurement experts are ready to help you navigate compliance, win tenders, and streamline your supply chain.
          </p>
          <Link
            href="/contact"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            Contact Our Team <IconArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Breadcrumb */}
      <nav className="py-4 px-4 md:px-8 border-t border-slate-200">
        <div className="max-w-6xl mx-auto flex gap-2 text-sm">
          <Link href="/" className="text-blue-600 hover:underline">
            Home
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600">Insights</span>
        </div>
      </nav>
    </main>
  )
}
