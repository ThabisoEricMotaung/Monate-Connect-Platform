"use client"

import React, { useState, useCallback } from "react"
import { useSupplierWorkspace } from "@/hooks/useThsuoData"
import { uploadSupplierDocument } from "@/lib/thuso/fileUpload"
import { generateAIResponse, parseUserIntent } from "@/lib/thuso/chatIntegration"
import {
  ThsuoWorkspace,
  ErrorBoundary,
  LoadingState,
} from "@/components/thuso"
import "@/styles/thuso-animations.css"

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

/**
 * Supplier Workspace Page
 * Full procurement workflow for suppliers responding to RFQs
 */
export default function SupplierWorkspacePage() {
  // Get RFQ ID from URL params
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null
  const rfqId = searchParams ? parseInt(searchParams.get("rfqId") || "0") : 0

  // Data layer
  const { activeRfq, rfqs, smartScore, loading, error } = useSupplierWorkspace(rfqId)

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoadingResponse, setIsLoadingResponse] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Handle file upload
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!rfqId || !activeRfq) return

      try {
        setUploadProgress(10)

        // Get user ID from session/auth
        const userId = "current-user-id" // TODO: Get from auth context

        // Determine document type from file name
        let documentType: "beecert" | "taxcert" | "company_reg" | "cidb" | "other" = "other"
        if (file.name.toLowerCase().includes("bee")) documentType = "beecert"
        if (file.name.toLowerCase().includes("tax")) documentType = "taxcert"
        if (file.name.toLowerCase().includes("company")) documentType = "company_reg"
        if (file.name.toLowerCase().includes("cidb")) documentType = "cidb"

        setUploadProgress(30)

        // Upload file
        const result = await uploadSupplierDocument(file, rfqId, userId, documentType)

        setUploadProgress(70)

        if (result.success) {
          // Add message to chat
          const newMessage: ChatMessage = {
            role: "user",
            content: `📎 Uploaded: ${result.fileName}`,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, newMessage])

          // Add AI response
          const aiResponse = await generateAIResponse(
            `I uploaded ${result.fileName}`,
            {
              rfqId,
              userRole: "supplier",
              rfqTitle: activeRfq.title,
              completionStatus: 85,
            },
            messages
          )

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: aiResponse,
              timestamp: new Date(),
            },
          ])

          setUploadProgress(100)
          setTimeout(() => setUploadProgress(0), 1000)
        } else {
          alert(`Upload failed: ${result.error}`)
        }
      } catch (err) {
        console.error("Upload error:", err)
        alert("Failed to upload file")
      } finally {
        setIsLoadingResponse(false)
      }
    },
    [rfqId, activeRfq, messages]
  )

  // Handle chat message
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !activeRfq) return

    try {
      setIsLoadingResponse(true)

      // Add user message
      const userMessage: ChatMessage = {
        role: "user",
        content: inputValue,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setInputValue("")

      // Generate AI response
      const aiResponse = await generateAIResponse(
        inputValue,
        {
          rfqId,
          userRole: "supplier",
          rfqTitle: activeRfq.title,
          completionStatus: 85,
          missingDocuments: ["Tax Clearance", "BEE Certificate"],
        },
        [...messages, userMessage]
      )

      // Add AI message
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiResponse,
          timestamp: new Date(),
        },
      ])
    } catch (err) {
      console.error("Chat error:", err)
      alert("Failed to get response")
    } finally {
      setIsLoadingResponse(false)
    }
  }, [inputValue, activeRfq, rfqId, messages])

  if (!rfqId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No RFQ Selected</h1>
          <p className="text-gray-600">Please select an RFQ to continue</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <LoadingState isLoading={loading} error={error} loadingMessage="Loading RFQ...">
        <div className="min-w-0 px-2 py-4 sm:px-4 lg:px-6">
          <ThsuoWorkspace rfqId={rfqId} userId="current-user-id" />
        </div>
      </LoadingState>
    </ErrorBoundary>
  )
}
