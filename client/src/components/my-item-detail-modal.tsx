import { useState } from "react";
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
  const [isHidden, setIsHidden] = useState(false); // Will be updated when item visibility feature is added
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

          {/* Trust Level Required */}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">Trust Level Required:</h3>
            <Badge variant="outline">{item.trustLevel}</Badge>
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
              {isUnavailable ? "Item Loaned Out" : "Manage Loans"}
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
                loanHistory.map((loan) => (
                  <div key={loan.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-blue-500"
                          onClick={() => onTrustClick(loan.borrowerId)}
                        >
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            Borrower ID: {loan.borrowerId}
                          </p>
                          <p className="text-sm text-gray-500">Click avatar to set trust level</p>
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
                ))
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </DialogContent>
    </Dialog>
  );
}