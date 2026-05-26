"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { getRFQDisplayStatus } from "@/lib/rfq-deadline"
import { supabase } from "@/lib/supabase"

type RFQ = {
  id: number
  title: string | null
  province: string | null
  status: string | null
  deadline: string | null
  created_at: string | null
}

type PurchaseOrder = {
  id: number
  po_number: string | null
  rfq_id: number | null
  quote_id: number | null
  title: string | null
  status: string | null
  generated_at: string | null
}

type Notification = {
  id: number
  type: string
  title: string
  link: string | null
  created_at: string | null
}

type CalendarEventType =
  | "RFQ Deadline"
  | "Awarded"
  | "Purchase Order"
  | "Verification"

type CalendarEvent = {
  id: string
  title: string
  date: string
  type: CalendarEventType
  status: string
  province: string | null
  link: string
}

const filterClass =
  "w-full rounded-md border border-panel bg-panel px-3 py-2.5 text-sm text-heading outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"

const typeStyles: Record<string, string> = {
  "RFQ Deadline": "border-sky-500/30 bg-sky-500/10 text-sky-700",
  "Closing Soon": "border-warning bg-warning-soft text-warning",
  Awarded: "border-success bg-success-soft text-success",
  "Purchase Order": "border-accent-soft bg-accent-soft text-accent-strong",
  Verification: "border-panel bg-panel text-secondary",
}

const statusStyles: Record<string, string> = {
  Open: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  "Closing Soon": "border-warning bg-warning-soft text-warning",
  Closed: "border-rose-500/30 bg-rose-500/10 text-rose-700",
  Awarded: "border-success bg-success-soft text-success",
  Generated: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  Issued: "border-accent-soft bg-accent-soft text-accent-strong",
  Approved: "border-success bg-success-soft text-success",
  Rejected: "border-rose-500/30 bg-rose-500/10 text-rose-700",
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function toEventDate(value: string | null): string | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function daysUntil(value: string): number {
  const today = startOfDay(new Date())
  const eventDay = startOfDay(new Date(value))

  return Math.round(
    (eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
}

function badgeClass(label: string): string {
  return typeStyles[label] ?? statusStyles[label] ?? "border-panel bg-panel text-secondary"
}

function eventSort(a: CalendarEvent, b: CalendarEvent): number {
  return new Date(a.date).getTime() - new Date(b.date).getTime()
}

function isCalendarEvent(event: CalendarEvent | null): event is CalendarEvent {
  return event !== null
}

function EventCard({ event }: { event: CalendarEvent }) {
  return (
    <article className="rounded-md border border-panel bg-card p-5 shadow-panel transition hover:border-accent/60 hover:bg-surface">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex rounded-md border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${badgeClass(event.type)}`}
            >
              {event.type}
            </span>
            {event.status === "Closing Soon" ? (
              <span
                className={`inline-flex rounded-md border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${badgeClass("Closing Soon")}`}
              >
                Closing Soon
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-base font-semibold text-heading">
            {event.title}
          </h3>
          <p className="mt-2 text-xs text-muted">
            {event.province || "National / Unspecified Province"}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="text-sm font-semibold text-heading">
            {formatDate(event.date)}
          </p>
          <span
            className={`mt-2 inline-flex rounded-md border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${badgeClass(event.status)}`}
          >
            {event.status}
          </span>
        </div>
      </div>

      <div className="mt-4 border-t border-panel pt-4">
        <Link
          href={event.link}
          className="inline-flex rounded-md border border-accent bg-accent px-4 py-2 text-xs font-semibold text-button transition hover:bg-accent-strong"
        >
          Open Record
        </Link>
      </div>
    </article>
  )
}

function EventList({
  title,
  events,
  emptyText,
}: {
  title: string
  events: CalendarEvent[]
  emptyText: string
}) {
  return (
    <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
      <div className="border-b border-panel pb-4">
        <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
          Calendar Queue
        </p>
        <h2 className="mt-2 text-lg font-semibold text-heading">{title}</h2>
      </div>

      {events.length === 0 ? (
        <div className="mt-5 rounded-md border border-panel bg-panel p-5">
          <p className="text-sm text-secondary">{emptyText}</p>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function ProcurementCalendarPage() {
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [typeFilter, setTypeFilter] = useState("")
  const [provinceFilter, setProvinceFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadCalendarData() {
      if (!supabase) {
        setErrorMessage("Supabase environment variables are not configured.")
        setLoading(false)
        return
      }

      setLoading(true)
      setErrorMessage("")

      const [rfqResult, purchaseOrderResult, userResult] = await Promise.all([
        supabase
          .from("rfqs")
          .select("id, title, province, status, deadline, created_at")
          .order("deadline", { ascending: true }),
        supabase
          .from("purchase_orders")
          .select("id, po_number, rfq_id, quote_id, title, status, generated_at")
          .order("generated_at", { ascending: false }),
        supabase.auth.getUser(),
      ])

      if (rfqResult.error) {
        setErrorMessage(rfqResult.error.message)
        setLoading(false)
        return
      }

      if (purchaseOrderResult.error) {
        setErrorMessage(purchaseOrderResult.error.message)
        setLoading(false)
        return
      }

      let notificationRows: Notification[] = []

      if (!userResult.error && userResult.data.user) {
        const { data, error } = await supabase
          .from("notifications")
          .select("id, type, title, link, created_at")
          .eq("recipient_id", userResult.data.user.id)
          .in("type", ["Verification Approved", "Verification Rejected"])
          .order("created_at", { ascending: false })
          .limit(20)

        if (!error) {
          notificationRows = (data ?? []) as Notification[]
        }
      }

      setRfqs((rfqResult.data ?? []) as RFQ[])
      setPurchaseOrders((purchaseOrderResult.data ?? []) as PurchaseOrder[])
      setNotifications(notificationRows)
      setLoading(false)
    }

    loadCalendarData()
  }, [])

  const events = useMemo<CalendarEvent[]>(() => {
    const rfqDeadlineEvents = rfqs
      .map((rfq): CalendarEvent | null => {
        const eventDate = toEventDate(rfq.deadline)
        if (!eventDate) return null

        const status = getRFQDisplayStatus(rfq.status, rfq.deadline)

        return {
          id: `rfq-deadline-${rfq.id}`,
          title: rfq.title || `RFQ-${rfq.id}`,
          date: eventDate,
          type: "RFQ Deadline" as CalendarEventType,
          status,
          province: rfq.province,
          link: `/dashboard/rfqs/${rfq.id}`,
        }
      })
      .filter(isCalendarEvent)

    const awardedEvents = rfqs
      .filter((rfq) => rfq.status === "Awarded")
      .map((rfq): CalendarEvent | null => {
        const eventDate = toEventDate(rfq.deadline ?? rfq.created_at)
        if (!eventDate) return null

        return {
          id: `rfq-awarded-${rfq.id}`,
          title: rfq.title || `RFQ-${rfq.id}`,
          date: eventDate,
          type: "Awarded" as CalendarEventType,
          status: "Awarded",
          province: rfq.province,
          link: `/dashboard/rfqs/${rfq.id}`,
        }
      })
      .filter(isCalendarEvent)

    const purchaseOrderEvents = purchaseOrders
      .map((purchaseOrder): CalendarEvent | null => {
        const eventDate = toEventDate(purchaseOrder.generated_at)
        if (!eventDate) return null

        return {
          id: `po-${purchaseOrder.id}`,
          title:
            purchaseOrder.po_number ||
            purchaseOrder.title ||
            `Purchase Order ${purchaseOrder.id}`,
          date: eventDate,
          type: "Purchase Order" as CalendarEventType,
          status: purchaseOrder.status || "Generated",
          province: null,
          link: `/dashboard/admin/purchase-orders/${purchaseOrder.id}`,
        }
      })
      .filter(isCalendarEvent)

    const verificationEvents = notifications
      .map((notification): CalendarEvent | null => {
        const eventDate = toEventDate(notification.created_at)
        if (!eventDate) return null

        const status = notification.type.includes("Rejected")
          ? "Rejected"
          : "Approved"

        return {
          id: `verification-${notification.id}`,
          title: notification.title,
          date: eventDate,
          type: "Verification" as CalendarEventType,
          status,
          province: null,
          link: notification.link || "/dashboard/verification",
        }
      })
      .filter(isCalendarEvent)

    return [
      ...rfqDeadlineEvents,
      ...awardedEvents,
      ...purchaseOrderEvents,
      ...verificationEvents,
    ]
  }, [notifications, purchaseOrders, rfqs])

  const filterOptions = useMemo(() => {
    return {
      types: Array.from(new Set(events.map((event) => event.type))).sort(),
      provinces: Array.from(
        new Set(
          events
            .map((event) => event.province)
            .filter((province): province is string => Boolean(province))
        )
      ).sort(),
      statuses: Array.from(new Set(events.map((event) => event.status))).sort(),
    }
  }, [events])

  const filteredEvents = useMemo(() => {
    return events
      .filter((event) => !typeFilter || event.type === typeFilter)
      .filter((event) => !provinceFilter || event.province === provinceFilter)
      .filter((event) => !statusFilter || event.status === statusFilter)
      .sort(eventSort)
  }, [events, provinceFilter, statusFilter, typeFilter])

  const upcomingDeadlines = filteredEvents.filter(
    (event) => event.type === "RFQ Deadline" && daysUntil(event.date) >= 0
  )
  const closingThisWeek = filteredEvents.filter(
    (event) =>
      event.type === "RFQ Deadline" &&
      daysUntil(event.date) >= 0 &&
      daysUntil(event.date) <= 7
  )
  const recentlyAwarded = filteredEvents
    .filter((event) => event.type === "Awarded")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const purchaseOrdersIssued = filteredEvents
    .filter((event) => event.type === "Purchase Order")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const calendarStrip = filteredEvents.slice(0, 12)

  return (
    <div>
      <div className="mb-8 border-b border-panel pb-6">
        <p className="text-xs uppercase tracking-[0.28em] text-accent">
          Procurement Calendar
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-heading">
          Deadline and Milestone Calendar
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-secondary">
          Track RFQ deadlines, closing windows, awards, purchase orders, and
          verification milestones in one procurement schedule.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-md border border-rose-500/25 bg-rose-500/10 px-5 py-4">
          <p className="text-sm font-semibold text-rose-700">
            Calendar failed to load
          </p>
          <p className="mt-1 text-xs text-rose-700">{errorMessage}</p>
        </div>
      )}

      <section className="mb-6 rounded-md border border-panel bg-card p-5 shadow-panel">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="calendar-type-filter"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Event Type
            </label>
            <select
              id="calendar-type-filter"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className={filterClass}
            >
              <option value="">All event types</option>
              {filterOptions.types.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="calendar-province-filter"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Province
            </label>
            <select
              id="calendar-province-filter"
              value={provinceFilter}
              onChange={(event) => setProvinceFilter(event.target.value)}
              className={filterClass}
            >
              <option value="">All provinces</option>
              {filterOptions.provinces.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="calendar-status-filter"
              className="mb-1.5 block text-[0.68rem] uppercase tracking-[0.24em] text-secondary"
            >
              Status
            </label>
            <select
              id="calendar-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={filterClass}
            >
              <option value="">All statuses</option>
              {filterOptions.statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-md border border-panel bg-card shadow-panel"
            />
          ))}
        </div>
      ) : filteredEvents.length === 0 && !errorMessage ? (
        <div className="rounded-md border border-panel bg-card p-16 text-center shadow-panel">
          <p className="text-sm font-semibold text-heading">
            No calendar events found.
          </p>
          <p className="mt-2 text-xs text-muted">
            Adjust filters or add RFQs and purchase orders to populate the
            procurement calendar.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-md border border-panel bg-card p-5 shadow-panel">
            <div className="border-b border-panel pb-4">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-secondary">
                Visual Timeline
              </p>
              <h2 className="mt-2 text-lg font-semibold text-heading">
                Next procurement events
              </h2>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {calendarStrip.map((event) => (
                <Link
                  key={event.id}
                  href={event.link}
                  className="rounded-md border border-panel bg-panel p-4 transition hover:border-accent/60 hover:bg-surface"
                >
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-secondary">
                    {formatDate(event.date)}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-heading">
                    {event.title}
                  </p>
                  <span
                    className={`mt-3 inline-flex rounded-md border px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] ${badgeClass(event.type)}`}
                  >
                    {event.type}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <EventList
              title="Upcoming deadlines"
              events={upcomingDeadlines}
              emptyText="No upcoming RFQ deadlines match the current filters."
            />
            <EventList
              title="Closing this week"
              events={closingThisWeek}
              emptyText="No RFQs are closing this week."
            />
            <EventList
              title="Recently awarded"
              events={recentlyAwarded}
              emptyText="No awarded RFQs match the current filters."
            />
            <EventList
              title="Purchase orders issued"
              events={purchaseOrdersIssued}
              emptyText="No purchase orders match the current filters."
            />
          </div>
        </div>
      )}
    </div>
  )
}
