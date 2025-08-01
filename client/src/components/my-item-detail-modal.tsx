import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Edit, 
  Users, 
  ChevronDown, 
  ChevronRight, 
  Calendar,
  User
} from "lucide-react";
import { format } from "date-fns";
import type { Item, Loan } from "@shared/schema";

interface MyItemDetailModalProps {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: Item) => void;
  onLoan: (item: Item) => void;
  onTrustClick: (userId: string) => void;
}

export function MyItemDetailModal({ 
  item, 
  isOpen, 
  onClose, 
  onEdit, 
  onLoan,
  onTrustClick 
}: MyItemDetailModalProps) {
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isHidden, setIsHidden] = useState(item?.isHidden || false);
  const [trustLevel, setTrustLevel] = useState([item?.trustLevel || 2]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get active loan for this item
  const { data: activeLoan } = useQuery({
    queryKey: ['/api/loans/active', item?.id],
    enabled: !!item?.id,
  });

  // Get loan history for this item
  const { data: loanHistory = [] } = useQuery<Loan[]>({
    queryKey: ['/api/loans/history', item?.id],
    enabled: !!item?.id,
  });

  // Get borrower information for loan history
  const borrowerIds = Array.from(new Set(loanHistory.map(loan => loan.borrowerId)));
  const { data: borrowers = [] } = useQuery({
    queryKey: ['/api/users/batch', borrowerIds],
    enabled: borrowerIds.length > 0,
    queryFn: async () => {
      if (borrowerIds.length === 0) return [];
      const responses = await Promise.all(
        borrowerIds.map(id => 
          apiRequest(`/api/users/${id}`, 'GET').then(res => res.json())
        )
      );
      return responses;
    }
  });

  // Create a map for easy borrower lookup
  const borrowerMap = borrowers.reduce((acc: any, borrower: any) => {
    acc[borrower.id] = borrower;
    return acc;
  }, {});

  // Toggle item visibility mutation
  const toggleVisibilityMutation = useMutation({
    mutationFn: async (hidden: boolean) => {
      if (!item) return;
      const response = await apiRequest(`/api/items/${item.id}`, "PUT", {
        isHidden: hidden
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Item Updated",
        description: `Item is now ${isHidden ? 'hidden from' : 'visible in'} public view.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/items/my'] });
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
        description: "Failed to update item visibility.",
        variant: "destructive",
      });
      setIsHidden(!isHidden); // Revert the toggle
    },
  });

  const handleVisibilityToggle = (checked: boolean) => {
    setIsHidden(checked);
    toggleVisibilityMutation.mutate(checked);
  };

  // Update trust level mutation
  const updateTrustLevelMutation = useMutation({
    mutationFn: async (newTrustLevel: number) => {
      if (!item) throw new Error("No item");
      
      const formData = new FormData();
      formData.append("trustLevel", newTrustLevel.toString());
      formData.append("title", item.title);
      formData.append("description", item.description);
      formData.append("category", item.category);
      
      const response = await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items", item?.id] });
      toast({
        title: "Trust level updated",
        description: `Trust level changed to ${trustLevel[0]}`,
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
      console.error("Error updating trust level:", error);
      toast({
        title: "Error",
        description: "Failed to update trust level. Please try again.",
        variant: "destructive",
      });
      // Revert trust level on error
      if (item) {
        setTrustLevel([item.trustLevel]);
      }
    },
  });

  const handleTrustLevelChange = (newLevel: number[]) => {
    setTrustLevel(newLevel);
    updateTrustLevelMutation.mutate(newLevel[0]);
  };

  // Update isHidden state when item changes
  useEffect(() => {
    if (item) {
      setIsHidden(item.isHidden || false);
      setTrustLevel([item.trustLevel]);
    }
  }, [item]);

  if (!item) return null;

  const isUnavailable = !!activeLoan;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{item.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Item Image */}
          {item.imageUrl && (
            <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-gray-700">{item.description}</p>
          </div>

          {/* Availability Status */}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Status:</h3>
            <Badge variant={isUnavailable ? "destructive" : "default"}>
              {isUnavailable ? "Unavailable" : "Available"}
            </Badge>
            {isUnavailable && activeLoan && (
              <span className="text-sm text-gray-600">
                (Currently loaned out)
              </span>
            )}
          </div>

          {/* Visibility Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="visibility-toggle"
              checked={isHidden}
              onCheckedChange={handleVisibilityToggle}
              disabled={toggleVisibilityMutation.isPending}
            />
            <Label htmlFor="visibility-toggle" className="font-semibold">
              Hide from public view
            </Label>
          </div>

          {/* Trust Level Slider */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Trust Level Required: {trustLevel[0]}</Label>
            <div className="flex items-center space-x-3">
              <Slider
                value={trustLevel}
                onValueChange={handleTrustLevelChange}
                max={5}
                min={1}
                step={1}
                className="flex-1"
                disabled={updateTrustLevelMutation.isPending}
              />
              <span className="w-12 text-center font-medium text-blue-600">
                {trustLevel[0]}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Higher levels mean only your most trusted contacts can see this item.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={() => onEdit(item)}
              className="flex items-center gap-2"
              variant="outline"
            >
              <Edit className="h-4 w-4" />
              Edit Item
            </Button>
            
            <Button 
              onClick={() => onLoan(item)}
              className="flex items-center gap-2"
              disabled={isUnavailable}
            >
              <Users className="h-4 w-4" />
              {isUnavailable ? "Item Loaned Out" : "Loan Item"}
            </Button>
          </div>

          {/* Loan History */}
          <Collapsible open={isHistoryExpanded} onOpenChange={setIsHistoryExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0">
                <span className="font-semibold">Loan History ({loanHistory.length})</span>
                {isHistoryExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-3 mt-3">
              {loanHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">No loan history yet.</p>
              ) : (
                loanHistory.map((loan) => {
                  const borrower = borrowerMap[loan.borrowerId];
                  const borrowerName = borrower 
                    ? (borrower.firstName && borrower.lastName 
                        ? `${borrower.firstName} ${borrower.lastName}` 
                        : borrower.email)
                    : `User ${loan.borrowerId}`;
                  const borrowerUsername = borrower?.username;
                  const borrowerInitials = borrower 
                    ? (borrower.firstName && borrower.lastName 
                        ? `${borrower.firstName[0]}${borrower.lastName[0]}` 
                        : borrower.email?.[0] || 'U')
                    : 'U';

                  return (
                    <div key={loan.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar 
                            className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-blue-500"
                            onClick={() => onTrustClick(loan.borrowerId)}
                          >
                            <AvatarImage 
                              src={borrower?.profileImageUrl || undefined}
                              alt={borrowerName}
                            />
                            <AvatarFallback>
                              {borrowerInitials.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-black">
                              {borrowerName}
                            </p>
                            {borrowerUsername && (
                              <p className="text-sm text-gray-500">@{borrowerUsername}</p>
                            )}
                          </div>
                        </div>
                      <Badge variant={loan.status === "active" ? "default" : "secondary"}>
                        {loan.status}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600">Borrowed</p>
                          <p className="font-medium">
                            {format(new Date(loan.startDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-gray-600">
                            {loan.status === "active" ? "Due" : "Returned"}
                          </p>
                          <p className="font-medium">
                            {loan.actualEndDate ? 
                              format(new Date(loan.actualEndDate), "MMM d, yyyy") : 
                              loan.expectedEndDate ?
                              format(new Date(loan.expectedEndDate), "MMM d, yyyy") :
                              "Not set"
                            }
                          </p>
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
}