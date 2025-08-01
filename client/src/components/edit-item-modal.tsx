import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { updateItemSchema } from "@shared/schema";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Item } from "@shared/schema";

const formSchema = updateItemSchema.extend({
  image: z.any().optional(),
});

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string | null;
}

export default function EditItemModal({ isOpen, onClose, itemId }: EditItemModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: item, isLoading } = useQuery<Item>({
    queryKey: ["/api/items", itemId],
    enabled: isOpen && !!itemId,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      trustLevel: 2,
    },
  });

  useEffect(() => {
    if (item) {
      form.reset({
        title: item.title,
        description: item.description,
        category: item.category,
        trustLevel: item.trustLevel,
      });
    }
  }, [item, form]);

  const updateItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (!itemId) throw new Error("No item ID");
      
      const formData = new FormData();
      if (data.title) formData.append("title", data.title);
      if (data.description) formData.append("description", data.description);
      if (data.category) formData.append("category", data.category);
      formData.append("trustLevel", item.trustLevel.toString());
      
      if (data.image?.[0]) {
        formData.append("image", data.image[0]);
      }

      const response = await fetch(`/api/items/${itemId}`, {
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
        title: "Item updated",
        description: "Your item has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/my"] });
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
        description: "Failed to update item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    updateItemMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  if (isLoading || !item) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g., Power Drill, Camera, Bike..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your item, its condition, and any special instructions..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tools">Tools & Hardware</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="sports">Sports & Recreation</SelectItem>
                      <SelectItem value="household">Household Items</SelectItem>
                      <SelectItem value="vehicles">Vehicles</SelectItem>
                      <SelectItem value="books">Books & Media</SelectItem>
                      <SelectItem value="clothing">Clothing & Accessories</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />



            {item.imageUrl && (
              <div>
                <FormLabel className="text-sm font-medium">Current Image</FormLabel>
                <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="image"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Update Photo</FormLabel>
                  <FormControl>
                    <Card className="border-2 border-dashed border-gray-300 hover:border-brand-blue transition-colors">
                      <CardContent className="p-8 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onChange(e.target.files)}
                          className="hidden"
                          id="image-upload"
                          {...field}
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <i className="fas fa-cloud-upload-alt text-4xl text-gray-300 mb-4 block"></i>
                          <p className="text-gray-600 mb-2">Click to upload new image or drag and drop</p>
                          <p className="text-sm text-gray-500">PNG, JPG, GIF up to 5MB</p>
                        </label>
                        {value?.[0] && (
                          <p className="mt-2 text-sm text-brand-blue">
                            New image selected: {value[0].name}
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
                disabled={updateItemMutation.isPending}
                className="flex-1 bg-brand-blue hover:bg-blue-700"
              >
                {updateItemMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Updating...
                  </>
                ) : (
                  "Update Item"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}