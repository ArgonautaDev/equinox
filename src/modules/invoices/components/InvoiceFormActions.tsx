import { Button } from "@/components/ui/button";
import { Printer, Save, Send } from "lucide-react";

interface InvoiceFormActionsProps {
    handlePrint: () => void;
    handleIssue: () => void;
    isPending: boolean;
    onSave: () => void;
}

export function InvoiceFormActions({ handlePrint, handleIssue, isPending, onSave }: InvoiceFormActionsProps) {
    return (
        <div className="flex gap-2">
            <Button 
                variant="outline" 
                onClick={(e) => {
                    e.preventDefault();
                    console.log("[Actions] Print Clicked");
                    handlePrint();
                }} 
                title="Imprimir / Vista Previa"
            >
                <Printer className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Imprimir</span>
            </Button>
            
            <Button 
                type="button" 
                onClick={(e) => {
                    e.preventDefault();
                    console.log("[Actions] Issue Clicked");
                    handleIssue();
                }}
                className="bg-green-600 hover:bg-green-700 text-white"
            >
                <Send className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Emitir</span>
            </Button>
            
            <Button 
                type="button" 
                onClick={(e) => {
                    e.preventDefault();
                    console.log("[Actions] Save Clicked");
                    // Trigger parent save handler
                    onSave();
                }}
                disabled={isPending}
                className="bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all"
            >
                {isPending ? "Guardando..." : <><Save className="h-4 w-4 lg:mr-2" /> <span className="hidden lg:inline">Guardar</span></>}
            </Button>
        </div>
    );
}
