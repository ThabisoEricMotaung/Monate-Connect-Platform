"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import PublicFooter from "@/components/PublicFooter"
import PublicHeader from "@/components/PublicHeader"

const checklistSections = [
  {
    title: "First Impression",
    task: "Open the public entry page and note whether the purpose of Monate Connect is immediately clear.",
    expected: "You can quickly identify how to login, register, explore the demo, or browse public information.",
    href: "/",
  },
  {
    title: "Supplier Registration",
    task: "Review the supplier registration flow and check whether the required fields feel understandable.",
    expected: "A new supplier can start registration without needing extra explanation.",
    href: "/auth/signup",
  },
  {
    title: "Login",
    task: "Test the login page and confirm the route feels clear for suppliers, admins, and buyers.",
    expected: "Login communicates what happens next and routes users into the correct workspace.",
    href: "/auth/login",
  },
  {
    title: "RFQ Browsing",
    task: "Browse available opportunities and inspect how RFQs are presented.",
    expected: "RFQ title, category, province, deadline, and next steps are easy to understand.",
    href: "/opportunities",
  },
  {
    title: "Quote Submission",
    task: "Open an RFQ and review the quote submission path, including required context and supporting information.",
    expected: "A supplier can tell what they need before submitting a quote.",
    href: "/dashboard/rfqs",
  },
  {
    title: "Supplier Profile",
    task: "Inspect the supplier profile experience and verify that profile, compliance, and SmartScore information is understandable.",
    expected: "A supplier can see what is complete, what is missing, and what affects procurement readiness.",
    href: "/dashboard/profile",
  },
  {
    title: "Mobile Experience",
    task: "Repeat the key public and dashboard flows on a mobile screen.",
    expected: "Navigation, cards, forms, buttons, and long text remain readable and usable.",
    href: "/",
  },
  {
    title: "Feedback Submission",
    task: "Submit one structured feedback item after completing the checklist.",
    expected: "Feedback can be captured with type, priority, rating, feature, and a useful message.",
    href: "/feedback",
  },
]

export default function TestPilotPage() {
  const [tested, setTested] = useState<Record<string, boolean>>({})

  const completedCount = useMemo(
    () => checklistSections.filter((section) => tested[section.title]).length,
    [tested]
  )
  const progress = Math.round((completedCount / checklistSections.length) * 100)

  function toggleSection(title: string) {
    setTested((current) => ({ ...current, [title]: !current[title] }))
  }

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-page px-5 py-10 text-primary sm:px-6">
        <section className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <aside className="entry-paper-panel self-start">
              <p className="newspaper-kicker">Pilot Testing</p>
              <h1 className="mt-4 font-display text-4xl font-bold leading-tight text-heading md:text-5xl">
                Monate Connect tester checklist.
              </h1>
              <p className="mt-5 text-sm leading-7 text-secondary">
                Work through the key pilot flows and mark each area as tested.
                Use the feedback form when something feels broken, confusing,
                promising, or worth improving.
              </p>

              <div className="mt-6 rounded-md border border-panel bg-surface p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-heading">Progress</p>
                  <p className="text-sm font-bold text-accent">{progress}%</p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-panel">
                  <div
                    className="h-full rounded-full bg-accent transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-secondary">
                  {completedCount} of {checklistSections.length} sections marked as tested.
                </p>
              </div>

              <Link
                href="/feedback"
                className="mt-6 inline-flex w-full items-center justify-center rounded-md border border-accent bg-accent px-5 py-3 text-sm font-bold text-button transition hover:bg-accent-strong"
              >
                Submit Feedback
              </Link>
            </aside>

            <div className="grid gap-4">
              {checklistSections.map((section, index) => {
                const checked = Boolean(tested[section.title])

                return (
                  <article
                    key={section.title}
                    className="rounded-md border border-panel bg-card p-5 shadow-panel"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-secondary">
                          Section {index + 1}
                        </p>
                        <h2 className="mt-2 text-xl font-semibold text-heading">
                          {section.title}
                        </h2>
                      </div>

                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-panel bg-panel px-3 py-2 text-sm font-semibold text-secondary">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSection(section.title)}
                          className="h-4 w-4 rounded border-panel accent-accent"
                        />
                        Mark as tested
                      </label>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-md border border-panel bg-panel p-4">
                        <p className="text-[0.63rem] font-bold uppercase tracking-[0.2em] text-muted">
                          Task
                        </p>
                        <p className="mt-2 text-sm leading-7 text-secondary">
                          {section.task}
                        </p>
                      </div>

                      <div className="rounded-md border border-panel bg-surface p-4">
                        <p className="text-[0.63rem] font-bold uppercase tracking-[0.2em] text-muted">
                          Expected outcome
                        </p>
                        <p className="mt-2 text-sm leading-7 text-secondary">
                          {section.expected}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-panel pt-4">
                      <span className={checked ? "text-sm font-semibold text-success" : "text-sm font-semibold text-muted"}>
                        {checked ? "Tested" : "Not tested yet"}
                      </span>
                      <Link
                        href={section.href}
                        className="rounded-md border border-panel bg-surface px-4 py-2 text-sm font-semibold text-secondary transition hover:border-accent hover:text-accent"
                      >
                        Open Feature
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
