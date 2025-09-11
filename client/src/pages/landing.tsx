import { Button } from "@/components/ui/button";
import { useRef } from "react";

export default function Landing() {
  const explanationRef = useRef<HTMLDivElement>(null);

  const handleLogin = () => {
    // Check if user just logged out and needs fresh authentication
    const urlParams = new URLSearchParams(window.location.search);
    const loggedOut = urlParams.get('logged_out') === 'true';
    
    // Force fresh authentication if user just logged out
    const loginUrl = loggedOut ? "/api/login?force=true" : "/api/login";
    window.location.href = loginUrl;
  };

  const handleLearnMore = () => {
    explanationRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground vaporwave-grid">
      {/* Hero Section with animated grid background */}
      <section className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
        {/* Animated grid overlay */}
        <div className="absolute inset-0 animated-grid opacity-20"></div>
        
        <div className="text-center max-w-2xl mx-auto relative z-10">
          <h1 
            className="text-5xl md:text-7xl font-bold mb-8 animate-fade-up text-glow-pink animate-neon-pulse"
            data-testid="text-hero-title"
          >
            Welcome to the Library of Stuff
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-up animation-delay-200">
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-neon-pink hover:bg-neon-purple text-background px-10 py-4 text-xl font-bold box-glow-pink animate-glow-pulse border-2 border-neon-pink"
              data-testid="button-enter"
            >
              ▶ ENTER ◀
            </Button>
            <Button 
              onClick={handleLearnMore}
              variant="outline"
              size="lg"
              className="border-2 border-electric-cyan text-electric-cyan hover:bg-electric-cyan hover:text-background px-10 py-4 text-xl font-bold box-glow-cyan"
              data-testid="button-learn-more"
            >
              ▶ LEARN MORE ◀
            </Button>
          </div>
        </div>
      </section>

      {/* Explanation Section with vaporwave styling */}
      <section 
        ref={explanationRef}
        id="learn-more"
        className="py-20 px-4 bg-muted relative"
        data-testid="section-learn-more"
      >
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="max-w-none">
            <p className="text-2xl leading-relaxed mb-8 text-electric-cyan font-semibold">
              The Library of Stuff makes it easy to borrow and loan every day items from people you already trust. 
              Trust is one way and customizable for each relationship.
            </p>
            
            <div className="bg-card border-2 border-neon-purple p-6 rounded-lg mb-8 box-glow-pink">
              <p className="text-xl leading-relaxed mb-4 text-sunset-orange">
                <span className="text-neon-pink font-bold">EXAMPLE:</span> Alice adds a guitar to the library, trust level 3. 
                Alice adds Bob at trust level 3 and Chewy at trust level 2. Bob can see Alice's guitar but Chewy can't. 
                Neither Bob nor Chewy knows what level of trust Alice has granted them.
              </p>
            </div>
            
            <p className="text-xl leading-relaxed mb-8 text-laser-green">
              When Bob wants to borrow the guitar, he texts Alice. The app does not include messaging on the assumption 
              that if you trust someone, you know how to contact them. They meet up to exchange the guitar. Bob sends 
              a request for the guitar which Alice approves. Alice can see the guitar in her list of loans, and Bob can 
              see it in his list of borrows.
            </p>

            <div className="mt-16 text-center">
              <Button 
                onClick={handleLogin}
                size="lg"
                className="bg-neon-pink hover:bg-neon-purple text-background px-16 py-6 text-2xl font-bold box-glow-pink animate-glow-pulse border-2 border-neon-pink"
                data-testid="button-get-started"
              >
                ▶ GET STARTED ◀
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
