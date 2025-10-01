import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useRef, useEffect, useState } from "react";
import jingleAudio from "@assets/library-of-stuff-jingle_1759345825836.mp3";

export default function Landing() {
  const explanationRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Temporarily remove dark class from landing page to preserve vaporwave theme
  useEffect(() => {
    const root = document.documentElement;
    const hadDarkClass = root.classList.contains("dark");

    // Remove dark class while on landing page
    root.classList.remove("dark");

    // Restore dark class when leaving landing page
    return () => {
      if (hadDarkClass) {
        root.classList.add("dark");
      }
    };
  }, []);

  const handleLogin = () => {
    // Check if user just logged out and needs fresh authentication
    const urlParams = new URLSearchParams(window.location.search);
    const loggedOut = urlParams.get("logged_out") === "true";

    // Force fresh authentication if user just logged out
    const loginUrl = loggedOut ? "/api/login?force=true" : "/api/login";
    window.location.href = loginUrl;
  };

  const handleLearnMore = () => {
    explanationRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio(jingleAudio);
    audioRef.current.loop = true;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleToggleJingle = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="landing-page">
      {/* Hero Section with authentic vaporwave grid */}
      <section className="min-h-screen flex items-center justify-center px-4 py-8 relative vaporwave-grid">
        {/* Animated grid with exact reference colors */}
        <div className="absolute inset-0 animated-grid"></div>
        <div className="absolute inset-0 animated-grid-2"></div>
        <div className="absolute inset-0 animated-grid-3"></div>

        {/* Scanlines for lo-fi VHS effect */}
        <div className="absolute inset-0 scanlines"></div>

        <div className="text-center max-w-3xl mx-auto relative z-10">
          <h1
            className="text-5xl md:text-7xl font-black mb-12 animate-fade-up vapor-text-pink uppercase tracking-wide leading-tight"
            style={{
              fontFamily: "Inter",
              letterSpacing: "0.04em",
              textShadow:
                "2px 2px 3px rgba(255, 80, 0, 0.6), -4px 4px 3px rgba(255, 120, 0, 1),  5px 5px 5px rgba(0,0,0,0.4)",
            }}
            data-testid="text-hero-title"
          >
            Library of Stuff
          </h1>

          <div className="flex flex-col items-center gap-8 animate-fade-up animation-delay-200">
            <div className="flex flex-col sm:flex-row gap-8 justify-center">
              <Button
                onClick={handleLogin}
                size="lg"
                className="bg-vapor-pink hover:bg-vapor-purple text-background px-12 py-6 text-2xl font-bold border-2 vapor-border-pink uppercase tracking-wider"
                data-testid="button-enter"
              >
                ENTER
              </Button>
              <Button
                onClick={handleLearnMore}
                variant="outline"
                size="lg"
                className="border-2 vapor-border-teal vapor-text-teal hover:bg-vapor-teal hover:text-background px-12 py-6 text-2xl font-bold uppercase tracking-wider"
                data-testid="button-learn-more"
              >
                LEARN MORE
              </Button>
            </div>
            <Button
              onClick={handleToggleJingle}
              variant="outline"
              size="lg"
              className="border-2 vapor-border-purple vapor-text-purple hover:bg-vapor-purple hover:text-background px-12 py-6 text-2xl font-bold uppercase tracking-wider"
              data-testid="button-jingle"
            >
              {isPlaying ? "STOP THE JINGLE" : "PLAY THE JINGLE"}
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section with accordion */}
      <section
        ref={explanationRef}
        id="learn-more"
        className="py-20 px-4 relative overflow-hidden"
        style={{ backgroundColor: "#1a1a2e" }}
        data-testid="section-learn-more"
      >
        <div className="absolute inset-0 tv-static">
          <div className="fuzzy-overlay"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {/* FAQ 1: What is it? */}
            <AccordionItem 
              value="item-1" 
              className="border-2 vapor-border-purple rounded-lg overflow-hidden"
              style={{ backgroundColor: "#0f0f1e" }}
            >
              <AccordionTrigger 
                className="px-6 py-4 text-2xl font-bold vapor-text-pink uppercase tracking-wide hover:no-underline hover:bg-opacity-80"
                data-testid="accordion-trigger-what-is-it"
              >
                What is it?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  <p className="text-xl leading-relaxed vapor-text-purple">
                    The Library of Stuff makes it easy to borrow and loan every day
                    items from people you already trust. Trust is one way and
                    customizable for each relationship.
                  </p>

                  <div
                    className="border-2 vapor-border-purple p-6 rounded-lg"
                    style={{ backgroundColor: "#1a1a2e" }}
                  >
                    <p className="text-lg leading-relaxed vapor-text-orange">
                      <span className="vapor-text-pink font-bold uppercase tracking-wide">
                        EXAMPLE:
                      </span>{" "}
                      Alice adds a guitar to the library, trust level 3. Alice adds
                      Bob at trust level 3 and Chewy at trust level 2. Bob can see
                      Alice's guitar but Chewy can't. Neither Bob nor Chewy knows what
                      level of trust Alice has granted them. <br />
                      <br />
                      When Bob wants to borrow the guitar, he texts Alice.* They meet
                      up to exchange the guitar. Bob sends a request for the guitar
                      which Alice approves. Alice can see the guitar in her list of
                      loans, and Bob can see it in his list of borrows. <br />
                      <br />* The app does not include messaging on the assumption
                      that if you trust someone, you know how to contact them.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* FAQ 2: What is anti-capitalist infrastructure? */}
            <AccordionItem 
              value="item-2" 
              className="border-2 vapor-border-purple rounded-lg overflow-hidden"
              style={{ backgroundColor: "#0f0f1e" }}
            >
              <AccordionTrigger 
                className="px-6 py-4 text-2xl font-bold vapor-text-pink uppercase tracking-wide hover:no-underline hover:bg-opacity-80"
                data-testid="accordion-trigger-anti-capitalist"
              >
                What is anti-capitalist infrastructure?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-lg leading-relaxed vapor-text-purple">
                  Anti-capitalist infrastructure refers to systems and tools that help people meet their needs outside of traditional market exchanges. Instead of buying and selling, we share resources based on trust and mutual aid. The Library of Stuff is infrastructure because it provides a foundation for sharing—not a marketplace for transactions. It's anti-capitalist because it prioritizes access over ownership and relationships over profit.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* FAQ 3: Does that mean you hate capitalism? */}
            <AccordionItem 
              value="item-3" 
              className="border-2 vapor-border-purple rounded-lg overflow-hidden"
              style={{ backgroundColor: "#0f0f1e" }}
            >
              <AccordionTrigger 
                className="px-6 py-4 text-2xl font-bold vapor-text-pink uppercase tracking-wide hover:no-underline hover:bg-opacity-80"
                data-testid="accordion-trigger-hate-capitalism"
              >
                Does that mean you hate capitalism?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-lg leading-relaxed vapor-text-purple">
                  Not necessarily. This project isn't about hate—it's about building alternatives. Whether you think capitalism is fundamentally broken or just needs some balance, the Library of Stuff offers a different way to meet everyday needs. You can use this tool to reduce consumption, save money, strengthen community bonds, or all of the above. Your reasons are your own.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* FAQ 4: How can I support the Library of Stuff? */}
            <AccordionItem 
              value="item-4" 
              className="border-2 vapor-border-purple rounded-lg overflow-hidden"
              style={{ backgroundColor: "#0f0f1e" }}
            >
              <AccordionTrigger 
                className="px-6 py-4 text-2xl font-bold vapor-text-pink uppercase tracking-wide hover:no-underline hover:bg-opacity-80"
                data-testid="accordion-trigger-support"
              >
                How can I support the Library of Stuff?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-lg leading-relaxed vapor-text-purple">
                  The best way to support this project is to use it! Share it with people you trust. Add your stuff. Borrow from others. Build a culture of sharing in your community. This tool is free and open-source—no premium tiers, no ads, no data harvesting. If you want to contribute technically, the code is available for you to improve, fork, or learn from.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* FAQ 5: Who built it? */}
            <AccordionItem 
              value="item-5" 
              className="border-2 vapor-border-purple rounded-lg overflow-hidden"
              style={{ backgroundColor: "#0f0f1e" }}
            >
              <AccordionTrigger 
                className="px-6 py-4 text-2xl font-bold vapor-text-pink uppercase tracking-wide hover:no-underline hover:bg-opacity-80"
                data-testid="accordion-trigger-who-built"
              >
                Who built it?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-lg leading-relaxed vapor-text-purple">
                  This project was built by someone who believes we can create better systems for sharing resources and supporting each other. It's offered freely as a tool for communities to use and adapt. The vaporwave aesthetic? That's just for fun—a little nostalgia for digital spaces that felt more human and less corporate.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Get Started Button */}
          <div className="mt-16 text-center">
            <Button
              onClick={handleLogin}
              size="lg"
              className="bg-vapor-pink hover:bg-vapor-purple text-background px-16 py-8 text-3xl font-black border-2 vapor-border-pink uppercase tracking-wider"
              data-testid="button-get-started"
            >
              GET STARTED
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
