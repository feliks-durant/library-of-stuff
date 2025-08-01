import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { updateUserProfileSchema } from "@shared/schema";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";

const formSchema = updateUserProfileSchema.pick({
  firstName: true,
  lastName: true,
  username: true,
}).extend({
  profileImage: z.any().optional(),
});

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      username: user?.username ?? "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const formData = new FormData();
      
      if (data.firstName) formData.append("firstName", data.firstName);
      if (data.lastName) formData.append("lastName", data.lastName);
      if (data.username) formData.append("username", data.username);
      
      if (data.profileImage?.[0]) {
        formData.append("profileImage", data.profileImage[0]);
      }

      const response = await fetch("/api/users/profile", {
        method: "PUT",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onClose();
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
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    updateProfileMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (!user) return null;

  const displayName = user?.username || "User";
  const initials = user?.username?.[0]?.toUpperCase() || "U";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Current Profile Picture */}
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage 
                  src={user.profileImageUrl || undefined}
                  alt={displayName}
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John"
                        {...field}
                      />
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
                      <Input 
                        placeholder="Doe"
                        {...field}
                      />
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
                  <FormLabel>Username (unique)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="johndoe"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profileImage"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Profile Picture</FormLabel>
                  <FormControl>
                    <Card className="border-2 border-dashed border-gray-300 hover:border-brand-blue transition-colors">
                      <CardContent className="p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onChange(e.target.files)}
                          className="hidden"
                          id="profile-image-upload"
                          {...field}
                        />
                        <label htmlFor="profile-image-upload" className="cursor-pointer">
                          <i className="fas fa-camera text-3xl text-gray-300 mb-3 block"></i>
                          <p className="text-gray-600 mb-2">Upload new profile picture</p>
                          <p className="text-sm text-gray-500">PNG, JPG, GIF up to 5MB</p>
                        </label>
                        {value?.[0] && (
                          <p className="mt-2 text-sm text-brand-blue">
                            Selected: {value[0].name}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-4 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
                className="flex-1 bg-brand-blue hover:bg-blue-700"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Updating...
                  </>
                ) : (
                  "Update Profile"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}