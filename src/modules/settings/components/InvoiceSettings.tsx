import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X, GripVertical, FileText } from "lucide-react";
import { settings } from "@/lib/tauri";

interface SortableItemProps {
  id: string;
  value: string;
  onDelete: () => void;
}

function SortableItem({ id, value, onDelete }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-md border text-sm group select-none"
    >
      <div
        {...listeners}
        className="cursor-grab hover:text-primary active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <span className="font-mono font-medium">{value}</span>
      <button
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export function InvoiceSettings() {
  const queryClient = useQueryClient();
  const [prefix, setPrefix] = useState("");
  const [nextNumber, setNextNumber] = useState("");
  const [items, setItems] = useState<{ id: string; value: string }[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { data: sequence, isLoading } = useQuery({
    queryKey: ["invoice-sequence"],
    queryFn: () => settings.getInvoiceSequence(),
  });

  const updateMutation = useMutation({
    mutationFn: settings.updateInvoiceSequence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice-sequence"] });
      setIsEditing(false);
    },
  });

  const startEditing = () => {
    if (sequence) {
      setPrefix(sequence.prefix);
      setNextNumber(String(sequence.next_number));

      const regex = /({[^}]+})|([^{}]+)/g;
      const matches = sequence.pattern.match(regex) || [];
      setItems(
        matches.map((m, i) => ({ id: `item-${i}-${Date.now()}`, value: m })),
      );

      setIsEditing(true);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const [customSeparator, setCustomSeparator] = useState("");

  const addToken = (token: string) => {
    setItems([...items, { id: `token-${Date.now()}`, value: token }]);
  };

  const handleAddCustomSeparator = () => {
    if (customSeparator) {
      addToken(customSeparator);
      setCustomSeparator("");
    }
  };

  const deleteItem = (id: string) => {
    setItems(items.filter((i) => i.id !== id));
  };

  const currentPatternPreview = items.map((i) => i.value).join("");

  const handleSave = () => {
    updateMutation.mutate({
      prefix,
      next_number: parseInt(nextNumber) || 1,
      pattern: currentPatternPreview,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Numeración de Facturas
        </CardTitle>
        <CardDescription>
          Configura el prefijo y patrón de numeración
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isEditing ? (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="p-4 bg-secondary/20 rounded-lg border border-border">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Prefijo
                </Label>
                <p className="font-medium text-lg mt-1">
                  {sequence?.prefix || "FAC"}
                </p>
              </div>
              <div className="p-4 bg-secondary/20 rounded-lg border border-border">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Próximo Número
                </Label>
                <p className="font-medium text-lg mt-1">
                  {sequence?.next_number || 1}
                </p>
              </div>
              <div className="p-4 bg-secondary/20 rounded-lg border border-border">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">
                  Patrón Actual
                </Label>
                <p className="font-mono text-sm bg-background border border-border inline-block px-2 py-1 rounded mt-1">
                  {sequence?.pattern || "{PREFIX}-{NUMBER}"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-primary">
              <span className="font-semibold">Ejemplo:</span>
              <span className="font-mono bg-background px-2 py-0.5 rounded border border-primary/20">
                {sequence?.prefix}-
                {String(sequence?.next_number).padStart(6, "0")}
              </span>
            </div>

            <Button onClick={startEditing}>Modificar Configuración</Button>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Prefijo</Label>
                <Input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Próximo Número</Label>
                <Input
                  type="number"
                  value={nextNumber}
                  onChange={(e) => setNextNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Constructor de Patrón</Label>
                <span className="text-xs text-muted-foreground font-mono bg-secondary px-2 py-1 rounded border border-border">
                  Vista previa: {currentPatternPreview}
                </span>
              </div>

              <div className="border border-dashed border-primary/30 rounded-lg p-4 bg-primary/5 min-h-[80px]">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={items.map((i) => i.id)}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="flex flex-wrap gap-2 items-center">
                      {items.map((item) => (
                        <SortableItem
                          key={item.id}
                          id={item.id}
                          value={item.value}
                          onDelete={() => deleteItem(item.id)}
                        />
                      ))}
                      {items.length === 0 && (
                        <span className="text-muted-foreground text-sm italic w-full text-center py-4">
                          Arrastra o agrega elementos aquí...
                        </span>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Agregar Elementos
                </Label>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addToken("{PREFIX}")}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Prefijo
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addToken("{NUMBER}")}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Número
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addToken("{CLIENT}")}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Cliente
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addToken("{YEAR}")}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Año
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => addToken("{MONTH}")}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Mes
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Separadores
                    </Label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 min-w-8 px-2 font-mono"
                        onClick={() => addToken("-")}
                      >
                        -
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 min-w-8 px-2 font-mono"
                        onClick={() => addToken("/")}
                      >
                        /
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 min-w-8 px-2 font-mono"
                        onClick={() => addToken(".")}
                      >
                        .
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => addToken(" ")}
                      >
                        Espacio
                      </Button>
                      
                      <div className="h-6 w-px bg-border mx-1"></div>

                      <div className="flex items-center gap-2">
                        <Input 
                          placeholder="Otro..." 
                          className="h-8 w-20 text-xs"
                          value={customSeparator}
                          onChange={(e) => setCustomSeparator(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomSeparator();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={handleAddCustomSeparator}
                          disabled={!customSeparator}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                Guardar Configuración
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
