import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { products as productsApi, Product } from "@/lib/tauri";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { Search, Plus } from "lucide-react";

interface ProductSelectorProps {
    onSelect: (product: Product) => void;
    trigger?: React.ReactNode;
}

export function ProductSelector({ onSelect, trigger }: ProductSelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const { data: products, isLoading } = useQuery({
        queryKey: ["products", "selector"],
        queryFn: () => productsApi.list({ isActive: true }),
    });

    const filteredProducts = products?.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSelect = (product: Product) => {
        onSelect(product);
        setOpen(false);
        setSearchTerm("");
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Agregar Producto
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Seleccionar Producto</DialogTitle>
                    <DialogDescription>
                        Busque y seleccione productos del inventario para agregar a la factura.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o SKU..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <div className="max-h-[400px] overflow-auto border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead className="text-right">Precio</TableHead>
                                    <TableHead className="text-right">Stock</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4">
                                            Cargando productos...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredProducts?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                            No se encontraron productos
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProducts?.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-mono text-xs">
                                                {product.sku || '-'}
                                            </TableCell>
                                            <TableCell>{product.name}</TableCell>
                                            <TableCell className="text-right">
                                                ${product.sale_price.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {product.stock_quantity}
                                            </TableCell>
                                            <TableCell>
                                                <Button size="sm" onClick={() => handleSelect(product)}>
                                                    Seleccionar
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
