import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleLogin = () => {
    // Check if user just logged out and needs fresh authentication
    const urlParams = new URLSearchParams(window.location.search);
    const loggedOut = urlParams.get('logged_out') === 'true';
    
    // Force fresh authentication if user just logged out
    const loginUrl = loggedOut ? "/api/login?force=true" : "/api/login";
    window.location.href = loginUrl;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-brand-blue rounded-full flex items-center justify-center">
              <i className="fas fa-boxes text-white text-2xl"></i>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-brand-blue">
            Library of Stuff
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Share what you trust with people you trust
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center">
                <i className="fas fa-check text-white text-sm"></i>
              </div>
              <p className="text-sm text-gray-700">Share items with trusted friends</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center">
                <i className="fas fa-check text-white text-sm"></i>
              </div>
              <p className="text-sm text-gray-700">Private trust scoring system</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-brand-green rounded-full flex items-center justify-center">
                <i className="fas fa-check text-white text-sm"></i>
              </div>
              <p className="text-sm text-gray-700">QR code profile sharing</p>
            </div>
          </div>
          
          <Button onClick={handleLogin} className="w-full bg-brand-blue hover:bg-blue-700">
            Get Started
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            By continuing, you agree to our terms of service and privacy policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
