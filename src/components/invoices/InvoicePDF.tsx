'use client'

import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import { InvoiceWithItems } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { terbilang } from '@/lib/utils/terbilang'

const styles = StyleSheet.create({
    page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
    companyLogo: {
        width: 120,
        height: 75,
        objectFit: 'contain',
        objectPosition: 'right center',
    },
    footerCompanyInfo: {
        position: 'absolute',
        bottom: 42,
        left: 40,
        right: 40,
        fontSize: 8,
        color: '#64748b',
        textAlign: 'center',
    },
    footerLegal: {
        position: 'absolute',
        bottom: 28,
        left: 40,
        right: 40,
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 8,
    },
    infoRow: { flexDirection: 'row', marginBottom: 4 },
    infoLabel: { width: 100, color: '#64748b' },
    infoValue: { fontWeight: 'bold' },
    section: { marginTop: 15, marginBottom: 15 },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingBottom: 5,
    },
    customerBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 4 },
    table: { marginTop: 10 },
    tableHeader: { flexDirection: 'row', backgroundColor: '#1e293b', color: 'white', padding: 8 },
    tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', padding: 8 },
    colNo: { width: '5%', textAlign: 'center' },
    colDesc: { width: '40%' },
    colQty: { width: '10%', textAlign: 'center' },
    colUnit: { width: '10%', textAlign: 'center' },
    colPrice: { width: '17.5%', textAlign: 'right' },
    colSubtotal: { width: '17.5%', textAlign: 'right' },
    totalsBox: { marginTop: 20, alignItems: 'flex-end' },
    totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4, width: 250 },
    totalLabel: { width: 100, color: '#64748b' },
    totalValue: { width: 150, textAlign: 'right', fontWeight: 'bold' },
    grandTotal: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#059669',
        borderTopWidth: 2,
        borderTopColor: '#1e293b',
        paddingTop: 8,
        marginTop: 8,
    },
    terbilang: {
        marginTop: 10,
        padding: 10,
        backgroundColor: '#fef3c7',
        borderRadius: 4,
        fontStyle: 'italic',
        color: '#92400e',
        fontSize: 9,
    },
    bankInfo: { marginTop: 20, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 4 },
})

interface InvoicePDFProps {
    invoice: InvoiceWithItems
    companyInfo?: { name: string; address: string; phone: string }
    bankInfo?: { bank_name: string; account_name: string; account_number: string }
    brandInfo?: {
        name: string
        address: string | null
        logo_url: string | null
        primary_color?: string | null
        accent_color?: string | null
        default_invoice_template_id?: string | null
    } | null
}

export function InvoicePDFDocument({ invoice, companyInfo, bankInfo, brandInfo }: InvoicePDFProps) {
    const jatuhTempo = new Date(invoice.tanggal)
    jatuhTempo.setDate(jatuhTempo.getDate() + (invoice.termin_pembayaran || 16))

    const primaryColor = brandInfo?.primary_color || '#1e293b'
    const accentColor = brandInfo?.accent_color || '#f97316'
    const template = invoice.template_id || brandInfo?.default_invoice_template_id || 'invoice_01'
    const isMinimal = template === 'invoice_02'
    const isBold = template === 'invoice_03'
    // Modern (invoice_01): header berwarna brand, tabel & aksen memakai warna utama.
    // Minimal (invoice_02): header putih bergaris, hemat tinta, teks gelap.
    // Bold (invoice_03): identitas brand dominan — header tebal + garis aksen, aksen menonjol.
    const headerStyle = isMinimal
        ? { ...styles.header, borderBottomWidth: 2, borderBottomColor: primaryColor, paddingBottom: 12 }
        : isBold
            ? { ...styles.header, backgroundColor: primaryColor, padding: 18, borderRadius: 8, borderBottomWidth: 4, borderBottomColor: accentColor }
            : { ...styles.header, backgroundColor: primaryColor, padding: 12, borderRadius: 4 }
    const headerTextColor = isMinimal ? '#1e293b' : 'white'
    const titleStyle = {
        color: headerTextColor,
        fontSize: isBold ? 30 : isMinimal ? 22 : 24,
        letterSpacing: isBold ? 2 : 0,
    }
    const infoLabelColor = isMinimal ? '#64748b' : isBold ? '#e2e8f0' : '#cbd5e1'
    const sectionTitleStyle = {
        color: isMinimal ? '#475569' : isBold ? accentColor : primaryColor,
        borderBottomColor: isMinimal ? '#e2e8f0' : `${isBold ? accentColor : primaryColor}40`,
    }
    const tableHeaderStyle = isMinimal
        ? { ...styles.tableHeader, backgroundColor: '#64748b' }
        : isBold
            ? { ...styles.tableHeader, backgroundColor: accentColor }
            : { ...styles.tableHeader, backgroundColor: primaryColor }
    const customerBoxStyle = isMinimal
        ? { ...styles.customerBox, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' }
        : isBold
            ? { ...styles.customerBox, backgroundColor: `${accentColor}18`, borderLeftWidth: 3, borderLeftColor: accentColor }
            : { ...styles.customerBox, backgroundColor: `${primaryColor}12` }
    const terbilangStyle = isMinimal
        ? { ...styles.terbilang, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', color: '#475569' }
        : isBold
            ? { ...styles.terbilang, backgroundColor: `${accentColor}1f`, color: accentColor }
            : styles.terbilang
    const grandTotalColor = isBold ? accentColor : primaryColor

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={headerStyle}>
                    <View>
                        <Text style={[styles.title, titleStyle]}>INVOICE</Text>
                        <View style={{ marginTop: 10 }}>
                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, { color: infoLabelColor }]}>No. Invoice:</Text>
                                <Text style={[styles.infoValue, { color: headerTextColor }]}>{invoice.no_invoice}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, { color: infoLabelColor }]}>Tanggal:</Text>
                                <Text style={[styles.infoValue, { color: headerTextColor }]}>{formatDate(invoice.tanggal)}</Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={[styles.infoLabel, { color: infoLabelColor }]}>Jatuh Tempo:</Text>
                                <Text style={[styles.infoValue, { color: headerTextColor }]}>{formatDate(jatuhTempo)}</Text>
                            </View>
                            {invoice.no_po && (
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabel, { color: infoLabelColor }]}>No. PO:</Text>
                                    <Text style={[styles.infoValue, { color: headerTextColor }]}>{invoice.no_po}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                    {brandInfo?.logo_url && <Image src={brandInfo.logo_url} style={styles.companyLogo} />}
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, sectionTitleStyle]}>Kepada Yth.</Text>
                    <View style={customerBoxStyle}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{invoice.customer?.name}</Text>
                        <Text style={{ color: '#64748b' }}>{invoice.customer?.alamat || '-'}</Text>
                        <Text style={{ color: '#64748b' }}>Telp: {invoice.customer?.phone}</Text>
                    </View>
                </View>

                <View style={styles.table}>
                    <View style={tableHeaderStyle}>
                        <Text style={[styles.colNo, { color: 'white' }]}>#</Text>
                        <Text style={[styles.colDesc, { color: 'white' }]}>Deskripsi</Text>
                        <Text style={[styles.colQty, { color: 'white' }]}>Qty</Text>
                        <Text style={[styles.colUnit, { color: 'white' }]}>Satuan</Text>
                        <Text style={[styles.colPrice, { color: 'white' }]}>Harga</Text>
                        <Text style={[styles.colSubtotal, { color: 'white' }]}>Sub Total</Text>
                    </View>
                    {invoice.items?.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                            <Text style={styles.colNo}>{index + 1}</Text>
                            <Text style={styles.colDesc}>{item.deskripsi}</Text>
                            <Text style={styles.colQty}>{item.jumlah}</Text>
                            <Text style={styles.colUnit}>{item.satuan}</Text>
                            <Text style={styles.colPrice}>{formatCurrency(item.harga_satuan)}</Text>
                            <Text style={styles.colSubtotal}>{formatCurrency(item.sub_total)}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.totalsBox}>
                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>Sub Total</Text>
                        <Text style={styles.totalValue}>{formatCurrency(invoice.sub_total)}</Text>
                    </View>
                    {invoice.ppn_persen > 0 && (
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>PPN ({invoice.ppn_persen}%)</Text>
                            <Text style={styles.totalValue}>{formatCurrency(invoice.ppn_amount)}</Text>
                        </View>
                    )}
                    <View style={[styles.totalRow, styles.grandTotal, { color: grandTotalColor, borderTopColor: grandTotalColor }]}>
                        <Text style={styles.totalLabel}>TOTAL</Text>
                        <Text style={[styles.totalValue, { color: grandTotalColor }]}>{formatCurrency(invoice.total)}</Text>
                    </View>
                    {invoice.total_dibayar > 0 && (
                        <>
                            <View style={[styles.totalRow, { marginTop: 8 }]}>
                                <Text style={styles.totalLabel}>Dibayar</Text>
                                <Text style={[styles.totalValue, { color: '#059669' }]}>-{formatCurrency(invoice.total_dibayar)}</Text>
                            </View>
                            <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6, marginTop: 4 }]}>
                                <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>Sisa Tagihan</Text>
                                <Text style={[styles.totalValue, { color: invoice.sisa_tagihan > 0 ? '#dc2626' : '#059669', fontSize: 13, fontWeight: 'bold' }]}>
                                    {formatCurrency(invoice.sisa_tagihan)}
                                </Text>
                            </View>
                        </>
                    )}
                </View>

                <View style={terbilangStyle}>
                    <Text>Terbilang: {terbilang(invoice.total_dibayar > 0 ? invoice.sisa_tagihan : invoice.total)}</Text>
                </View>

                {bankInfo && (
                    <View style={styles.bankInfo}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Pembayaran:</Text>
                        <Text>Bank: {bankInfo.bank_name}</Text>
                        <Text>Atas Nama: {bankInfo.account_name}</Text>
                        <Text>No. Rekening: {bankInfo.account_number}</Text>
                    </View>
                )}

                {(companyInfo?.address || companyInfo?.phone) && (
                    <Text style={styles.footerCompanyInfo}>
                        {[companyInfo.address, companyInfo.phone].filter(Boolean).join(' • ')}
                    </Text>
                )}
                <Text style={styles.footerLegal}>Invoice ini sah dan diproses secara elektronik.</Text>
            </Page>
        </Document>
    )
}

export default InvoicePDFDocument
