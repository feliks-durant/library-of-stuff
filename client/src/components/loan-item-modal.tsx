import { useState } from "react";
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
  item: Item;
  children: React.ReactNode;
}

export function LoanItemModal({ item, children }: LoanItemModalProps) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedBorrower, setSelectedBorrower] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user connections for borrower selection
  const { data: connections = [] } = useQuery<User[]>({
    queryKey: ["/api/users/connections"],
    enabled: open,
  });

  const filteredConnections = connections.filter((user: User) => 
    user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      setStartDate(undefined);
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
    
    if (!startDate || !endDate || !selectedBorrower) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (startDate >= endDate) {
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    createLoanMutation.mutate({
      itemId: item.id,
      borrowerId: selectedBorrower,
      startDate: startDate,
      expectedEndDate: endDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Loan Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item</Label>
            <Input value={item.title} disabled />
          </div>
          
          <div className="space-y-2">
            <Label>Borrower *</Label>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={selectedBorrower} onValueChange={setSelectedBorrower}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a person to lend to" />
                </SelectTrigger>
                <SelectContent>
                  {filteredConnections.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      {searchQuery ? "No matching connections" : "No trusted connections found"}
                    </div>
                  ) : (
                    filteredConnections.map((user: User) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          {user.profileImageUrl && (
                            <img 
                              src={user.profileImageUrl} 
                              alt=""
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user.email
                              }
                            </div>
                            {user.firstName && user.lastName && (
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
                    disabled={(date) => date < new Date() || (startDate ? date <= startDate : false)}
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