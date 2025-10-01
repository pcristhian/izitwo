"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle } from "lucide-react";

export default function Vendedores({ sucursal }) {
    const [vendedores, setVendedores] = useState([]);
    const [nombreFiltro, setNombreFiltro] = useState("");
    const [cajaFiltro, setCajaFiltro] = useState("");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [nombreNuevo, setNombreNuevo] = useState("");
    const [cajaNueva, setCajaNueva] = useState("");
    const [mensaje, setMensaje] = useState("");

    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        if (sucursal) fetchVendedores();
    }, [sucursal, nombreFiltro, cajaFiltro]);

    const fetchVendedores = async () => {
        const { data, error } = await supabase
            .from("vendedores")
            .select(`
            id,
            nombre,
            caja,
            sucursal_id,
            productos_vendidos(id, nombre, categoria_id, cantidad, categorias(nombre))
        `)
            .eq("sucursal_id", sucursal.id);

        if (!error && data) {
            // Procesar productos vendidos por categoría
            const processed = data.map(v => {
                const resumen = {};

                (v.productos_vendidos || []).forEach(pv => {
                    const cat = pv.categorias?.nombre?.slice(0, 10) || "SinCat"; // abreviar
                    if (!resumen[cat]) resumen[cat] = 0;
                    resumen[cat] += pv.cantidad || 0;
                });

                const resumenTexto = Object.entries(resumen)
                    .map(([cat, cant]) => `${cat}: ${cant}`)
                    .join(", ");

                return { ...v, resumenCategorias: resumenTexto };
            });

            setVendedores(processed);
        }
    };


    const abrirModal = () => {
        setNombreNuevo("");
        setCajaNueva("");
        setMensaje("");
        setModalAbierto(true);
    };

    const registrarVendedor = async () => {
        if (!nombreNuevo || !cajaNueva) {
            setMensaje("⚠️ Completa todos los campos");
            return;
        }

        const { error } = await supabase.from("vendedores").insert([
            {
                nombre: nombreNuevo,
                caja: cajaNueva,
                sucursal_id: sucursal.id
            }
        ]);

        if (!error) {
            setMensaje("✅ Vendedor agregado con éxito");
            fetchVendedores();
            setModalAbierto(false);
        } else {
            console.error(error);
            setMensaje("❌ Error al registrar vendedor");
        }
    };

    const eliminarVendedor = async (id) => {
        if (!confirm("¿Deseas eliminar este vendedor?")) return;
        const { error } = await supabase.from("vendedores").delete().eq("id", id);
        if (!error) fetchVendedores();
    };

    const exportToExcel = () => {
        const data = vendedores.map(v => ({
            nombre: v.nombre,
            caja: v.caja,
            productos_vendidos: v.productos_vendidos,
            sucursal: sucursal.nombre
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Vendedores");
        XLSX.writeFile(workbook, `vendedores_${sucursal.nombre}.xlsx`);
    };

    // Paginación lógica
    const totalPages = Math.ceil(vendedores.length / itemsPerPage);
    const displayedVendedores = vendedores.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <motion.h2
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-2xl font-bold mb-4 text-indigo-700"
            >
                Vendedores - {sucursal.nombre}
            </motion.h2>

            {/* Filtros */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex gap-4 flex-wrap mb-6 items-end"
            >
                <input
                    type="text"
                    placeholder="Filtrar por nombre"
                    value={nombreFiltro}
                    onChange={e => setNombreFiltro(e.target.value)}
                    className="border p-2 rounded shadow-sm"
                />
                <input
                    type="text"
                    placeholder="Filtrar por caja"
                    value={cajaFiltro}
                    onChange={e => setCajaFiltro(e.target.value)}
                    className="border p-2 rounded shadow-sm"
                />
                <button
                    onClick={() => { setNombreFiltro(""); setCajaFiltro(""); }}
                    className="flex items-center gap-2 px-3 py-2 bg-red-400 hover:bg-red-500 text-white rounded shadow"
                >
                    <XCircle size={18} /> Quitar Filtros
                </button>
            </motion.div>

            {/* Botones */}
            <div className="flex justify-between mb-4 items-center">
                <button
                    onClick={abrirModal}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded shadow"
                >
                    Nuevo Vendedor
                </button>
                <button
                    onClick={exportToExcel}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded shadow"
                >
                    Exportar Excel
                </button>
                {/* Paginación */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        {"<"}
                    </button>
                    <span className="px-2 py-1">{currentPage} / {totalPages || 1}</span>
                    <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        {">"}
                    </button>
                </div>
            </div>

            {/* Tabla */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="overflow-auto border rounded bg-white shadow"
                style={{ maxHeight: "60vh" }}
            >
                <table className="w-full table-auto border-collapse text-left">
                    <thead className="bg-indigo-100 sticky top-0">
                        <tr>
                            <th className="border p-2">Nombre</th>
                            <th className="border p-2">Caja</th>
                            <th className="border p-2">Productos Vendidos</th>
                            <th className="border p-2">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedVendedores.map(v => (
                            <motion.tr
                                key={v.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.3 }}
                                className="hover:bg-gray-50"
                            >
                                <td className="border p-2">{v.nombre}</td>
                                <td className="border p-2">{v.caja}</td>
                                <td className="border p-2">{v.resumenCategorias || "-"}</td>

                                <td className="border p-2">
                                    <button
                                        onClick={() => eliminarVendedor(v.id)}
                                        className="px-2 py-1 bg-red-400 hover:bg-red-500 text-white rounded"
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                    </tbody>
                </table>
            </motion.div>

            {/* Modal */}
            {modalAbierto && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center min-h-screen">
                    <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md mx-4">
                        <h3 className="text-2xl font-bold mb-6 text-center">Nuevo Vendedor</h3>
                        <div className="mb-4">
                            <label className="block mb-1">Nombre</label>
                            <input
                                type="text"
                                value={nombreNuevo}
                                onChange={e => setNombreNuevo(e.target.value)}
                                className="border rounded p-2 w-full"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block mb-1">Caja</label>
                            <input
                                type="text"
                                value={cajaNueva}
                                onChange={e => setCajaNueva(e.target.value)}
                                className="border rounded p-2 w-full"
                            />
                        </div>
                        <div className="flex justify-between mt-6">
                            <button
                                onClick={() => setModalAbierto(false)}
                                className="bg-gray-400 text-white px-4 py-2 rounded"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={registrarVendedor}
                                className="bg-green-600 text-white px-4 py-2 rounded"
                            >
                                Guardar
                            </button>
                        </div>
                        {mensaje && <p className="mt-4">{mensaje}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
