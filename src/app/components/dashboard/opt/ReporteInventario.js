"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, XCircle } from "lucide-react";
import ReporteVentas from "./ReporteVentas"; // Segundo tab: ventas

export default function ReporteInventario({ sucursal }) {
    const [activeTab, setActiveTab] = useState("inventario"); // "inventario" | "ventas"
    const [inventario, setInventario] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [categoriaFiltro, setCategoriaFiltro] = useState("");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [showExportOptions, setShowExportOptions] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage] = useState(10); // filas por página, puedes ajustarlo
    const totalPages = Math.ceil(inventario.length / rowsPerPage);

    // Para obtener los registros de la página actual
    const paginatedData = inventario.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );


    // Inicializar fechas por defecto
    useEffect(() => {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
            .toISOString()
            .split("T")[0];
        const finMes = hoy.toISOString().split("T")[0];

        setFechaInicio(inicioMes);
        setFechaFin(finMes);
    }, []);

    // Cargar inventario y categorías
    useEffect(() => {
        if (sucursal && fechaInicio && fechaFin) {
            fetchCategorias();
            fetchInventario();
        }
    }, [sucursal, categoriaFiltro, fechaInicio, fechaFin]);

    const fetchCategorias = async () => {
        const { data, error } = await supabase.from("categorias").select("*");
        if (!error && data) setCategorias(data);
    };

    const fetchInventario = async () => {
        let query = supabase
            .from("inventarios")
            .select(
                `id, stock_actual, stock_minimo, 
                 productos(id, codigo, nombre, categoria_id, precio, costo, fechaingreso, categorias(nombre)), 
                 sucursal_id`
            )
            .eq("sucursal_id", sucursal.id)
            .gte("productos.fechaingreso", fechaInicio)
            .lte("productos.fechaingreso", fechaFin);

        if (categoriaFiltro) query = query.eq("productos.categoria_id", parseInt(categoriaFiltro));

        const { data, error } = await query;
        if (!error && data) setInventario(data);
    };

    const resetFiltros = () => {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
            .toISOString()
            .split("T")[0];
        const finMes = hoy.toISOString().split("T")[0];

        setCategoriaFiltro("");
        setFechaInicio(inicioMes);
        setFechaFin(finMes);
    };

    const exportToExcel = (data, filename = "reporte.xlsx") => {
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
        XLSX.writeFile(workbook, filename);
    };

    // Exportar tabla actual
    const handleExportTablaActual = () => {
        const data = inventario.map(i => ({
            codigo: i.productos?.codigo || "",
            nombre: i.productos?.nombre || "",
            categoria: i.productos?.categorias?.nombre || "",
            precio: i.productos?.precio ?? "",
            stock_actual: i.stock_actual,
            stock_minimo: i.stock_minimo,
            fecha_ingreso: i.productos?.fechaingreso || "",
            sucursal: sucursal.nombre
        }));
        exportToExcel(data, `inventario_tabla_actual_${sucursal.nombre}.xlsx`);
    };

    // Exportar todo inventario por categoría
    const handleExportTodoInventario = async () => {
        const { data, error } = await supabase
            .from("inventarios")
            .select(
                `id, stock_actual, stock_minimo, 
                 productos(id, codigo, nombre, categoria_id, precio, costo, fechaingreso, categorias(nombre)), 
                 sucursal_id`
            )
            .eq("sucursal_id", sucursal.id);

        if (error || !data) return;

        const workbook = XLSX.utils.book_new();
        const categoriasMap = {};

        data.forEach(i => {
            const categoria = i.productos.categorias?.nombre || "Sin categoría";
            if (!categoriasMap[categoria]) categoriasMap[categoria] = [];
            categoriasMap[categoria].push({
                codigo: i.productos.codigo,
                nombre: i.productos.nombre,
                precio: i.productos.precio,
                stock_actual: i.stock_actual,
                fecha_ingreso: i.productos.fechaingreso,
                categoria: categoria,
                sucursal: sucursal.nombre
            });
        });

        Object.entries(categoriasMap).forEach(([categoria, rows]) => {
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, ws, categoria.substring(0, 30));
        });

        XLSX.writeFile(workbook, `inventario_completo_${sucursal.nombre}.xlsx`);
    };
    const handleExportSoloStock = async () => {
        const { data, error } = await supabase
            .from("inventarios")
            .select(
                `id, stock_actual, productos(id, codigo, nombre, categoria_id, precio, fechaingreso, categorias(nombre)), sucursal_id`
            )
            .eq("sucursal_id", sucursal.id);

        if (error || !data) return;

        const workbook = XLSX.utils.book_new();

        // Agrupar por categoría
        const categoriasMap = {};
        data.forEach(i => {
            const categoria = i.productos.categorias?.nombre || "Sin categoría";
            if (!categoriasMap[categoria]) categoriasMap[categoria] = [];

            categoriasMap[categoria].push({
                codigo: i.productos.codigo,
                nombre: i.productos.nombre,
                precio: i.productos.precio,
                stock_actual: i.stock_actual,
                fecha_ingreso: i.productos.fechaingreso,
                categoria: categoria,
                sucursal: sucursal.nombre
            });
        });

        // Crear una hoja por categoría
        Object.entries(categoriasMap).forEach(([categoria, rows]) => {
            const ws = XLSX.utils.json_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, ws, categoria.substring(0, 30));
        });

        XLSX.writeFile(workbook, `inventario_stock_actual_${sucursal.nombre}.xlsx`);
    };


    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Tabs */}
            <div className="flex justify-center gap-4 mb-6">
                <button
                    onClick={() => setActiveTab("inventario")}
                    className={`px-4 py-2 rounded font-semibold ${activeTab === "inventario" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                >
                    Inventario
                </button>
                <button
                    onClick={() => setActiveTab("ventas")}
                    className={`px-4 py-2 rounded font-semibold ${activeTab === "ventas" ? "bg-orange-400 text-white" : "bg-gray-200"}`}
                >
                    Ventas
                </button>
            </div>

            <AnimatePresence exitBeforeEnter>
                {activeTab === "inventario" && (
                    <motion.div
                        key="inventario"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.4 }}
                    >
                        <motion.h2
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="text-2xl font-bold mb-4 text-indigo-700"
                        >
                            Reporte de Inventario - {sucursal.nombre}
                        </motion.h2>

                        {/* Filtros */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            className="flex gap-4 flex-wrap mb-6 items-end"
                        >
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fecha inicio</label>
                                <input
                                    type="date"
                                    value={fechaInicio}
                                    onChange={e => setFechaInicio(e.target.value)}
                                    className="border p-2 rounded shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Fecha fin</label>
                                <input
                                    type="date"
                                    value={fechaFin}
                                    onChange={e => setFechaFin(e.target.value)}
                                    className="border p-2 rounded shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Categoría</label>
                                <select
                                    value={categoriaFiltro}
                                    onChange={e => setCategoriaFiltro(e.target.value)}
                                    className="border p-2 rounded shadow-sm"
                                >
                                    <option value="">Todas</option>
                                    {categorias.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.nombre.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={resetFiltros}
                                className="flex items-center gap-2 px-3 py-2 bg-red-400 hover:bg-red-500 text-white rounded shadow"
                            >
                                <XCircle size={18} /> Quitar Filtros
                            </button>
                        </motion.div>


                        {/* Botones Exportar + Paginación */}
                        <div className="flex justify-between items-center mb-6">
                            {/* Botones Exportar */}
                            <div className="flex gap-4">
                                <button
                                    onClick={handleExportTablaActual}
                                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded shadow"
                                >
                                    Exportar Tabla Actual
                                </button>

                                {/* Exportar Todo con Desplegable */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowExportOptions(!showExportOptions)}
                                        className="px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded shadow flex items-center gap-2"
                                    >
                                        Exportar Todo el Inventario
                                        {showExportOptions ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>

                                    <AnimatePresence>
                                        {showExportOptions && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.3 }}
                                                className="absolute mt-2 bg-white border rounded shadow-lg p-4 w-72 z-10"
                                            >
                                                <p className="mb-2 text-sm text-gray-700">
                                                    Opciones de exportación (cada categoría será una hoja en Excel)
                                                </p>
                                                <button
                                                    onClick={handleExportTodoInventario}
                                                    className="w-full px-3 py-2 mb-2 bg-orange-500 hover:bg-orange-600 text-white rounded"
                                                >
                                                    Exportar Todo
                                                </button>
                                                <button
                                                    onClick={handleExportSoloStock}
                                                    className="w-full px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded"
                                                >
                                                    Exportar solo productos + Stock Actual
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Paginación */}
                            <div className="flex gap-2 items-center">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                                >
                                    Anterior
                                </button>
                                <span className="px-2 py-1">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                        {/* Tabla Inventario */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6 }}
                            className="overflow-auto border rounded bg-white shadow"
                        >
                            <table className="w-full table-auto border-collapse text-left">
                                <thead className="bg-indigo-100 sticky top-0">
                                    <tr>
                                        <th className="border p-2">Código</th>
                                        <th className="border p-2">Nombre</th>
                                        <th className="border p-2">Categoría</th>
                                        <th className="border p-2">Precio</th>
                                        <th className="border p-2">Stock Actual</th>
                                        <th className="border p-2">Stock Mínimo</th>
                                        <th className="border p-2">Fecha Ingreso</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.map(i => (
                                        <motion.tr
                                            key={i.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ duration: 0.3 }}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="border p-2">{i.productos?.codigo || "-"}</td>
                                            <td className="border p-2">{i.productos?.nombre || "Sin producto"}</td>
                                            <td className="border p-2">{i.productos?.categorias?.nombre || "-"}</td>
                                            <td className="border p-2">{i.productos?.precio ?? "-"}</td>
                                            <td className="border p-2">{i.stock_actual}</td>
                                            <td className="border p-2">{i.stock_minimo}</td>
                                            <td className="border p-2">{i.productos?.fechaingreso?.split("T")[0] || "-"}</td>
                                        </motion.tr>
                                    ))}
                                </tbody>

                            </table>
                        </motion.div>
                    </motion.div>
                )}

                {activeTab === "ventas" && (
                    <motion.div
                        key="ventas"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.4 }}
                    >
                        <ReporteVentas sucursal={sucursal} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
