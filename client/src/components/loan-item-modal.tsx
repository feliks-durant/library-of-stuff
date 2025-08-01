import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Search } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Item, User } from "@shared/schema";
import { Input } from "@/components/ui/input";

interface LoanItemModalProps {
  item: Item | null;
  children?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export function LoanItemModal({ item, children, isOpen: externalIsOpen, onClose: externalOnClose }: LoanItemModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const open = externalIsOpen !== undefined ? externalIsOpen : internalOpen;
  const setOpen = externalOnClose !== undefined ? 
    (value: boolean) => { if (!value) externalOnClose(); } : 
    setInternalOpen;
  const [startDate] = useState<Date>(new Date()); // Always today
  const [endDate, setEndDate] = useState<Date>();
  const [selectedBorrower, setSelectedBorrower] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user connections for borrower selection
  const { data: connections = [] } = useQuery<User[]>({
    queryKey: ["/api/users/connections"],
    enabled: open,
  });

  const filteredConnections = connections.filter((user: User) => {
    const query = searchQuery.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query) ||
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  const createLoanMutation = useMutation({
    mutationFn: async (data: {
      itemId: string;
      borrowerId: string;
      startDate: Date;
      expectedEndDate: Date;
    }) => {
      return apiRequest("/api/loans", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Loan Created",
        description: "The item has been successfully loaned out.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/loans/my-lent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/my"] });
      setOpen(false);
      setEndDate(undefined);
      setSelectedBorrower("");
      setSearchQuery("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create loan",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form validation:', {
      startDate,
      endDate,
      selectedBorrower,
      searchQuery
    });
    
    if (!endDate || !selectedBorrower) {
      toast({
        title: "Error",
        description: `Please fill in all required fields. Missing: ${!endDate ? 'End Date ' : ''}${!selectedBorrower ? 'Borrower' : ''}`,
        variant: "destructive",
      });
      return;
    }

    if (startDate >= endDate) {
      toast({
        title: "Error",
        description: "End date must be after today",
        variant: "destructive",
      });
      return;
    }

    if (!item) return;
    
    createLoanMutation.mutate({
      itemId: item.id,
      borrowerId: selectedBorrower,
      startDate: startDate.toISOString(),
      expectedEndDate: endDate.toISOString(),
      status: 'active',
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Loan Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item</Label>
            <Input value={item?.title || ''} disabled />
          </div>
          
          <div className="space-y-2">
            <Label>Borrower *</Label>
            <div ref={searchRef} className="relative">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email to select borrower..."
                  value={searchQuery}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setSearchQuery(newValue);
                    setShowDropdown(true);
                    // Only clear selection if user manually clears the search or types something different from selected user
                    if (newValue === "" || (selectedBorrower && newValue !== searchQuery)) {
                      console.log('Clearing selectedBorrower due to text change');
                      setSelectedBorrower("");
                    }
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="pl-8"
                />
              </div>
              
              {/* Dropdown results that appear when typing */}
              {showDropdown && searchQuery && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {filteredConnections.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">
                      No matching connections found
                    </div>
                  ) : (
                    filteredConnections.map((user: User) => (
                      <div
                        key={user.trusteeId || user.id}
                        className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                        onClick={() => {
                          const userId = user.trusteeId || user.id;
                          console.log('Selecting user:', userId, user);
                          setSelectedBorrower(userId);
                          setSearchQuery(user.firstName && user.lastName ? 
                            `${user.firstName} ${user.lastName}` : 
                            user.email || '');
                          setShowDropdown(false);
                        }}
                      >
                        {user.profileImageUrl && (
                          <img 
                            src={user.profileImageUrl} 
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <div className="font-medium">
                            {user.firstName && user.lastName ? 
                              `${user.firstName} ${user.lastName}` : 
                              user.email
                            }
                          </div>
                          {user.username && (
                            <div className="text-xs text-muted-foreground">
                              @{user.username}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal bg-muted cursor-default text-sm"
                disabled
              >
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {format(startDate, "MMM d, yyyy")} (Today)
                </span>
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Expected Return Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date <= startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createLoanMutation.isPending}
              className="flex-1"
            >
              {createLoanMutation.isPending ? "Creating..." : "Create Loan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}