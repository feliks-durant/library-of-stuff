import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import ItemDetailModal from "@/components/item-detail-modal";
import EditItemModal from "@/components/edit-item-modal";
import type { Item } from "@shared/schema";

interface ItemCardProps {
  item: Item & {
    owner?: {
      firstName?: string;
      lastName?: string;
      username?: string;
      discriminator?: string;
      profileImageUrl?: string;
    };
  };
  onClick?: () => void; // Optional click handler prop
}

export default function ItemCard({ item, onClick }: ItemCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { user } = useAuth();

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

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      setShowDetails(true);
    }
  };
  


  return (
    <>
      <Card 
        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-200 overflow-hidden cursor-pointer hover:scale-[1.02]"
        onClick={handleCardClick}
      >
        {/* Item Image */}
        <div className="w-full h-48 overflow-hidden">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Image failed to load:', item.imageUrl);
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', item.imageUrl);
              }}
            />
          ) : null}
          <div className={`w-full h-full bg-gray-200 flex items-center justify-center ${item.imageUrl ? 'hidden' : ''}`}>
            <i className="fas fa-box text-gray-400 text-4xl"></i>
          </div>
        </div>
        
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {item.description}
          </p>
          
          <div className="flex items-center space-x-2">
            <Avatar className="w-6 h-6">
              <AvatarImage 
                src={item.owner?.profileImageUrl || undefined}
                alt={ownerDisplayName}
                className="object-cover"
              />
              <AvatarFallback className="text-xs">
                {ownerInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col leading-tight">
              <span className="text-sm text-gray-900">{ownerDisplayName}</span>
              {ownerUsername && (
                <span className="text-xs text-gray-500">{ownerUsername}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Item Details Modal */}
      <ItemDetailModal 
        item={item}
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
      />

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
