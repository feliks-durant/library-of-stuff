import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { OnboardingModal } from "@/components/onboarding-modal";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Home from "@/pages/home";
import TrustAssignment from "@/pages/trust-assignment";
import MyItems from "@/pages/my-items";
import LoanRequests from "@/pages/loan-requests";
import Loans from "@/pages/loans";
import TrustRequests from "@/pages/trust-requests";
import QRItemScan from "@/pages/qr-item-scan";
import RequestTrust from "@/pages/request-trust";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user needs onboarding (no firstName, lastName, or username)
  const needsOnboarding = isAuthenticated && user && (!user.firstName || !user.lastName || !user.username);

  useEffect(() => {
    if (needsOnboarding) {
      setShowOnboarding(true);
    }
  }, [needsOnboarding]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  return (
    <>
      <Switch>
        {/* Public routes */}
        <Route path="/" component={Landing} />
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        
        {/* QR scan route - accessible to everyone */}
        <Route path="/qr/item/:itemId" component={QRItemScan} />
        {/* Trust request route - accessible to authenticated users */}
        <Route path="/request-trust/:userId" component={RequestTrust} />
        
        {/* Protected routes */}
        {isAuthenticated && (
          <>
            <Route path="/browse" component={Home} />
            <Route path="/my-items" component={MyItems} />
            <Route path="/loan-requests" component={LoanRequests} />
            <Route path="/loans" component={Loans} />
            <Route path="/trust-requests" component={TrustRequests} />
            <Route path="/trust/:userId" component={TrustAssignment} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>

      {/* No longer need onboarding modal - info collected during registration */}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
