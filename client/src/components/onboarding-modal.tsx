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
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const onboardingSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  username: z.string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be no more than 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .toLowerCase(),
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameCheckTimeout, setUsernameCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
    },
  });

  const checkUsernameMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest(`/api/users/check-username?username=${encodeURIComponent(username)}`, "GET");
      return response.json();
    },
    onSuccess: (data) => {
      setUsernameStatus(data.available ? 'available' : 'taken');
    },
    onError: (error) => {
      if (!isUnauthorizedError(error)) {
        console.error("Username check error:", error);
        setUsernameStatus('idle');
      }
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async (data: OnboardingForm) => {
      const response = await apiRequest("/api/users/complete-onboarding", "POST", data);
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
    setUsernameStatus('idle');

    // Only check if username meets minimum requirements
    if (value.length >= 3 && /^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameStatus('checking');
      
      // Debounce the check
      const timeout = setTimeout(() => {
        checkUsernameMutation.mutate(value.toLowerCase());
      }, 500);
      
      setUsernameCheckTimeout(timeout);
    }
  };

  const onSubmit = (data: OnboardingForm) => {
    if (usernameStatus !== 'available') {
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
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin text-gray-500" />;
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'taken':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getUsernameMessage = () => {
    switch (usernameStatus) {
      case 'checking':
        return "Checking availability...";
      case 'available':
        return "Username is available!";
      case 'taken':
        return "Username is already taken";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>.close]:hidden">
        <DialogHeader>
          <DialogTitle className="text-center">Welcome to Library of Stuff!</DialogTitle>
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
                  {usernameStatus !== 'idle' && (
                    <p className={`text-xs ${
                      usernameStatus === 'available' ? 'text-green-600' : 
                      usernameStatus === 'taken' ? 'text-red-600' : 
                      'text-gray-500'
                    }`}>
                      {getUsernameMessage()}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full" 
              disabled={completeOnboardingMutation.isPending || usernameStatus !== 'available'}
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