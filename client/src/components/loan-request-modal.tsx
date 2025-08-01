import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Item } from "@shared/schema";

interface LoanRequestModalProps {
  item: Item;
  children: React.ReactNode;
}

export function LoanRequestModal({ item, children }: LoanRequestModalProps) {
  const [open, setOpen] = useState(false);
  const [startDate] = useState<Date>(new Date()); // Always today
  const [endDate, setEndDate] = useState<Date>();
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createRequestMutation = useMutation({
    mutationFn: async (data: {
      itemId: string;
      requestedStartDate: Date;
      requestedEndDate: Date;
      message?: string;
    }) => {
      const response = await apiRequest("/api/loan-requests", "POST", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Sent",
        description: "Your loan request has been sent to the item owner.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/loan-requests/my"] });
      setOpen(false);
      setEndDate(undefined);
      setMessage("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send loan request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!endDate) {
      toast({
        title: "Error",
        description: "Please select an end date",
        variant: "destructive",
      });
      return;
    }

    if (startDate >= endDate) {
      toast({
        title: "Error",
        description: "End date must be after today",
        variant: "destructive",
      });
      return;
    }

    createRequestMutation.mutate({
      itemId: item.id,
      requestedStartDate: startDate.toISOString(),
      requestedEndDate: endDate.toISOString(),
      message: message || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Request to Borrow</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item</Label>
            <Input value={item.title} disabled />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal bg-muted cursor-default text-sm"
                disabled
              >
                <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate">
                  {format(startDate, "MMM d, yyyy")} (Today)
                </span>
              </Button>
            </div>
            
            <div className="space-y-2">
              <Label>Expected Return Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date <= startDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Message (Optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Any additional details about your request..."
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createRequestMutation.isPending}
              className="flex-1"
            >
              {createRequestMutation.isPending ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}