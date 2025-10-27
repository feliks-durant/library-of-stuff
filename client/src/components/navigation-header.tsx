import { useState } from "react";
import { Link } from "wouter";

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
import { formatDisplayName } from "@shared/schema";
import ThemeToggle from "@/components/theme-toggle";

interface NavigationHeaderProps {
  onAddItem: () => void;
  onOpenProfile: () => void;
}

export default function NavigationHeader({
  onAddItem,
  onOpenProfile,
}: NavigationHeaderProps) {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  return (
    <header className="bg-background shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section - Responsive */}
          <div className="flex items-center min-w-0 flex-1">
            <div className="flex-shrink-0">
              <Link href="/browse">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-primary hover:opacity-80 cursor-pointer transition-colors truncate">
                  <i className="fas fa-boxes mr-1 sm:mr-2"></i>
                  <span className="hidden xs:inline">Library of Stuff</span>
                  <span className="xs:hidden">LoS</span>
                </h1>
              </Link>
            </div>
          </div>

          {/* Navigation Section - Responsive */}
          <nav className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 flex-shrink-0">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Add Item Button - Responsive */}
            <Button 
              onClick={onAddItem} 
              className="bg-primary text-primary-foreground hover:opacity-90 text-xs sm:text-sm px-4 sm:px-6 min-w-[64px] sm:min-w-[120px]"
            >
              <i className="fas fa-plus sm:mr-2"></i>
              <span className="hidden sm:inline ml-1">Add Item</span>
            </Button>
            
            {/* User Profile Dropdown - Responsive */}
            <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-1 sm:space-x-2 text-foreground hover:text-primary min-w-0">
                  <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                    <AvatarImage 
                      src={user?.profileImageUrl || undefined} 
                      alt={user ? formatDisplayName(user) : 'User'}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-xs">
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden lg:block font-medium max-w-24 truncate text-sm">
                    {user ? formatDisplayName(user) : 'User'}
                  </span>
                  <i className="fas fa-chevron-down text-xs hidden sm:block"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 sm:w-48">
                <DropdownMenuItem onClick={onOpenProfile} className="text-sm">
                  <i className="fas fa-user mr-2 w-4"></i>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/my-items">
                    <div className="flex items-center w-full text-sm">
                      <i className="fas fa-boxes mr-2 w-4"></i>
                      My Items
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/loans">
                    <div className="flex items-center w-full text-sm">
                      <i className="fas fa-handshake mr-2 w-4"></i>
                      My Loans
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/trust-requests">
                    <div className="flex items-center w-full text-sm">
                      <i className="fas fa-users mr-2 w-4"></i>
                      My Connections
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-sm">
                  <i className="fas fa-sign-out-alt mr-2 w-4"></i>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>


    </header>
  );
}
