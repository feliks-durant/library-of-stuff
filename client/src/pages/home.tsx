import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import NavigationHeader from "@/components/navigation-header";
import ItemCard from "@/components/item-card";
import AddItemModal from "@/components/add-item-modal";
import QRScannerModal from "@/components/qr-scanner-modal";
import UserProfileModal from "@/components/user-profile-modal";
import TrustAssignmentModal from "@/components/trust-assignment-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User as UserIcon, Heart } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import type { Item, User } from "@shared/schema";
import { formatUsername, formatDisplayName } from "@shared/schema";

// Trust Request Modal Component
function TrustRequestModal({ 
  isOpen, 
  onClose, 
  user 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  user: User;
}) {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTrustRequestMutation = useMutation({
    mutationFn: async (requestData: { targetId: string; message?: string }) => {
      const response = await apiRequest("/api/trust-requests", "POST", requestData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trust-requests/sent"] });
      toast({
        title: "Trust request sent",
        description: `You have requested trust from ${formatDisplayName(user)}`,
      });
      onClose();
      setMessage("");
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

  const userName = formatDisplayName(user);

  const handleSubmit = () => {
    createTrustRequestMutation.mutate({
      targetId: user.id,
      message: message || undefined,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Trust from {userName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Send a trust request to {userName}. They will decide what trust level to assign you.
          </p>
          
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
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createTrustRequestMutation.isPending}
            className="bg-brand-blue hover:bg-blue-700"
          >
            {createTrustRequestMutation.isPending ? "Sending..." : "Send Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// User Card Component
function UserCard({ user, existingTrustLevel }: { user: User; existingTrustLevel?: number }) {
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  
  const userName = formatDisplayName(user);
  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user.username?.[0]?.toUpperCase() || "U";

  return (
    <>
      <Card className="bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow border overflow-hidden">
        <CardContent className="p-6 text-center">
          <Avatar className="w-16 h-16 mx-auto mb-4">
            <AvatarImage 
              src={user.profileImageUrl || undefined}
              alt={userName}
              className="object-cover"
            />
            <AvatarFallback className="text-lg">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          
          {user.firstName && user.lastName ? (
            <>
              <h3 className="font-semibold text-foreground mb-1">{user.firstName} {user.lastName}</h3>
              {user.username && (
                <p className="text-sm text-muted-foreground mb-3">@{user.username}</p>
              )}
            </>
          ) : (
            <h3 className="font-semibold text-foreground mb-4">{userName}</h3>
          )}
          {existingTrustLevel && (
            <div className="mb-3">
              <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                Trust Level: {existingTrustLevel}
              </span>
            </div>
          )}
          
          <div className="space-y-2">
            <Button
              onClick={() => setShowTrustModal(true)}
              className="w-full bg-brand-blue hover:bg-blue-700"
            >
              <UserIcon className="w-4 h-4 mr-2" />
              {existingTrustLevel ? 'Update Trust Level' : 'Set Trust Level'}
            </Button>
            
            {!existingTrustLevel && (
              <Button
                onClick={() => setShowRequestModal(true)}
                variant="outline"
                className="w-full"
              >
                <Heart className="w-4 h-4 mr-2" />
                Request Trust
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      
      <TrustAssignmentModal 
        isOpen={showTrustModal}
        onClose={() => setShowTrustModal(false)}
        user={user}
      />
      
      <TrustRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        user={user}
      />
    </>
  );
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [searchTab, setSearchTab] = useState("items");
  const [relationshipFilter, setRelationshipFilter] = useState("all");

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const { data: searchResults = [] } = useQuery<Item[]>({
    queryKey: ["/api/items/search", { q: searchQuery }],
    enabled: searchQuery.length > 0,
    retry: false,
  });

  const { data: userSearchResults = [] } = useQuery<User[]>({
    queryKey: ["/api/users/search", { q: searchQuery }],
    enabled: searchQuery.length > 0,
    retry: false,
  });

  // Get user connections to show existing trust levels
  const { data: userConnections = [] } = useQuery<Array<{ trusteeId: string; trustLevel: number }>>({
    queryKey: ["/api/users/connections"],
    enabled: searchTab === "users",
  });

  // Process and sort items
  const filteredItems = searchQuery ? searchResults : items;
  
  const categoryFilteredItems = categoryFilter === "all" 
    ? filteredItems 
    : filteredItems.filter((item: Item) => item.category === categoryFilter);

  const sortedItems = [...categoryFilteredItems].sort((a, b) => {
    if (sortBy === "alphabetical") {
      return a.title.localeCompare(b.title);
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  // Process and sort users with existing trust levels
  const usersWithTrust = userSearchResults.map((user: User) => {
    const connection = userConnections.find((conn: any) => conn.trusteeId === user.id);
    return {
      ...user,
      existingTrustLevel: connection?.trustLevel
    };
  });

  // Sort users: those with existing relationships first
  const sortedUsers = [...usersWithTrust].sort((a, b) => {
    if (a.existingTrustLevel && !b.existingTrustLevel) return -1;
    if (!a.existingTrustLevel && b.existingTrustLevel) return 1;
    if (a.existingTrustLevel && b.existingTrustLevel) {
      return b.existingTrustLevel - a.existingTrustLevel; // Higher trust first
    }
    return 0; // Keep original order for users without trust
  });

  // Filter users based on relationship filter
  const filteredUsers = relationshipFilter === "all" 
    ? sortedUsers 
    : relationshipFilter === "existing" 
      ? sortedUsers.filter(user => user.existingTrustLevel)
      : sortedUsers.filter(user => !user.existingTrustLevel);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader 
          onAddItem={() => setShowAddModal(true)}
          onOpenProfile={() => setShowProfileModal(true)}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-card rounded-xl shadow-sm border overflow-hidden animate-pulse">
                <div className="w-full h-48 bg-muted"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader 
        onAddItem={() => setShowAddModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Don't buy, borrow. 
          </h2>
          {/* <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-6">
            Browse through items shared by your trusted network. Only items you're trusted to borrow will appear.
          </p> */}
          
          {/* Search Bar */}
          <div className="max-w-lg mx-auto">
            <div className="relative">
              <Input
                type="search"
                placeholder="Search for things or people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 border-gray-300 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
            </div>
          </div>
        </div>

        {/* Filters - only show when not searching */}
        {!searchQuery && (
          <div className="mb-6 flex flex-wrap items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 sm:mb-0">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="tools">Tools & Hardware</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="sports">Sports & Recreation</SelectItem>
                  <SelectItem value="household">Household Items</SelectItem>
                  <SelectItem value="vehicles">Vehicles</SelectItem>
                  <SelectItem value="books">Books & Media</SelectItem>
                  <SelectItem value="clothing">Clothing & Accessories</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recently Added</SelectItem>
                  <SelectItem value="alphabetical">Alphabetical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {sortedItems.length} items available to borrow
            </div>
          </div>
        )}

        {/* Search Results or Items Grid */}
        {searchQuery ? (
          // Show search results with tabs
          <Tabs value={searchTab} onValueChange={setSearchTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="items">
                Items ({searchResults?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="users">
                Users ({userSearchResults?.length || 0})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="items" className="space-y-6">
              {/* Item-specific filters */}
              <div className="mb-6 flex flex-wrap items-center justify-between">
                <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="tools">Tools & Hardware</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="sports">Sports & Recreation</SelectItem>
                      <SelectItem value="household">Household Items</SelectItem>
                      <SelectItem value="vehicles">Vehicles</SelectItem>
                      <SelectItem value="books">Books & Media</SelectItem>
                      <SelectItem value="clothing">Clothing & Accessories</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Recently Added</SelectItem>
                      <SelectItem value="alphabetical">Alphabetical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {sortedItems.length} items available to borrow
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sortedItems.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
              {sortedItems.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">No items found for "{searchQuery}"</p>
                  <p className="text-muted-foreground mt-2 opacity-70">Try a different search term or adjust your filters.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="users" className="space-y-6">
              {/* User-specific filters */}
              <div className="mb-6 flex flex-wrap items-center justify-between">
                <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                  <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="existing">Existing Relationships</SelectItem>
                      <SelectItem value="new">New Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {filteredUsers.length} users found
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredUsers.map((user) => (
                  <UserCard key={user.id} user={user} existingTrustLevel={user.existingTrustLevel} />
                ))}
              </div>
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">No users found for "{searchQuery}"</p>
                  <p className="text-muted-foreground mt-2 opacity-70">Try a different search term or adjust your filter.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-boxes text-muted-foreground text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No items available</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? "No items match your search criteria." 
                : "No one has shared items with you yet, or you need to be assigned trust levels to see items."
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddModal(true)} className="bg-brand-blue hover:bg-blue-700">
                <i className="fas fa-plus mr-2"></i>
                Add Your First Item
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <AddItemModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <QRScannerModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} />
      <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </div>
  );
}
