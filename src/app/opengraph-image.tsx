import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

export const alt = "AiForm Procure — South African government tenders and RFQs"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OpenGraphImage() {
  const mark = await readFile(join(process.cwd(), "public", "aiform-mark.png"))
  const markDataUrl = `data:image/png;base64,${mark.toString("base64")}`

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#f8f4ec",
          color: "#1a3a2a",
          padding: "72px 88px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 790 }}>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: 5, color: "#8c6a2f", textTransform: "uppercase" }}>
            South African procurement
          </div>
          <div style={{ display: "flex", marginTop: 30, fontSize: 66, fontWeight: 700, lineHeight: 1.08 }}>
            Government tenders and RFQs, in one live feed.
          </div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 27, lineHeight: 1.4, color: "#53665c" }}>
            Browse open opportunities by province, industry, and closing date.
          </div>
          <div style={{ display: "flex", marginTop: 42, fontSize: 24, fontWeight: 700 }}>
            AiForm Procure
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 230, height: 300 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={markDataUrl} alt="" width="190" height="237" style={{ objectFit: "contain" }} />
        </div>
      </div>
    ),
    size,
  )
}
