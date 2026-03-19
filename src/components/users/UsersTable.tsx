import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Power, KeyRound } from "lucide-react";
import { useToggleUserActive } from "@/hooks/useUsers";
import { EditUserModal } from "./EditUserModal";
import { ResetPasswordModal } from "./ResetPasswordModal";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface UsersTableProps {
  users: Profile[];
  isLoading: boolean;
}

export function UsersTable({ users, isLoading }: UsersTableProps) {
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [resettingPasswordUser, setResettingPasswordUser] = useState<Profile | null>(null);
  const toggleActive = useToggleUserActive();

  const handleToggleActive = (user: Profile) => {
    toggleActive.mutate({
      user_id: user.id,
      ativo: !user.ativo,
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Admin</Badge>;
      case "manager":
        return <Badge variant="secondary">Manager</Badge>;
      case "sdr":
        return <Badge className="bg-primary/80 hover:bg-primary">SDR</Badge>;
      case "closer":
        return <Badge className="bg-accent-foreground text-accent hover:bg-accent-foreground/90">Closer</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getStatusBadge = (ativo: boolean) => {
    return ativo ? (
      <Badge variant="default">Ativo</Badge>
    ) : (
      <Badge variant="secondary">Inativo</Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.nome}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>{getStatusBadge(user.ativo)}</TableCell>
                  <TableCell>
                    {new Date(user.criado_em).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        disabled={user.role === "admin" || user.role === "manager"}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setResettingPasswordUser(user)}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={user.ativo ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleToggleActive(user)}
                        disabled={
                          toggleActive.isPending ||
                          user.role === "admin" ||
                          user.role === "manager"
                        }
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditUserModal
        user={editingUser}
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
      />

      <ResetPasswordModal
        user={resettingPasswordUser}
        open={!!resettingPasswordUser}
        onClose={() => setResettingPasswordUser(null)}
      />
    </>
  );
}
