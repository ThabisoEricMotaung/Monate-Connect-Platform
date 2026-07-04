export type PayFastTier = "supplier" | "buyer_starter" | "buyer_professional"
export type PayFastBillingFrequency = "monthly" | "annual"

export type PayFastPlan = {
  tier: PayFastTier
  label: string
  displayPrice: string
  amount: number
  billingFrequency: PayFastBillingFrequency
  payfastFrequency: "3" | "6"
  itemName: string
  itemDescription: string
}

export const payfastPlans: Record<PayFastTier, PayFastPlan> = {
  supplier: {
    tier: "supplier",
    label: "Supplier Access",
    displayPrice: "R299",
    amount: 299,
    billingFrequency: "monthly",
    payfastFrequency: "3",
    itemName: "Supplier Access",
    itemDescription: "AiForm Procure Supplier Access monthly subscription",
  },
  buyer_starter: {
    tier: "buyer_starter",
    label: "Buyer Starter",
    displayPrice: "R990",
    amount: 990,
    billingFrequency: "monthly",
    payfastFrequency: "3",
    itemName: "Buyer Starter",
    itemDescription: "AiForm Procure Buyer Starter monthly subscription",
  },
  buyer_professional: {
    tier: "buyer_professional",
    label: "Buyer Professional",
    displayPrice: "R2,490",
    amount: 2490,
    billingFrequency: "monthly",
    payfastFrequency: "3",
    itemName: "Buyer Professional",
    itemDescription: "AiForm Procure Buyer Professional monthly subscription",
  },
}

export function isPayFastTier(value: unknown): value is PayFastTier {
  return value === "supplier" || value === "buyer_starter" || value === "buyer_professional"
}
