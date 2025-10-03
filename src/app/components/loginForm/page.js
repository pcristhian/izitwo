"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import bcrypt from "bcryptjs";
import { motion, AnimatePresence } from "framer-motion";

const categories = [
    "/img/distribuidora.png",
    "/img/tecnologia.png",
    "/img/natural.png",
    "/img/imedic.png",
];

export default function LoginForm() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [index, setIndex] = useState(0);
    const router = useRouter();

    // Carrusel automático
    useEffect(() => {
        const interval = setInterval(() => {
            setIndex((prev) => (prev + 1) % categories.length);
        }, 3000); // cambia cada 3 segundos
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const { data, error } = await supabase
                .from("usuarios")
                .select("*")
                .eq("usuario", username)
                .single();

            if (error) throw error;

            if (data && (await bcrypt.compare(password, data.clave))) {
                sessionStorage.setItem("isLoggedIn", "true");
                router.push("/components/dashboard");
            } else {
                setError("Usuario o contraseña incorrectos");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="bg-white p-6 rounded-xl shadow-lg w-full max-w-md"
            >
                <div className="text-center mb-6">
                    <motion.h1
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="text-3xl font-bold text-gray-800"
                    >
                        Jard Complications
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
                        className="text-gray-600 mt-2"
                    >
                        Ingresa tus credenciales para continuar
                    </motion.p>
                </div>

                {/* 🔥 Carrusel de imágenes */}
                {/* 🔥 Carrusel de imágenes con fondo */}
                <div className="relative w-full h-40 mb-6 flex items-center justify-center overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={index}
                            src={categories[index]}
                            alt={`Categoría ${index + 1}`}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.8 }}
                            className="absolute w-36 h-36 object-cover rounded-full shadow-lg border border-gray-300"
                        />
                    </AnimatePresence>
                </div>


                <form onSubmit={handleSubmit} className="space-y-5">
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 flex items-center"
                            >
                                <svg
                                    className="w-5 h-5 mr-2"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <span>{error}</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div>
                        <label
                            htmlFor="username"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Usuario
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            required
                            className="block w-full pl-3 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="Ingresa tu usuario"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Contraseña
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="block w-full pl-3 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                            placeholder="Ingresa tu contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <motion.button
                        type="submit"
                        disabled={isLoading}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 transition"
                    >
                        {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
                    </motion.button>
                </form>
            </motion.div>
        </div>
    );
}
