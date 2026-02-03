//! Tax Calculator Service

use rust_decimal::Decimal;
use rust_decimal_macros::dec;

/// Calculate IVA (Venezuela VAT)
#[allow(dead_code)]
pub fn calculate_iva(subtotal: Decimal, rate: Decimal) -> Decimal {
    subtotal * rate / dec!(100)
}

/// Calculate line total
pub fn calculate_line_total(
    quantity: Decimal,
    unit_price: Decimal,
    tax_rate: Decimal,
    discount_percent: Decimal,
) -> (Decimal, Decimal, Decimal) {
    let gross = quantity * unit_price;
    let discount = gross * discount_percent / dec!(100);
    let subtotal = gross - discount;
    let tax = subtotal * tax_rate / dec!(100);
    let total = subtotal + tax;

    (subtotal, tax, total)
}

/// Calculate invoice totals
#[allow(dead_code)]
pub fn calculate_invoice_totals(
    items: &[(Decimal, Decimal, Decimal)], // (subtotal, tax, total)
) -> (Decimal, Decimal, Decimal) {
    let mut subtotal = dec!(0);
    let mut tax_amount = dec!(0);
    let mut total = dec!(0);

    for (item_subtotal, item_tax, item_total) in items {
        subtotal += item_subtotal;
        tax_amount += item_tax;
        total += item_total;
    }

    (subtotal, tax_amount, total)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_iva() {
        let subtotal = dec!(100);
        let rate = dec!(16);
        assert_eq!(calculate_iva(subtotal, rate), dec!(16));
    }

    #[test]
    fn test_calculate_line_total() {
        // Qty: 2, Price: 50, Tax: 16%, Discount: 10%
        // Gross: 100
        // Discount: 10
        // Subtotal: 90
        // Tax: 90 * 0.16 = 14.4
        // Total: 104.4
        let (sub, tax, total) = calculate_line_total(dec!(2), dec!(50), dec!(16), dec!(10));
        assert_eq!(sub, dec!(90));
        assert_eq!(tax, dec!(14.4));
        assert_eq!(total, dec!(104.4));
    }
}
