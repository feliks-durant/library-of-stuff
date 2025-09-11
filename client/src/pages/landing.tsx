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
    <div className="min-h-screen bg-background text-foreground dark:bg-background dark:text-foreground">
      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="text-center max-w-2xl mx-auto">
          <h1 
            className="text-5xl md:text-6xl font-bold mb-8 animate-fade-up"
            data-testid="text-hero-title"
          >
            Welcome to the Library of Stuff
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up animation-delay-200">
            <Button 
              onClick={handleLogin}
              size="lg"
              className="bg-brand-blue hover:bg-blue-700 text-white px-8 py-3 text-lg"
              data-testid="button-enter"
            >
              Enter
            </Button>
            <Button 
              onClick={handleLearnMore}
              variant="outline"
              size="lg"
              className="border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white px-8 py-3 text-lg"
              data-testid="button-learn-more"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Explanation Section */}
      <section 
        ref={explanationRef}
        id="learn-more"
        className="py-16 px-4 bg-muted dark:bg-muted"
        data-testid="section-learn-more"
      >
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none text-foreground dark:text-foreground">
            <p className="text-xl leading-relaxed mb-6">
              The Library of Stuff makes it easy to borrow and loan every day items from people you already trust. 
              Trust is one way and customizable for each relationship.
            </p>
            
            <p className="text-lg leading-relaxed mb-6">
              <strong>Example:</strong> Alice adds a guitar to the library, trust level 3. Alice adds Bob at trust level 3 
              and Chewy at trust level 2. Bob can see Alice's guitar but Chewy can't. Neither Bob nor Chewy knows 
              what level of trust Alice has granted them.
            </p>
            
            <p className="text-lg leading-relaxed mb-6">
              When Bob wants to borrow the guitar, he texts Alice. The app does not include messaging on the assumption 
              that if you trust someone, you know how to contact them. They meet up to exchange the guitar. Bob sends 
              a request for the guitar which Alice approves. Alice can see the guitar in her list of loans, and Bob can 
              see it in his list of borrows.
            </p>

            <div className="mt-12 text-center">
              <Button 
                onClick={handleLogin}
                size="lg"
                className="bg-brand-blue hover:bg-blue-700 text-white px-12 py-4 text-lg"
                data-testid="button-get-started"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
