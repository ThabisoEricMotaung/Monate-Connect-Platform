"use client"

import { format as formatDate } from "date-fns"

export interface ExportableOpportunity {
  title: string
  buyer: string
  closingDate: string | null
  budget: number | null
  status: string | null
  source: string | null
  province: string | null
  category: string | null
}

const EXPORT_HEADERS = ["Title", "Buyer", "Closing Date", "Budget", "Status", "Source", "Province", "Category"]

function formatBudget(value: number | null): string {
  if (value === null || value === undefined) return "Not specified"
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(value)
}

function formatClosingDate(value: string | null): string {
  if (!value) return "No deadline"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "No deadline"
  return formatDate(date, "dd MMM yyyy")
}

function toRow(opportunity: ExportableOpportunity): string[] {
  return [
    opportunity.title || "Untitled opportunity",
    opportunity.buyer || "Unknown",
    formatClosingDate(opportunity.closingDate),
    formatBudget(opportunity.budget),
    opportunity.status || "Unknown",
    opportunity.source || "AiForm Platform",
    opportunity.province || "Not specified",
    opportunity.category || "Not specified",
  ]
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function exportOpportunitiesAsCSV(opportunities: ExportableOpportunity[], filename = "opportunities.csv") {
  const rows = [EXPORT_HEADERS, ...opportunities.map(toRow)]
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename)
}

export async function exportOpportunitiesAsExcel(opportunities: ExportableOpportunity[], filename = "opportunities.xlsx") {
  const XLSX = await import("xlsx")
  const rows = [EXPORT_HEADERS, ...opportunities.map(toRow)]
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  worksheet["!cols"] = EXPORT_HEADERS.map(() => ({ wch: 22 }))
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Opportunities")
  XLSX.writeFile(workbook, filename)
}

export async function exportOpportunitiesAsPDF(opportunities: ExportableOpportunity[], filename = "opportunities.pdf") {
  const { jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const doc = new jsPDF({ orientation: "landscape" })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFillColor(30, 58, 42)
  doc.rect(0, 0, pageWidth, 22, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(15)
  doc.text("AiForm Procure", 14, 14)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(200, 160, 96)
  doc.text(
    `Opportunities export · Generated ${formatDate(new Date(), "dd MMM yyyy HH:mm")} · ${opportunities.length} result${opportunities.length === 1 ? "" : "s"}`,
    14,
    19,
  )

  autoTable(doc, {
    startY: 28,
    head: [EXPORT_HEADERS],
    body: opportunities.map(toRow),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 42], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [244, 240, 231] },
    margin: { left: 14, right: 14 },
  })

  doc.save(filename)
}
