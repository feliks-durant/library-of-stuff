import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import type { Item } from "@shared/schema";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user } = useAuth();
  const [showQRCode, setShowQRCode] = useState(false);

  const { data: myItems = [] } = useQuery<Item[]>({
    queryKey: ["/api/items/my"],
    enabled: isOpen,
  });

  const { data: connections = [] } = useQuery({
    queryKey: ["/api/users/connections"],
    enabled: isOpen,
  });

  if (!user) return null;

  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`;

  // Generate QR code URL for user profile
  const currentDomain = window.location.origin;
  const profileUrl = `${currentDomain}/trust/${user.id}`;

  const handleShareProfile = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Library of Stuff Profile",
          text: `Check out my Library of Stuff profile`,
          url: profileUrl,
        });
      } catch (error) {
        console.log("Sharing cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(profileUrl);
      // Could show a toast here
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Your Profile</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Info */}
          <div className="flex items-start space-x-6">
            <Avatar className="w-24 h-24">
              <AvatarImage 
                src={user.profileImageUrl || undefined}
                alt={fullName}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h4 className="text-2xl font-semibold text-gray-900 mb-2">
                {fullName || "Your Name"}
              </h4>
              <p className="text-gray-600 mb-4">{user.email}</p>
              
              <div className="flex space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-blue">
                    {myItems.length}
                  </div>
                  <div className="text-sm text-gray-600">Items Shared</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-brand-green">
                    {connections.length}
                  </div>
                  <div className="text-sm text-gray-600">Connections</div>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <Card>
            <CardContent className="pt-6">
              <h5 className="font-semibold text-gray-900 mb-4">Share Your Profile</h5>
              <div className="flex items-center space-x-4">
                <div className="w-32 h-32 bg-white rounded-lg border-2 border-gray-200 flex items-center justify-center">
                  {showQRCode ? (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(profileUrl)}`}
                      alt="Profile QR Code"
                      className="w-28 h-28"
                    />
                  ) : (
                    <div className="text-center">
                      <i className="fas fa-qrcode text-4xl text-gray-400 mb-2"></i>
                      <p className="text-xs text-gray-500">Click to show</p>
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-3">
                    Others can scan this QR code to set your trust level and see items you're willing to share with them.
                  </p>
                  <div className="space-x-2">
                    <Button 
                      onClick={() => setShowQRCode(!showQRCode)}
                      variant="outline"
                      size="sm"
                    >
                      {showQRCode ? "Hide" : "Show"} QR Code
                    </Button>
                    <Button 
                      onClick={handleShareProfile}
                      size="sm"
                      className="bg-brand-blue hover:bg-blue-700"
                    >
                      Share Profile
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Items Section */}
          <div>
            <h5 className="font-semibold text-gray-900 mb-4">My Items</h5>
            {myItems.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-box text-gray-400"></i>
                  </div>
                  <p className="text-gray-600 mb-4">You haven't added any items yet</p>
                  <Button onClick={onClose} size="sm" className="bg-brand-blue hover:bg-blue-700">
                    Add Your First Item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {myItems.slice(0, 6).map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.title}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                          ) : (
                            <i className="fas fa-box text-gray-400"></i>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="font-medium text-gray-900 text-sm truncate">
                            {item.title}
                          </h6>
                          <p className="text-xs text-gray-500 capitalize">
                            {item.category}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {myItems.length > 6 && (
                  <Card>
                    <CardContent className="p-3 text-center">
                      <div className="text-sm text-gray-600">
                        +{myItems.length - 6} more items
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button variant="outline" className="flex-1">
              Edit Profile
            </Button>
            <Button className="flex-1 bg-brand-blue hover:bg-blue-700">
              Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
