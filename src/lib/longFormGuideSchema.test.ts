import { describe, expect, it } from "vitest"
import { buildLongFormSchema } from "@/components/LongFormGuidePage"

describe("long-form guide schema", () => {
  it("builds FAQPage questions from question sections", () => {
    const schema = buildLongFormSchema(
      "FAQPage",
      "FAQ",
      "Answers",
      "/guides/faq",
      ["## What is this?", "An answer.", "## Not a question", "Skipped."],
    ) as { "@type": string; mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> }

    expect(schema["@type"]).toBe("FAQPage")
    expect(schema.mainEntity).toEqual([{
      "@type": "Question",
      name: "What is this?",
      acceptedAnswer: { "@type": "Answer", text: "An answer." },
    }])
  })

  it("builds ordered HowTo steps and absolute anchors", () => {
    const schema = buildLongFormSchema(
      "HowTo",
      "How to test",
      "Test it",
      "/how-to/test",
      ["## Overview", "Intro", "## Step 1: Start", "Do this.", "## Step 2: Finish", "Done."],
    ) as { "@type": string; step: Array<{ position: number; name: string; url: string }> }

    expect(schema["@type"]).toBe("HowTo")
    expect(schema.step).toEqual([
      expect.objectContaining({ position: 1, name: "Start", url: "https://www.aiformprocure.co.za/how-to/test#step-1" }),
      expect.objectContaining({ position: 2, name: "Finish", url: "https://www.aiformprocure.co.za/how-to/test#step-2" }),
    ])
  })
})
