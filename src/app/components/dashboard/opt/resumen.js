"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Package, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../../lib/supabase";

export default function Resumen({ sucursal }) {
    const [ventas, setVentas] = useState([]);
    const [productos, setProductos] = useState([]);
    const [dashboardView, setDashboardView] = useState("resumen");
    const [topProductos, setTopProductos] = useState([]);
    const [topCategorias, setTopCategorias] = useState([]);

    // 🎨 Paleta suave por sucursal
    const themes = {
        1: {
            // Sucursal 1 → Azules frescos
            primary: "from-sky-400 to-blue-500",
            secondary: "from-indigo-300 to-sky-400",
            card1: "bg-sky-300",
            card2: "bg-indigo-300",
            card3: "bg-blue-300",
            category: "from-sky-400 to-indigo-400",
            chart: "#38bdf8", // sky-400
        },
        2: {
            // Sucursal 2 → Naranjas suaves
            primary: "from-amber-400 to-orange-400",
            secondary: "from-yellow-300 to-amber-400",
            card1: "bg-amber-300",
            card2: "bg-orange-300",
            card3: "bg-yellow-300",
            category: "from-amber-400 to-orange-400",
            chart: "#fbbf24", // amber-400
        },
    };

    const theme = themes[sucursal?.id] || themes[1]; // fallback azul

    useEffect(() => {
        if (sucursal) {
            fetchVentas();
            fetchProductos();
        }
    }, [sucursal]);

    const fetchVentas = async () => {
        const { data, error } = await supabase
            .from("ventas")
            .select("id, producto_id, cantidad, total, productos(nombre, categoria_id, categorias(nombre))")
            .eq("sucursal_id", sucursal.id);

        if (!error && data) {
            setVentas(data);
            calcularTopProductos(data);
            calcularTopCategorias(data);
        }
    };

    const fetchProductos = async () => {
        const { data, error } = await supabase.from("productos").select("id, nombre, categoria_id");
        if (!error && data) setProductos(data);
    };

    const calcularTopProductos = (ventasData) => {
        const acumulado = {};
        ventasData.forEach((v) => {
            const nombre = v.productos.nombre;
            acumulado[nombre] = (acumulado[nombre] || 0) + v.cantidad;
        });
        const sorted = Object.entries(acumulado).sort((a, b) => b[1] - a[1]);
        setTopProductos(sorted.slice(0, 3));
    };

    const calcularTopCategorias = (ventasData) => {
        const categoriasMap = {};
        ventasData.forEach((v) => {
            const cat = v.productos.categorias?.nombre || "Sin categoría";
            categoriasMap[cat] = categoriasMap[cat] || {};
            categoriasMap[cat][v.productos.nombre] =
                (categoriasMap[cat][v.productos.nombre] || 0) + v.cantidad;
        });

        const topPorCategoria = Object.entries(categoriasMap).map(([cat, prods]) => {
            const top3 = Object.entries(prods).sort((a, b) => b[1] - a[1]).slice(0, 3);
            return { categoria: cat, productos: top3 };
        });

        setTopCategorias(topPorCategoria);
    };

    const fadeInUp = {
        hidden: { opacity: 0, y: 20, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1 },
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-center text-indigo-700">
                Dashboard de Ventas - Resumen
            </h1>

            {/* Botones de vista */}
            <div className="flex justify-center gap-4 mb-6">
                <button
                    className={`px-4 py-2 rounded font-semibold transition-colors duration-300 ${dashboardView === "resumen"
                        ? `bg-gradient-to-r ${theme.primary} text-white`
                        : "bg-gray-200 text-gray-800"
                        }`}
                    onClick={() => setDashboardView("resumen")}
                >
                    Resumen
                </button>
                <button
                    className={`px-4 py-2 rounded font-semibold transition-colors duration-300 ${dashboardView === "porCategoria"
                        ? `bg-gradient-to-r ${theme.secondary} text-white`
                        : "bg-gray-200 text-gray-800"
                        }`}
                    onClick={() => setDashboardView("porCategoria")}
                >
                    Por Categoría
                </button>
            </div>

            {/* AnimatePresence para transiciones */}
            <AnimatePresence mode="wait">
                {dashboardView === "resumen" && (
                    <motion.div
                        key="resumen"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.4 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                    >
                        {/* Producto más vendido */}
                        <motion.div
                            className={`${theme.card1} text-white rounded-lg p-6 flex flex-col items-center justify-center shadow-lg`}
                            variants={fadeInUp}
                            initial="hidden"
                            animate="visible"
                            transition={{ duration: 0.5 }}
                        >
                            <TrendingUp size={36} className="mb-2" />
                            <span className="text-xl font-bold">Producto Más Vendido</span>
                            {topProductos[0] && (
                                <span className="mt-2 text-2xl font-extrabold">
                                    {topProductos[0][0]} ({topProductos[0][1]} u.)
                                </span>
                            )}
                        </motion.div>

                        {/* Total de ventas */}
                        <motion.div
                            className={`${theme.card2} text-white rounded-lg p-6 flex flex-col items-center justify-center shadow-lg`}
                            variants={fadeInUp}
                            initial="hidden"
                            animate="visible"
                            transition={{ duration: 0.6 }}
                        >
                            <Package size={36} className="mb-2" />
                            <span className="text-xl font-bold">Total Ventas</span>
                            <span className="mt-2 text-2xl font-extrabold">
                                {ventas.reduce((sum, v) => sum + v.total, 0)} Bs.
                            </span>
                        </motion.div>

                        {/* Transacciones */}
                        <motion.div
                            className={`${theme.card3} text-white rounded-lg p-6 flex flex-col items-center justify-center shadow-lg`}
                            variants={fadeInUp}
                            initial="hidden"
                            animate="visible"
                            transition={{ duration: 0.7 }}
                        >
                            <ShoppingBag size={36} className="mb-2" />
                            <span className="text-xl font-bold">Productos Vendidos</span>
                            <span className="mt-2 text-2xl font-extrabold">{ventas.length}</span>
                        </motion.div>
                    </motion.div>
                )}

                {dashboardView === "porCategoria" && (
                    <motion.div
                        key="porCategoria"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
                    >
                        {topCategorias.map((c) => (
                            <motion.div
                                key={c.categoria}
                                className={`bg-gradient-to-r ${theme.category} text-white rounded-lg p-4 shadow-lg`}
                                variants={fadeInUp}
                                initial="hidden"
                                animate="visible"
                                transition={{ duration: 0.5 }}
                            >
                                <span className="font-bold text-lg">{c.categoria}</span>
                                <ul className="mt-2">
                                    {c.productos.map(([nombre, cantidad], idx) => (
                                        <li key={idx}>
                                            {nombre} ({cantidad})
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Gráfica */}
            <motion.div
                className="bg-white rounded-lg p-6 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h2 className="text-xl font-bold mb-4 text-center text-indigo-700">Gráfica de Ventas</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={
                            dashboardView === "resumen"
                                ? topProductos.map(([nombre, cantidad]) => ({ nombre, cantidad }))
                                : topCategorias.flatMap((c) =>
                                    c.productos.map(([nombre, cantidad]) => ({ nombre, cantidad }))
                                )
                        }
                    >
                        <XAxis dataKey="nombre" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="cantidad" fill={theme.chart} />
                    </BarChart>
                </ResponsiveContainer>
            </motion.div>
        </div>
    );
}
