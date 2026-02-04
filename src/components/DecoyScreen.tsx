import { useState } from 'react';
import { Calculator, Plus, Minus, X, Divide, Equal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function DecoyScreen() {
  const [display, setDisplay] = useState('0');
  const [operator, setOperator] = useState<string | null>(null);
  const [previousValue, setPreviousValue] = useState<number | null>(null);

  const handleNumber = (num: string) => {
    setDisplay((prev) => (prev === '0' ? num : prev + num));
  };

  const handleOperator = (op: string) => {
    setPreviousValue(parseFloat(display));
    setOperator(op);
    setDisplay('0');
  };

  const handleEquals = () => {
    if (operator && previousValue !== null) {
      const current = parseFloat(display);
      let result = 0;

      switch (operator) {
        case '+':
          result = previousValue + current;
          break;
        case '-':
          result = previousValue - current;
          break;
        case '*':
          result = previousValue * current;
          break;
        case '/':
          result = previousValue / current;
          break;
      }

      setDisplay(result.toString());
      setOperator(null);
      setPreviousValue(null);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setOperator(null);
    setPreviousValue(null);
  };

  const buttons = [
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', '=', '+'],
  ];

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Card className="p-6 w-96 shadow-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-700">Calculadora</h2>
        </div>

        {/* Display */}
        <div className="bg-slate-900 text-white p-4 rounded-lg mb-4 text-right text-3xl font-mono h-16 flex items-center justify-end overflow-hidden">
          {display}
        </div>

        {/* Clear button */}
        <Button variant="destructive" className="w-full mb-2" onClick={handleClear}>
          Limpiar
        </Button>

        {/* Number pad */}
        <div className="grid grid-cols-4 gap-2">
          {buttons.flat().map((btn) => {
            const isOperator = ['+', '-', '*', '/'].includes(btn);
            const isEquals = btn === '=';

            return (
              <Button
                key={btn}
                variant={isOperator || isEquals ? 'default' : 'outline'}
                className={`h-16 text-xl font-semibold ${
                  isEquals ? 'bg-green-600 hover:bg-green-700' : ''
                }`}
                onClick={() => {
                  if (btn === '=') handleEquals();
                  else if (isOperator) handleOperator(btn);
                  else handleNumber(btn);
                }}
              >
                {btn === '+' && <Plus className="w-5 h-5" />}
                {btn === '-' && <Minus className="w-5 h-5" />}
                {btn === '*' && <X className="w-5 h-5" />}
                {btn === '/' && <Divide className="w-5 h-5" />}
                {btn === '=' && <Equal className="w-5 h-5" />}
                {!isOperator && btn !== '=' && btn}
              </Button>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 mt-4 text-center">
          Presiona Ctrl 3 veces rápido para acceder al sistema
        </p>
      </Card>
    </div>
  );
}
