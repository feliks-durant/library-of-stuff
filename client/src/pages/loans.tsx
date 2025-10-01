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
import { useEffect, useState } from "react";
import NavigationHeader from "@/components/navigation-header";
import AddItemModal from "@/components/add-item-modal";
import QRScannerModal from "@/components/qr-scanner-modal";
import UserProfileModal from "@/components/user-profile-modal";
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
  borrowerFirstName?: string;
  borrowerLastName?: string;
  borrowerUsername?: string;
  borrowerEmail?: string;
  borrowerProfileImage?: string;
  lenderFirstName?: string;
  lenderLastName?: string;
  lenderUsername?: string;
  lenderEmail?: string;
  lenderProfileImage?: string;
}

export default function LoansPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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

  const [pendingApproval, setPendingApproval] = useState<string | null>(null);
  const [pendingDenial, setPendingDenial] = useState<string | null>(null);

  const approveLoanRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      setPendingApproval(requestId);
      const response = await apiRequest(`/api/loan-requests/${requestId}`, "PATCH", {
        status: "approved",
      });
      return response.json();
    },
    onSuccess: () => {
      setPendingApproval(null);
      toast({
        title: "Request Approved",
        description: "The loan request has been approved and a loan has been created.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/loan-requests/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loans/my-lent"] });
    },
    onError: (error) => {
      setPendingApproval(null);
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
        description: "Failed to approve request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const denyLoanRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      setPendingDenial(requestId);
      const response = await apiRequest(`/api/loan-requests/${requestId}`, "PATCH", {
        status: "denied",
      });
      return response.json();
    },
    onSuccess: () => {
      setPendingDenial(null);
      toast({
        title: "Request Denied",
        description: "The loan request has been denied.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/loan-requests/pending"] });
    },
    onError: (error) => {
      setPendingDenial(null);
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
          firstName: loan.lenderFirstName,
          lastName: loan.lenderLastName,
          username: loan.lenderUsername,
          email: loan.lenderEmail, 
          image: loan.lenderProfileImage 
        }
      : { 
          firstName: loan.borrowerFirstName,
          lastName: loan.borrowerLastName,
          username: loan.borrowerUsername,
          email: loan.borrowerEmail, 
          image: loan.borrowerProfileImage 
        };
    
    const fullName = [otherUser.firstName, otherUser.lastName].filter(Boolean).join(' ');
    const displayName = fullName && otherUser.username 
      ? `${fullName} @${otherUser.username}`
      : fullName 
      ? fullName
      : otherUser.username 
      ? `@${otherUser.username}`
      : otherUser.email;

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
                <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
                  <Avatar className="w-5 h-5 flex-shrink-0">
                    <AvatarImage src={otherUser.image} />
                    <AvatarFallback className="text-xs">
                      {otherUser.username?.[0]?.toUpperCase() || 
                       otherUser.firstName?.charAt(0).toUpperCase() || 
                       otherUser.email?.charAt(0).toUpperCase() || 
                       'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">
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
    <div className="min-h-screen bg-background">
      <NavigationHeader 
        onAddItem={() => setShowAddItemModal(true)}
        onScanQR={() => setShowQRScanner(true)}
        onOpenProfile={() => setShowProfileModal(true)}
      />
      <div className="container mx-auto p-6 max-w-4xl">
        <h1 className="text-2xl font-bold text-foreground mb-6">Loans & Requests</h1>
        
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
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
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
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start space-x-3 min-w-0 flex-1">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">
                          <AvatarImage src={request.borrowerProfileImage || undefined} />
                          <AvatarFallback>
                            {(request.borrowerName || request.borrowerEmail || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                                {(request.borrowerFirstName || request.borrowerLastName) ? (
                                  <>
                                    <span className="text-foreground">
                                      {[request.borrowerFirstName, request.borrowerLastName].filter(Boolean).join(' ')}
                                    </span>
                                    {request.borrowerUsername && (
                                      <span className="text-muted-foreground ml-1">@{request.borrowerUsername}</span>
                                    )}
                                  </>
                                ) : (
                                  request.borrowerUsername ? `@${request.borrowerUsername}` : request.borrowerEmail
                                )}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                                  {request.itemTitle}
                                </span>
                                <Badge className={`text-xs ${
                                  request.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                                  request.status === "approved" ? "bg-green-100 text-green-800" :
                                  "bg-red-100 text-red-800"
                                }`}>
                                  {request.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                            <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                            <span className="truncate">
                              {format(new Date(request.requestedStartDate), "MMM d")} - {" "}
                              {format(new Date(request.requestedEndDate), "MMM d, yyyy")}
                            </span>
                          </div>
                          
                          {request.message && (
                            <p className="text-muted-foreground mb-3 text-xs sm:text-sm line-clamp-2">{request.message}</p>
                          )}
                          
                          <p className="text-xs text-muted-foreground opacity-70">
                            Requested {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                      
                      {request.status === "pending" && (
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            onClick={() => approveLoanRequestMutation.mutate(request.id)}
                            disabled={pendingApproval !== null || pendingDenial !== null}
                            className="bg-primary text-primary-foreground hover:opacity-90 text-xs sm:text-sm"
                          >
                            {pendingApproval === request.id ? "Approving..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => denyLoanRequestMutation.mutate(request.id)}
                            disabled={pendingApproval !== null || pendingDenial !== null}
                            className="text-red-600 hover:bg-red-50 text-xs sm:text-sm"
                          >
                            {pendingDenial === request.id ? "Denying..." : "Deny"}
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
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
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
                <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
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
      
      <AddItemModal
        isOpen={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
      />
      
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
      />
      
      <UserProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}