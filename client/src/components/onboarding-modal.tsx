import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, Upload, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be no more than 30 characters")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Username can only contain letters, numbers, periods, dashes, and underscores",
    )
    .toLowerCase(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [usernameCheckTimeout, setUsernameCheckTimeout] =
    useState<NodeJS.Timeout | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    mode: "onChange", // Enable validation on change
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
    },
  });

  const checkUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest(
        `/api/users/check-username?username=${encodeURIComponent(username)}`,
        "GET",
      );
      return response.json();
    },
    onSuccess: (data) => {
      setUsernameStatus(data.available ? "available" : "taken");
    },
    onError: (error) => {
      if (!isUnauthorizedError(error)) {
        console.error("Username check error:", error);
        setUsernameStatus("idle");
      }
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: OnboardingForm) => {
      const formData = new FormData();
      formData.append("firstName", data.firstName);
      formData.append("lastName", data.lastName);
      formData.append("username", data.username);
      
      if (profileImage) {
        formData.append("profileImage", profileImage);
      }

      const response = await fetch("/api/users/complete-onboarding", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Welcome to Library of Stuff!",
        description: "Your profile has been set up successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete();
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

      const errorMessage = error.message.includes("username")
        ? "Username is already taken. Please choose a different one."
        : "Failed to complete setup. Please try again.";

      toast({
        title: "Setup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleUsernameChange = (value: string) => {
    // Clear previous timeout
    if (usernameCheckTimeout) {
      clearTimeout(usernameCheckTimeout);
    }

    // Reset status
    setUsernameStatus("idle");

    // Trigger form validation immediately for real-time feedback
    setTimeout(() => form.trigger("username"), 0);

    // Only check availability if username meets all requirements
    if (
      value.length >= 3 &&
      value.length <= 30 &&
      /^[a-zA-Z0-9._-]+$/.test(value)
    ) {
      setUsernameStatus("checking");

      // Debounce the availability check
      const timeout = setTimeout(() => {
        checkUsernameMutation.mutate(value.toLowerCase());
      }, 500);

      setUsernameCheckTimeout(timeout);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image under 5MB.",
        variant: "destructive",
      });
      return;
    }

    setProfileImage(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
  };

  const onSubmit = (data: OnboardingForm) => {
    // Check if there are any form validation errors
    if (Object.keys(form.formState.errors).length > 0) {
      return; // Let form validation handle the errors
    }

    if (usernameStatus !== "available") {
      toast({
        title: "Username Required",
        description: "Please choose an available username before continuing.",
        variant: "destructive",
      });
      return;
    }

    completeOnboardingMutation.mutate(data);
  };

  const getUsernameIcon = () => {
    switch (usernameStatus) {
      case "checking":
        return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />;
      case "available":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "taken":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getUsernameMessage = () => {
    const errors = form.formState.errors.username;
    if (errors) {
      return errors.message;
    }

    switch (usernameStatus) {
      case "checking":
        return "Checking availability...";
      case "available":
        return "Username is available!";
      case "taken":
        return "Username is already taken";
      default:
        return "";
    }
  };

  const getUsernameMessageColor = () => {
    const errors = form.formState.errors.username;
    if (errors) {
      return "text-red-600";
    }

    switch (usernameStatus) {
      case "available":
        return "text-green-600";
      case "taken":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>.close]:hidden">
        <DialogHeader>
          <DialogTitle className="text-center">
            Welcome to Library of Stuff!
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            Let's set up your profile to get started
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="johndoe"
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          handleUsernameChange(e.target.value);
                        }}
                        className="pr-10"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {getUsernameIcon()}
                      </div>
                    </div>
                  </FormControl>
                  <div className="text-xs text-muted-foreground mb-1">
                    <p>•3-30 characters</p>
                    <p>
                      •Letters, numbers, periods (.), dashes (-), and
                      underscores (_) only
                    </p>
                  </div>
                  {(usernameStatus !== "idle" ||
                    form.formState.errors.username) && (
                    <p className={`text-xs ${getUsernameMessageColor()}`}>
                      {getUsernameMessage()}
                    </p>
                  )}
                </FormItem>
              )}
            />

            {/* Profile Picture Upload Section */}
            <div className="space-y-3">
              <FormLabel className="text-sm font-medium">
                Profile Picture <span className="text-xs text-muted-foreground">(optional)</span>
              </FormLabel>
              
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profileImagePreview || undefined} />
                  <AvatarFallback>
                    <User className="h-8 w-8 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex flex-col space-y-2">
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('profile-image-input')?.click()}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="h-4 w-4" />
                      <span>Upload Photo</span>
                    </Button>
                    
                    {profileImage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeImage}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, GIF or WebP. Max 5MB.
                  </p>
                </div>
              </div>
              
              <input
                id="profile-image-input"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                completeOnboardingMutation.isPending ||
                usernameStatus !== "available" ||
                Object.keys(form.formState.errors).length > 0
              }
            >
              {completeOnboardingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
