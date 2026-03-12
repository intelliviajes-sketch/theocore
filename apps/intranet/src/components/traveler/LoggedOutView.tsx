"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function LoggedOutView({ onLogin }: { onLogin: () => void }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    const backgroundImages = [
        'https://images.unsplash.com/photo-1431274172761-fca41d930114?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        'https://images.unsplash.com/photo-1717986439981-0c6a51130cfa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        'https://images.unsplash.com/photo-1543716091-a840c05249ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        'https://images.unsplash.com/photo-1457207714875-13ef75a801ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
        'https://images.unsplash.com/photo-1555992828-ca4dbe41d294?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080',
    ];

    const fadeInUp = {
        initial: { opacity: 0, y: 30 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 30 },
        transition: { duration: 0.6, ease: 'easeOut' }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [backgroundImages.length]);

    return (
        <div className="w-full max-w-6xl mx-auto h-full relative px-4 sm:px-6">
            <div className="absolute inset-0 z-0 overflow-hidden rounded-xl shadow-2xl">
                {/* Imagen estática */}
                <Image
                    src={backgroundImages[currentImageIndex]}
                    alt="background static"
                    fill
                    className="object-cover absolute inset-0"
                    priority
                />

                {/* Imagen animada con transición */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentImageIndex}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 3, ease: "easeInOut" }}
                        className="w-full h-full absolute inset-0"
                    >
                        <Image
                            src={backgroundImages[currentImageIndex]}
                            alt="background transitioning"
                            fill
                            className="object-cover"
                        />
                    </motion.div>
                </AnimatePresence>

                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-purple-900/50 to-blue-900/60 pointer-events-none" />
            </div>

            <div className="relative z-10 flex items-center justify-center min-h-screen">
                <motion.div
                    variants={fadeInUp}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    onHoverStart={() => setHoveredCard('offer')}
                    onHoverEnd={() => setHoveredCard(null)}
                    className="w-1/2 bg-transparent hover:bg-white/5 transition-all rounded-2xl shadow-2xl p-8 sm:p-12 text-center text-white relative overflow-hidden transform hover:scale-[1.01] duration-300 backdrop-blur-md"
                >
                    {hoveredCard === 'offer' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.2 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gradient-to-br from-blue-700/40 via-purple-700/40 to-blue-700/40 blur-2xl"
                        />
                    )}

                    <div className="relative z-10">
                        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full mx-auto mb-6 flex items-center justify-center bg-white/20 p-4">
                            <Image
                                src="/ivi-logo.png"
                                alt="IVI Logo"
                                width={128}
                                height={128}
                                className="object-contain"
                                priority
                            />
                        </div>
                        <h3 className="text-2xl sm:text-3xl mb-4 font-bold">¿Listo para tu próxima aventura?</h3>
                        <p className="text-base sm:text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                            Deja que nuestro asistente IA te ayude a descubrir destinos increíbles.
                        </p>
                        <motion.button
                            onClick={onLogin}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.98 }}
                            className="bg-white text-blue-600 px-6 py-3 sm:px-8 sm:py-4 rounded-xl text-lg font-bold transition-all shadow-md"
                        >
                            Entrar / Registrar
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
