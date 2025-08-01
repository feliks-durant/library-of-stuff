import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import EditItemModal from "@/components/edit-item-modal";
import { LoanRequestModal } from "@/components/loan-request-modal";
import { HandHeart } from "lucide-react";
import type { Item } from "@shared/schema";

interface ItemCardProps {
  item: Item & {
    owner?: {
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    };
  };
}

export default function ItemCard({ item }: ItemCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { user } = useAuth();

  const ownerName = item.owner?.firstName && item.owner?.lastName
    ? `${item.owner.firstName} ${item.owner.lastName.charAt(0)}.`
    : "Unknown User";

  const ownerInitials = item.owner?.firstName && item.owner?.lastName
    ? `${item.owner.firstName[0]}${item.owner.lastName[0]}`
    : "?";

  const isOwner = user?.id === item.ownerId;

  return (
    <>
      <Card className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden">
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
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="w-6 h-6">
                <AvatarImage 
                  src={item.owner?.profileImageUrl || undefined}
                  alt={ownerName}
                  className="object-cover"
                />
                <AvatarFallback className="text-xs">
                  {ownerInitials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-500">{ownerName}</span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(true)}
              className="text-brand-blue hover:text-blue-700 text-sm font-medium p-0"
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Item Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{item.title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Item Image */}
            <div className="w-full h-48 rounded-lg overflow-hidden">
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
            
            {/* Item Details */}
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Description</h4>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Category</h4>
                <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full capitalize">
                  {item.category}
                </span>
              </div>
              
              <div className="flex items-center space-x-3 pt-2">
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={item.owner?.profileImageUrl || undefined}
                    alt={ownerName}
                    className="object-cover"
                  />
                  <AvatarFallback>
                    {ownerInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Shared by</p>
                  <p className="text-gray-600 text-sm">{ownerName}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t space-y-2">
                {!isOwner && (
                  <LoanRequestModal item={item}>
                    <Button className="w-full bg-brand-blue hover:bg-blue-700">
                      <HandHeart className="w-4 h-4 mr-2" />
                      Request to Borrow
                    </Button>
                  </LoanRequestModal>
                )}
                
                {isOwner && (
                  <Button 
                    onClick={() => {
                      setShowDetails(false);
                      setShowEditModal(true);
                    }}
                    className="w-full bg-brand-blue hover:bg-blue-700"
                  >
                    <i className="fas fa-edit mr-2"></i>
                    Edit Item
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Modal */}
      {isOwner && (
        <EditItemModal 
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          itemId={item.id}
        />
      )}
    </>
  );
}
