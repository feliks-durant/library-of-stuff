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
  const scrollPositionRef = useRef<number>(0);

  const handleAccordionChange = () => {
    const savedScrollY = scrollPositionRef.current;
    
    const restore = () => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, savedScrollY);
      
      requestAnimationFrame(() => {
        window.scrollTo(0, savedScrollY);
        setTimeout(() => {
          window.scrollTo(0, savedScrollY);
          document.documentElement.style.scrollBehavior = '';
        }, 300);
      });
    };
    
    restore();
  };

  const handleAccordionMouseDown = () => {
    scrollPositionRef.current = window.scrollY;
    document.documentElement.style.scrollBehavior = 'auto';
  };

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
    window.location.href = "/login";
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
        style={{ backgroundColor: "#1a1a2e", overflowAnchor: "none" }}
        data-testid="section-learn-more"
      >
        <div className="absolute inset-0 tv-static">
          <div className="fuzzy-overlay"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10">
          <Accordion type="single" collapsible className="w-full space-y-4" onValueChange={handleAccordionChange}>
            {/* FAQ 1: What is it? */}
            <AccordionItem
              value="item-1"
              className="border-2 vapor-border-purple rounded-lg overflow-hidden"
              style={{ backgroundColor: "#0f0f1e" }}
            >
              <AccordionTrigger
                className="px-6 py-4 text-2xl font-bold vapor-text-pink uppercase tracking-wide hover:no-underline hover:bg-opacity-80"
                data-testid="accordion-trigger-what-is-it"
                onMouseDown={handleAccordionMouseDown}
              >
                What is it?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  <p className="text-xl leading-relaxed vapor-text-purple">
                    The Library of Stuff makes it easy to borrow and loan every
                    day items from people you already trust. Trust is one way
                    and customizable for each relationship.
                  </p>

                  <div
                    className="border-2 vapor-border-purple p-6 rounded-lg"
                    style={{ backgroundColor: "#1a1a2e" }}
                  >
                    <p className="text-lg leading-relaxed vapor-text-orange">
                      <span className="vapor-text-pink font-bold uppercase tracking-wide">
                        EXAMPLE:
                      </span>{" "}
                      Alice adds a guitar to the library, trust level 3. Alice
                      adds Bob at trust level 3 and Chewy at trust level 2. Bob
                      can see Alice's guitar but Chewy can't. Neither Bob nor
                      Chewy knows what level of trust Alice has granted them.{" "}
                      <br />
                      <br />
                      When Bob wants to borrow the guitar, he texts Alice.* They
                      meet up to exchange the guitar. Bob sends a request for
                      the guitar which Alice approves. Alice can see the guitar
                      in her list of loans, and Bob can see it in his list of
                      borrows. <br />
                      <br />* The app does not include messaging on the
                      assumption that if you trust someone, you know how to
                      contact them.
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
                onMouseDown={handleAccordionMouseDown}
              >
                What is anti-capitalist infrastructure?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-lg leading-relaxed vapor-text-purple">
                  I explore this more on substack but in brief:
                  <br />
                  <br />
                  Infrastructure is anti-capitalist when it diminishes the power
                  of capitalism in our lives. The Library of Stuff attempts that
                  by focusing our attention on strong relationships and sharing
                  what we already have rather than seeking individual power to
                  acquire new stuff.
                  <br />
                  <br />
                  In theory, if owners know that their stuff is going to be used
                  by others, they will be incentivized to buy higher quality
                  items that can be used by their friends many times. Not
                  needing to personally own one of everything allows people to
                  invest in better items.
                  <br />
                  <br />
                  ex. if I need to hang a painting but don't have a drill, I
                  might buy one. However, knowing that I won't use it much, I'm
                  likely to get the cheapest one. If I know that my friends
                  would also use the drill, I might be more likely to buy a
                  higher quality one so that it can be passed around without
                  breaking.
                  <br />
                  <br />
                  Because items are still individually owned, and trust it the
                  main currency, borrowers have an incentive to treat items with
                  care and respect to stay in good report with the owner. Owners
                  adjust the trust levels of individual borrowers to ensure that
                  their stuff is used responsibly. <br />
                  <br />
                  One final thought; there's a Japanese concept called
                  tsukumogami, the idea that objects can take on their own
                  spirit.* A high-quality tool that has been a part of many
                  people's lives can have a powerful, well-storied spirit.
                  Modern society is built around the division between the
                  inanimate and the conscious. A more sustainable, meaningful
                  view may be one where the stuff around us -- our books, our
                  tools, our clothes, our homes -- are cared for as beings unto
                  themselves.
                  <br />
                  <br />* Japan is not the only culture with this concept its
                  just particularly easy to find information about Japanese
                  culture on the internet
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
                onMouseDown={handleAccordionMouseDown}
              >
                Does that mean you hate capitalism?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-lg leading-relaxed vapor-text-purple">
                  I do not have the time or energy to hate a system that is so
                  embedded in my life that it's hard to imagine life without it.
                  <br />
                  <br />
                  That said, capitalism is obviously flawed and is the cause of
                  unfathomable suffering in the world. I think it's important to
                  create tools to reclaim power from capital.
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
                onMouseDown={handleAccordionMouseDown}
              >
                How can I support the Library of Stuff?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-lg leading-relaxed vapor-text-purple">
                  The best way to support is to use it! The library is only
                  valuable when people are willing to add their items and lend
                  them out. The next best way is to support financially at{" "}
                  <a href="https://ko-fi.com/feliksdurant">
                    ko-fi.com/feliksdurant
                  </a>{" "}
                  so that I can keep the servers running.
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
                onMouseDown={handleAccordionMouseDown}
              >
                Who built it?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-lg leading-relaxed vapor-text-purple">
                  My name is Feliks Durant, insta <a href="https://www.instagram.com/feliks.durant">@feliks.durant</a> I'll have a website
                  at some point but it aint today.
                </p>
              </AccordionContent>
            </AccordionItem>
            
            {/* FAQ 6: How was it built? */}
            <AccordionItem
              value="item-6"
              className="border-2 vapor-border-purple rounded-lg overflow-hidden"
              style={{ backgroundColor: "#0f0f1e" }}
            >
              <AccordionTrigger
                className="px-6 py-4 text-2xl font-bold vapor-text-pink uppercase tracking-wide hover:no-underline hover:bg-opacity-80"
                data-testid="accordion-trigger-how-was-it-built"
                onMouseDown={handleAccordionMouseDown}
              >
                How was it built?
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-lg leading-relaxed vapor-text-purple">
                  Originally I tried building it from scratch in Django but that
                  turned out to be a lot of work and I got burned out on it. A
                  couple months later the AI tools were way better and I just
                  proompted it into existance. Not crazy proud of that but I'm
                  hopeful that the water and energy that we could save by
                  borrowing more stuff will more than make up for what was spent
                  developing it.
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
