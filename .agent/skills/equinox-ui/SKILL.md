---
name: equinox-ui
description: Patrones de UI específicos del proyecto Equinox ERP
---

# Equinox UI Patterns

Patrones y convenciones de UI específicos del proyecto Equinox ERP.

## Estructura de módulos CRUD

### Archivos por módulo:

```
src/modules/{module}/
├── {Module}List.tsx      # Lista principal con tabla
├── {Module}Form.tsx      # Formulario crear/editar
├── columns.tsx           # Definición de columnas de tabla
└── index.ts              # Re-exports
```

### Ejemplo de rutas:

```tsx
// En App.tsx
<Route path="/{modules}" element={<{Module}List />} />
<Route path="/{modules}/new" element={<{Module}Form />} />
<Route path="/{modules}/:id" element={<{Module}Form />} />
```

## Patrón de formulario con edición

### Estructura estándar:

```tsx
export function EntityForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;

  // 1. Definir formulario
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { /* valores vacíos */ },
  });

  // 2. Query para edición
  const { data: entity, isLoading } = useQuery({
    queryKey: ["entity", id],
    queryFn: () => api.get(id!),
    enabled: isEditing,
  });

  // 3. Poblar formulario
  useEffect(() => {
    if (entity) {
      form.setValue("field1", entity.field1 ?? "");
      // ... más campos
    }
  }, [entity, form]);

  // 4. Mutations
  const createMutation = useMutation({
    mutationFn: api.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      navigate("/entities");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entities"] });
      navigate("/entities");
    },
  });

  // 5. Loading state
  if (isEditing && isLoading) {
    return <LoadingSpinner />;
  }

  // 6. Render form...
}
```

## RIF/Cédula venezolano

### Formato estándar:
- **Tipos válidos**: V, E, J, G, P
- **Formato completo**: `{TIPO}-{NÚMERO}-{DÍGITO}` (ej: `J-12345678-9`)
- **Regex de validación**: `/^([VEJGP])-(\d{7,8})-(\d)$/`

### Implementación con campos separados:

```tsx
// Campos del formulario
const formSchema = z.object({
  tax_type: z.string().optional(),   // V, E, J, G, P
  rif_number: z.string().optional(), // 12345678-9
});

// Al enviar, combinar:
const fullTaxId = taxType && rifNumber 
  ? `${taxType}-${rifNumber}` 
  : undefined;

// Al cargar, separar:
const match = taxId.match(/^([VEJGP])-(.+)$/);
if (match) {
  taxType = match[1];
  rifNumber = match[2];
}
```

## Códigos auto-generados

### Patrón para códigos secuenciales:

```rust
// Backend: Generar código único
let code = format!("CLI-{:04}", next_sequence);

// Frontend: Campo disabled en edición
<Input 
  disabled={isEditing} 
  placeholder="Se generará automáticamente" 
/>
```

## Soft Delete (Activar/Desactivar)

### Patrón estándar:

```tsx
// Columna de estado
{
  accessorKey: "is_active",
  header: "Estado",
  cell: ({ row }) => (
    !row.original.is_active && (
      <Badge variant="secondary">Inactivo</Badge>
    )
  ),
}

// Acciones contextuales
{row.original.is_active ? (
  <>
    <DropdownMenuItem onClick={() => onEdit(id)}>
      Editar
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => onDeactivate(id)}>
      Desactivar
    </DropdownMenuItem>
  </>
) : (
  <DropdownMenuItem onClick={() => onReactivate(id)}>
    Reactivar
  </DropdownMenuItem>
)}
```

## Naming conventions

### Frontend (TypeScript):
- **Interfaces de datos**: snake_case (match con backend)
  - `Client { tax_id, is_active }`
- **Props de componentes**: camelCase
  - `onDelete, isLoading`
- **Campos de formulario**: snake_case (match con DTO)
  - `form.setValue("tax_type", value)`

### Backend (Rust):
- **Structs**: snake_case
- **DTOs con serde**: Use `#[serde(rename_all = "camelCase")]` si el frontend envía camelCase

## Tauri Commands

### Patrón de llamada:

```typescript
// lib/tauri.ts
export const entities = {
  list: (filters?: Filters) => 
    invoke<Entity[]>("list_entities", { filters }),
  get: (id: string) => 
    invoke<Entity>("get_entity", { id }),
  create: (data: CreateDto) => 
    invoke<Entity>("create_entity", { data }),
  update: (id: string, data: UpdateDto) => 
    invoke<Entity>("update_entity", { id, data }),
  delete: (id: string) => 
    invoke<void>("delete_entity", { id }),
  restore: (id: string) => 
    invoke<void>("restore_entity", { id }),
};
```
