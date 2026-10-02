'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useApplicationIdentity } from '@/components/layout/AppIdentityProvider'
import { GridPulse } from '@/components/ui/grid-pulse'
import { Particles } from '@/components/ui/highlighter'
import { SignInCard, type SignInCredentials } from '@/components/ui/sign-in-card'

export default function LoginPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()
    const identity = useApplicationIdentity()

    const handleLogin = async ({ email, password }: SignInCredentials) => {
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.push('/dashboard')
            router.refresh()
        }
    }

    return (
        <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-950 px-6 py-10">
            {/* === BACKGROUND GRID PULSE === */}
            {/* text-white dipakai untuk memberi tahu grid bahwa latarnya gelap */}
            <GridPulse className="text-white" />

            {/* === PARTIKEL BRAND (spotlight + partikel mengikuti kursor) === */}
            <Particles className="absolute inset-0 opacity-70" quantity={140} color="#dc2626" vy={-0.2} />

            {/* Kartu login */}
            <SignInCard
                title={identity.name}
                subtitle="Jersey Convection Management"
                logoUrl={identity.logoUrl}
                loading={loading}
                error={error}
                onSubmit={handleLogin}
            />

            <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/40">
                Owner &amp; Admin access only
            </p>
        </div>
    )
}
