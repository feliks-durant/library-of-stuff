import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { LoanRequestModal } from "@/components/loan-request-modal";
import EditItemModal from "@/components/edit-item-modal";
import { HandHeart } from "lucide-react";
import { useState } from "react";
import type { Item } from "@shared/schema";

interface ItemDetailModalProps {
  item: Item & {
    owner?: {
      firstName?: string;
      lastName?: string;
      username?: string;
      discriminator?: string;
      profileImageUrl?: string;
    };
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ItemDetailModal({ item, isOpen, onClose }: ItemDetailModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const { user } = useAuth();

  if (!item) return null;

  // Show firstName/lastName in black, @username in gray
  const ownerDisplayName = item.owner?.firstName && item.owner?.lastName
    ? `${item.owner.firstName} ${item.owner.lastName}`
    : "Unknown User";
  
  const ownerUsername = item.owner?.username ? `@${item.owner.username}` : "";

  const ownerInitials = item.owner?.firstName && item.owner?.lastName
    ? `${item.owner.firstName[0]}${item.owner.lastName[0]}`.toUpperCase()
    : item.owner?.username
    ? item.owner.username[0].toUpperCase()
    : "?";

  const isOwner = user?.id === item.ownerId;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
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
                    alt={ownerDisplayName}
                    className="object-cover"
                  />
                  <AvatarFallback>
                    {ownerInitials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Shared by</p>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm text-gray-900">{ownerDisplayName}</span>
                    {ownerUsername && (
                      <span className="text-xs text-gray-500">{ownerUsername}</span>
                    )}
                  </div>
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
                      onClose();
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