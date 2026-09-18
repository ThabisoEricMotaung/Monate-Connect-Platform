"use client"

import { useState } from "react"

export default function ThusoWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#7B5BA4] text-white shadow-lg transition hover:bg-[#6b4a94] active:scale-95"
        aria-label="Open chat"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </button>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:items-center sm:justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat Box */}
          <div className="relative w-full max-w-sm rounded-none border border-[#e5e5e7] bg-white shadow-xl sm:max-h-[500px]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e5e5e7] bg-[#f9f9fa] p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#7B5BA4] to-[#6b4a94] flex items-center justify-center text-white text-sm font-bold">
                  T
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1f2937]">Thuso</p>
                  <p className="text-xs text-[#6b7280]">Typically replies instantly</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#6b7280] hover:text-[#1f2937]"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div className="flex h-64 flex-col gap-4 overflow-y-auto bg-white p-4">
              <div className="flex gap-2">
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-[#7B5BA4] to-[#6b4a94] flex items-center justify-center text-white text-xs font-bold">
                  T
                </div>
                <div className="max-w-xs rounded-lg bg-[#f3f4f6] p-3">
                  <p className="text-sm text-[#1f2937]">
                    Hi! 👋 I&apos;m Thuso. How can I help you today?
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-[#7B5BA4] to-[#6b4a94] flex items-center justify-center text-white text-xs font-bold">
                  T
                </div>
                <div className="max-w-xs rounded-lg bg-[#f3f4f6] p-3">
                  <p className="text-sm text-[#1f2937]">
                    I can help with pricing, feature questions, supplier registration, or connecting you with our team.
                  </p>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-[#e5e5e7] bg-[#f9f9fa] p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 rounded-none border border-[#d4d0c4] bg-white px-3 py-2 text-sm text-[#1f2937] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#7B5BA4]"
                />
                <a
                  href="mailto:aiformstudio@gmail.com"
                  className="inline-flex items-center justify-center rounded-none bg-[#7B5BA4] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#6b4a94]"
                >
                  Email
                </a>
              </div>
              <p className="mt-2 text-xs text-[#6b7280]">
                For immediate support, email us at{" "}
                <a href="mailto:aiformstudio@gmail.com" className="font-semibold text-[#7B5BA4] hover:underline">
                  aiformstudio@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
