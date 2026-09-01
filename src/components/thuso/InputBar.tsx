"use client"

import { useRef, useState } from "react"
import { IconMicrophone, IconPaperclip, IconSend } from "@tabler/icons-react"

interface InputBarProps {
  onSendMessage: (message: string, file?: File) => void
}

export default function InputBar({ onSendMessage }: InputBarProps) {
  const [message, setMessage] = useState("")
  const [fileName, setFileName] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = () => {
    if (!message.trim()) return
    onSendMessage(message)
    setMessage("")
    setFileName("")
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    onSendMessage(`Uploading: ${file.name}`, file)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-[#FBF9F4] px-4 pb-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-end gap-2 rounded-2xl border border-[#D8D2C5] bg-white p-2 shadow-sm focus-within:border-[#1E3A2B]/50 focus-within:ring-2 focus-within:ring-[#1E3A2B]/10">
        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-[#A67832] transition-colors duration-200 hover:bg-[#F4F0E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B]" aria-label="Attach file">
          <IconPaperclip className="h-5 w-5" stroke={2} />
        </button>

        <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png" />

        <div className="flex min-w-0 flex-1 flex-col">
          {fileName ? <p className="mb-2 truncate text-xs font-medium text-[#6F6A61]">Attached: {fileName}</p> : null}
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your RFQ response or upload a document..."
            rows={2}
            maxLength={2000}
            aria-label="Message Thuso about this RFQ"
            className="max-h-32 min-h-11 w-full resize-none border-0 bg-transparent px-2 py-2.5 text-base font-medium text-[#1E3A2B] placeholder-[#857F75] focus:outline-none sm:text-sm"
          />
        </div>

        <div className="flex shrink-0 gap-1">
          <button type="button" className="hidden h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-[#A67832] transition-colors duration-200 hover:bg-[#F4F0E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B] sm:flex" aria-label="Voice input">
            <IconMicrophone className="h-5 w-5" stroke={2} />
          </button>
          <button type="button" onClick={handleSend} disabled={!message.trim()} className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-[#1E3A2B] text-white transition-colors duration-200 hover:bg-[#294D39] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A2B] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message">
            <IconSend className="h-5 w-5" stroke={2} />
          </button>
        </div>
      </div>

      <p className="mt-2 pr-1 text-right text-xs text-[#7B756B]">{message.length} / 2000 characters</p>
    </div>
  )
}
