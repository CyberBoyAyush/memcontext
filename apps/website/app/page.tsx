import {
  Header,
  Hero,
  LaunchVideo,
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
      <main className="overflow-hidden px-4">
        <Hero />
       
        <Features />
        <HowItWorks />
         <LaunchVideo />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
