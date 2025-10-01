import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertCircle, Loader2, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { User } from "@shared/schema";
import { formatDisplayName } from "@shared/schema";

export default function RequestTrust() {
  const { userId } = useParams();
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/users", userId],
    enabled: !!userId,
    retry: false,
  });

  const createTrustRequestMutation = useMutation({
    mutationFn: async (requestData: { targetId: string; message?: string }) => {
      const response = await apiRequest("/api/trust-requests", "POST", requestData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trust-requests/sent"] });
      toast({
        title: "Trust request sent",
        description: `You have requested trust from ${formatDisplayName(user!)}`,
      });
      setLocation('/');
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
        description: "Failed to send trust request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!userId) return;
    createTrustRequestMutation.mutate({
      targetId: userId,
      message: message || undefined,
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">
              Failed to load user information.
            </p>
            <Button onClick={() => setLocation('/')} data-testid="button-go-home">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const userName = formatDisplayName(user);
  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user.username?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6">
          <div className="text-center mb-6">
            <Heart className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Request Trust</h2>
            <p className="text-muted-foreground">
              You need to be trusted by this person to view their items
            </p>
          </div>

          <div className="flex flex-col items-center mb-6 p-4 bg-muted rounded-lg">
            <Avatar className="w-20 h-20 mb-3">
              <AvatarImage 
                src={user.profileImageUrl || undefined}
                alt={userName}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-foreground text-lg">{userName}</h3>
            {user.username && (
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="message" className="text-sm font-medium">
                Message (Optional)
              </Label>
              <Textarea
                id="message"
                placeholder="Why are you requesting trust from this person?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1"
                rows={3}
                data-testid="input-trust-message"
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setLocation('/')}
                className="flex-1"
                data-testid="button-cancel-trust-request"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createTrustRequestMutation.isPending}
                className="flex-1 bg-primary text-primary-foreground"
                data-testid="button-send-trust-request"
              >
                {createTrustRequestMutation.isPending ? "Sending..." : "Send Request"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
