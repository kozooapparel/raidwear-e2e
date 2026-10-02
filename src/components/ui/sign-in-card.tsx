'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import { Mail, Lock, Eye, EyeClosed, ArrowRight } from 'lucide-react'

export interface SignInCredentials {
    email: string
    password: string
}

export interface SignInCardProps {
    title: string
    subtitle: string
    logoUrl: string | null
    loading: boolean
    error: string | null
    onSubmit: (credentials: SignInCredentials) => void
}

type FocusedInput = 'email' | 'password' | null

export function SignInCard({
    title,
    subtitle,
    logoUrl,
    loading,
    error,
    onSubmit,
}: SignInCardProps) {
    const [showPassword, setShowPassword] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [focusedInput, setFocusedInput] = useState<FocusedInput>(null)

    // Efek kartu 3D mengikuti gerakan mouse
    const mouseX = useMotionValue(0)
    const mouseY = useMotionValue(0)
    const rotateX = useTransform(mouseY, [-300, 300], [10, -10])
    const rotateY = useTransform(mouseX, [-300, 300], [-10, 10])

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        mouseX.set(e.clientX - rect.left - rect.width / 2)
        mouseY.set(e.clientY - rect.top - rect.height / 2)
    }

    const handleMouseLeave = () => {
        mouseX.set(0)
        mouseY.set(0)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({ email, password })
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-sm relative z-10"
            style={{ perspective: 1500 }}
        >
            <motion.div
                className="relative"
                style={{ rotateX, rotateY }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <div className="relative group">
                    {/* Efek glow kartu */}
                    <motion.div
                        className="absolute -inset-[1px] rounded-2xl opacity-0 group-hover:opacity-70 transition-opacity duration-700"
                        animate={{
                            boxShadow: [
                                '0 0 10px 2px rgba(255,255,255,0.03)',
                                '0 0 15px 5px rgba(255,255,255,0.05)',
                                '0 0 10px 2px rgba(255,255,255,0.03)',
                            ],
                            opacity: [0.2, 0.4, 0.2],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                            repeatType: 'mirror',
                        }}
                    />

                    {/* Efek berkas cahaya berjalan di tepi kartu */}
                    <div className="absolute -inset-[1px] rounded-2xl overflow-hidden">
                        {/* Berkas atas */}
                        <motion.div
                            className="absolute top-0 left-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-white to-transparent opacity-70"
                            initial={{ filter: 'blur(2px)' }}
                            animate={{
                                left: ['-50%', '100%'],
                                opacity: [0.3, 0.7, 0.3],
                                filter: ['blur(1px)', 'blur(2.5px)', 'blur(1px)'],
                            }}
                            transition={{
                                left: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 },
                                opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror' },
                                filter: { duration: 1.5, repeat: Infinity, repeatType: 'mirror' },
                            }}
                        />

                        {/* Berkas kanan */}
                        <motion.div
                            className="absolute top-0 right-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-white to-transparent opacity-70"
                            initial={{ filter: 'blur(2px)' }}
                            animate={{
                                top: ['-50%', '100%'],
                                opacity: [0.3, 0.7, 0.3],
                                filter: ['blur(1px)', 'blur(2.5px)', 'blur(1px)'],
                            }}
                            transition={{
                                top: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 0.6 },
                                opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 0.6 },
                                filter: { duration: 1.5, repeat: Infinity, repeatType: 'mirror', delay: 0.6 },
                            }}
                        />

                        {/* Berkas bawah */}
                        <motion.div
                            className="absolute bottom-0 right-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-white to-transparent opacity-70"
                            initial={{ filter: 'blur(2px)' }}
                            animate={{
                                right: ['-50%', '100%'],
                                opacity: [0.3, 0.7, 0.3],
                                filter: ['blur(1px)', 'blur(2.5px)', 'blur(1px)'],
                            }}
                            transition={{
                                right: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 1.2 },
                                opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 1.2 },
                                filter: { duration: 1.5, repeat: Infinity, repeatType: 'mirror', delay: 1.2 },
                            }}
                        />

                        {/* Berkas kiri */}
                        <motion.div
                            className="absolute bottom-0 left-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-white to-transparent opacity-70"
                            initial={{ filter: 'blur(2px)' }}
                            animate={{
                                bottom: ['-50%', '100%'],
                                opacity: [0.3, 0.7, 0.3],
                                filter: ['blur(1px)', 'blur(2.5px)', 'blur(1px)'],
                            }}
                            transition={{
                                bottom: { duration: 2.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1, delay: 1.8 },
                                opacity: { duration: 1.2, repeat: Infinity, repeatType: 'mirror', delay: 1.8 },
                                filter: { duration: 1.5, repeat: Infinity, repeatType: 'mirror', delay: 1.8 },
                            }}
                        />

                        {/* Titik glow di sudut kartu */}
                        <motion.div
                            className="absolute top-0 left-0 h-[5px] w-[5px] rounded-full bg-white/40 blur-[1px]"
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 2, repeat: Infinity, repeatType: 'mirror' }}
                        />
                        <motion.div
                            className="absolute top-0 right-0 h-[8px] w-[8px] rounded-full bg-white/60 blur-[2px]"
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 2.4, repeat: Infinity, repeatType: 'mirror', delay: 0.5 }}
                        />
                        <motion.div
                            className="absolute bottom-0 right-0 h-[8px] w-[8px] rounded-full bg-white/60 blur-[2px]"
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 2.2, repeat: Infinity, repeatType: 'mirror', delay: 1 }}
                        />
                        <motion.div
                            className="absolute bottom-0 left-0 h-[5px] w-[5px] rounded-full bg-white/40 blur-[1px]"
                            animate={{ opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 2.3, repeat: Infinity, repeatType: 'mirror', delay: 1.5 }}
                        />
                    </div>

                    {/* Glow border kartu */}
                    <div className="absolute -inset-[0.5px] rounded-2xl bg-gradient-to-r from-white/3 via-white/7 to-white/3 opacity-0 group-hover:opacity-70 transition-opacity duration-500" />

                    {/* Latar kartu kaca */}
                    <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.05] shadow-2xl overflow-hidden">
                        {/* Pola halus di dalam kartu */}
                        <div
                            className="absolute inset-0 opacity-[0.03]"
                            style={{
                                backgroundImage: `linear-gradient(135deg, white 0.5px, transparent 0.5px), linear-gradient(45deg, white 0.5px, transparent 0.5px)`,
                                backgroundSize: '30px 30px',
                            }}
                        />

                        {/* Logo dan header */}
                        <div className="text-center space-y-1 mb-5">
                            <motion.div
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: 'spring', duration: 0.8 }}
                                className="mx-auto w-10 h-10 rounded-full border border-white/10 flex items-center justify-center relative overflow-hidden"
                            >
                                {logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={logoUrl} alt={`${title} logo`} className="w-full h-full object-contain" />
                                ) : (
                                    <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                                        {title.charAt(0).toUpperCase()}
                                    </span>
                                )}

                                {/* Efek pencahayaan dalam logo */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80"
                            >
                                {title}
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="text-white/60 text-xs"
                            >
                                {subtitle}
                            </motion.p>
                        </div>

                        {/* Form login */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-3 py-2"
                                >
                                    {error}
                                </motion.div>
                            )}

                            <div className="space-y-3">
                                {/* Input email */}
                                <motion.div
                                    className={`relative ${focusedInput === 'email' ? 'z-10' : ''}`}
                                    whileHover={{ scale: 1.01 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                >
                                    <div className="absolute -inset-[0.5px] bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />

                                    <div className="relative flex items-center overflow-hidden rounded-lg">
                                        <Mail
                                            className={`absolute left-3 w-4 h-4 transition-all duration-300 ${
                                                focusedInput === 'email' ? 'text-white' : 'text-white/40'
                                            }`}
                                        />

                                        <input
                                            type="email"
                                            placeholder="Email address"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            onFocus={() => setFocusedInput('email')}
                                            onBlur={() => setFocusedInput(null)}
                                            required
                                            autoComplete="email"
                                            className="w-full bg-white/5 border border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 rounded-lg transition-all duration-300 pl-10 pr-3 focus:bg-white/10 outline-none text-sm"
                                        />

                                        {focusedInput === 'email' && (
                                            <motion.div
                                                layoutId="input-highlight"
                                                className="absolute inset-0 bg-white/5 -z-10"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        )}
                                    </div>
                                </motion.div>

                                {/* Input password */}
                                <motion.div
                                    className={`relative ${focusedInput === 'password' ? 'z-10' : ''}`}
                                    whileHover={{ scale: 1.01 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                >
                                    <div className="absolute -inset-[0.5px] bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300" />

                                    <div className="relative flex items-center overflow-hidden rounded-lg">
                                        <Lock
                                            className={`absolute left-3 w-4 h-4 transition-all duration-300 ${
                                                focusedInput === 'password' ? 'text-white' : 'text-white/40'
                                            }`}
                                        />

                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setFocusedInput('password')}
                                            onBlur={() => setFocusedInput(null)}
                                            required
                                            autoComplete="current-password"
                                            className="w-full bg-white/5 border border-transparent focus:border-white/20 text-white placeholder:text-white/30 h-10 rounded-lg transition-all duration-300 pl-10 pr-10 focus:bg-white/10 outline-none text-sm"
                                        />

                                        {/* Toggle tampilkan password */}
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                                            className="absolute right-3 cursor-pointer"
                                        >
                                            {showPassword ? (
                                                <EyeClosed className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                                            ) : (
                                                <Eye className="w-4 h-4 text-white/40 hover:text-white transition-colors duration-300" />
                                            )}
                                        </button>

                                        {focusedInput === 'password' && (
                                            <motion.div
                                                layoutId="input-highlight"
                                                className="absolute inset-0 bg-white/5 -z-10"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                            />
                                        )}
                                    </div>
                                </motion.div>
                            </div>

                            {/* Tombol sign in */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                disabled={loading}
                                className="w-full relative group/button mt-5 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-white/10 rounded-lg blur-lg opacity-0 group-hover/button:opacity-70 transition-opacity duration-300" />

                                <div className="relative overflow-hidden bg-white text-black font-medium h-10 rounded-lg transition-all duration-300 flex items-center justify-center">
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 -z-10"
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{ duration: 1.5, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1 }}
                                        style={{ opacity: loading ? 1 : 0, transition: 'opacity 0.3s ease' }}
                                    />

                                    <AnimatePresence mode="wait">
                                        {loading ? (
                                            <motion.div
                                                key="loading"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="flex items-center justify-center"
                                            >
                                                <div className="w-4 h-4 border-2 border-black/70 border-t-transparent rounded-full animate-spin" />
                                            </motion.div>
                                        ) : (
                                            <motion.span
                                                key="button-text"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="flex items-center justify-center gap-1 text-sm font-medium"
                                            >
                                                Sign In
                                                <ArrowRight className="w-3 h-3 group-hover/button:translate-x-1 transition-transform duration-300" />
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.button>
                        </form>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
