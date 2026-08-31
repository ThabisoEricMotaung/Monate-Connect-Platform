"use client"

import { useState, useRef } from "react"
import { IconPaperclip, IconMicrophone, IconSend } from "@tabler/icons-react"

interface InputBarProps {
  onSendMessage: (message: string, file?: File) => void
}

export default function InputBar({ onSendMessage }: InputBarProps) {
  const [message, setMessage] = useState("")
  const [fileName, setFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message)
      setMessage("")
      setFileName("")
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
      onSendMessage(`📎 Uploading: ${file.name}`, file)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-[#e8e8e6] bg-white px-6 py-4 md:px-8">
      <div className="flex items-end gap-3">
        {/* Attachment Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e0e0db] text-[#c8a060] transition hover:bg-[#f5f5f3]"
          aria-label="Attach file"
        >
          <IconPaperclip className="h-5 w-5" stroke={2} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"
        />

        {/* Message Input */}
        <div className="flex-1 flex flex-col">
          {fileName && (
            <p className="mb-2 text-xs text-[#999]">📎 {fileName}</p>
          )}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your RFQ response, upload documents, or type a question..."
            rows={3}
            className="w-full resize-none rounded-lg border border-[#e0e0db] bg-white px-4 py-2 text-sm font-medium text-[#1a3a2a] placeholder-[#999] transition focus:border-[#c8a060] focus:outline-none focus:ring-1 focus:ring-[#c8a060]/20"
          />
        </div>

        {/* Voice + Send Buttons */}
        <div className="flex gap-2">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e0e0db] text-[#c8a060] transition hover:bg-[#f5f5f3]"
            aria-label="Voice input"
          >
            <IconMicrophone className="h-5 w-5" stroke={2} />
          </button>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#1a3a2a] to-[#244f39] text-white transition hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
            aria-label="Send message"
          >
            <IconSend className="h-5 w-5" stroke={2} />
          </button>
        </div>
      </div>

      {/* Character Counter */}
      <p className="mt-2 text-right text-xs text-[#999]">
        {message.length} / 2000 characters
      </p>
    </div>
  )
}
