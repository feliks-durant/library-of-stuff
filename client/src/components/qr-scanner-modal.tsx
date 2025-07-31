import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
  const [, setLocation] = useLocation();
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      streamRef.current = stream;
      setHasPermission(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasPermission(false);
      setIsScanning(false);
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to scan QR codes.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // Simulate QR code scanning for demo purposes
  const handleManualInput = () => {
    const testUserId = prompt("Enter user ID for testing (or scan QR code in production):");
    if (testUserId) {
      handleClose();
      setLocation(`/trust/${testUserId}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
            {hasPermission === false ? (
              <div className="flex items-center justify-center h-full text-center p-4">
                <div>
                  <i className="fas fa-camera-slash text-4xl text-gray-400 mb-4"></i>
                  <p className="text-gray-600 mb-4">Camera access denied</p>
                  <Button onClick={startCamera} variant="outline" size="sm">
                    Try Again
                  </Button>
                </div>
              </div>
            ) : hasPermission === null || !isScanning ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <i className="fas fa-spinner fa-spin text-4xl text-gray-400 mb-4"></i>
                  <p className="text-gray-500">Starting camera...</p>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />
                <div className="absolute inset-0 border-2 border-brand-blue rounded-lg">
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-48 h-48 border-2 border-brand-blue rounded-lg animate-pulse"></div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Point your camera at someone's profile QR code to set their trust level
            </p>
            
            {/* Development helper button */}
            <Button 
              onClick={handleManualInput}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Manual Input (Dev Mode)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
