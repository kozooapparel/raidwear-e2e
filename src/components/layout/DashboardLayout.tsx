'use client'

import { useState, useEffect } from 'react'
import { Profile } from '@/types/database'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApplicationIdentity } from './AppIdentityProvider'
import { HighlightGroup, Particles } from '@/components/ui/highlighter'

interface DashboardLayoutProps {
    user: Profile | null
    children: React.ReactNode
}

type NavItem = {
    href: string
    label: string
    icon: React.ReactNode
    badge?: string
}

const Icon = {
    Dashboard: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
    ),
    Order: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
    ),
    Customer: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
    ),
    Product: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
        </svg>
    ),
    Invoice: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
    ),
    Chart: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
    ),
    Receipt: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
        </svg>
    ),
    SPK: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
    ),
    Employee: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
    ),
    Attendance: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        </svg>
    ),
    Payroll: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
    ),
    User: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
    ),
    Brand: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
    ),
    Logout: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
        </svg>
    ),
    Menu: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
    ),
    Close: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    Chevron: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
    ),
}

export default function DashboardLayout({ user, children }: DashboardLayoutProps) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()
    const identity = useApplicationIdentity()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024)
            if (window.innerWidth >= 1024) {
                setMobileMenuOpen(false)
            }
        }
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const mainMenuItems: NavItem[] = [
        { href: '/dashboard', label: 'Dashboard', icon: Icon.Dashboard },
        { href: '/orders/history', label: 'Riwayat Order', icon: Icon.Order },
        { href: '/customers', label: 'Customers', icon: Icon.Customer },
        { href: '/barang', label: 'Barang', icon: Icon.Product },
    ]

    const keuanganItems: NavItem[] = [
        { href: '/invoices', label: 'Invoice', icon: Icon.Invoice },
        { href: '/invoices/rekap', label: 'Rekap Invoice', icon: Icon.Chart },
        { href: '/kuitansi', label: 'Kuitansi', icon: Icon.Receipt },
        { href: '/kuitansi/rekap', label: 'Rekap Kuitansi', icon: Icon.Chart },
    ]

    const produksiItems: NavItem[] = [
        { href: '/form-order', label: 'Form Order', icon: Icon.SPK },
    ]

    const hrItems: NavItem[] = [
        { href: '/hr/employees', label: 'Karyawan', icon: Icon.Employee },
        { href: '/hr/attendance', label: 'Absensi', icon: Icon.Attendance },
        { href: '/hr/payroll', label: 'Payroll', icon: Icon.Payroll },
    ]

    const settingsItems: NavItem[] = [
        { href: '/users', label: 'Kelola User', icon: Icon.User },
        { href: '/brands', label: 'Brand', icon: Icon.Brand },
        { href: '/storage', label: 'Penyimpanan File', icon: Icon.Product },
    ]

    type NavSection = { title: string; items: NavItem[] }
    const sections: NavSection[] = [
        { title: 'Main Menu', items: mainMenuItems },
        { title: 'Keuangan', items: keuanganItems },
        { title: 'Produksi', items: produksiItems },
        { title: 'HR & Payroll', items: hrItems },
    ]

    if (user?.role === 'owner') {
        sections.push({ title: 'Settings', items: settingsItems })
    }

    const isExpanded = isMobile ? mobileMenuOpen : sidebarOpen

    const renderNavItem = (item: NavItem) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))
        return (
            <a
                key={item.href}
                href={item.href}
                onClick={() => isMobile && setMobileMenuOpen(false)}
                title={!isExpanded ? item.label : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 focus-ring ${
                    isActive
                        ? 'bg-red-50 text-red-600'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                } ${isExpanded ? '' : 'justify-center'}`}
            >
                {isActive && isExpanded && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-red-600 rounded-r-full" />
                )}
                <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-red-600' : 'text-slate-500 group-hover:text-slate-700'}`}>
                    {item.icon}
                </span>
                <span className={`whitespace-nowrap transition-all duration-200 ease-in-out ${isExpanded ? 'opacity-100 translate-x-0 w-auto' : 'opacity-0 -translate-x-2 w-0 overflow-hidden'}`}>
                    {item.label}
                </span>
                {item.badge && isExpanded && (
                    <span className="ml-auto text-[10px] font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                        {item.badge}
                    </span>
                )}
            </a>
        )
    }

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-200 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-sm flex-shrink-0 overflow-hidden">
                    {identity.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={identity.logoUrl} alt={`${identity.name} logo`} className="w-full h-full object-contain bg-white p-1" />
                    ) : (
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z" />
                        </svg>
                    )}
                </div>
                <div className={`overflow-hidden flex-1 transition-all duration-200 ease-in-out ${isExpanded ? 'opacity-100 w-auto translate-x-0' : 'opacity-0 w-0 -translate-x-2'}`}>
                    <h1 className="text-[15px] font-semibold text-slate-900 whitespace-nowrap tracking-tight">{identity.name}</h1>
                    <p className="text-[11px] text-slate-500 whitespace-nowrap">Jersey Convection</p>
                </div>
                {isMobile && (
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        aria-label="Tutup menu"
                    >
                        {Icon.Close}
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
                {sections.map((section) => (
                    <div key={section.title} className="mb-6 last:mb-0">
                        <p className={`px-3 mb-2 text-[10.5px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${isExpanded ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
                            {section.title}
                        </p>
                        <div className="space-y-0.5">
                            {section.items.map(renderNavItem)}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Bottom Section - User */}
            <div className="p-3 border-t border-slate-200 flex-shrink-0">
                <div className={`flex items-center gap-2.5 p-2 rounded-lg ${isExpanded ? '' : 'justify-center'}`}>
                    <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm">
                        {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className={`flex-1 min-w-0 transition-all duration-200 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                        <p className="text-[13px] font-semibold text-slate-900 truncate whitespace-nowrap">
                            {user?.full_name || 'User'}
                        </p>
                        <p className="text-[11px] text-slate-500 capitalize truncate whitespace-nowrap">
                            {user?.role || 'admin'}
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    title="Logout"
                    className={`mt-1 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors focus-ring ${isExpanded ? '' : 'justify-center'}`}
                >
                    <span className="flex-shrink-0">{Icon.Logout}</span>
                    <span className={`whitespace-nowrap transition-all duration-200 ${isExpanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}>
                        Logout
                    </span>
                </button>
            </div>
        </>
    )

    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* Mobile Overlay Backdrop */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar - Desktop */}
            {!isMobile && (
                <aside
                    className={`${sidebarOpen ? 'w-64' : 'w-[68px]'} flex-shrink-0 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen transition-[width] duration-300 ease-in-out`}
                    onMouseEnter={() => setSidebarOpen(true)}
                    onMouseLeave={() => setSidebarOpen(false)}
                >
                    {sidebarContent}
                </aside>
            )}

            {/* Sidebar - Mobile */}
            {isMobile && (
                <aside
                    className={`fixed top-0 left-0 h-screen w-72 bg-white z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    {sidebarContent}
                </aside>
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0">
                {/* Mobile Header */}
                {isMobile && (
                    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 focus-ring"
                            aria-label="Buka menu"
                        >
                            {Icon.Menu}
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-brand-gradient flex items-center justify-center overflow-hidden">
                                {identity.logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={identity.logoUrl} alt={`${identity.name} logo`} className="w-full h-full object-contain bg-white p-1" />
                                ) : (
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z" />
                                    </svg>
                                )}
                            </div>
                            <span className="font-semibold text-slate-900">{identity.name}</span>
                        </div>
                    </div>
                )}
                <div className={`${isMobile ? 'p-4' : 'p-5 lg:p-6'} w-full relative isolate`}>
                    {/* === PARTIKEL BRAND (dekorasi latar seluruh halaman modul) === */}
                    <Particles
                        className="absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,#000_88%,transparent)] opacity-70"
                        quantity={120}
                        color="#dc2626"
                        vy={-0.15}
                    />
                    {/* Semua kartu `.surface` di dalamnya otomatis mendapat spotlight kursor */}
                    <HighlightGroup>
                        {children}
                    </HighlightGroup>
                </div>
            </main>
        </div>
    )
}
