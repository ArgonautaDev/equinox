/**
 * Product Form Page (Create/Edit)
 */

import { useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Loader2, Package } from "lucide-react";
import { VariantManager } from "./VariantManager";
import { PriceHistoryView } from "./components/PriceHistoryView";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  products,
  categories,
  units,
  productTypes,
  CreateProductDto,
  Category,
  Unit,
  ProductType,
} from "@/lib/tauri";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const formSchema = z.object({
  sku: z.string().optional(),
  barcode: z.string().optional(),
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  unit_id: z.string().optional(),
  product_type_id: z.string().optional(),
  cost_price: z.coerce.number().min(0, "El costo debe ser mayor o igual a 0"),
  sale_price: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
  tax_rate: z.coerce.number().min(0).max(100).default(16),
  min_stock: z.coerce.number().min(0).default(0),
  max_stock: z.coerce.number().min(0).default(0),
  supplier_reference: z.string().optional(),
  has_variants: z.boolean().default(false),
  track_expiration: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

export function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      sku: "",
      barcode: "",
      name: "",
      description: "",
      category_id: "",
      unit_id: "",
      product_type_id: "",
      cost_price: 0,
      sale_price: 0,
      tax_rate: 16,
      min_stock: 0,
      max_stock: 0,
      supplier_reference: "",
      has_variants: false,
      track_expiration: false,
    },
  });

  // Watch prices for margin calculation and variants
  const costPrice = form.watch("cost_price");
  const salePrice = form.watch("sale_price");
  const hasVariants = form.watch("has_variants");

  const margins = useMemo(() => {
    const cost = costPrice || 0;
    const sale = salePrice || 0;
    const amount = sale - cost;
    const percent = cost > 0 ? (amount / cost) * 100 : 0;
    return { amount, percent };
  }, [costPrice, salePrice]);

  // Fetch product if editing
  const { data: product } = useQuery({
    queryKey: ["product", id],
    queryFn: () => products.get(id!),
    enabled: isEditing,
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categories.list({ isActive: true }),
  });

  // Fetch units
  const { data: unitsData } = useQuery({
    queryKey: ["units"],
    queryFn: () => units.list(),
  });

  // Fetch product types
  const { data: productTypesData } = useQuery({
    queryKey: ["productTypes"],
    queryFn: () => productTypes.list(),
  });

  // Populate form when editing
  useEffect(() => {
    if (product) {
      form.setValue("sku", product.sku || "");
      form.setValue("barcode", product.barcode || "");
      form.setValue("name", product.name);
      form.setValue("description", product.description || "");
      form.setValue("category_id", product.category_id || "");
      form.setValue("unit_id", product.unit_id || "");
      form.setValue("product_type_id", product.product_type_id || "");
      form.setValue("cost_price", product.cost_price);
      form.setValue("sale_price", product.sale_price);
      form.setValue("tax_rate", product.tax_rate);
      form.setValue("min_stock", product.min_stock);
      form.setValue("max_stock", product.max_stock);
      form.setValue("supplier_reference", product.supplier_reference || "");
      form.setValue("has_variants", product.has_variants);
      form.setValue("track_expiration", product.track_expiration);
    }
  }, [product, form]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateProductDto) => products.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      navigate("/inventory/products");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: CreateProductDto) => products.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      navigate("/inventory/products");
    },
  });

  const onSubmit = (values: FormData) => {
    const data: CreateProductDto = {
      sku: values.sku || undefined,
      barcode: values.barcode || undefined,
      name: values.name,
      description: values.description || undefined,
      category_id: values.category_id || undefined,
      unit_id: values.unit_id || undefined,
      product_type_id: values.product_type_id || undefined,
      cost_price: values.cost_price,
      sale_price: values.sale_price,
      tax_rate: values.tax_rate,
      min_stock: values.min_stock,
      max_stock: values.max_stock,
      supplier_reference: values.supplier_reference || undefined,
      has_variants: values.has_variants,
      track_expiration: values.track_expiration,
    };

    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const formError = createMutation.error || updateMutation.error;

  return (
    <div className="space-y-6 p-6 block max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/inventory/products">Productos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>
              {isEditing ? "Editar Producto" : "Nuevo Producto"}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/inventory/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            {isEditing ? "Editar Producto" : "Nuevo Producto"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditing
              ? "Modifica los datos del producto"
              : "Completa los datos para crear un nuevo producto"}
          </p>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="details" className="w-full">
        {isEditing && (
          <TabsList className="mb-4">
            <TabsTrigger value="details">Detalles del Producto</TabsTrigger>
            <TabsTrigger value="history">Historial de Precios</TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="details">
          <Form {...form} key={product?.id || "new"}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {formError && (
                <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg">
                  {String(formError)}
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Info */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU</FormLabel>
                            <FormControl>
                              <Input placeholder="PRD-0001" {...field} />
                            </FormControl>
                            <FormDescription>
                              Dejarlo vacío para generar automáticamente
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="barcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código de Barras</FormLabel>
                            <FormControl>
                              <Input placeholder="7501234567890" {...field} />
                            </FormControl>
                            <FormDescription className="invisible">
                              Espacio reservado para alineación
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre del Producto *</FormLabel>
                          <FormControl>
                            <Input placeholder="Nombre del producto" {...field} />
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
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descripción detallada del producto..."
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-3">
                      <FormField
                        control={form.control}
                        name="category_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              key={`category-${id || 'new'}-${field.value || 'empty'}`}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categoriesData?.map((cat: Category) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="unit_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unidad</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              key={`unit-${id || 'new'}-${field.value || 'empty'}`}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {unitsData?.map((unit: Unit) => (
                                  <SelectItem key={unit.id} value={unit.id}>
                                    {unit.name} ({unit.abbreviation})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="product_type_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              key={`type-${id || 'new'}-${field.value || 'empty'}`}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {productTypesData?.map((type: ProductType) => (
                                  <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Pricing */}
                <Card>
                  <CardHeader>
                    <CardTitle>Precios</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="cost_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio Costo</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sale_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio Venta</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" min="0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Calculated Margins */}
                    <div className="p-3 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Margen $:</span>
                        <span className="font-mono font-medium">
                          ${margins.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Margen %:</span>
                        <span
                          className={`font-mono font-medium ${
                            margins.percent >= 30
                              ? "text-green-600"
                              : margins.percent >= 15
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {margins.percent.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="tax_rate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>IVA %</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" min="0" max="100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Stock */}
                <Card>
                  <CardHeader>
                    <CardTitle>Inventario</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 grid-cols-2">
                      <FormField
                        control={form.control}
                        name="min_stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Mínimo</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="max_stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stock Máximo</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="supplier_reference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ref. Proveedor</FormLabel>
                          <FormControl>
                            <Input placeholder="Código proveedor" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Options */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Opciones</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-6">
                      <FormField
                        control={form.control}
                        name="has_variants"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Tiene variantes (talla, color, etc.)
                            </FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="track_expiration"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              Controlar fecha de vencimiento
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Variant Manager - only show if has_variants is true and editing */}
                {hasVariants && isEditing && id && (
                  <Card className="lg:col-span-3">
                    <CardContent className="pt-6">
                      <VariantManager productId={id} productName={product?.name || ""} />
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" asChild>
                  <Link to="/inventory/products">Cancelar</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {isEditing ? "Guardar Cambios" : "Crear Producto"}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        {isEditing && id && (
            <TabsContent value="history">
                <PriceHistoryView productId={id} />
            </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
