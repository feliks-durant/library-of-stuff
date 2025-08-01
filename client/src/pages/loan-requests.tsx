import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, MessageSquare, Check, X } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

interface LoanRequestWithDetails {
  id: string;
  itemId: string;
  borrowerId: string;
  requestedStartDate: string;
  requestedEndDate: string;
  status: string;
  message?: string;
  createdAt: string;
  updatedAt: string;
  // Additional fields that would be joined
  itemTitle?: string;
  borrowerName?: string;
  borrowerEmail?: string;
  borrowerProfileImage?: string;
}

export default function LoanRequestsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading } = useAuth();

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

  const { data: requests = [], isLoading: requestsLoading } = useQuery<LoanRequestWithDetails[]>({
    queryKey: ["/api/loan-requests/pending"],
    retry: false,
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest(`/api/loan-requests/${id}`, "PATCH", { status });
    },
    onSuccess: (_, { status }) => {
      toast({
        title: status === "approved" ? "Request Approved" : "Request Denied",
        description: `The loan request has been ${status}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/loan-requests/pending"] });
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
        description: error.message || "Failed to update request",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (requestId: string) => {
    updateRequestMutation.mutate({ id: requestId, status: "approved" });
  };

  const handleDeny = (requestId: string) => {
    updateRequestMutation.mutate({ id: requestId, status: "denied" });
  };

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  if (requestsLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Loan Requests</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Pending Loan Requests</h1>
      
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Pending Requests</h3>
            <p className="text-muted-foreground">
              You don't have any pending loan requests at the moment.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.borrowerProfileImage} />
                      <AvatarFallback>
                        {request.borrowerName ? 
                          request.borrowerName.charAt(0).toUpperCase() : 
                          request.borrowerEmail?.charAt(0).toUpperCase()
                        }
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {request.borrowerName || request.borrowerEmail}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        wants to borrow "{request.itemTitle || "Unknown Item"}"
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {request.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {format(new Date(request.requestedStartDate), "MMM d")} - {" "}
                        {format(new Date(request.requestedEndDate), "MMM d, yyyy")}
                      </span>
                    </div>
                    <span>•</span>
                    <span>Requested {format(new Date(request.createdAt), "MMM d, yyyy")}</span>
                  </div>
                  
                  {request.message && (
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-sm font-medium mb-1">Message:</p>
                      <p className="text-sm">{request.message}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleApprove(request.id)}
                      disabled={updateRequestMutation.isPending}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleDeny(request.id)}
                      disabled={updateRequestMutation.isPending}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Deny
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}