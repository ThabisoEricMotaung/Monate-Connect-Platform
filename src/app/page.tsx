import Hero from "@/components/sections/Hero"
import Stats from "@/components/sections/Stats"
import Features from "@/components/sections/Features"
import Categories from "@/components/sections/Categories"
import SupplierSpotlight from "@/components/sections/SupplierSpotlight"

export default function Home() {
  return (
    <main className="min-h-screen bg-page text-primary">
      <Hero />

      <Stats />

      <Features />

      <Categories />

      <SupplierSpotlight />

    </main>
  )
}