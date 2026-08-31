"use client"

import { IconAlertCircle, IconCheck } from "@tabler/icons-react"

interface ProjectStatusCardProps {
  rfqId?: number
}

export default function ProjectStatusCard({ rfqId }: ProjectStatusCardProps) {
  // Mock data - would come from real API
  const projectData = {
    title: "Bidvest RFQ #451",
    status: "Draft",
    completion: 85,
    suppliers: [
      { name: "Your Company", score: null, status: "In Progress" },
    ],
    missing: ["BEE Certificate"],
    deadline: "25 Aug 2026",
  }

  return (
    <div className="rounded-lg border border-[#e0e0db] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-[#1a3a2a]">{projectData.title}</p>
          <p className="text-xs text-[#999] mt-1">
            Status: <span className="font-semibold text-[#c8a060]">{projectData.status}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-[#1a3a2a]/5 px-3 py-1.5">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-semibold text-[#1a3a2a]">Active</span>
        </div>
      </div>

      {/* Completion Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[#999]">Response Completion</p>
          <p className="text-xs font-bold text-[#1a3a2a]">{projectData.completion}%</p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#e8e8e6]">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300"
            style={{ width: `${projectData.completion}%` }}
          />
        </div>
      </div>

      {/* Missing Items */}
      {projectData.missing.length > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
          <div className="flex items-start gap-2">
            <IconAlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" stroke={2} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-amber-900">Missing Documents</p>
              <ul className="mt-1 text-xs text-amber-800 space-y-0.5">
                {projectData.missing.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Deadline */}
      <div className="rounded-lg bg-[#f5f5f3] p-3">
        <p className="text-xs font-semibold text-[#999]">Submission Deadline</p>
        <p className="text-sm font-bold text-[#1a3a2a] mt-1">{projectData.deadline}</p>
      </div>
    </div>
  )
}
