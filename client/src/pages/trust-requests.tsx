import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, UserCheck, Clock, CheckCircle, XCircle, Search, Users } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import NavigationHeader from "@/components/navigation-header";
import TrustAssignmentModal from "@/components/trust-assignment-modal";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface TrustRequestWithDetails {
  id: string;
  requesterId: string;
  targetId: string;
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

interface Connection {
  trusteeId: string;
  trustLevel: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImageUrl?: string;
  createdAt?: string;
}

export default function MyConnectionsPage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [activeTab, setActiveTab] = useState("requests");

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

  const { data: connections = [], isLoading: connectionsLoading } = useQuery<Connection[]>({
    queryKey: ["/api/users/connections"],
    retry: false,
  });

  // Filter and sort connections
  const filteredConnections = connections.filter(connection =>
    searchQuery === "" || 
    `${connection.firstName} ${connection.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedConnections = [...filteredConnections].sort((a, b) => {
    switch (sortBy) {
      case "name":
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      case "trust":
        return b.trustLevel - a.trustLevel;
      case "recent":
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      default:
        return 0;
    }
  });

  // When trust is assigned via the modal, automatically approve the request
  const handleTrustAssigned = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/trust-requests/received"] });
    queryClient.invalidateQueries({ queryKey: ["/api/users/connections"] });
    toast({
      title: "Trust request approved",
      description: "Trust level has been set successfully.",
    });
    setSelectedUser(null);
  };

  const denyTrustRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      await apiRequest(`/api/trust-requests/${requestId}/deny`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trust-requests/received"] });
      toast({
        title: "Trust request denied",
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
      console.error("Error denying trust request:", error);
      toast({
        title: "Error",
        description: "Failed to deny trust request. Please try again.",
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
        <NavigationHeader 
          searchQuery=""
          onSearchChange={() => {}}
          onAddItem={() => {}}
          onScanQR={() => {}}
          onOpenProfile={() => {}}
        />
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
      <NavigationHeader 
        searchQuery=""
        onSearchChange={() => {}}
        onAddItem={() => {}}
        onScanQR={() => {}}
        onOpenProfile={() => {}}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Connections</h1>
          <p className="text-gray-600">
            Manage trust requests and view your connections with trust levels.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="requests">
              <Heart className="w-4 h-4 mr-2" />
              Requests ({receivedRequests.filter(req => req.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="connections">
              <Users className="w-4 h-4 mr-2" />
              Connections ({connections.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
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
                            <Button
                              size="sm"
                              onClick={() => setSelectedUser({ 
                                id: request.requesterId, 
                                firstName: request.requesterName?.split(' ')[0] || '', 
                                lastName: request.requesterName?.split(' ')[1] || '',
                                email: request.requesterEmail || '',
                                profileImageUrl: request.requesterProfileImage || undefined
                              } as User)}
                              className="bg-brand-blue hover:bg-blue-700"
                            >
                              Set Trust Level
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => denyTrustRequestMutation.mutate(request.id)}
                              disabled={denyTrustRequestMutation.isPending}
                              className="text-red-600 hover:bg-red-50"
                            >
                              {denyTrustRequestMutation.isPending ? "..." : "Deny"}
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

          <TabsContent value="connections" className="space-y-6">
            {/* Search and Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search connections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="trust">Trust Level (High-Low)</SelectItem>
                  <SelectItem value="recent">Recently Added</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {connectionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading connections...</p>
                </div>
              </div>
            ) : sortedConnections.length === 0 ? (
              searchQuery ? (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No connections found</h3>
                  <p className="text-gray-600">Try adjusting your search query.</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No connections yet</h3>
                  <p className="text-gray-600">Start building trust relationships by setting trust levels for other users.</p>
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedConnections.map((connection) => (
                  <Card key={connection.trusteeId} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage 
                            src={connection.profileImageUrl || undefined}
                            alt={`${connection.firstName} ${connection.lastName}`}
                            className="object-cover"
                          />
                          <AvatarFallback>
                            {connection.firstName?.[0]}{connection.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {connection.firstName} {connection.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">{connection.email}</p>
                          
                          <div className="mt-3">
                            <Badge className={getTrustLevelBadge(connection.trustLevel)}>
                              Trust Level {connection.trustLevel}
                            </Badge>
                          </div>
                          
                          <div className="mt-4">
                            <Button
                              onClick={() => setSelectedUser({
                                id: connection.trusteeId,
                                firstName: connection.firstName || '',
                                lastName: connection.lastName || '',
                                email: connection.email || '',
                                profileImageUrl: connection.profileImageUrl || '',
                              } as User)}
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              Update Trust Level
                            </Button>
                          </div>
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
      
      {selectedUser && (
        <TrustAssignmentModal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          user={selectedUser}
          onTrustAssigned={handleTrustAssigned}
        />
      )}
    </div>
  );
}