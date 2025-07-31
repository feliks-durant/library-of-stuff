import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import NavigationHeader from "@/components/navigation-header";
import ItemCard from "@/components/item-card";
import AddItemModal from "@/components/add-item-modal";
import QRScannerModal from "@/components/qr-scanner-modal";
import UserProfileModal from "@/components/user-profile-modal";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Item } from "@shared/schema";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const { data: items = [], isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const { data: searchResults = [] } = useQuery<Item[]>({
    queryKey: ["/api/items/search", { q: searchQuery }],
    enabled: searchQuery.length > 0,
  });

  const filteredItems = searchQuery ? searchResults : items;

  const categoryFilteredItems = categoryFilter === "all" 
    ? filteredItems 
    : filteredItems.filter(item => item.category === categoryFilter);

  const sortedItems = [...categoryFilteredItems].sort((a, b) => {
    if (sortBy === "alphabetical") {
      return a.title.localeCompare(b.title);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddItem={() => setShowAddModal(true)}
          onScanQR={() => setShowQRModal(true)}
          onOpenProfile={() => setShowProfileModal(true)}
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
                <div className="w-full h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onAddItem={() => setShowAddModal(true)}
        onScanQR={() => setShowQRModal(true)}
        onOpenProfile={() => setShowProfileModal(true)}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Discover Items You Can Borrow
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Browse through items shared by your trusted network. Only items you're trusted to borrow will appear.
          </p>
        </div>

        {/* Filters */}
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
          
          <div className="text-sm text-gray-600">
            {sortedItems.length} items available to borrow
          </div>
        </div>

        {/* Items Grid */}
        {sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-boxes text-gray-400 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No items available</h3>
            <p className="text-gray-600 mb-6">
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
