"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { motion } from "framer-motion";
import { XCircle } from "lucide-react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export default function Vendedores({ sucursal }) {
    const [vendedores, setVendedores] = useState([]);
    const [nombreFiltro, setNombreFiltro] = useState("");
    const [cajaFiltro, setCajaFiltro] = useState("");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [nombreNuevo, setNombreNuevo] = useState("");
    const [cajaNueva, setCajaNueva] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [editandoId, setEditandoId] = useState(null);

    //mostrar tabla CRUD
    const [mostrarTabla, setMostrarTabla] = useState(true);


    // Paginación
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Ranking
    const [ranking, setRanking] = useState([]);

    useEffect(() => {
        if (sucursal) {
            fetchVendedores();
            fetchRanking();
        }
    }, [sucursal, nombreFiltro, cajaFiltro]);

    const fetchVendedores = async () => {
        const { data, error } = await supabase
            .from("vendedores")
            .select(`id, nombre, caja, sucursal_id`)
            .eq("sucursal_id", sucursal.id);

        if (!error && data) {
            // Filtros básicos de lista de vendedores
            let filtered = data;
            if (nombreFiltro) {
                filtered = filtered.filter(v =>
                    v.nombre.toLowerCase().includes(nombreFiltro.toLowerCase())
                );
            }
            if (cajaFiltro) {
                filtered = filtered.filter(v =>
                    v.caja.toLowerCase().includes(cajaFiltro.toLowerCase())
                );
            }

            setVendedores(filtered);
        }
    };

    const fetchRanking = async () => {
        const { data, error } = await supabase
            .from("ventas")
            .select(`
        cantidad,
        vendedor_id,
        vendedores(nombre, caja),
        productos(
          categorias(nombre)
        )
      `)
            .eq("sucursal_id", sucursal.id);

        if (error) {
            console.error(error);
            return;
        }

        // Si hay filtros aplicados, filtramos ventas por vendedor/caja
        let filtrado = data;
        if (nombreFiltro) {
            filtrado = filtrado.filter(v =>
                v.vendedores?.nombre?.toLowerCase().includes(nombreFiltro.toLowerCase())
            );
        }
        if (cajaFiltro) {
            filtrado = filtrado.filter(v =>
                v.vendedores?.caja?.toLowerCase().includes(cajaFiltro.toLowerCase())
            );
        }

        // Agrupar por categoría
        const map = {};
        filtrado.forEach(venta => {
            const categoria = venta.productos?.categorias?.nombre || "Sin categoría";
            if (!map[categoria]) {
                map[categoria] = { categoria, total: 0 };
            }
            map[categoria].total += venta.cantidad;
        });

        const processed = Object.values(map).sort((a, b) => b.total - a.total);
        setRanking(processed);
    };

    const abrirModal = (vendedor = null) => {
        setNombreNuevo(vendedor?.nombre || "");
        setCajaNueva(vendedor?.caja || "");
        setEditandoId(vendedor?.id || null);
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
                sucursal_id: sucursal.id,
            },
        ]);

        if (!error) {
            setMensaje("✅ Vendedor agregado con éxito");
            fetchVendedores();
            fetchRanking();
            setModalAbierto(false);
        } else {
            console.error(error);
            setMensaje("❌ Error al registrar vendedor");
        }
    };

    const editarVendedor = async () => {
        if (!nombreNuevo || !cajaNueva) {
            setMensaje("⚠️ Completa todos los campos");
            return;
        }

        const { error } = await supabase
            .from("vendedores")
            .update({
                nombre: nombreNuevo,
                caja: cajaNueva,
            })
            .eq("id", editandoId);

        if (!error) {
            setMensaje("✅ Vendedor actualizado con éxito");
            fetchVendedores();
            fetchRanking();
            setModalAbierto(false);
        } else {
            console.error(error);
            setMensaje("❌ Error al actualizar vendedor");
        }
    };

    const eliminarVendedor = async (id) => {
        if (!confirm("¿Deseas eliminar este vendedor?")) return;
        const { error } = await supabase.from("vendedores").delete().eq("id", id);
        if (!error) {
            fetchVendedores();
            fetchRanking();
        }
    };

    // Paginación lógica
    const totalPages = Math.ceil(vendedores.length / itemsPerPage);
    const displayedVendedores = vendedores.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

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
                    onChange={(e) => setNombreFiltro(e.target.value)}
                    className="border p-2 rounded shadow-sm"
                />
                <input
                    type="text"
                    placeholder="Filtrar por caja"
                    value={cajaFiltro}
                    onChange={(e) => setCajaFiltro(e.target.value)}
                    className="border p-2 rounded shadow-sm"
                />
                <button
                    onClick={() => {
                        setNombreFiltro("");
                        setCajaFiltro("");
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-red-400 hover:bg-red-500 text-white rounded"
                >
                    <XCircle size={18} /> Quitar Filtros
                </button>
            </motion.div>

            <div className="flex justify-between mb-4 items-center">
                <div className="flex gap-3">
                    <button
                        onClick={() => abrirModal()}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded shadow"
                    >
                        Nuevo Vendedor
                    </button>
                    <button
                        onClick={() => setMostrarTabla(!mostrarTabla)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded shadow"
                    >
                        {mostrarTabla ? "Ocultar Tabla" : "Mostrar Tabla"}
                    </button>
                </div>

                {/* Paginación */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        {"<"}
                    </button>
                    <span className="px-2 py-1">
                        {currentPage} / {totalPages || 1}
                    </span>
                    <button
                        onClick={() =>
                            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                        }
                        className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        {">"}
                    </button>
                </div>
            </div>

            {mostrarTabla && (
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
                                <th className="border p-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedVendedores.map((v) => (
                                <motion.tr
                                    key={v.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="hover:bg-gray-50"
                                >
                                    <td className="border p-2">{v.nombre}</td>
                                    <td className="border p-2">{v.caja}</td>
                                    <td className="border p-2 flex gap-2">
                                        <button
                                            onClick={() => abrirModal(v)}
                                            className="px-2 py-1 bg-yellow-400 hover:bg-yellow-500 text-white rounded"
                                        >
                                            Editar
                                        </button>
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
            )}

            {/* Modal CRUD */}
            {modalAbierto && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center min-h-screen">
                    <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md mx-4">
                        <h3 className="text-2xl font-bold mb-6 text-center">
                            {editandoId ? "Editar Vendedor" : "Nuevo Vendedor"}
                        </h3>
                        <div className="mb-4">
                            <label className="block mb-1">Nombre</label>
                            <input
                                type="text"
                                value={nombreNuevo}
                                onChange={(e) => setNombreNuevo(e.target.value)}
                                className="border rounded p-2 w-full"
                            />
                        </div>
                        <div className="mb-4">
                            <label className="block mb-1">Caja</label>
                            <input
                                type="text"
                                value={cajaNueva}
                                onChange={(e) => setCajaNueva(e.target.value)}
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
                                onClick={editandoId ? editarVendedor : registrarVendedor}
                                className="bg-green-600 text-white px-4 py-2 rounded"
                            >
                                {editandoId ? "Actualizar" : "Guardar"}
                            </button>
                        </div>
                        {mensaje && <p className="mt-4">{mensaje}</p>}
                    </div>
                </div>
            )}

            {/* Ranking */}
            <div className="mt-10 bg-white p-6 rounded-xl shadow">
                <h2 className="text-xl font-bold mb-2 text-indigo-600">
                    Ranking por Categorías - {sucursal.nombre}
                </h2>

                {(nombreFiltro || cajaFiltro) && (
                    <p className="text-sm text-gray-500 mb-4">
                        Mostrando ventas de{" "}
                        <span className="font-medium">
                            {nombreFiltro || `Caja ${cajaFiltro}`}
                        </span>
                    </p>
                )}

                {ranking.length === 0 ? (
                    <p className="text-gray-500">No hay ventas registradas.</p>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={ranking} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="categoria" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="total" fill="#4f46e5" name="Unidades Vendidas" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
