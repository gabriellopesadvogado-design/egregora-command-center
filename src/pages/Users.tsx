import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { useAllProfiles } from "@/hooks/useUsers";
import { UsersTable } from "@/components/users/UsersTable";
import { CreateUserModal } from "@/components/users/CreateUserModal";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function Users() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: users, isLoading } = useAllProfiles();
  const { profile } = useAuth();

  // Only allow admin and manager to access this page
  if (profile && profile.cargo !== "admin" && profile.cargo !== "gestor") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários da plataforma
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      <UsersTable users={users || []} isLoading={isLoading} />

      <CreateUserModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
