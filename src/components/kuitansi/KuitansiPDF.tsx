'use client'

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { KuitansiWithInvoice } from '@/types/database'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { terbilang } from '@/lib/utils/terbilang'

// Styles untuk PDF Kuitansi
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        backgroundColor: '#1e293b',
        color: 'white',
        padding: 20,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: 4,
    },
    headerInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 15,
    },
    headerRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    headerLabel: {
        color: '#94a3b8',
        width: 80,
    },
    headerValue: {
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        paddingBottom: 15,
    },
    label: {
        width: 150,
    },
    labelTitle: {
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 2,
    },
    labelSubtitle: {
        fontSize: 8,
        fontStyle: 'italic',
        color: '#64748b',
    },
    value: {
        flex: 1,
        fontWeight: 'bold',
        fontSize: 12,
    },
    terbilangRow: {
        flexDirection: 'row',
        marginBottom: 15,
        paddingBottom: 15,
    },
    terbilangLabel: {
        width: 150,
    },
    terbilangValue: {
        flex: 1,
        fontWeight: 'bold',
        fontSize: 11,
        color: '#f97316',
        fontStyle: 'italic',
    },
    amountBox: {
        backgroundColor: '#fef3c7',
        padding: 15,
        marginBottom: 20,
        borderRadius: 4,
    },
    amountValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#92400e',
        textAlign: 'center',
    },
    signatureArea: {
        marginTop: 40,
        alignItems: 'flex-end',
    },
    signatureBox: {
        width: 200,
        alignItems: 'center',
    },
    signatureLocation: {
        marginBottom: 10,
    },
    signatureLine: {
        width: 150,
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#1e293b',
        marginBottom: 5,
    },
    signatureLabel: {
        fontSize: 9,
        color: '#64748b',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1e293b',
        color: 'white',
        padding: 15,
    },
    footerText: {
        fontSize: 9,
    },
    footerSubtext: {
        fontSize: 8,
        fontStyle: 'italic',
        color: '#94a3b8',
        marginTop: 2,
    },
})

interface KuitansiPDFProps {
    kuitansi: KuitansiWithInvoice
    companyInfo?: {
        name: string
        address: string
        phone: string
        primary_color?: string | null
        accent_color?: string | null
        default_kuitansi_template_id?: string | null
    }
}

export function KuitansiPDFDocument({ kuitansi, companyInfo }: KuitansiPDFProps) {
    // Get brand info from invoice, fallback to company info
    const brand = kuitansi.invoice?.brand
    const displayName = brand?.company_name || companyInfo?.name || 'RAIDWEAR'
    const displayAddress = brand?.address || companyInfo?.address || ''
    const primaryColor = brand?.primary_color || companyInfo?.primary_color || '#1e293b'
    const accentColor = brand?.accent_color || companyInfo?.accent_color || '#f97316'
    const templateId = kuitansi.template_id || brand?.default_kuitansi_template_id || companyInfo?.default_kuitansi_template_id || 'receipt_01'
    const isMinimal = templateId === 'receipt_02'
    const isCompact = templateId === 'receipt_03'
    // Formal (receipt_01): header & footer berwarna brand, kotak jumlah aksen.
    // Minimal (receipt_02): header/footer putih bergaris, teks gelap, hemat tinta.
    // Compact (receipt_03): header berwarna namun rapat & hemat ruang.
    const headerStyle = isMinimal
        ? { ...styles.header, backgroundColor: '#ffffff', borderBottomWidth: 2, borderBottomColor: primaryColor, padding: 16, marginBottom: 16 }
        : isCompact
            ? { ...styles.header, backgroundColor: primaryColor, padding: 12, marginBottom: 10 }
            : { ...styles.header, backgroundColor: primaryColor }
    const footerStyle = isMinimal
        ? { ...styles.footer, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: primaryColor }
        : { ...styles.footer, backgroundColor: primaryColor }
    const titleStyle = [
        styles.title,
        {
            color: isMinimal ? primaryColor : 'white',
            fontSize: isCompact ? 20 : 28,
            letterSpacing: isCompact ? 2 : 4,
        },
    ]
    const headerLabelStyle = [styles.headerLabel, { color: isMinimal ? '#64748b' : '#94a3b8' }]
    const headerValueStyle = [styles.headerValue, { color: isMinimal ? '#1e293b' : 'white' }]
    const footerTextStyle = { color: isMinimal ? '#334155' : 'white' }
    const footerSubtextStyle = { color: isMinimal ? '#64748b' : '#94a3b8' }
    const contentStyle = isCompact ? { ...styles.content, padding: 12 } : styles.content
    const rowStyle = isCompact ? { ...styles.row, marginBottom: 10, paddingBottom: 10 } : styles.row
    const terbilangRowStyle = isCompact ? { ...styles.terbilangRow, marginBottom: 10, paddingBottom: 10 } : styles.terbilangRow
    const signatureAreaStyle = isCompact ? { ...styles.signatureArea, marginTop: 20 } : styles.signatureArea
    const amountStyle = isMinimal
        ? { ...styles.amountBox, backgroundColor: '#ffffff', borderWidth: 1, borderColor: primaryColor }
        : isCompact
            ? { ...styles.amountBox, backgroundColor: `${accentColor}25`, padding: 10, marginBottom: 12 }
            : { ...styles.amountBox, backgroundColor: `${accentColor}25` }
    const amountValueStyle = isMinimal
        ? { ...styles.amountValue, color: primaryColor }
        : isCompact
            ? { ...styles.amountValue, fontSize: 16 }
            : styles.amountValue
    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={headerStyle}>
                    <Text style={titleStyle}>KUITANSI</Text>
                    <View style={styles.headerInfo}>
                        <View>
                            <View style={styles.headerRow}>
                                <Text style={headerLabelStyle}>No. Kuitansi:</Text>
                                <Text style={headerValueStyle}>{kuitansi.no_kuitansi}</Text>
                            </View>
                            <View style={styles.headerRow}>
                                <Text style={headerLabelStyle}>Tanggal:</Text>
                                <Text style={headerValueStyle}>{formatDate(kuitansi.tanggal)}</Text>
                            </View>
                        </View>
                        <View>
                            <View style={styles.headerRow}>
                                <Text style={headerLabelStyle}>No. Invoice:</Text>
                                <Text style={headerValueStyle}>{kuitansi.invoice?.no_invoice}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <View style={contentStyle}>
                    {/* Sudah diterima dari */}
                    <View style={rowStyle}>
                        <View style={styles.label}>
                            <Text style={styles.labelTitle}>Sudah diterima dari</Text>
                            <Text style={styles.labelSubtitle}>Received from</Text>
                        </View>
                        <Text style={styles.value}>: {kuitansi.invoice?.customer?.name}</Text>
                    </View>

                    {/* Jumlah */}
                    <View style={amountStyle}>
                        <Text style={amountValueStyle}>Rp {formatCurrency(kuitansi.jumlah).replace('Rp', '').trim()}</Text>
                    </View>

                    {/* Terbilang */}
                    <View style={terbilangRowStyle}>
                        <View style={styles.terbilangLabel}>
                            <Text style={[styles.labelTitle, { color: primaryColor }]}>Terbilang</Text>
                            <Text style={styles.labelSubtitle}>Amount in words</Text>
                        </View>
                        <Text style={styles.terbilangValue}>: {terbilang(kuitansi.jumlah)}</Text>
                    </View>

                    {/* Untuk Pembayaran */}
                    <View style={rowStyle}>
                        <View style={styles.label}>
                            <Text style={[styles.labelTitle, { color: primaryColor }]}>Untuk Pembayaran</Text>
                            <Text style={styles.labelSubtitle}>In Payment of</Text>
                        </View>
                        <Text style={[styles.value, { color: primaryColor }]}>: {kuitansi.keterangan}</Text>
                    </View>

                    {/* Signature */}
                    <View style={signatureAreaStyle}>
                        <View style={styles.signatureBox}>
                            <Text style={styles.signatureLocation}>
                                {kuitansi.lokasi || 'Bandung'}, {formatDate(kuitansi.tanggal)}
                            </Text>
                            <View style={styles.signatureLine}></View>
                            <Text style={styles.signatureLabel}>(Penerima)</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={footerStyle}>
                    <Text style={[styles.footerText, footerTextStyle, { fontWeight: 'bold', marginBottom: 3 }]}>{displayName}</Text>
                    <Text style={[styles.footerText, footerTextStyle]}>Kuitansi ini berlaku sah, setelah uang diterima.</Text>
                    <Text style={[styles.footerSubtext, footerSubtextStyle]}>This payment will be legal, if the cheque has been accepted by the bank</Text>
                </View>
            </Page>
        </Document>
    )
}

export default KuitansiPDFDocument
