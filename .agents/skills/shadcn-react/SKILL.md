---
name: shadcn-react
description: Patrones y soluciones para componentes shadcn/ui con React Hook Form
---

# shadcn/ui + React Hook Form

Documentación de patrones y soluciones para usar shadcn/ui con react-hook-form en el proyecto Equinox.

## Select con React Hook Form

### Problema: El Select no muestra el valor cargado dinámicamente

Cuando se usa `form.setValue()` o `form.reset()` para cargar datos en un formulario, el componente Select de shadcn (basado en Radix UI) no actualiza su visualización aunque el valor interno esté correcto.

### Solución: Key dinámica

Agregar una `key` que cambie cuando el valor cambia, forzando un remount del componente:

```tsx
<FormField
  control={form.control}
  name="tax_type"
  render={({ field }) => (
    <FormItem>
      <Select 
        onValueChange={field.onChange} 
        value={field.value}
        defaultValue={field.value}
        key={`field-name-${entityId || 'new'}-${field.value || 'empty'}`}
      >
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="option1">Opción 1</SelectItem>
          <SelectItem value="option2">Opción 2</SelectItem>
        </SelectContent>
      </Select>
    </FormItem>
  )}
/>
```

### Puntos clave:

1. **`key` dinámica**: Incluir el ID de la entidad y el valor actual
2. **`defaultValue`**: Agregar además del `value` para mejor compatibilidad
3. **`value`**: Mantener el control del valor desde el formulario
4. **Evitar string vacía**: El Select muestra placeholder cuando value es `""`

## Formularios con datos async

### Patrón recomendado para edición de entidades:

```tsx
// 1. Mostrar loading mientras se cargan datos
if (isEditing && isLoadingEntity) {
  return <LoadingSpinner />;
}

// 2. Usar useEffect con setValue para cada campo
useEffect(() => {
  if (entity) {
    form.setValue("field1", entity.field1 ?? "");
    form.setValue("field2", entity.field2 ?? "");
    // ... más campos
  }
}, [entity, form]);

// 3. Agregar key al Form para forzar re-render si es necesario
<Form {...form} key={entity?.id || 'new'}>
```

### ¿Por qué no usar form.reset()?

`form.reset()` debería funcionar, pero en la práctica:
- Los componentes Select de Radix no siempre se actualizan
- `setValue` por campo individual es más confiable
- Combinado con keys dinámicas, garantiza la actualización visual

## Validación con Zod

### Campos opcionales que pueden ser string vacía:

```tsx
const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email().optional().or(z.literal("")),
  tax_type: z.string().optional(), // Permite vacío
});
```

## Componentes de formulario estándar

### Input con FormField:

```tsx
<FormField
  control={form.control}
  name="fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label</FormLabel>
      <FormControl>
        <Input placeholder="..." {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Textarea con FormField:

```tsx
<FormField
  control={form.control}
  name="notes"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Notas</FormLabel>
      <FormControl>
        <Textarea 
          placeholder="Notas adicionales..."
          className="resize-none"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```
