import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import NavigationHeader from "@/components/navigation-header";
import EditItemModal from "@/components/edit-item-modal";
import { LoanItemModal } from "@/components/loan-item-modal";
import { MyItemDetailModal } from "@/components/my-item-detail-modal";
import AddItemModal from "@/components/add-item-modal";
import QRScannerModal from "@/components/qr-scanner-modal";
import UserProfileModal from "@/components/user-profile-modal";
import TrustAssignmentModal from "@/components/trust-assignment-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { HandHeart, Printer, CheckSquare, Square } from "lucide-react";
import type { Item } from "@shared/schema";
import { generateQRCodesPDF } from "@/lib/pdfGenerator";
import { useAuth } from "@/hooks/useAuth";

export default function MyItems() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [loaningItemId, setLoaningItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showMyItemDetail, setShowMyItemDetail] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [trustUserId, setTrustUserId] = useState<string | null>(null);
  
  // Print mode state
  const [printMode, setPrintMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Fetch user data for trust modal
  const { data: trustUser } = useQuery({
    queryKey: [`/api/users/${trustUserId}`],
    enabled: !!trustUserId,
  });

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items/my"],
  });

  const { data: searchResults = [] } = useQuery<Item[]>({
    queryKey: ["/api/items/my/search", { q: searchQuery }],
    enabled: searchQuery.length > 0,
  });

  const filteredItems = searchQuery ? searchResults : items;

  const categoryFilteredItems = categoryFilter === "all" 
    ? filteredItems 
    : filteredItems.filter(item => item.category === categoryFilter);

  const visibilityFilteredItems = visibilityFilter === "all"
    ? categoryFilteredItems
    : visibilityFilter === "visible"
      ? categoryFilteredItems.filter(item => !item.isHidden)
      : categoryFilteredItems.filter(item => item.isHidden);

  const sortedItems = [...visibilityFilteredItems].sort((a, b) => {
    if (sortBy === "alphabetical") {
      return a.title.localeCompare(b.title);
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const handleItemClick = (item: Item) => {
    if (printMode) {
      // In print mode, toggle selection
      toggleItemSelection(item.id);
    } else {
      setSelectedItem(item);
      setShowMyItemDetail(true);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedItemIds.size === sortedItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(sortedItems.map(item => item.id)));
    }
  };

  const handleEnterPrintMode = () => {
    setPrintMode(true);
    setSelectedItemIds(new Set());
  };

  const handleExitPrintMode = () => {
    setPrintMode(false);
    setSelectedItemIds(new Set());
  };

  const handleGeneratePDF = async () => {
    const selectedItems = sortedItems.filter(item => selectedItemIds.has(item.id));
    if (selectedItems.length === 0) return;

    await generateQRCodesPDF(selectedItems, user?.username || 'user');
    // Exit print mode after generating PDF
    handleExitPrintMode();
  };

  const handleEditItem = (item: Item) => {
    setSelectedItem(null);
    setShowMyItemDetail(false);
    setEditingItemId(item.id);
  };

  const handleLoanItem = (item: Item) => {
    setSelectedItem(null);
    setShowMyItemDetail(false);
    setLoaningItemId(item.id);
  };

  const handleTrustClick = (userId: string) => {
    setTrustUserId(userId);
    setShowTrustModal(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader 
          onAddItem={() => setShowAddItemModal(true)}
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
        onAddItem={() => setShowAddItemModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground">My Items</h2>
            <p className="text-lg text-muted-foreground mt-2">
              {printMode ? "Select items to print QR codes" : "Manage the items you've shared"}
            </p>
          </div>
          <div className="flex gap-2">
            {printMode ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleExitPrintMode}
                  data-testid="button-exit-print-mode"
                >
                  <i className="fas fa-times mr-2"></i>
                  Cancel
                </Button>
                <Button 
                  onClick={handleGeneratePDF}
                  disabled={selectedItemIds.size === 0}
                  data-testid="button-generate-pdf"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Generate PDF ({selectedItemIds.size})
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleEnterPrintMode}
                  disabled={sortedItems.length === 0}
                  data-testid="button-enter-print-mode"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print QR Codes
                </Button>
                <Link href="/browse">
                  <Button variant="outline" data-testid="button-back-to-browse">
                    <i className="fas fa-arrow-left mr-2"></i>
                    Back to Browse
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative max-w-md">
            <Input
              type="search"
              placeholder="Search your items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
          </div>

          <div className="flex flex-wrap items-center justify-between">
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

              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="visible">Visible Items</SelectItem>
                  <SelectItem value="hidden">Hidden Items</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {sortedItems.length} items
              {visibilityFilter === "all" && items.filter(item => item.isHidden).length > 0 && (
                <span className="ml-2 text-muted-foreground opacity-70">
                  ({items.filter(item => item.isHidden).length} hidden)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Print Mode Select All */}
        {printMode && sortedItems.length > 0 && (
          <div className="mb-4">
            <Button
              variant="outline"
              onClick={toggleSelectAll}
              data-testid="button-toggle-select-all"
            >
              {selectedItemIds.size === sortedItems.length ? (
                <>
                  <Square className="mr-2 h-4 w-4" />
                  Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Select All
                </>
              )}
            </Button>
          </div>
        )}

        {/* Items Grid */}
        {sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-boxes text-muted-foreground text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No items found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery 
                ? "No items match your search criteria." 
                : "You haven't added any items yet."
              }
            </p>
            {!searchQuery && (
              <Link href="/">
                <Button className="bg-brand-blue hover:bg-blue-700">
                  <i className="fas fa-plus mr-2"></i>
                  Add Your First Item
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedItems.map((item) => (
              <Card 
                key={item.id} 
                className="bg-card rounded-xl shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200 border overflow-hidden cursor-pointer relative"
                onClick={() => handleItemClick(item)}
                data-testid={`card-item-${item.id}`}
              >
                {/* Print Mode Checkbox */}
                {printMode && (
                  <div className="absolute top-2 right-2 z-10">
                    <Checkbox
                      checked={selectedItemIds.has(item.id)}
                      onCheckedChange={() => toggleItemSelection(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-background border-2"
                      data-testid={`checkbox-item-${item.id}`}
                    />
                  </div>
                )}
                
                {/* Item Image */}
                <div className="w-full h-48 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onLoad={() => console.log("Image loaded successfully:", item.imageUrl)}
                      onError={() => console.log("Image failed to load:", item.imageUrl)}
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <i className="fas fa-box text-muted-foreground text-4xl"></i>
                    </div>
                  )}
                  
                  {/* Hidden Item Indicator */}
                  {item.isHidden && !printMode && (
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary">
                        Hidden
                      </Badge>
                    </div>
                  )}
                </div>
                
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    {item.isHidden && (
                      <Badge variant="outline" className="text-xs">
                        Hidden
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="capitalize">
                      {item.category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Trust Level: {item.trustLevel}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* My Item Detail Modal */}
      <MyItemDetailModal
        item={selectedItem}
        isOpen={showMyItemDetail}
        onClose={() => {
          setShowMyItemDetail(false);
          setSelectedItem(null);
        }}
        onEdit={handleEditItem}
        onLoan={handleLoanItem}
        onTrustClick={handleTrustClick}
      />

      {/* Edit Item Modal */}
      <EditItemModal 
        isOpen={!!editingItemId}
        onClose={() => setEditingItemId(null)}
        itemId={editingItemId}
      />

      {/* Loan Item Modal */}
      {loaningItemId && (
        <LoanItemModal 
          isOpen={!!loaningItemId}
          onClose={() => setLoaningItemId(null)}
          item={sortedItems.find(item => item.id === loaningItemId) || null}
        />
      )}

      {/* Trust Assignment Modal */}
      {trustUserId && trustUser && (
        <TrustAssignmentModal
          isOpen={showTrustModal}
          onClose={() => {
            setShowTrustModal(false);
            setTrustUserId(null);
          }}
          user={trustUser}
        />
      )}
      
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