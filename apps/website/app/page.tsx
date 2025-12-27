import {
  Header,
  Hero,
  TrustBlock,
  Features,
  HowItWorks,
  FAQ,
  FinalCTA,
  Footer,
} from "@/components";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <TrustBlock />
        <Features />
        <HowItWorks />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
