"use client"

import React, { Component, ReactNode } from "react"
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary component for Thuso Workspace
 * Catches errors in child components and displays graceful fallback UI
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <div className="max-w-md w-full space-y-6">
              <div className="text-center">
                <IconAlertTriangle className="w-16 h-16 text-amber-600 dark:text-amber-400 mx-auto mb-4 animate-bounce" />
                <h1 className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-2">
                  Something went wrong
                </h1>
                <p className="text-amber-800 dark:text-amber-200 text-sm mb-4">
                  We encountered an unexpected error. Please try again or contact support.
                </p>
              </div>

              {this.state.error && (
                <div className="p-4 bg-amber-100 dark:bg-amber-900/50 rounded-lg border border-amber-300 dark:border-amber-700">
                  <p className="font-mono text-xs text-amber-900 dark:text-amber-100 break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors duration-200 font-medium"
                >
                  <IconRefresh className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 px-4 py-2 bg-amber-200 hover:bg-amber-300 dark:bg-amber-900 dark:hover:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-lg transition-colors duration-200 font-medium"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
