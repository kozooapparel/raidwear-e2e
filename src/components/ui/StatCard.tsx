import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand'
  delta?: string
  trend?: 'up' | 'down' | 'flat'
  helper?: string
}

/**
 * Warna semantik dipakai sebagai titik kecil di samping label — bukan sebagai
 * warna angka atau kotak ikon. Dengan begitu arti status tetap terbaca, tetapi
 * hierarki tetap dibawa ukuran teks & bobot, bukan warna.
 */
const toneDot = {
  default: 'bg-slate-400',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  brand: 'bg-brand-500',
}

const trendTone = {
  up: 'text-emerald-600',
  down: 'text-red-600',
  flat: 'text-slate-500',
}

/**
 * Kartu metrik satu tingkat elevasi: tepi saja (tanpa bayangan), radius 12,
 * padding 16. Tidak diberi efek hover karena kartu ini tidak bisa diklik.
 */
export function StatCard({ label, value, icon, tone = 'default', delta, trend, helper }: StatCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-[16px]">
      <div className="flex items-start justify-between gap-[12px]">
        <div className="min-w-0 flex-1">
          <p className="flex items-start gap-[6px] text-sm font-medium uppercase leading-tight tracking-wide text-slate-500">
            <span className={`mt-[5px] h-[6px] w-[6px] shrink-0 rounded-full ${toneDot[tone]}`} aria-hidden="true" />
            <span className="min-w-0">{label}</span>
          </p>
          <p className="mt-[8px] truncate text-xl font-semibold tracking-tight text-slate-900 text-mono md:text-2xl">
            {value}
          </p>
          {(delta || helper) && (
            <div className="mt-[8px] flex items-center gap-[6px] text-sm">
              {delta && trend && (
                <span className={`inline-flex items-center gap-[2px] font-semibold ${trendTone[trend]}`}>
                  {trend === 'up' && '↑'}
                  {trend === 'down' && '↓'}
                  {trend === 'flat' && '→'}
                  {delta}
                </span>
              )}
              {helper && <span className="text-slate-500">{helper}</span>}
            </div>
          )}
        </div>
        {icon && (
          <div className="hidden h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-500 sm:flex">
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
