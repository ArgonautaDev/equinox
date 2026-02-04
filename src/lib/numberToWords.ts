export function numberToWords(number: number, currency: string = "BOLIVARES"): string {
    const units = [
        "", "UN ", "DOS ", "TRES ", "CUATRO ", "CINCO ", "SEIS ", "SIETE ", "OCHO ", "NUEVE "
    ];
    const tens = [
        "", "DIEZ ", "VEINTE ", "TREINTA ", "CUARENTA ", "CINCUENTA ", "SESENTA ", "SETENTA ", "OCHENTA ", "NOVENTA "
    ];
    const teens = [
        "DIEZ ", "ONCE ", "DOCE ", "TRECE ", "CATORCE ", "QUINCE ", "DIECISEIS ", "DIECISIETE ", "DIECIOCHO ", "DIECINUEVE "
    ];
    const twenty = [
        "VEINTE ", "VEINTIUNO ", "VEINTIDOS ", "VEINTITRES ", "VEINTICUATRO ", "VEINTICINCO ", "VEINTISEIS ", "VEINTISIETE ", "VEINTIOCHO ", "VEINTINUEVE "
    ];
    const hundreds = [
        "", "CIENTO ", "DOSCIENTOS ", "TRESCIENTOS ", "CUATROCIENTOS ", "QUINIENTOS ", "SEISCIENTOS ", "SETECIENTOS ", "OCHOCIENTOS ", "NOVECIENTOS "
    ];

    if (number === 0) return "CERO " + currency;

    const integerPart = Math.floor(number);
    const decimalPart = Math.round((number - integerPart) * 100);

    let words = "";

    const convertGroup = (n: number) => {
        let output = "";
        if (n === 100) return "CIEN ";

        if (n >= 100) {
            output += hundreds[Math.floor(n / 100)];
            n %= 100;
        }

        if (n >= 30) {
            output += tens[Math.floor(n / 10)];
            if (n % 10 > 0) output += "Y " + units[n % 10];
        } else if (n >= 20) {
            output += twenty[n - 20];
        } else if (n >= 10) {
            output += teens[n - 10];
        } else if (n > 0) {
            output += units[n];
        }
        return output;
    };

    if (integerPart >= 1000000) {
        const millions = Math.floor(integerPart / 1000000);
        words += convertGroup(millions);
        words += millions === 1 ? "MILLON " : "MILLONES ";
        
        const remainder = integerPart % 1000000;
        if (remainder > 0) {
             if (remainder >= 1000) {
                const thousands = Math.floor(remainder / 1000);
                if (thousands === 1) words += "MIL ";
                else words += convertGroup(thousands) + "MIL ";
             }
             words += convertGroup(remainder % 1000);
        }
    } else if (integerPart >= 1000) {
        const thousands = Math.floor(integerPart / 1000);
        if (thousands === 1) words += "MIL ";
        else words += convertGroup(thousands) + "MIL ";
        
        words += convertGroup(integerPart % 1000);
    } else {
        words += convertGroup(integerPart);
    }

    words = words.trim();
    if (words === "UN") words = "UN"; // Fix logic for currency if needed, keeping simple.

    return `SON: ${words} ${currency} CON ${decimalPart.toString().padStart(2, '0')}/100`;
}
