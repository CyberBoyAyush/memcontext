import {
  Header,
  Hero,
  StatsBar,
  LaunchVideo,
  Features,
  ContextVault,
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
      <main className="overflow-hidden ">
        <Hero />
        {/* <StatsBar /> */}
        <Features />
        <ContextVault />
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
