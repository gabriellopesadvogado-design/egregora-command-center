import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NotificationDropdown } from "./NotificationDropdown";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center",
                "rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground",
                "animate-pulse"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <NotificationDropdown onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
