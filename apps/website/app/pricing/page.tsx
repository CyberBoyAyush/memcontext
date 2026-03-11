import type { Metadata } from "next";
import { Header, Pricing, Footer } from "@/components";

export const metadata: Metadata = {
  title: "Pricing - MemContext",
  description:
    "Simple, transparent pricing for MemContext. Start free, scale as your AI memory grows.",
};

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="overflow-hidden px-4 ">
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
