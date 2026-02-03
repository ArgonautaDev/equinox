import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { Invoice, InvoiceItem, CompanySettings } from '@/lib/tauri';
import { format } from 'date-fns';

// Register fonts if needed, otherwise use standard fonts
// Font.register({ family: 'Open Sans', src: '...' });

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#CCCCCC',
        paddingBottom: 10,
    },
    companyInfo: {
        flexDirection: 'column',
    },
    companyName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    invoiceInfo: {
        flexDirection: 'column',
        alignItems: 'flex-end',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#212121',
    },
    clientSection: {
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    clientBox: {
        width: '50%',
        paddingRight: 10,
    },
    label: {
        fontSize: 8,
        color: '#666666',
        marginBottom: 2,
    },
    text: {
        fontSize: 10,
        marginBottom: 4,
    },
    table: {
        width: '100%',
        marginVertical: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        backgroundColor: '#F5F5F5',
        paddingVertical: 5,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        paddingVertical: 5,
    },
    col1: { width: '10%' },
    col2: { width: '40%' },
    col3: { width: '15%', textAlign: 'right' },
    col4: { width: '15%', textAlign: 'right' },
    col5: { width: '20%', textAlign: 'right' },
    
    totalsSection: {
        flexDirection: 'column',
        alignItems: 'flex-end',
        marginTop: 10,
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '40%',
        marginBottom: 4,
    },
    totalLabel: {
        fontWeight: 'bold',
    },
    totalValue: {
        textAlign: 'right',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 8,
        color: '#999999',
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
        paddingTop: 10,
    },
});

interface InvoicePDFProps {
    invoice: Invoice;
    items: InvoiceItem[];
    settings?: CompanySettings;
}

export const InvoicePDF = ({ invoice, items, settings }: InvoicePDFProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.companyInfo}>
                    <Text style={styles.companyName}>{settings?.name || 'Equinox ERP'}</Text>
                    <Text style={styles.text}>{settings?.legal_id || 'Rif: J-00000000-0'}</Text>
                    <Text style={styles.text}>{settings?.address || 'Dirección de la empresa'}</Text>
                    <Text style={styles.text}>{settings?.phone || 'Teléfonos'}</Text>
                    <Text style={styles.text}>{settings?.email || 'email@empresa.com'}</Text>
                </View>
                <View style={styles.invoiceInfo}>
                    <Text style={styles.title}>FACTURA</Text>
                    <Text style={styles.text}>N° Control: {invoice.invoice_number}</Text>
                    <Text style={styles.text}>
                        Fecha: {format(new Date(invoice.issue_date), 'dd/MM/yyyy')}
                    </Text>
                    <Text style={styles.text}>
                        Vencimiento: {invoice.due_date ? format(new Date(invoice.due_date), 'dd/MM/yyyy') : 'N/A'}
                    </Text>
                </View>
            </View>

            {/* Client Info */}
            <View style={styles.clientSection}>
                <View style={styles.clientBox}>
                    <Text style={styles.label}>CLIENTE</Text>
                    <Text style={{ ...styles.text, fontWeight: 'bold' }}>{invoice.client_name}</Text>
                    <Text style={styles.text}>{invoice.client_tax_id}</Text>
                    <Text style={styles.text}>{invoice.client_address}</Text>
                </View>
                <View style={styles.clientBox}>
                    <Text style={styles.label}>TÉRMINOS DE PAGO</Text>
                    <Text style={styles.text}>{invoice.payment_terms || 'Contado'}</Text>
                    <Text style={styles.label}>MONEDA</Text>
                    <Text style={styles.text}>{invoice.currency}</Text>
                </View>
            </View>

            {/* Items Table */}
            <View style={styles.table}>
                <View style={styles.tableHeader}>
                    <Text style={styles.col1}>CANT</Text>
                    <Text style={styles.col2}>DESCRIPCIÓN</Text>
                    <Text style={styles.col3}>PREC. UNIT</Text>
                    <Text style={styles.col4}>DESC.</Text>
                    <Text style={styles.col5}>TOTAL</Text>
                </View>
                {items.map((item) => (
                    <View key={item.id} style={styles.tableRow}>
                        <Text style={styles.col1}>{item.quantity}</Text>
                        <Text style={styles.col2}>{item.description}</Text>
                        <Text style={styles.col3}>
                            {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(item.unit_price)}
                        </Text>
                        <Text style={styles.col4}>
                            {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(item.discount_amount)}
                        </Text>
                        <Text style={styles.col5}>
                            {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(item.line_total)}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Totals */}
            <View style={styles.totalsSection}>
                <View style={styles.totalRow}>
                    <Text>Subtotal:</Text>
                    <Text>{new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(invoice.subtotal)}</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text>Descuentos:</Text>
                    <Text>-{new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(invoice.discount_total)}</Text>
                </View>
                <View style={styles.totalRow}>
                    <Text>Impuestos:</Text>
                    <Text>{new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(invoice.tax_total)}</Text>
                </View>
                <View style={{ ...styles.totalRow, marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderColor: '#000000' }}>
                    <Text style={styles.totalLabel}>TOTAL {invoice.currency}:</Text>
                    <Text style={{ ...styles.totalValue, fontWeight: 'bold' }}>
                        {new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2 }).format(invoice.total)}
                    </Text>
                </View>
            </View>

            {/* Notes */}
            {invoice.notes && (
                <View style={{ marginTop: 20 }}>
                    <Text style={styles.label}>NOTAS</Text>
                    <Text style={styles.text}>{invoice.notes}</Text>
                </View>
            )}

            {/* Footer */}
            <View style={styles.footer}>
                <Text>Documento generado electrónicamente por Equinox ERP</Text>
            </View>
        </Page>
    </Document>
);
