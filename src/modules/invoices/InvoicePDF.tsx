import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { Invoice, InvoiceItem, CompanySettings } from '@/lib/tauri';
import { format } from 'date-fns';
import { numberToWords } from '@/lib/numberToWords';

// Register fonts (using standard fonts for now, but configured for clarity)
const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 8,
    },
    // Header Section
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        height: 80,
    },
    companySection: {
        width: '60%',
        flexDirection: 'column',
        justifyContent: 'flex-start',
    },
    companyName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    companyDetails: {
        fontSize: 8,
        color: '#333',
        marginBottom: 1,
    },
    invoiceBox: {
        width: '35%',
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 4,
        padding: 0,
    },
    invoiceBoxHeader: {
        backgroundColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        padding: 4,
        textAlign: 'center',
        fontWeight: 'bold',
        fontSize: 10,
    },
    invoiceBoxContent: {
        padding: 5,
        flexDirection: 'column',
        gap: 2,
    },
    invoiceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    invoiceLabel: {
        fontWeight: 'bold',
    },

    // Client Section
    clientSection: {
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 4,
        marginBottom: 10,
        padding: 5,
        flexDirection: 'column',
    },
    clientRow: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    clientLabel: {
        width: 60,
        fontWeight: 'bold',
    },
    clientValue: {
        flex: 1,
    },
    clientValueWide: {
        flex: 2,
    },

    // Table Section
    tableContainer: {
        borderWidth: 1,
        borderColor: '#000',
        borderBottomWidth: 0, // Last row adds bottom border
        marginTop: 5,
        flexGrow: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#e0e0e0',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        paddingVertical: 4,
        paddingHorizontal: 2,
        fontWeight: 'bold',
        fontSize: 7,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingVertical: 3,
        paddingHorizontal: 2,
        fontSize: 8,
    },
    // Columns
    colCode: { width: '12%' },
    colDesc: { width: '43%' },
    colQty: { width: '10%', textAlign: 'center' },
    colPrice: { width: '15%', textAlign: 'right' },
    colDisc: { width: '10%', textAlign: 'right' },
    colTotal: { width: '15%', textAlign: 'right' },

    // Footer Section
    footerContainer: {
        marginTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingTop: 5,
        flexDirection: 'row',
    },
    amountInWords: {
        width: '60%',
        paddingRight: 10,
        fontSize: 8,
        fontStyle: 'italic',
    },
    totalsBox: {
        width: '40%',
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 2,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    lastTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
        backgroundColor: '#f0f0f0',
        fontWeight: 'bold',
    },
    notesSection: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        paddingTop: 5,
    },
    legalFooter: {
        marginTop: 20,
        textAlign: 'center',
        fontSize: 7,
        color: '#666',
    },
});

interface InvoicePDFProps {
    invoice: Invoice;
    items: InvoiceItem[];
    settings?: CompanySettings;
}

export const InvoicePDF = ({ invoice, items, settings }: InvoicePDFProps) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
    };

    return (
        <Document>
            <Page size="LETTER" style={styles.page}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <View style={styles.companySection}>
                        <Text style={styles.companyName}>{settings?.name || 'NOMBRE DE EMPRESA'}</Text>
                        <Text style={styles.companyDetails}>{settings?.legal_id || 'RIF: J-00000000-0'}</Text>
                        <Text style={styles.companyDetails}>{settings?.address || 'Dirección Fiscal'}</Text>
                        <Text style={styles.companyDetails}>{settings?.phone || 'Teléfonos'}</Text>
                        <Text style={styles.companyDetails}>{settings?.email || 'Email'}</Text>
                    </View>
                    <View style={styles.invoiceBox}>
                        <Text style={styles.invoiceBoxHeader}>FACTURA</Text>
                        <View style={styles.invoiceBoxContent}>
                            <View style={styles.invoiceRow}>
                                <Text style={styles.invoiceLabel}>NÚMERO:</Text>
                                <Text>{invoice.invoice_number}</Text>
                            </View>
                            <View style={styles.invoiceRow}>
                                <Text style={styles.invoiceLabel}>FECHA:</Text>
                                <Text>{format(new Date(invoice.issue_date), 'dd/MM/yyyy')}</Text>
                            </View>
                            <View style={styles.invoiceRow}>
                                <Text style={styles.invoiceLabel}>VENCE:</Text>
                                <Text>{invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : 'N/A'}</Text>
                            </View>
                            <View style={styles.invoiceRow}>
                                <Text style={styles.invoiceLabel}>CONDICIÓN:</Text>
                                <Text>{invoice.payment_terms || 'Contado'}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Client Info */}
                <View style={styles.clientSection}>
                    <View style={styles.clientRow}>
                        <Text style={styles.clientLabel}>RAZÓN SOCIAL:</Text>
                        <Text style={styles.clientValueWide}>{invoice.client_name}</Text>
                        <Text style={styles.clientLabel}>VENDEDOR:</Text>
                        <Text style={styles.clientValue}>--</Text> 
                    </View>
                    <View style={styles.clientRow}>
                        <Text style={styles.clientLabel}>RIF / CI:</Text>
                        <Text style={styles.clientValueWide}>{invoice.client_tax_id}</Text>
                        <Text style={styles.clientLabel}>MONEDA:</Text>
                        <Text style={styles.clientValue}>{invoice.currency}</Text>
                    </View>
                    <View style={styles.clientRow}>
                        <Text style={styles.clientLabel}>DIRECCIÓN:</Text>
                        <Text style={styles.clientValueWide}>{invoice.client_address || 'N/A'}</Text>
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colCode}>CÓDIGO</Text>
                        <Text style={styles.colDesc}>DESCRIPCIÓN</Text>
                        <Text style={styles.colQty}>CANT.</Text>
                        <Text style={styles.colPrice}>PRECIO</Text>
                         <Text style={styles.colDisc}>% DESC</Text>
                        <Text style={styles.colTotal}>TOTAL</Text>
                    </View>
                    {items.map((item, index) => (
                        <View key={item.id} style={{ ...styles.tableRow, backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                            <Text style={styles.colCode}>{item.code || '-'}</Text>
                            <Text style={styles.colDesc}>{item.description}</Text>
                            <Text style={styles.colQty}>{item.quantity}</Text>
                            <Text style={styles.colPrice}>{formatCurrency(item.unit_price)}</Text>
                             <Text style={styles.colDisc}>{item.discount_percent > 0 ? `${item.discount_percent}%` : '-'}</Text>
                            <Text style={styles.colTotal}>{formatCurrency(item.line_total)}</Text>
                        </View>
                    ))}
                </View>

                {/* Footer & Totals */}
                <View style={styles.footerContainer}>
                    <View style={styles.amountInWords}>
                        <Text>{numberToWords(invoice.total, invoice.currency)}</Text>
                        {invoice.notes && (
                            <View style={styles.notesSection}>
                                <Text style={{fontWeight: 'bold'}}>NOTAS:</Text>
                                <Text>{invoice.notes}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text style={styles.invoiceLabel}>SUBTOTAL:</Text>
                            <Text>{formatCurrency(invoice.subtotal)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.invoiceLabel}>DESCUENTO:</Text>
                            <Text>{formatCurrency(invoice.discount_total)}</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.invoiceLabel}>I.V.A.:</Text>
                            <Text>{formatCurrency(invoice.tax_total)}</Text>
                        </View>
                        <View style={styles.lastTotalRow}>
                            <Text style={{fontWeight: 'bold'}}>TOTAL {invoice.currency}:</Text>
                            <Text style={{fontWeight: 'bold'}}>{formatCurrency(invoice.total)}</Text>
                        </View>
                    </View>
                </View>
                
                 {/* Legal Footer */}
                 <View style={styles.legalFooter}>
                    <Text>Generado por Equinox ERP - Documento Sin Valor Fiscal</Text>
                </View>
            </Page>
        </Document>
    );
};

