import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUrgentNotifications } from "@/hooks/useNotifications";
import { Sidebar } from "./Sidebar";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { MeetingAlertModal } from "@/components/notifications/MeetingAlertModal";

export function AppLayout() {
  const { user, loading } = useAuth();
  const { urgentAlert, dismissUrgentAlert } = useUrgentNotifications();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with notification bell */}
        <header className="h-14 border-b flex items-center justify-end px-6 bg-background shrink-0">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Large alert modal for 5-minute meeting reminders */}
      <MeetingAlertModal 
        notification={urgentAlert} 
        onDismiss={dismissUrgentAlert} 
      />
    </div>
  );
}
