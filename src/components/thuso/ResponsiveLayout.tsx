"use client"

import React, { useState, useEffect, ReactNode } from "react"
import { IconMenu2, IconX } from "@tabler/icons-react"

interface ResponsiveLayoutProps {
  sidebar: ReactNode
  main: ReactNode
  showSidebar?: boolean
}

/**
 * Responsive layout wrapper for Thuso Workspace
 * Handles mobile drawer, tablet sidebar, and desktop dual-pane layouts
 */
export default function ResponsiveLayout({
  sidebar,
  main,
  showSidebar = true,
}: ResponsiveLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if mobile on mount
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener("resize", checkMobile)

    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return (
    <div className="h-full flex flex-col md:flex-row bg-white dark:bg-gray-950">
      {/* Mobile hamburger button */}
      {isMobile && showSidebar && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
        >
          {sidebarOpen ? (
            <IconX className="w-5 h-5" />
          ) : (
            <IconMenu2 className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">Menu</span>
        </button>
      )}

      {/* Sidebar */}
      {showSidebar && (
        <>
          {/* Mobile overlay */}
          {isMobile && sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar content */}
          <div
            className={`
              fixed md:relative inset-y-0 left-0 w-64 md:w-80
              bg-gray-50 dark:bg-gray-900
              border-r border-gray-200 dark:border-gray-800
              overflow-y-auto transition-all duration-300 ease-in-out
              z-50 md:z-0
              ${isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0"}
              md:translate-x-0
              animate-fade-in
            `}
          >
            {sidebar}
          </div>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="animate-fade-in-up">{main}</div>
      </div>
    </div>
  )
}
