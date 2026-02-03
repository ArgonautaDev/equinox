/**
 * Product Table Columns Definition
 */

import { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { MoreHorizontal, Pencil, Trash2, RotateCcw, AlertTriangle, Package } from "lucide-react";
import { Product } from "@/lib/tauri";
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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-VE", { style: "decimal", minimumFractionDigits: 2 }).format(value);

export const createColumns = ({
  onDelete,
  onRestore,
}: ColumnProps): ColumnDef<Product>[] => [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <span className="font-mono text-sm">{row.original.sku || "-"}</span>
    ),
  },
  {
    accessorKey: "name",
    header: "Producto",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-muted-foreground" />
        <div>
          <span className="font-medium">{row.original.name}</span>
          {!row.original.is_active && (
            <Badge variant="secondary" className="ml-2 text-xs">
              Inactivo
            </Badge>
          )}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "cost_price",
    header: "Costo",
    cell: ({ row }) => (
      <span className="text-sm font-mono">${formatCurrency(row.original.cost_price)}</span>
    ),
  },
  {
    accessorKey: "sale_price",
    header: "Precio Venta",
    cell: ({ row }) => (
      <span className="text-sm font-mono font-medium">${formatCurrency(row.original.sale_price)}</span>
    ),
  },
  {
    accessorKey: "margin_percent",
    header: "Margen",
    cell: ({ row }) => {
      const margin = row.original.margin_percent;
      const color = margin >= 30 ? "text-green-600" : margin >= 15 ? "text-yellow-600" : "text-red-600";
      return <span className={`text-sm font-medium ${color}`}>{margin.toFixed(1)}%</span>;
    },
  },
  {
    accessorKey: "stock_quantity",
    header: "Stock",
    cell: ({ row }) => {
      const stock = row.original.stock_quantity;
      const minStock = row.original.min_stock;
      const isLow = stock <= minStock && minStock > 0;
      
      return (
        <div className="flex items-center gap-1">
          {isLow && <AlertTriangle className="h-4 w-4 text-amber-500" />}
          <span className={`text-sm font-mono ${isLow ? "text-amber-600 font-medium" : ""}`}>
            {stock}
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const product = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Acciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {product.is_active ? (
              <>
                <DropdownMenuItem asChild>
                  <Link to={`/inventory/products/${product.id}`}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(product.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Desactivar
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onClick={() => onRestore(product.id)}>
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
