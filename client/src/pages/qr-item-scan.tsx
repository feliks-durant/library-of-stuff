import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import ItemDetailModal from "@/components/item-detail-modal";
import type { Item } from "@shared/schema";

interface AccessCheckResponse {
  action: 'login' | 'request_trust' | 'insufficient_trust' | 'view';
  message?: string;
  ownerId?: string;
  requiredLevel?: number;
  currentLevel?: number;
  item?: Item;
}

export default function QRItemScan() {
  const { itemId } = useParams();
  const [, setLocation] = useLocation();
  const [showInsufficientTrustModal, setShowInsufficientTrustModal] = useState(false);
  const [insufficientTrustMessage, setInsufficientTrustMessage] = useState("");
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemToShow, setItemToShow] = useState<Item | null>(null);

  const { data: accessCheck, isLoading, error } = useQuery<AccessCheckResponse>({
    queryKey: ["/api/items", itemId, "check-access"],
    enabled: !!itemId,
    retry: false,
  });

  useEffect(() => {
    if (!accessCheck || isLoading) return;

    switch (accessCheck.action) {
      case 'login':
        // Redirect to login with return URL
        window.location.href = `/api/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        break;

      case 'request_trust':
        // Navigate to trust request page for the owner
        setLocation(`/request-trust/${accessCheck.ownerId}`);
        break;

      case 'insufficient_trust':
        // Show modal with message
        setInsufficientTrustMessage(accessCheck.message || 'Your trust level is too low to view this item.');
        setShowInsufficientTrustModal(true);
        break;

      case 'view':
        // Show item detail modal
        if (accessCheck.item) {
          setItemToShow(accessCheck.item);
          setShowItemModal(true);
        }
        break;

      default:
        break;
    }
  }, [accessCheck, isLoading, setLocation]);

  const handleInsufficientTrustClose = () => {
    setShowInsufficientTrustModal(false);
    setLocation('/');
  };

  const handleItemModalClose = () => {
    setShowItemModal(false);
    setLocation('/');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">
              Failed to load item information. The item may not exist.
            </p>
            <Button onClick={() => setLocation('/')} data-testid="button-go-home">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Processing...</p>
        </div>
      </div>

      {/* Insufficient Trust Modal */}
      <Dialog open={showInsufficientTrustModal} onOpenChange={setShowInsufficientTrustModal}>
        <DialogContent className="sm:max-w-md" data-testid="modal-insufficient-trust">
          <DialogHeader>
            <DialogTitle>Insufficient Trust Level</DialogTitle>
            <DialogDescription>
              {insufficientTrustMessage}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleInsufficientTrustClose} data-testid="button-close-insufficient-trust">
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Detail Modal */}
      {itemToShow && (
        <ItemDetailModal 
          item={itemToShow as any}
          isOpen={showItemModal}
          onClose={handleItemModalClose}
        />
      )}
    </>
  );
}
