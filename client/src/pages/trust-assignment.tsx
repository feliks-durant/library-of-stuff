import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User } from "@shared/schema";
import NavigationHeader from "@/components/navigation-header";

export default function TrustAssignment() {
  const { userId } = useParams();
  const [, setLocation] = useLocation();
  const [trustLevel, setTrustLevel] = useState([3]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["/api/users", userId],
    enabled: !!userId,
  });

  const { data: currentTrust } = useQuery<{ trustLevel: number }>({
    queryKey: ["/api/trust", userId],
    enabled: !!userId,
  });

  useEffect(() => {
    if (currentTrust?.trustLevel) {
      setTrustLevel([currentTrust.trustLevel]);
    }
  }, [currentTrust]);

  const saveTrustMutation = useMutation({
    mutationFn: async (data: { trusteeId: string; trustLevel: number }) => {
      const response = await apiRequest("POST", "/api/trust", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Trust level saved",
        description: "The trust level has been set successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trust"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      setLocation("/");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save trust level. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!userId) return;
    saveTrustMutation.mutate({
      trusteeId: userId,
      trustLevel: trustLevel[0],
    });
  };

  const getTrustDescription = (level: number) => {
    const descriptions = {
      1: { title: "Basic Trust", desc: "Acquaintance level - very basic items only" },
      2: { title: "Low Trust", desc: "Someone you've met a few times" },
      3: { title: "Moderate Trust", desc: "Someone you know personally and would lend common items to" },
      4: { title: "High Trust", desc: "Close friend or family member" },
      5: { title: "Complete Trust", desc: "Complete trust with valuable or personal items" }
    };
    return descriptions[level as keyof typeof descriptions] || descriptions[3];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-md mx-auto p-6">
          <div className="w-24 h-24 bg-muted rounded-full mx-auto"></div>
          <div className="h-6 bg-muted rounded w-48 mx-auto"></div>
          <div className="h-4 bg-muted rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-red-500 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">User Not Found</h3>
            <p className="text-muted-foreground mb-6">
              The user profile you're trying to access could not be found.
            </p>
            <Button onClick={() => setLocation("/")} variant="outline">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const description = getTrustDescription(trustLevel[0]);

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader 
        onAddItem={() => {}}
        onOpenProfile={() => {}}
      />
      <div className="max-w-md mx-auto p-6 h-full flex flex-col">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="mr-4 p-2"
          >
            <i className="fas fa-arrow-left text-xl"></i>
          </Button>
          <h2 className="text-xl font-semibold text-foreground">Set Trust Level</h2>
        </div>

        <div className="flex-1">
          <div className="text-center mb-8">
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarImage 
                src={user.profileImageUrl || undefined} 
                alt={`${user.firstName} ${user.lastName}`}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-muted-foreground">{user.email}</p>
          </div>

          <Card className="mb-8">
            <CardContent className="pt-6">
              <h4 className="font-semibold text-foreground mb-4">
                How much do you trust this person?
              </h4>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Slider
                    value={trustLevel}
                    onValueChange={setTrustLevel}
                    max={5}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-bold text-2xl text-primary">
                    {trustLevel[0]}
                  </span>
                </div>
                
                <Card>
                  <CardContent className="pt-4 text-center">
                    <p className="font-medium text-foreground mb-1">
                      {description.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {description.desc}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button 
              onClick={handleSave}
              disabled={saveTrustMutation.isPending}
              className="w-full bg-primary text-primary-foreground hover:opacity-90 py-4 font-semibold"
            >
              {saveTrustMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Saving...
                </>
              ) : (
                "Set Trust Level"
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => setLocation("/")}
              className="w-full py-4 font-medium"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
