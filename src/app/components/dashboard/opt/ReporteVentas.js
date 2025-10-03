"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, XCircle } from "lucide-react";

export default function ReporteVentas({ sucursal }) {
    const [ventas, setVentas] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [categoriaFiltro, setCategoriaFiltro] = useState("");
    const [fechaInicio, setFechaInicio] = useState("");
    const [fechaFin, setFechaFin] = useState("");
    const [showExportOptions, setShowExportOptions] = useState(false);

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
            .toISOString()
            .split("T")[0];
        const finMes = hoy.toISOString().split("T")[0];

        setFechaInicio(inicioMes);
        setFechaFin(finMes);
    }, []);

    useEffect(() => {
        if (sucursal && fechaInicio && fechaFin) {
            fetchCategorias();
            fetchVentas();
        }
    }, [sucursal, categoriaFiltro, fechaInicio, fechaFin]);

    const fetchCategorias = async () => {
        const { data, error } = await supabase.from("categorias").select("*");
        if (!error && data) setCategorias(data);
    };

    const fetchVentas = async () => {
        let query = supabase
            .from("ventas")
            .select(
                `producto_id, cantidad, precio_unitario, total, fecha, 
         productos(codigo, nombre, categoria_id, categorias(nombre)), 
         sucursal_id`
            )
            .eq("sucursal_id", sucursal.id)
            .gte("fecha", fechaInicio)
            .lte("fecha", fechaFin);

        if (categoriaFiltro) query = query.eq("productos.categoria_id", parseInt(categoriaFiltro));

        const { data, error } = await query;
        if (!error && data) setVentas(data);
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

    // Exportar tabla actual
    const handleExportTablaActual = () => {
        const data = ventas.map(v => ({
            codigo: v.productos?.codigo || "",
            nombre: v.productos?.nombre || "",
            categoria: v.productos?.categorias?.nombre || "",
            cantidad: v.cantidad,
            precio_unitario: v.precio_unitario,
            total: v.total,
            fecha: v.fecha,
            sucursal: sucursal.nombre
        }));
        XLSX.writeFile(XLSX.utils.book_new(), `ventas_tabla_actual_${sucursal.nombre}.xlsx`);
        exportToExcel(data, `ventas_tabla_actual_${sucursal.nombre}.xlsx`);
    };

    // Exportar todas las ventas (año actual)
    const handleExportTodasVentas = async () => {
        const hoy = new Date();
        const inicioAno = `${hoy.getFullYear()}-01-01`;
        const { data, error } = await supabase
            .from("ventas")
            .select(
                `producto_id, cantidad, precio_unitario, total, fecha, 
         productos(codigo, nombre, categoria_id, categorias(nombre)), 
         sucursal_id`
            )
            .eq("sucursal_id", sucursal.id)
            .gte("fecha", inicioAno);

        if (error || !data) return;

        const workbook = XLSX.utils.book_new();
        const rows = data.map(v => ({
            codigo: v.productos?.codigo || "",
            nombre: v.productos?.nombre || "",
            categoria: v.productos?.categorias?.nombre || "",
            cantidad: v.cantidad,
            precio_unitario: v.precio_unitario,
            total: v.total,
            fecha: v.fecha,
            sucursal: sucursal.nombre
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, ws, `Ventas_${hoy.getFullYear()}`);
        XLSX.writeFile(workbook, `ventas_${hoy.getFullYear()}_${sucursal.nombre}.xlsx`);
    };

    // Paginación
    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentRows = ventas.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(ventas.length / rowsPerPage);

    return (
        <div className="p-4">
            <motion.h2
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-xl font-bold mb-4 text-indigo-700"
            >
                Reporte de Ventas - {sucursal.nombre}
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
                            <option key={c.id} value={c.id}>{c.nombre.toUpperCase()}</option>
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

            {/* Botones Exportar */}
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
                    <button
                        onClick={handleExportTodasVentas}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded shadow"
                    >
                        Exportar Todas las Ventas (Año Actual)
                    </button>
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


            {/* Tabla Ventas con altura ajustable */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="overflow-auto border rounded bg-white shadow"
                style={{ maxHeight: "60vh" }} // ajustable según pantalla
            >
                <table className="w-full table-auto border-collapse text-left">
                    <thead className="bg-indigo-100 sticky top-0">
                        <tr>
                            <th className="border p-2">Código</th>
                            <th className="border p-2">Nombre</th>
                            <th className="border p-2">Categoría</th>
                            <th className="border p-2">Cantidad</th>
                            <th className="border p-2">Precio Unitario</th>
                            <th className="border p-2">Total</th>
                            <th className="border p-2">Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentRows.map((v, idx) => (
                            <motion.tr
                                key={`${v.productos?.codigo}-${idx}`}

                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="hover:bg-gray-50"
                            >
                                <td className="border p-2">{v.productos?.codigo || "-"}</td>
                                <td className="border p-2">{v.productos?.nombre || "Sin producto"}</td>
                                <td className="border p-2">{v.productos?.categorias?.nombre || "-"}</td>
                                <td className="border p-2">{v.cantidad}</td>
                                <td className="border p-2">{v.precio_unitario}</td>
                                <td className="border p-2">{v.total}</td>
                                <td className="border p-2">{v.fecha?.split("T")[0] || "-"}</td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </motion.div>

            {/* Paginación */}

        </div>
    );
}
