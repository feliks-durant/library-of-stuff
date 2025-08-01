import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
import EditProfileModal from "@/components/edit-profile-modal";
import type { User } from "@shared/schema";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { user } = useAuth();
  const [showQRCode, setShowQRCode] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);



  const { data: connections = [] } = useQuery<User[]>({
    queryKey: ["/api/users/connections"],
    enabled: isOpen,
  });

  if (!user) return null;

  // Show real name if available, fallback to username#discriminator
  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.username && user.discriminator
    ? `${user.username}#${user.discriminator}`
    : "User";

  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user.username?.[0]?.toUpperCase() || "U";

  // Generate QR code URL for user profile
  const currentDomain = window.location.origin;
  const profileUrl = `${currentDomain}/profile/${user.id}`;

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
                alt={displayName}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h4 className="text-2xl font-semibold text-gray-900 mb-2">
                {displayName}
              </h4>
              
              <div className="flex space-x-4">
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



          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowEditProfile(true)}
            >
              Edit Profile
            </Button>
            <Link href="/my-items">
              <Button className="flex-1 bg-brand-blue hover:bg-blue-700">
                Manage Items
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
      
      {/* Edit Profile Modal */}
      <EditProfileModal 
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />
    </Dialog>
  );
}
