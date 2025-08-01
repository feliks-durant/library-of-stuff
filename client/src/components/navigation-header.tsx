import { useState } from "react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { formatUsername } from "@shared/schema";

interface NavigationHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onAddItem: () => void;
  onScanQR: () => void;
  onOpenProfile: () => void;
}

export default function NavigationHeader({
  searchQuery,
  onSearchChange,
  onAddItem,
  onScanQR,
  onOpenProfile,
}: NavigationHeaderProps) {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <Link href="/">
                <h1 className="text-2xl font-bold text-brand-blue hover:text-blue-700 cursor-pointer transition-colors">
                  <i className="fas fa-boxes mr-2"></i>
                  Library of Stuff
                </h1>
              </Link>
            </div>
            
            {/* Desktop Search Bar */}
            <div className="hidden md:block flex-1 max-w-lg">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Search items you can borrow..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 pr-4 border-gray-300 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
                <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </div>
            </div>
          </div>

          <nav className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onScanQR}
              className="p-2 text-gray-600 hover:text-brand-blue"
            >
              <i className="fas fa-qrcode text-xl"></i>
            </Button>
            

            
            <Button onClick={onAddItem} className="bg-brand-blue hover:bg-blue-700">
              <i className="fas fa-plus mr-2"></i>
              Add Item
            </Button>
            
            {/* User Profile Dropdown */}
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 text-gray-700 hover:text-brand-blue">
                  <Avatar className="w-8 h-8">
                    <AvatarImage 
                      src={user?.profileImageUrl || undefined} 
                      alt={formatUsername(user)}
                      className="object-cover"
                    />
                    <AvatarFallback>
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block font-medium">
                    {formatUsername(user)}
                  </span>
                  <i className="fas fa-chevron-down text-sm"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={onOpenProfile}>
                  <i className="fas fa-user mr-2"></i>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/my-items">
                    <div className="flex items-center w-full">
                      <i className="fas fa-boxes mr-2"></i>
                      My Items
                    </div>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link href="/loans">
                    <div className="flex items-center w-full">
                      <i className="fas fa-handshake mr-2"></i>
                      My Loans
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/trust-requests">
                    <div className="flex items-center w-full">
                      <i className="fas fa-users mr-2"></i>
                      My Connections
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden px-4 pb-4">
        <div className="relative">
          <Input
            type="search"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 border-gray-300 focus:ring-2 focus:ring-brand-blue focus:border-transparent"
          />
          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
        </div>
      </div>
    </header>
  );
}
