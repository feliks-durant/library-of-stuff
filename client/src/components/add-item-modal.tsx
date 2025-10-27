import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { insertItemSchema } from "@shared/schema";
import { z } from "zod";
import { isUnauthorizedError } from "@/lib/authUtils";

const formSchema = insertItemSchema.extend({
  image: z.any().optional(),
}).omit({ ownerId: true });

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddItemModal({ isOpen, onClose }: AddItemModalProps) {
  const [trustLevel, setTrustLevel] = useState([2]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      trustLevel: 2,
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", data.description);
      formData.append("category", data.category);
      formData.append("trustLevel", trustLevel[0].toString());
      
      if (data.image?.[0]) {
        formData.append("image", data.image[0]);
      }

      const response = await fetch("/api/items", {
        method: "POST",
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
        title: "Item added",
        description: "Your item has been added successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/items/my"] });
      form.reset();
      setTrustLevel([2]);
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
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createItemMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    setTrustLevel([2]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Item</DialogTitle>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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

            <div>
              <FormLabel className="text-sm font-medium">Trust Level Required</FormLabel>
              <div className="space-y-3 mt-2">
                <div className="flex items-center space-x-3">
                  <Slider
                    value={trustLevel}
                    onValueChange={setTrustLevel}
                    max={5}
                    min={1}
                    step={1}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium text-brand-blue">
                    {trustLevel[0]}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Higher levels mean only your most trusted contacts can see this item.
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="image"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Photo</FormLabel>
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
                          <p className="text-gray-600 mb-2">Click to upload or drag and drop</p>
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
                data-testid="button-cancel-add-item"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="outline"
                disabled={createItemMutation.isPending}
                className="flex-1"
                data-testid="button-submit-add-item"
              >
                {createItemMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Adding...
                  </>
                ) : (
                  "Add Item"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
