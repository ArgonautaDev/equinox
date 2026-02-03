/**
 * Client Table Columns Definition
 */

import { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { MoreHorizontal, Pencil, Trash2, RotateCcw } from "lucide-react";
import { Client } from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface ColumnProps {
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}

export const createColumns = ({
  onDelete,
  onRestore,
}: ColumnProps): ColumnDef<Client>[] => [
  {
    accessorKey: "code",
    header: "Código",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.code || "-"}</span>
    ),
  },
  {
    accessorKey: "tax_id",
    header: "RIF / C.I.",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.tax_id || "-"}</span>
    ),
  },
  {
    accessorKey: "name",
    header: "Nombre / Razón Social",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.original.name}</span>
        {!row.original.is_active && (
          <Badge variant="secondary" className="text-xs">
            Inactivo
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "address",
    header: "Dirección",
    cell: ({ row }) => {
      const address = row.original.address;
      if (!address) return <span className="text-muted-foreground">-</span>;
      const truncated = address.length > 30 ? `${address.slice(0, 30)}...` : address;
      return <span className="text-sm">{truncated}</span>;
    },
  },
  {
    accessorKey: "phone",
    header: "Teléfono",
    cell: ({ row }) => (
      <span className="text-sm">{row.original.phone || "-"}</span>
    ),
  },
  {
    accessorKey: "email",
    header: "Correo",
    cell: ({ row }) => {
      const email = row.original.email;
      if (!email) return <span className="text-muted-foreground">-</span>;
      return (
        <a
          href={`mailto:${email}`}
          className="text-sm text-primary hover:underline"
        >
          {email}
        </a>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const client = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Acciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {client.is_active ? (
              <>
                <DropdownMenuItem asChild>
                  <Link to={`/clients/${client.id}`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(client.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Desactivar
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => onRestore(client.id)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reactivar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
