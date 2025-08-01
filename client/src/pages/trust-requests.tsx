import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, UserCheck, Clock, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import NavigationHeader from "@/components/navigation-header";
import { apiRequest } from "@/lib/queryClient";

interface TrustRequestWithDetails {
  id: string;
  requesterId: string;
  targetId: string;
  requestedLevel: number;
  message?: string;
  status: string;
  createdAt: string;
  // Additional fields that would be joined
  requesterName?: string;
  requesterEmail?: string;
  requesterProfileImage?: string;
  targetName?: string;
  targetEmail?: string;
  targetProfileImage?: string;
}

export default function TrustRequestsPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: receivedRequests = [], isLoading: receivedLoading } = useQuery<TrustRequestWithDetails[]>({
    queryKey: ["/api/trust-requests/received"],
    retry: false,
  });

  const { data: sentRequests = [], isLoading: sentLoading } = useQuery<TrustRequestWithDetails[]>({
    queryKey: ["/api/trust-requests/sent"],
    retry: false,
  });

  const approveTrustRequestMutation = useMutation({
    mutationFn: async ({ requestId, trustLevel }: { requestId: string; trustLevel: number }) => {
      // First update the trust request to approved
      await apiRequest(`/api/trust-requests/${requestId}`, "PATCH", {
        status: "approved",
      });
      
      // Then create the actual trust relationship
      const response = await apiRequest("/api/trust", "POST", {
        trusteeId: receivedRequests.find(req => req.id === requestId)?.requesterId,
        trustLevel: trustLevel,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trust-requests/received"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/connections"] });
      toast({
        title: "Trust level assigned",
        description: "You have successfully assigned trust to this user.",
      });
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
        description: "Failed to assign trust level. Please try again.",
        variant: "destructive",
      });
    },
  });

  const denyTrustRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await apiRequest(`/api/trust-requests/${requestId}`, "PATCH", {
        status: "denied",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trust-requests/received"] });
      toast({
        title: "Request denied",
        description: "The trust request has been denied.",
      });
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
        description: "Failed to deny request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getTrustLevelBadge = (level: number) => {
    const colors = {
      1: "bg-red-100 text-red-800",
      2: "bg-orange-100 text-orange-800", 
      3: "bg-yellow-100 text-yellow-800",
      4: "bg-green-100 text-green-800",
      5: "bg-blue-100 text-blue-800",
    };
    return colors[level as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "denied":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Denied</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Trust Requests</h1>
          <p className="text-gray-600">
            Manage trust level requests from other users and view your sent requests.
          </p>
        </div>

        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="received">
              <Heart className="w-4 h-4 mr-2" />
              Received ({receivedRequests.filter(req => req.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              <UserCheck className="w-4 h-4 mr-2" />
              Sent ({sentRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4">
            {receivedLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading requests...</p>
                </div>
              </div>
            ) : receivedRequests.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No trust requests</h3>
                <p className="text-gray-600">No one has requested trust from you yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {receivedRequests.map((request) => (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={request.requesterProfileImage || undefined} />
                            <AvatarFallback>
                              {(request.requesterName || request.requesterEmail || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="font-semibold text-gray-900">
                                {request.requesterName || request.requesterEmail}
                              </h3>
                              <Badge className={getTrustLevelBadge(request.requestedLevel)}>
                                Trust Level {request.requestedLevel}
                              </Badge>
                              {getStatusBadge(request.status)}
                            </div>
                            
                            {request.message && (
                              <p className="text-gray-600 mb-3">{request.message}</p>
                            )}
                            
                            <p className="text-sm text-gray-500">
                              Requested {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        
                        {request.status === "pending" && (
                          <div className="flex space-x-2">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <Button
                                key={level}
                                size="sm"
                                variant={level === request.requestedLevel ? "default" : "outline"}
                                onClick={() => approveTrustRequestMutation.mutate({ requestId: request.id, trustLevel: level })}
                                disabled={approveTrustRequestMutation.isPending}
                                className={level === request.requestedLevel ? "bg-brand-blue hover:bg-blue-700" : ""}
                              >
                                {level}
                              </Button>
                            ))}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => denyTrustRequestMutation.mutate(request.id)}
                              disabled={denyTrustRequestMutation.isPending}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Deny
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {sentLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading requests...</p>
                </div>
              </div>
            ) : sentRequests.length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests sent</h3>
                <p className="text-gray-600">You haven't sent any trust requests yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentRequests.map((request) => (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={request.targetProfileImage || undefined} />
                          <AvatarFallback>
                            {(request.targetName || request.targetEmail || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {request.targetName || request.targetEmail}
                            </h3>
                            <Badge className={getTrustLevelBadge(request.requestedLevel)}>
                              Trust Level {request.requestedLevel}
                            </Badge>
                            {getStatusBadge(request.status)}
                          </div>
                          
                          {request.message && (
                            <p className="text-gray-600 mb-3">{request.message}</p>
                          )}
                          
                          <p className="text-sm text-gray-500">
                            Sent {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}