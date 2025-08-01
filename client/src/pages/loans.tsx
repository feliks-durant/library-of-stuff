import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, Package, HandHeart } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import NavigationHeader from "@/components/navigation-header";
import { apiRequest } from "@/lib/queryClient";
import { formatDisplayName } from "@shared/schema";

interface LoanWithDetails {
  id: string;
  itemId: string;
  borrowerId: string;
  lenderId: string;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  status: string;
  notes?: string;
  createdAt: string;
  // Additional fields that would be joined
  itemTitle?: string;
  itemImageUrl?: string;
  borrowerName?: string;
  borrowerUsername?: string;
  borrowerDiscriminator?: string;
  borrowerEmail?: string;
  borrowerProfileImage?: string;
  lenderName?: string;
  lenderUsername?: string;
  lenderDiscriminator?: string;
  lenderEmail?: string;
  lenderProfileImage?: string;
}

export default function LoansPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Fetch pending loan requests
  const { data: loanRequests = [], isLoading: requestsLoading } = useQuery<any[]>({
    queryKey: ["/api/loan-requests/pending"],
    retry: false,
  });

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

  const { data: borrowedLoans = [], isLoading: borrowedLoading } = useQuery<LoanWithDetails[]>({
    queryKey: ["/api/loans/my-borrowed"],
    retry: false,
  });

  const { data: lentLoans = [], isLoading: lentLoading } = useQuery<LoanWithDetails[]>({
    queryKey: ["/api/loans/my-lent"],
    retry: false,
  });

  const markAsReturnedMutation = useMutation({
    mutationFn: async (loanId: string) => {
      const response = await apiRequest(`/api/loans/${loanId}`, "PATCH", {
        status: "returned",
        actualEndDate: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Marked as Returned",
        description: "The item has been successfully marked as returned.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/loans/my-lent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loans/my-borrowed"] });
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
        description: "Failed to mark item as returned. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (loan: LoanWithDetails) => {
    if (loan.status === "returned") return "bg-green-100 text-green-800";
    if (loan.status === "overdue") return "bg-red-100 text-red-800";
    
    const daysLeft = differenceInDays(new Date(loan.expectedEndDate), new Date());
    if (daysLeft < 0) return "bg-red-100 text-red-800"; // Overdue
    if (daysLeft <= 3) return "bg-yellow-100 text-yellow-800"; // Due soon
    return "bg-blue-100 text-blue-800"; // Active
  };

  const getStatusText = (loan: LoanWithDetails) => {
    if (loan.status === "returned") return "Returned";
    if (loan.status === "overdue") return "Overdue";
    
    const daysLeft = differenceInDays(new Date(loan.expectedEndDate), new Date());
    if (daysLeft < 0) return "Overdue";
    if (daysLeft === 0) return "Due Today";
    if (daysLeft === 1) return "Due Tomorrow";
    if (daysLeft <= 7) return `Due in ${daysLeft} days`;
    return "Active";
  };

  const LoanCard = ({ loan, type }: { loan: LoanWithDetails; type: "borrowed" | "lent" }) => {
    const otherUser = type === "borrowed" 
      ? { 
          name: loan.lenderName, 
          username: loan.lenderUsername,
          discriminator: loan.lenderDiscriminator,
          email: loan.lenderEmail, 
          image: loan.lenderProfileImage 
        }
      : { 
          name: loan.borrowerName, 
          username: loan.borrowerUsername,
          discriminator: loan.borrowerDiscriminator,
          email: loan.borrowerEmail, 
          image: loan.borrowerProfileImage 
        };
    
    const displayName = formatDisplayName(otherUser) !== 'Unknown User' 
      ? formatDisplayName(otherUser) 
      : otherUser.name || otherUser.email;

    return (
      <Card key={loan.id}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                {loan.itemImageUrl ? (
                  <img 
                    src={loan.itemImageUrl} 
                    alt={loan.itemTitle}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <Package className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">
                  {loan.itemTitle || "Unknown Item"}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={otherUser.image} />
                    <AvatarFallback className="text-xs">
                      {otherUser.username?.[0]?.toUpperCase() || 
                       otherUser.name?.charAt(0).toUpperCase() || 
                       otherUser.email?.charAt(0).toUpperCase() || 
                       'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    {type === "borrowed" ? "from" : "to"} {displayName}
                  </span>
                </div>
              </div>
            </div>
            <Badge className={getStatusColor(loan)}>
              {getStatusText(loan)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {format(new Date(loan.startDate), "MMM d")} - {" "}
                  {format(new Date(loan.expectedEndDate), "MMM d, yyyy")}
                </span>
              </div>
              {loan.actualEndDate && (
                <>
                  <span>•</span>
                  <span>Returned {format(new Date(loan.actualEndDate), "MMM d, yyyy")}</span>
                </>
              )}
            </div>
            
            {loan.notes && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Notes:</p>
                <p className="text-sm">{loan.notes}</p>
              </div>
            )}
            
            {loan.status === "active" && type === "lent" && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => markAsReturnedMutation.mutate(loan.id)}
                disabled={markAsReturnedMutation.isPending}
              >
                {markAsReturnedMutation.isPending ? "Marking as Returned..." : "Mark as Returned"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading || !isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader 
        searchQuery=""
        onSearchChange={() => {}}
        onAddItem={() => {}}
        onScanQR={() => {}}
        onOpenProfile={() => {}}
      />
      <div className="container mx-auto p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Loans & Requests</h1>
        
        <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            Requests ({loanRequests.filter(req => req.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="borrowed" className="flex items-center gap-2">
            <HandHeart className="h-4 w-4" />
            Borrowed ({borrowedLoans.length})
          </TabsTrigger>
          <TabsTrigger value="lent" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Lent Out ({lentLoans.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="requests" className="mt-6">
          {requestsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : loanRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Loan Requests</h3>
                <p className="text-muted-foreground">
                  No one has requested to borrow your items yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {loanRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={request.borrowerProfileImage || undefined} />
                          <AvatarFallback>
                            {(request.borrowerName || request.borrowerEmail || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">
                              {request.borrowerName || request.borrowerEmail}
                            </h3>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm font-medium text-gray-900">{request.itemTitle}</span>
                            <Badge className={
                              request.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                              request.status === "approved" ? "bg-green-100 text-green-800" :
                              "bg-red-100 text-red-800"
                            }>
                              {request.status}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2">
                            <CalendarIcon className="w-4 h-4 inline mr-1" />
                            {format(new Date(request.requestedStartDate), "MMM d")} - {" "}
                            {format(new Date(request.requestedEndDate), "MMM d, yyyy")}
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
                          <Button
                            size="sm"
                            onClick={() => {
                              // Handle approve logic
                              console.log("Approve request:", request.id);
                            }}
                            className="bg-brand-blue hover:bg-blue-700"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              // Handle deny logic  
                              console.log("Deny request:", request.id);
                            }}
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
        
        <TabsContent value="borrowed" className="mt-6">
          {borrowedLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : borrowedLoans.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <HandHeart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Borrowed Items</h3>
                <p className="text-muted-foreground">
                  You haven't borrowed any items yet. Check out the item search to find things you can borrow.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {borrowedLoans.map((loan) => (
                <LoanCard key={loan.id} loan={loan} type="borrowed" />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="lent" className="mt-6">
          {lentLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : lentLoans.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Lent Items</h3>
                <p className="text-muted-foreground">
                  You haven't lent out any items yet. Visit your items page to loan out your belongings.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {lentLoans.map((loan) => (
                <LoanCard key={loan.id} loan={loan} type="lent" />
              ))}
            </div>
          )}
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}