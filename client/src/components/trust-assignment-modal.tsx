import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { Heart, Star, Shield, Crown, Gem } from "lucide-react";

interface TrustAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const trustLevels = [
  { level: 1, icon: Heart, color: "text-gray-400", bg: "bg-gray-100", title: "Basic Trust", description: "Can borrow small, everyday items" },
  { level: 2, icon: Star, color: "text-blue-500", bg: "bg-blue-100", title: "Trusted Friend", description: "Can borrow most personal items" },
  { level: 3, icon: Shield, color: "text-green-500", bg: "bg-green-100", title: "Close Friend", description: "Can borrow valuable items" },
  { level: 4, icon: Crown, color: "text-purple-500", bg: "bg-purple-100", title: "Family-Level Trust", description: "Can borrow expensive or precious items" },
  { level: 5, icon: Gem, color: "text-orange-500", bg: "bg-orange-100", title: "Complete Trust", description: "Can borrow anything you own" },
];

export default function TrustAssignmentModal({ isOpen, onClose, user }: TrustAssignmentModalProps) {
  const [trustLevel, setTrustLevel] = useState([3]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const userName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email || "Unknown User";

  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.email ? user.email[0].toUpperCase() : "?";

  const currentTrustLevel = trustLevels.find(level => level.level === trustLevel[0])!;
  const TrustIcon = currentTrustLevel.icon;

  const setTrustMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/trust", "POST", {
        trusteeId: user.id,
        trustLevel: trustLevel[0],
      });
    },
    onSuccess: () => {
      toast({
        title: "Trust Level Set",
        description: `${userName} now has trust level ${trustLevel[0]}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users/connections"] });
      onClose();
    },
    onError: (error) => {
      console.error("Error setting trust level:", error);
      toast({
        title: "Error",
        description: "Failed to set trust level. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTrustMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Trust Level</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Info */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <Avatar className="w-12 h-12">
              <AvatarImage 
                src={user.profileImageUrl || undefined}
                alt={userName}
                className="object-cover"
              />
              <AvatarFallback>
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-gray-900">{userName}</h3>
              <p className="text-gray-600 text-sm">{user.email}</p>
            </div>
          </div>

          {/* Trust Level Selector */}
          <div className="space-y-4">
            <Label htmlFor="trust-level">Trust Level: {trustLevel[0]}</Label>
            
            {/* Current Trust Level Display */}
            <div className={`p-4 rounded-lg ${currentTrustLevel.bg} border-2 border-gray-200`}>
              <div className="flex items-center space-x-3 mb-2">
                <div className={`p-2 rounded-full bg-white ${currentTrustLevel.color}`}>
                  <TrustIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{currentTrustLevel.title}</h4>
                  <p className="text-gray-600 text-sm">{currentTrustLevel.description}</p>
                </div>
              </div>
            </div>

            {/* Slider */}
            <div className="px-2">
              <Slider
                id="trust-level"
                min={1}
                max={5}
                step={1}
                value={trustLevel}
                onValueChange={setTrustLevel}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Basic</span>
                <span>Trusted</span>
                <span>Close</span>
                <span>Family</span>
                <span>Complete</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={setTrustMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-brand-blue hover:bg-blue-700"
              disabled={setTrustMutation.isPending}
            >
              {setTrustMutation.isPending ? "Setting..." : "Set Trust Level"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}