"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function RegistrarVenta({ sucursal }) {
    const [categorias, setCategorias] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
    const [ventas, setVentas] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [producto, setProducto] = useState(null);
    const [busqueda, setBusqueda] = useState("");
    const [cantidad, setCantidad] = useState(1);
    const [fecha, setFecha] = useState("");
    const [vendedorId, setVendedorId] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [modalAbierto, setModalAbierto] = useState(false);
    const [descuento, setDescuento] = useState("");
    const [descDescuento, setDescDescuento] = useState("");
    const [productosSeleccionados, setProductosSeleccionados] = useState([]);
    const [vendedorSeleccionado, setVendedorSeleccionado] = useState(null);

    // Inicializar categorías, vendedores y ventas del día
    useEffect(() => {
        if (sucursal) {
            setCategoriaSeleccionada(null);
            setVendedorSeleccionado(null);
            cargarVentas();
            fetchCategoriasVendedores();
        }
    }, [sucursal]);

    const fetchCategoriasVendedores = async () => {
        const { data: cats } = await supabase.from("categorias").select("*").order("id");
        const { data: vends } = await supabase.from("vendedores").select("*").eq("sucursal_id", sucursal.id);
        setCategorias(cats || []);
        setVendedores(vends || []);
    };

    const cargarVentas = async (cat = null, vend = null) => {
        if (!sucursal) return;

        const ahoraBolivia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }));
        const inicioDia = new Date(ahoraBolivia); inicioDia.setHours(0, 0, 0, 0);
        const finDia = new Date(ahoraBolivia); finDia.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from("ventas")
            .select(`
                cantidad,
                precio_unitario,
                descuento,
                desc_descuento,
                fecha,
                total,
                producto:producto_id(id,codigo,nombre,categoria_id),
                vendedor:vendedor_id(id,nombre,caja),
                sucursal_id
            `)
            .gte("fecha", inicioDia.toISOString())
            .lte("fecha", finDia.toISOString())
            .eq("sucursal_id", sucursal.id)
            .order("fecha", { ascending: false });

        if (!error && data) {
            let filtradas = data;
            if (cat) filtradas = filtradas.filter(v => Number(v.producto?.categoria_id) === Number(cat.id));
            if (vend) filtradas = filtradas.filter(v => Number(v.vendedor?.id) === Number(vend.id));
            setVentas(filtradas);
        }
    };

    const seleccionarCategoria = cat => {
        setCategoriaSeleccionada(cat);
        cargarVentas(cat, vendedorSeleccionado);
    };

    const seleccionarVendedor = vend => {
        setVendedorSeleccionado(vend);
        cargarVentas(categoriaSeleccionada, vend);
    };

    useEffect(() => {
        const buscarProducto = async () => {
            if (!categoriaSeleccionada || !sucursal || !busqueda.trim()) {
                setProducto(null);
                return;
            }

            const { data: inventarios } = await supabase
                .from("inventarios")
                .select(`stock_actual, producto:producto_id(*)`)
                .eq("sucursal_id", sucursal.id);

            const encontrado = inventarios.find(inv =>
                (inv.producto?.codigo?.toUpperCase() === busqueda.trim().toUpperCase() ||
                    inv.producto?.nombre?.toUpperCase().includes(busqueda.trim().toUpperCase())) &&
                Number(inv.producto?.categoria_id) === Number(categoriaSeleccionada.id)
            );

            if (!encontrado) {
                setProducto(null);
                setMensaje("❌ Producto no encontrado");
            } else {
                setProducto({ ...encontrado.producto, stockActual: encontrado.stock_actual });
                setMensaje("");
                setCantidad(1);
                setDescuento("");
                setDescDescuento("");
            }
        };
        buscarProducto();
    }, [busqueda, categoriaSeleccionada, sucursal]);

    const abrirModal = () => {
        setBusqueda("");
        setProducto(null);
        setCantidad(1);
        setVendedorId("");
        setProductosSeleccionados([]);
        // Fecha en La Paz para input datetime-local
        const now = new Date();

        const boliviaTime = new Intl.DateTimeFormat("sv-SE", {
            timeZone: "America/La_Paz",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        }).format(now);

        // Intl con "sv-SE" devuelve algo como: "2025-10-01 15:45"
        const fechaBolivia = boliviaTime.replace(" ", "T");

        setFecha(fechaBolivia);
        setDescuento("");
        setDescDescuento("");
        setMensaje("");
        setModalAbierto(true);
    };

    const agregarProducto = () => {
        if (!producto) return;
        if (cantidad > producto.stockActual) {
            setMensaje(`❌ Stock insuficiente (${producto.stockActual})`);
            return;
        }

        setProductosSeleccionados(prev => [
            ...prev,
            {
                ...producto,
                cantidad,
                descuento: descuento ? Number(descuento) : 0,
                descDescuento: descDescuento || null
            }
        ]);

        setProducto(null);
        setBusqueda("");
        setCantidad(1);
        setDescuento("");
        setDescDescuento("");
        setMensaje("");
    };

    const registrarVenta = async () => {
        if (!vendedorId || productosSeleccionados.length === 0) {
            setMensaje("⚠️ Completa todos los campos");
            return;
        }

        const fechaVenta = fecha || new Date().toISOString();
        const registros = [];

        productosSeleccionados.forEach(p => {
            for (let i = 0; i < p.cantidad; i++) {
                registros.push({
                    producto_id: p.id,
                    vendedor_id: Number(vendedorId),
                    sucursal_id: Number(sucursal.id),
                    cantidad: 1,
                    precio_unitario: Number(p.precio),
                    total: Number(Math.max(0, p.precio - (p.descuento || 0))),
                    descuento: Number(p.descuento || 0),
                    desc_descuento: p.descDescuento || null,
                    fecha: fechaVenta
                });
            }
        });

        const { error } = await supabase.from("ventas").insert(registros);

        if (!error) {
            for (let p of productosSeleccionados) {
                await supabase.from("inventarios")
                    .update({ stock_actual: p.stockActual - p.cantidad })
                    .eq("producto_id", p.id)
                    .eq("sucursal_id", sucursal.id);
            }

            setMensaje("✅ Ventas registradas");
            setModalAbierto(false);
            cargarVentas(categoriaSeleccionada, vendedorSeleccionado);
        } else setMensaje("❌ Error al registrar: " + JSON.stringify(error));
    };

    return (
        <div className="p-4">
            {/* Categorías */}
            <div className="flex flex-wrap gap-2 mb-2 sticky top-0 bg-white z-50 p-2 shadow justify-center">
                <button
                    onClick={() => seleccionarCategoria(null)}
                    className={`px-4 py-2 rounded-lg transition ${categoriaSeleccionada === null ? "bg-blue-500 text-white" : "bg-blue-100 hover:bg-blue-200"}`}
                >TODO</button>
                {categorias.map(c => (
                    <button
                        key={c.id}
                        onClick={() => seleccionarCategoria(c)}
                        className={`px-4 py-2 rounded-lg transition ${categoriaSeleccionada?.id === c.id ? "bg-blue-500 text-white" : "bg-blue-100 hover:bg-blue-200"}`}
                    >{c.nombre.toUpperCase()}</button>
                ))}
            </div>

            {/* Vendedores */}
            <div className="flex flex-wrap gap-2 mb-4 sticky top-[50px] bg-white z-40 p-2 shadow justify-center">
                <button
                    onClick={() => seleccionarVendedor(null)}
                    className={`px-4 py-2 rounded-lg transition ${vendedorSeleccionado === null ? "bg-green-500 text-white" : "bg-green-100 hover:bg-green-200"}`}
                >TODO</button>
                {vendedores.map(v => (
                    <button
                        key={v.id}
                        onClick={() => seleccionarVendedor(v)}
                        className={`px-4 py-2 rounded-lg transition ${vendedorSeleccionado?.id === v.id ? "bg-green-500 text-white" : "bg-green-100 hover:bg-green-200"}`}
                    >{v.caja.toUpperCase()}</button>
                ))}
            </div>

            {/* Botón Nueva Venta */}
            <div className="flex justify-end mb-2">
                <button onClick={abrirModal} className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded shadow transition">Nueva venta</button>
            </div>

            {/* Tabla de ventas del día */}
            <div className="max-w-4xl mx-auto mt-4 overflow-x-auto">
                {ventas.length === 0 ? (
                    <p className="text-gray-500">No hay ventas registradas hoy.</p>
                ) : (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border p-2 text-left">Código</th>
                                <th className="border p-2 text-left">Producto</th>
                                <th className="border p-2 text-left">Cantidad</th>
                                <th className="border p-2 text-left">Descuento</th>
                                <th className="border p-2 text-left">Descripción</th>
                                <th className="border p-2 text-left">Total</th>
                                <th className="border p-2 text-left">Vendedor</th>
                                <th className="border p-2 text-left">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventas.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-4 text-gray-500">
                                        No hay ventas registradas.
                                    </td>
                                </tr>
                            ) : (
                                ventas.map((v) => (
                                    <tr
                                        key={v.id}
                                        className="hover:bg-gray-50 transition"
                                    >
                                        <td className="px-4 py-2 border-b">{v.producto?.codigo}</td>
                                        <td className="px-4 py-2 border-b">{v.producto?.nombre}</td>
                                        <td className="px-4 py-2 border-b">{v.cantidad}</td>
                                        <td className="px-4 py-2 border-b">{v.descuento}</td>

                                        <td className="px-4 py-2 border-b">{v.desc_descuento}</td>
                                        <td className="px-4 py-2 border-b">Bs. {v.total.toFixed(2)}</td>
                                        <td className="px-4 py-2 border-b">{v.vendedor?.nombre} ({v.vendedor?.caja})</td>
                                        <td className="px-4 py-2 border-b">
                                            {v.fecha.slice(0, 16).replace("T", " ")}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal de Nueva Venta */}
            <AnimatePresence>
                {modalAbierto && (
                    <motion.div
                        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white p-6 rounded-lg shadow-lg w-full max-w-5xl mx-2 max-h-[90vh] overflow-y-auto"
                            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                        >
                            <h3 className="text-2xl font-bold mb-4 text-center">
                                Registrar venta ({categoriaSeleccionada?.nombre || "TODO"})
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block mb-1">Buscar producto (código o nombre)</label>
                                    <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} className="border rounded p-2 w-full" />
                                    {producto && (
                                        <div className="mt-2 border rounded p-2 bg-blue-50 text-sm">
                                            <p><strong>Nombre:</strong> {producto.nombre}</p>
                                            <p><strong>Código:</strong> {producto.codigo}</p>
                                            <p><strong>Precio:</strong> Bs. {producto.precio}</p>
                                            <p><strong>Stock:</strong> {producto.stockActual}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <label>Cantidad:</label>
                                                <input type="number" min="1" value={cantidad} onChange={e => setCantidad(Number(e.target.value))} className="border p-1 w-16" />
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <label>Descuento:</label>
                                                <input type="number" min="0" value={descuento} onChange={e => setDescuento(e.target.value)} className="border p-1 w-20" />
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <label>Descripción descuento:</label>
                                                <input type="text" value={descDescuento} onChange={e => setDescDescuento(e.target.value)} className="border p-1 w-full" />
                                            </div>
                                            <button onClick={agregarProducto} className="mt-2 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded transition">Agregar</button>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block mb-1">Vendedor</label>
                                    <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} className="border rounded p-2 w-full">
                                        <option value="">Selecciona un vendedor</option>
                                        {vendedores.map(v => <option key={v.id} value={v.id}>{v.caja} - {v.nombre}</option>)}
                                    </select>

                                    <div className="mt-2">
                                        <label className="block mb-1">Fecha de venta</label>
                                        <input type="datetime-local" value={fecha} onChange={e => setFecha(e.target.value)} className="border rounded p-2 w-full" />
                                    </div>
                                </div>
                            </div>

                            {/* Productos a registrar */}
                            {productosSeleccionados.length > 0 && (
                                <div className="mb-4 overflow-x-auto">
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="border p-2">Código</th>
                                                <th className="border p-2">Nombre</th>
                                                <th className="border p-2">Cantidad</th>
                                                <th className="border p-2">Descuento</th>
                                                <th className="border p-2">Descripción descuento</th>
                                                <th className="border p-2">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {productosSeleccionados.map((p, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 transition">
                                                    <td className="border p-2">{p.codigo}</td>
                                                    <td className="border p-2">{p.nombre}</td>
                                                    <td className="border p-2">{p.cantidad}</td>
                                                    <td className="border p-2">{p.descuento}</td>
                                                    <td className="border p-2">{p.descDescuento || "-"}</td>
                                                    <td className="border p-2">{(p.precio * p.cantidad - (p.descuento || 0)).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 mt-4">
                                <button onClick={() => setModalAbierto(false)} className="bg-gray-300 hover:bg-gray-400 text-white px-4 py-2 rounded transition">Cancelar</button>
                                <button onClick={registrarVenta} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition">Guardar</button>
                            </div>

                            {mensaje && <p className="mt-2 text-center">{mensaje}</p>}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
