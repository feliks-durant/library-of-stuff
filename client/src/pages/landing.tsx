import { Button } from "@/components/ui/button";
import { useRef } from "react";

export default function Landing() {
  const explanationRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="min-h-screen bg-background text-foreground">
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

          <div className="flex flex-col sm:flex-row gap-8 justify-center animate-fade-up animation-delay-200">
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
        </div>
      </section>

      {/* Explanation Section with clean vaporwave styling */}
      <section
        ref={explanationRef}
        id="learn-more"
        className="py-20 px-4 bg-static relative"
        data-testid="section-learn-more"
      >
        {/* Subtle scanlines for lo-fi effect */}
        {/* <div className="absolute inset-0 scanlines"></div> */}
        <div className="absolute inset-0 tv-static"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="max-w-none space-y-8">
            <p className="text-2xl leading-relaxed vapor-purple font-semibold">
              The Library of Stuff makes it easy to borrow and loan every day
              items from people you already trust. Trust is one way and
              customizable for each relationship.
            </p>

            <div className="bg-card border-2 vapor-border-purple p-8 rounded-lg">
              <p className="text-xl leading-relaxed vapor-text-orange">
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
        </div>
      </section>
    </div>
  );
}
