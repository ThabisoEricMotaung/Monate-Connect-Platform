import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import Badge from "./Badge"
import FormField from "./FormField"
import SelectField from "./SelectField"
import TextArea from "./TextArea"
import TextInput from "./TextInput"

describe("form UI components", () => {
  it("connects a label, helper text, and error message to its control", () => {
    const html = renderToStaticMarkup(
      <FormField
        id="company-name"
        label="Company name"
        helperText="Use the registered name."
        error="Company name is required."
        required
      >
        <TextInput name="companyName" />
      </FormField>,
    )

    expect(html).toContain('for="company-name"')
    expect(html).toContain('id="company-name"')
    expect(html).toContain('aria-describedby="company-name-helper company-name-error"')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('role="alert"')
  })

  it("renders native select and textarea controls with accessible sizing", () => {
    const select = renderToStaticMarkup(
      <SelectField aria-label="Province">
        <option>Gauteng</option>
      </SelectField>,
    )
    const textArea = renderToStaticMarkup(<TextArea aria-label="Description" />)

    expect(select).toContain("<select")
    expect(select).toContain("h-11")
    expect(textArea).toContain("<textarea")
    expect(textArea).toContain("min-h-[100px]")
  })

  it("renders semantic status badges", () => {
    const html = renderToStaticMarkup(<Badge variant="success">Verified</Badge>)
    expect(html).toContain("var(--success)")
    expect(html).toContain("Verified")
  })
})
