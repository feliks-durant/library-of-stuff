import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import NavigationHeader from "@/components/navigation-header";
import EditItemModal from "@/components/edit-item-modal";
import { LoanItemModal } from "@/components/loan-item-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HandHeart } from "lucide-react";
import type { Item } from "@shared/schema";

export default function MyItems() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

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

  const sortedItems = [...categoryFilteredItems].sort((a, b) => {
    if (sortBy === "alphabetical") {
      return a.title.localeCompare(b.title);
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const handleEditItem = (itemId: string) => {
    setEditingItemId(itemId);
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
        searchQuery=""
        onSearchChange={() => {}}
        onAddItem={() => {}}
        onScanQR={() => {}}
        onOpenProfile={() => {}}
      />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">My Items</h2>
            <p className="text-lg text-gray-600 mt-2">
              Manage the items you've shared
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">
              <i className="fas fa-arrow-left mr-2"></i>
              Back to Browse
            </Button>
          </Link>
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
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
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
            </div>
            
            <div className="text-sm text-gray-600">
              {sortedItems.length} items
            </div>
          </div>
        </div>

        {/* Items Grid */}
        {sortedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-boxes text-gray-400 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600 mb-6">
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
              <Card key={item.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden">
                {/* Item Image */}
                <div className="w-full h-48 overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <i className="fas fa-box text-gray-400 text-4xl"></i>
                    </div>
                  )}
                </div>
                
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full capitalize">
                      {item.category}
                    </span>
                    <span className="text-sm text-gray-500">
                      Trust Level: {item.trustLevel}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => handleEditItem(item.id)}
                      size="sm"
                      variant="outline"
                      className="flex-1"
                    >
                      <i className="fas fa-edit mr-1"></i>
                      Edit
                    </Button>
                    <LoanItemModal item={item}>
                      <Button
                        size="sm"
                        className="flex-1 bg-brand-blue hover:bg-blue-700"
                      >
                        <HandHeart className="w-3 h-3 mr-1" />
                        Loan
                      </Button>
                    </LoanItemModal>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Item Modal */}
      <EditItemModal 
        isOpen={!!editingItemId}
        onClose={() => setEditingItemId(null)}
        itemId={editingItemId}
      />
    </div>
  );
}