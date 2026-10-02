export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    public: {
        Tables: {
            customers: {
                Row: {
                    id: string
                    name: string
                    phone: string
                    alamat: string | null
                    kota: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    phone: string
                    alamat?: string | null
                    kota?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    phone?: string
                    alamat?: string | null
                    kota?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            // ==========================================
            // BRANDS TABLE
            // ==========================================
            brands: {
                Row: {
                    id: string
                    code: string
                    name: string
                    company_name: string
                    address: string | null
                    phone: string | null
                    email: string | null
                    logo_url: string | null
                    bank_name: string | null
                    account_name: string | null
                    account_number: string | null
                    primary_color: string
                    accent_color: string
                    secondary_color: string
                    default_invoice_template_id: string
                    default_kuitansi_template_id: string
                    invoice_prefix: string
                    kuitansi_prefix: string
                    spk_prefix: string
                    invoice_counter: number
                    kuitansi_counter: number
                    spk_counter: number
                    is_default: boolean
                    is_active: boolean
                    tenant_id: string
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    code: string
                    name: string
                    company_name: string
                    address?: string | null
                    phone?: string | null
                    email?: string | null
                    logo_url?: string | null
                    bank_name?: string | null
                    account_name?: string | null
                    account_number?: string | null
                    primary_color?: string
                    accent_color?: string
                    secondary_color?: string
                    default_invoice_template_id?: string
                    default_kuitansi_template_id?: string
                    invoice_prefix?: string
                    kuitansi_prefix?: string
                    spk_prefix?: string
                    invoice_counter?: number
                    kuitansi_counter?: number
                    spk_counter?: number
                    is_default?: boolean
                    is_active?: boolean
                    tenant_id?: string
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    code?: string
                    name?: string
                    company_name?: string
                    address?: string | null
                    phone?: string | null
                    email?: string | null
                    logo_url?: string | null
                    bank_name?: string | null
                    account_name?: string | null
                    account_number?: string | null
                    primary_color?: string
                    accent_color?: string
                    secondary_color?: string
                    default_invoice_template_id?: string
                    default_kuitansi_template_id?: string
                    invoice_prefix?: string
                    kuitansi_prefix?: string
                    spk_prefix?: string
                    invoice_counter?: number
                    kuitansi_counter?: number
                    spk_counter?: number
                    is_default?: boolean
                    is_active?: boolean
                    tenant_id?: string
                    created_at?: string
                    updated_at?: string
                }
            }
            orders: {
                Row: {
                    id: string
                    customer_id: string
                    total_quantity: number
                    order_description: string | null
                    mockup_url: string | null
                    layout_url: string | null
                    deadline: string | null
                    stage: OrderStage
                    dp_desain_amount: number
                    dp_desain_verified: boolean
                    dp_desain_proof_url: string | null
                    dp_desain_verified_at: string | null
                    dp_desain_verified_by: string | null
                    dp_produksi_amount: number
                    dp_produksi_verified: boolean
                    dp_produksi_proof_url: string | null
                    dp_produksi_verified_at: string | null
                    dp_produksi_verified_by: string | null
                    pelunasan_amount: number
                    pelunasan_verified: boolean
                    pelunasan_proof_url: string | null
                    pelunasan_verified_at: string | null
                    pelunasan_verified_by: string | null
                    tracking_number: string | null
                    shipped_at: string | null
                    stage_entered_at: string
                    payment_proof_url: string | null
                    created_by: string | null
                    created_at: string
                    updated_at: string
                    // Stage completion tracking
                    layout_completed: boolean
                    layout_completed_at: string | null
                    production_ready: boolean
                    production_ready_at: string | null
                    print_completed: boolean
                    print_completed_at: string | null
                    sewing_completed: boolean
                    sewing_completed_at: string | null
                    packing_completed: boolean
                    packing_completed_at: string | null
                    // SPK fields
                    spk_number: string | null
                    size_breakdown: Record<string, number> | null
                    production_notes: string | null
                    // Flexible SPK fields
                    nama_po: string | null
                    spk_sections: SPKSection[] | null
                    production_specs: ProductionSpecs | null
                    // Brand
                    brand_id: string | null
                    // Design notes
                    design_notes: string | null
                    // Archive
                    is_archived: boolean
                    tenant_id: string
                }
                Insert: {
                    id?: string
                    customer_id: string
                    total_quantity: number
                    order_description?: string | null
                    mockup_url?: string | null
                    deadline?: string | null
                    stage?: OrderStage
                    dp_desain_amount?: number
                    dp_desain_verified?: boolean
                    dp_desain_proof_url?: string | null
                    dp_produksi_amount?: number
                    dp_produksi_verified?: boolean
                    dp_produksi_proof_url?: string | null
                    pelunasan_amount?: number
                    pelunasan_verified?: boolean
                    pelunasan_proof_url?: string | null
                    tracking_number?: string | null
                    stage_entered_at?: string
                    created_by?: string | null
                    // Stage completion tracking
                    layout_completed?: boolean
                    production_ready?: boolean
                    print_completed?: boolean
                    sewing_completed?: boolean
                    packing_completed?: boolean
                    // SPK fields
                    spk_number?: string | null
                    size_breakdown?: Record<string, number> | null
                    production_notes?: string | null
                    // Flexible SPK fields
                    nama_po?: string | null
                    spk_sections?: SPKSection[] | null
                    production_specs?: ProductionSpecs | null
                    // Brand
                    brand_id?: string | null
                    // Design notes
                    design_notes?: string | null
                    // Archive
                    is_archived?: boolean
                    tenant_id?: string
                }
                Update: {
                    id?: string
                    customer_id?: string
                    total_quantity?: number
                    order_description?: string | null
                    mockup_url?: string | null
                    layout_url?: string | null
                    deadline?: string | null
                    stage?: OrderStage
                    dp_desain_amount?: number
                    dp_desain_verified?: boolean
                    dp_desain_proof_url?: string | null
                    dp_produksi_amount?: number
                    dp_produksi_verified?: boolean
                    dp_produksi_proof_url?: string | null
                    pelunasan_amount?: number
                    pelunasan_verified?: boolean
                    pelunasan_proof_url?: string | null
                    tracking_number?: string | null
                    shipped_at?: string | null
                    stage_entered_at?: string
                    payment_proof_url?: string | null
                    // Stage completion tracking
                    layout_completed?: boolean
                    layout_completed_at?: string | null
                    production_ready?: boolean
                    production_ready_at?: string | null
                    print_completed?: boolean
                    print_completed_at?: string | null
                    sewing_completed?: boolean
                    sewing_completed_at?: string | null
                    packing_completed?: boolean
                    packing_completed_at?: string | null
                    // SPK fields
                    spk_number?: string | null
                    size_breakdown?: Record<string, number> | null
                    production_notes?: string | null
                    // Flexible SPK fields
                    nama_po?: string | null
                    spk_sections?: SPKSection[] | null
                    production_specs?: ProductionSpecs | null
                    // Brand
                    brand_id?: string | null
                    // Design notes
                    design_notes?: string | null
                    // Archive
                    is_archived?: boolean
                    tenant_id?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string
                    role: 'owner' | 'admin'
                    avatar_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    full_name: string
                    role?: 'owner' | 'admin'
                    avatar_url?: string | null
                }
                Update: {
                    email?: string
                    full_name?: string
                    role?: 'owner' | 'admin'
                    avatar_url?: string | null
                }
            }
            // ==========================================
            // INVOICE SYSTEM TABLES
            // ==========================================
            barang: {
                Row: {
                    id: string
                    brand_id: string
                    nama_barang: string
                    satuan: string
                    harga_satuan: number
                    kategori: string | null
                    is_active: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    brand_id: string
                    nama_barang: string
                    satuan?: string
                    harga_satuan?: number
                    kategori?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    brand_id?: string
                    nama_barang?: string
                    satuan?: string
                    harga_satuan?: number
                    kategori?: string | null
                    is_active?: boolean
                    created_at?: string
                    updated_at?: string
                }
            }
            barang_harga_tier: {
                Row: {
                    id: string
                    barang_id: string
                    min_qty: number
                    max_qty: number | null
                    harga: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    barang_id: string
                    min_qty: number
                    max_qty?: number | null
                    harga: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    barang_id?: string
                    min_qty?: number
                    max_qty?: number | null
                    harga?: number
                    created_at?: string
                }
            }
            invoices: {
                Row: {
                    id: string
                    no_invoice: string
                    tanggal: string
                    customer_id: string
                    order_id: string | null
                    perkiraan_produksi: number | null
                    deadline: string | null
                    termin_pembayaran: number
                    no_po: string | null
                    sub_total: number
                    ppn_persen: number
                    ppn_amount: number
                    total: number
                    total_dibayar: number
                    sisa_tagihan: number
                    status_pembayaran: 'BELUM_LUNAS' | 'SUDAH_LUNAS'
                    created_by: string | null
                    created_at: string
                    updated_at: string
                    // Brand
                    brand_id: string | null
                    template_id: string | null
                }
                Insert: {
                    id?: string
                    no_invoice: string
                    tanggal?: string
                    customer_id: string
                    order_id?: string | null
                    perkiraan_produksi?: number | null
                    deadline?: string | null
                    termin_pembayaran?: number
                    no_po?: string | null
                    sub_total?: number
                    ppn_persen?: number
                    ppn_amount?: number
                    total?: number
                    total_dibayar?: number
                    sisa_tagihan?: number
                    status_pembayaran?: 'BELUM_LUNAS' | 'SUDAH_LUNAS'
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                    // Brand
                    brand_id?: string | null
                    template_id?: string | null
                }
                Update: {
                    id?: string
                    no_invoice?: string
                    tanggal?: string
                    customer_id?: string
                    order_id?: string | null
                    perkiraan_produksi?: number | null
                    deadline?: string | null
                    termin_pembayaran?: number
                    no_po?: string | null
                    sub_total?: number
                    ppn_persen?: number
                    ppn_amount?: number
                    total?: number
                    total_dibayar?: number
                    sisa_tagihan?: number
                    status_pembayaran?: 'BELUM_LUNAS' | 'SUDAH_LUNAS'
                    created_by?: string | null
                    created_at?: string
                    updated_at?: string
                    // Brand
                    brand_id?: string | null
                    template_id?: string | null
                }
            }
            invoice_items: {
                Row: {
                    id: string
                    invoice_id: string
                    item_no: number
                    barang_id: string | null
                    deskripsi: string
                    jumlah: number
                    satuan: string
                    harga_satuan: number
                    sub_total: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    invoice_id: string
                    item_no: number
                    barang_id?: string | null
                    deskripsi: string
                    jumlah: number
                    satuan?: string
                    harga_satuan: number
                    sub_total: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    invoice_id?: string
                    item_no?: number
                    barang_id?: string | null
                    deskripsi?: string
                    jumlah?: number
                    satuan?: string
                    harga_satuan?: number
                    sub_total?: number
                    created_at?: string
                }
            }
            kuitansi: {
                Row: {
                    id: string
                    no_kuitansi: number
                    tanggal: string
                    invoice_id: string
                    jumlah: number
                    keterangan: string | null
                    lokasi: string
                    created_by: string | null
                    created_at: string
                    template_id: string | null
                }
                Insert: {
                    id?: string
                    no_kuitansi?: number
                    tanggal?: string
                    invoice_id: string
                    jumlah: number
                    keterangan?: string | null
                    lokasi?: string
                    created_by?: string | null
                    created_at?: string
                    template_id?: string | null
                }
                Update: {
                    id?: string
                    no_kuitansi?: number
                    tanggal?: string
                    invoice_id?: string
                    jumlah?: number
                    keterangan?: string | null
                    lokasi?: string
                    created_by?: string | null
                    created_at?: string
                    template_id?: string | null
                }
            }
            app_settings: {
                Row: {
                    id: string
                    key: string
                    value: Json
                    updated_at: string
                }
                Insert: {
                    id?: string
                    key: string
                    value: Json
                    updated_at?: string
                }
                Update: {
                    id?: string
                    key?: string
                    value?: Json
                    updated_at?: string
                }
            }
        }
        Views: {
            dashboard_metrics: {
                Row: {
                    total_active_orders: number
                    total_unpaid_orders: number
                    total_receivables: number
                    bottleneck_count: number
                }
            }
            bottleneck_orders: {
                Row: {
                    id: string
                    customer_id: string
                    customer_name: string
                    customer_phone: string
                    days_in_stage: number
                }
            }
        }
        Functions: {
            delete_order_permanently: {
                Args: { p_order_id: string }
                Returns: undefined
            }
        }
        Enums: {}
    }
}

// 10-Stage Kanban Types (updated)
export type OrderStage =
    | 'customer_dp_desain'   // 1. Customer DP Desain
    | 'proses_desain'        // 2. Proses Desain
    | 'proses_layout'        // 3. Proses Layout (NEW)
    | 'dp_produksi'          // 4. DP Produksi (Gatekeeper - 50%)
    | 'antrean_produksi'     // 5. Antrean Produksi
    | 'print_press'          // 6. Print & Press
    | 'cutting_jahit'        // 7. Cutting & Jahit
    | 'packing'              // 8. Packing
    | 'pelunasan'            // 9. Pelunasan (Gatekeeper - Full payment)
    | 'pengiriman'           // 10. Pengiriman

export const STAGE_LABELS: Record<OrderStage, string> = {
    customer_dp_desain: 'Deposit Desain',
    proses_desain: 'Proses Desain',
    dp_produksi: 'DP Produksi',
    proses_layout: 'Proses Layout',
    antrean_produksi: 'Antrean Produksi',
    print_press: 'Print & Press',
    cutting_jahit: 'Cutting & Jahit',
    packing: 'Packing',
    pelunasan: 'Pelunasan',
    pengiriman: 'Pengiriman',
}

export const STAGES_ORDER: OrderStage[] = [
    'customer_dp_desain',
    'proses_desain',
    'dp_produksi',
    'proses_layout',
    'antrean_produksi',
    'print_press',
    'cutting_jahit',
    'packing',
    'pelunasan',
    'pengiriman',
]

// Gatekeeper stages - require payment verification
export const GATEKEEPER_STAGES: OrderStage[] = ['dp_produksi', 'pelunasan']

// Per-stage bottleneck threshold (in days)
// Proses Desain & Layout: 1 hari (critical - impacts entire timeline)
// Other stages: 2 hari
export const STAGE_BOTTLENECK_DAYS: Record<OrderStage, number> = {
    customer_dp_desain: 2,
    proses_desain: 1,      // ⚡ Critical - 1 hari
    proses_layout: 1,      // ⚡ Critical - 1 hari
    dp_produksi: 2,
    antrean_produksi: 2,
    print_press: 2,
    cutting_jahit: 2,
    packing: 2,
    pelunasan: 2,
    pengiriman: 2,
}

// Type aliases for convenience
export type Customer = Database['public']['Tables']['customers']['Row']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']
export type Order = Database['public']['Tables']['orders']['Row']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']
export type OrderUpdate = Database['public']['Tables']['orders']['Update']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type DashboardMetrics = Database['public']['Views']['dashboard_metrics']['Row']

// Invoice System Type Aliases
export type Barang = Database['public']['Tables']['barang']['Row']
export type BarangInsert = Database['public']['Tables']['barang']['Insert']
export type BarangUpdate = Database['public']['Tables']['barang']['Update']
export type BarangHargaTier = Database['public']['Tables']['barang_harga_tier']['Row']
export type BarangHargaTierInsert = Database['public']['Tables']['barang_harga_tier']['Insert']
export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert']
export type Kuitansi = Database['public']['Tables']['kuitansi']['Row']
export type KuitansiInsert = Database['public']['Tables']['kuitansi']['Insert']
export type AppSettings = Database['public']['Tables']['app_settings']['Row']

// Brand System Type Aliases
export type Brand = Database['public']['Tables']['brands']['Row']
export type BrandInsert = Database['public']['Tables']['brands']['Insert']
export type BrandUpdate = Database['public']['Tables']['brands']['Update']

// Extended types with relations
export interface InvoiceWithCustomer extends Invoice {
    customer: Customer
}

// Canonical order with relations used across kanban, modals, and form-order.
// Struct-compatible superset of every previously duplicated local definition.
export interface OrderWithCustomer extends Order {
    customer: Customer
    creator?: { id: string; full_name: string } | null
    brand?: Brand | null
    invoices?: Array<{ id: string }>
}

export interface InvoiceWithItems extends Invoice {
    customer: Customer
    items: InvoiceItem[]
    brand?: Brand | null
}

export interface KuitansiWithInvoice extends Kuitansi {
    invoice: InvoiceWithCustomer & { brand?: Brand | null }
}

export interface BarangWithTiers extends Barang {
    harga_tiers: BarangHargaTier[]
}

// Payment Status Type
export type PaymentStatus = 'BELUM_LUNAS' | 'SUDAH_LUNAS'

// ==========================================
// SPK (Surat Perintah Kerja) Types
// ==========================================

// Individual person in personalization list
export interface PersonItem {
    no?: number
    name: string
    back_name?: string           // Nama punggung
    size: string
    sleeve_type?: 'Pendek' | 'Panjang' | 'Tanpa Lengan'
    completed?: boolean          // Checklist ✓ for production tracking
    group?: string               // Group/location: "Cikeas", "Kalapa Dua", etc.
}

// Size rekap with optional notes
export interface SizeRekapItem {
    size: string
    jumlah: number
    keterangan?: string          // "BAHAN MICROCOOL", "BAHAN EMBOSS", etc.
}

// Section within SPK (supports multi-product orders)
export interface SPKSection {
    id: string
    title: string                // "Timnas Tenis", "Men 1", "Lengan Pendek", etc.
    mockup_urls: string[]        // Multiple mockup images per section
    collar_image_url?: string    // Jenis kerah image

    // Format A: Simple rekap (qty per size)
    size_breakdown?: Record<string, number>  // { "M": 5, "L": 10 }

    // Format B: Personalization list (with names)
    personalization_list?: PersonItem[]

    // Format C: Rekap with notes/keterangan
    size_rekap?: SizeRekapItem[]

    notes?: string               // Notes specific to this section
}

// Production specifications
export interface ProductionSpecs {
    kerah?: string               // Collar type: "V NECK", "Polo", etc.
    kerah_image_url?: string     // Collar reference image
    bahan?: string               // Material: "MILANO PREMIUM", "EMBOSS", etc.
    bahan_celana?: string        // Pants material
    kategori?: string            // "PANJANG & PENDEK", etc.
    bis?: string                 // "BRAND SENDIRI", "POLOSIN", etc.
    autentic?: string            // Authentic label
    penjahit?: string            // Tailor name
    need_atasan?: boolean        // Checkbox: needs top
    need_celana?: boolean        // Checkbox: needs pants

    // ===== Form Order Produksi =====
    // Detail Produk (isi manual)
    jenis_produk?: string        // "Jersey", "Polo Shirt", etc.
    jenis_bahan?: string         // "Milano Premium", "Drifit", etc.
    pola_desain?: string         // Pola baju / desain
    model_kerah?: string         // "O-Neck", "V-Neck", "Polo", etc.
    model_lengan?: string        // "Pendek", "Panjang", "Tanpa Lengan"
    jumlah_produksi?: number     // Jumlah produksi (pcs)

    // Kebutuhan Produksi (isi manual)
    kebutuhan_bahan_meter?: number
    kebutuhan_bahan_kg?: number

    // Gambar (paste / upload)
    mockup_image_url?: string    // Mockup — kanan bawah
    list_order_image_urls?: string[]  // List order — kanan atas, memanjang ke bawah
}

// Full SPK data structure
export interface SPKData {
    nama_po: string
    deadline: string | null
    sections: SPKSection[]
    production_specs: ProductionSpecs
    notes: string
}
