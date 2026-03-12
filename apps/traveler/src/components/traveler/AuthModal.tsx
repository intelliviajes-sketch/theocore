"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabaseBrowser as supabase } from "@/lib/supabase/client";
import toast from "react-hot-toast";

type Props = {
    open: boolean;
    onClose: () => void;
    onSuccess: (user: { id: string; email: string; full_name?: string | null }) => void;
};

type Tab = "login" | "register";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthModal({ open, onClose, onSuccess }: Props) {
    const [tab, setTab] = useState<Tab>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [language, setLanguage] = useState<string>("");
    const [country, setCountry] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const dialogRef = useRef<HTMLDivElement | null>(null);

    // Detectar idioma automáticamente
    useEffect(() => {
        const lang = (navigator?.language || "es-ES").toLowerCase();
        setLanguage(lang);
        const cc = lang.split("-")[1] || "ES";
        setCountry(cc.toUpperCase());
    }, []);

    // Reset de errores al abrir/cambiar pestaña
    useEffect(() => {
        if (open) {
            setErr(null);
            setLoading(false);
        }
    }, [open, tab]);

    // Escuchar tecla Escape
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (open) window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    const canSubmitLogin = useMemo(
        () => emailRegex.test(email) && password.length >= 6,
        [email, password]
    );

    const canSubmitRegister = useMemo(
        () => emailRegex.test(email) && password.length >= 6 && fullName.trim().length >= 2,
        [email, password, fullName]
    );

    const handleLogin = async () => {
        setErr(null);
        if (!canSubmitLogin) {
            setErr("Email o contraseña inválidos.");
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            const user = data.user;
            if (!user) throw new Error("No se pudo obtener el usuario.");

            const { data: profile } = await supabase
                .from("travelers")
                .select("id, full_name, email")
                .eq("id", user.id)
                .maybeSingle();

            if (!profile) {
                await supabase.from("travelers").insert({
                    id: user.id,
                    full_name: fullName || null,
                    email: user.email,
                    country,
                    language,
                    travel_style: [],
                });
            }

            onSuccess({ id: user.id, email: user.email!, full_name: profile?.full_name ?? fullName ?? null });
            onClose();
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Error desconocido";
            setErr(mapSupabaseError(errorMessage));
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        setErr(null);
        if (!canSubmitRegister) {
            setErr("Completa todos los datos.");
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: { full_name: fullName, country, language },
                },
            });
            if (error) throw error;

            toast.success("Correo enviado. Por favor verifica para continuar.");
            setTab("login");
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Error desconocido";
            setErr(mapSupabaseError(errorMessage));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm px-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onMouseDown={handleBackdropClick}
                >
                    <motion.div
                        ref={dialogRef}
                        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-100"
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 280 }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                                <button
                                    onClick={() => setTab("login")}
                                    className={`px-3 py-2 text-sm rounded-lg ${tab === "login" ? "bg-white shadow" : ""}`}
                                >
                                    Iniciar sesión
                                </button>
                                <button
                                    onClick={() => setTab("register")}
                                    className={`px-3 py-2 text-sm rounded-lg ${tab === "register" ? "bg-white shadow" : ""}`}
                                >
                                    Crear cuenta
                                </button>
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-500 hover:text-black">✕</button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5">
                            {tab === "register" && (
                                <div className="mb-4">
                                    <label className="text-sm">Nombre</label>
                                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                                        className="w-full rounded-lg border px-3 py-2" />
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="text-sm">Email</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    className="w-full rounded-lg border px-3 py-2" />
                            </div>

                            <div className="mb-4">
                                <label className="text-sm">Contraseña</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                    className="w-full rounded-lg border px-3 py-2" />
                            </div>

                            {err && <p className="text-red-600 text-sm">{err}</p>}

                            <button
                                onClick={tab === "login" ? handleLogin : handleRegister}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl mt-4"
                            >
                                {loading ? "Cargando..." : tab === "login" ? "Entrar" : "Registrarse"}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function mapSupabaseError(message: string = ""): string {
    const msg = message.toLowerCase();
    if (msg.includes("invalid login credentials")) return "Credenciales inválidas.";
    if (msg.includes("user already registered")) return "Este email ya está registrado.";
    return message;
}