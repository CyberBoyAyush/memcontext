import {
  Header,
  Hero,
  StatsBar,
  LaunchVideo,
  Features,
  MemoryPipeline,
  UseCases,
  HowItWorks,
  FAQ,
  FinalCTA,
  Footer,
} from "@/components";

export default function Home() {
  return (
    <>
      <Header />
      <main className="overflow-hidden px-4">
        <Hero />
        <StatsBar />
        <Features />
        <MemoryPipeline />
        <HowItWorks />
        <UseCases />
        <LaunchVideo />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
