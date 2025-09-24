"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

export default function RegistrarVenta({ sucursal }) {
    const [categorias, setCategorias] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
    const [ventas, setVentas] = useState([]);
    const [vendedores, setVendedores] = useState([]);
    const [producto, setProducto] = useState(null);
    const [codigo, setCodigo] = useState("");
    const [cantidad, setCantidad] = useState(1);
    const [fecha, setFecha] = useState("");
    const [vendedorId, setVendedorId] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [modalAbierto, setModalAbierto] = useState(false);

    // NUEVOS STATES
    const [descuento, setDescuento] = useState(0);
    const [descDescuento, setDescDescuento] = useState("");
    const [mostrarDescuento, setMostrarDescuento] = useState(false);

    // Mostrar todas las ventas del día al inicio si no hay categoría seleccionada
    useEffect(() => {
        if (sucursal) {
            setCategoriaSeleccionada(null);
            cargarVentas(null, true);
        }
    }, [sucursal]);

    // Cargar categorías y vendedores
    useEffect(() => {
        const fetchData = async () => {
            const { data: cats } = await supabase
                .from("categorias")
                .select("*")
                .in("nombre", [
                    "Celulares",
                    "Accesorios",
                    "Imedic",
                    "Productos Naturales",
                    "Suplementos",
                    "Pañuelitos",
                ])
                .order("id", { ascending: true });

            const { data: vends } = await supabase.from("vendedores").select("*");

            setCategorias(cats || []);
            setVendedores(vends || []);
        };
        fetchData();
    }, []);

    // Cargar ventas del día o por categoría
    const cargarVentas = async (categoria, todas = false) => {
        if (!sucursal) return;

        const inicioDia = new Date();
        inicioDia.setHours(0, 0, 0, 0);
        const finDia = new Date();
        finDia.setHours(23, 59, 59, 999);

        const { data, error } = await supabase
            .from("ventas")
            .select(`
                id,
                cantidad,
                precio_unitario,
                descuento,
                desc_descuento,
                fecha,
                producto:producto_id(id,codigo,nombre,categoria_id),
                vendedor:vendedor_id(nombre,caja),
                sucursal_id
            `)
            .gte("fecha", inicioDia.toISOString())
            .lte("fecha", finDia.toISOString())
            .eq("sucursal_id", sucursal.id);

        if (!error && data) {
            const ventasFiltradas = todas
                ? data
                : data.filter(
                    (venta) => Number(venta.producto?.categoria_id) === Number(categoria?.id)
                );
            setVentas(ventasFiltradas);
        }
    };

    const seleccionarCategoria = (cat) => {
        setCategoriaSeleccionada(cat);
        cargarVentas(cat);
    };

    // Buscar producto automáticamente
    useEffect(() => {
        const buscarProducto = async () => {
            if (!categoriaSeleccionada || !sucursal || codigo.trim() === "") {
                setProducto(null);
                return;
            }

            const { data: inventarios, error } = await supabase
                .from("inventarios")
                .select(`stock_actual, producto:producto_id(*)`)
                .eq("sucursal_id", sucursal.id);

            if (error || !inventarios) {
                setProducto(null);
                setMensaje("❌ Error al buscar producto");
                return;
            }

            const prodEncontrado = inventarios.find(
                (inv) =>
                    inv.producto?.codigo?.trim().toUpperCase() === codigo.trim().toUpperCase() &&
                    Number(inv.producto?.categoria_id) === Number(categoriaSeleccionada.id)
            );

            if (!prodEncontrado) {
                setProducto(null);
                setMensaje("❌ Producto no encontrado en esta sucursal/categoría");
            } else {
                setProducto({ ...prodEncontrado.producto, stockActual: prodEncontrado.stock_actual });
                setMensaje("");
                setCantidad(1);
            }
        };

        buscarProducto();
    }, [codigo, categoriaSeleccionada, sucursal]);

    // Registrar venta
    const registrarVenta = async () => {
        if (!producto || !vendedorId || !sucursal || cantidad <= 0) {
            setMensaje("⚠️ Completa todos los campos");
            return;
        }

        if (cantidad > producto.stockActual) {
            setMensaje(`❌ Stock insuficiente. Disponible: ${producto.stockActual}`);
            return;
        }

        const { error } = await supabase.from("ventas").insert([
            {
                producto_id: producto.id,
                vendedor_id: vendedorId,
                sucursal_id: sucursal.id,
                cantidad,
                precio_unitario: producto.precio,
                descuento,
                desc_descuento: descDescuento,
                fecha: fecha || new Date().toISOString(),
            },
        ]);

        if (!error) {
            // Actualizar inventario
            await supabase
                .from("inventarios")
                .update({ stock_actual: producto.stockActual - cantidad })
                .eq("producto_id", producto.id)
                .eq("sucursal_id", sucursal.id);

            setMensaje("✅ Venta registrada con éxito");
            setCodigo("");
            setProducto(null);
            setCantidad(1);
            setVendedorId("");
            setFecha("");
            setDescuento(0);
            setDescDescuento("");
            setMostrarDescuento(false);
            setModalAbierto(false);
            cargarVentas(categoriaSeleccionada);
        } else {
            console.error(error);
            setMensaje("❌ Error al registrar la venta");
        }
    };

    const subtotal = producto ? producto.precio * cantidad : 0;
    const total = Math.max(0, subtotal - descuento);

    return (
        <div className="p-4">
            {/* Selector de categoría */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
                {/* Botón TODO */}
                <button
                    onClick={() => {
                        setCategoriaSeleccionada(null);
                        cargarVentas(null, true);
                    }}
                    className={`px-4 py-2 rounded-lg ${categoriaSeleccionada === null
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 hover:bg-gray-300"
                        }`}
                >
                    TODO
                </button>

                {categorias.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => seleccionarCategoria(cat)}
                        className={`px-4 py-2 rounded-lg ${categoriaSeleccionada?.id === cat.id
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 hover:bg-gray-300"
                            }`}
                    >
                        {cat.nombre.toUpperCase()}
                    </button>
                ))}
            </div>
            {/* Vista de ventas */}
            <div className="max-w-2xl mx-auto relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        {categoriaSeleccionada
                            ? `Ventas de ${categoriaSeleccionada.nombre} en ${sucursal?.nombre} (Mes actual)`
                            : `Ventas de todas las categorías en ${sucursal?.nombre} (Hoy)`}
                    </h2>

                    {/* Botón de nueva venta */}
                    <button
                        onClick={() => setModalAbierto(true)}
                        className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition"
                    >
                        Nueva venta
                    </button>
                </div>

                {ventas.length === 0 ? (
                    <p className="text-gray-500 mb-4">No hay ventas registradas.</p>
                ) : (
                    <ul className="mb-4">
                        {ventas.map((venta) => (
                            <li key={venta.id} className="border p-3 rounded mb-2 flex justify-between">
                                <div>
                                    <p>
                                        <strong>Código:</strong> {venta.producto?.codigo} — <strong>Producto:</strong> {venta.producto?.nombre}
                                    </p>
                                    <p>
                                        <strong>Cantidad:</strong> {venta.cantidad} — <strong>Total:</strong> ${(venta.cantidad * venta.precio_unitario - (venta.descuento || 0)).toFixed(2)}
                                    </p>
                                    {venta.descuento > 0 && (
                                        <p className="text-red-600 text-sm">Descuento: -${venta.descuento} ({venta.desc_descuento})</p>
                                    )}
                                    <p><strong>Vendedor:</strong> {venta.vendedor?.nombre} ({venta.vendedor?.caja})</p>
                                </div>
                                <div className="text-sm text-gray-600">{new Date(venta.fecha).toLocaleDateString()}</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>


            {/* Modal de venta */}
            {modalAbierto && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center min-h-screen">
                    <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-4xl mx-4">
                        <h3 className="text-2xl font-bold mb-6 text-center">
                            Registrar venta ({categoriaSeleccionada?.nombre || "TODO"})
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Código */}
                            <div>
                                <label className="block mb-1">Código del producto</label>
                                <input
                                    type="text"
                                    value={codigo}
                                    onChange={(e) => setCodigo(e.target.value)}
                                    className="border rounded p-2 w-full"
                                />
                                {producto && (
                                    <div className="mt-3 border p-3 rounded text-sm">
                                        <p><strong>Nombre:</strong> {producto.nombre}</p>
                                        <p><strong>Código:</strong> {producto.codigo}</p>
                                        <p><strong>Precio:</strong> ${producto.precio}</p>
                                        <p><strong>Stock:</strong> {producto.stockActual}</p>
                                    </div>
                                )}
                            </div>

                            {/* Vendedor + Fecha */}
                            <div>
                                <label className="block mb-1">Caja / Vendedor</label>
                                <select
                                    value={vendedorId}
                                    onChange={(e) => setVendedorId(e.target.value)}
                                    className="border rounded p-2 w-full"
                                >
                                    <option value="">Selecciona un vendedor</option>
                                    {vendedores.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.caja} - {v.nombre}
                                        </option>
                                    ))}
                                </select>

                                <div className="mt-4">
                                    <label className="block mb-1">Fecha de venta (opcional)</label>
                                    <input
                                        type="datetime-local"
                                        value={fecha}
                                        onChange={(e) => setFecha(e.target.value)}
                                        className="border rounded p-2 w-full"
                                    />
                                </div>
                            </div>

                            {/* Cantidad + Total */}
                            <div>
                                <label className="block mb-1">Cantidad</label>
                                <div className="flex items-center gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setCantidad((prev) => Math.max(1, prev - 1))}
                                        className="px-6 py-2 border rounded-l bg-gray-100 hover:bg-gray-200"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(Number(e.target.value))}
                                        className="border-t border-b p-2 w-20 text-center"
                                        min="1"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setCantidad((prev) => prev + 1)}
                                        className="px-6 py-2 border rounded-r bg-gray-100 hover:bg-gray-200"
                                    >
                                        +
                                    </button>

                                    <div className="flex flex-col">
                                        <span className="text-gray-600 text-sm">Total</span>
                                        <span className="font-semibold text-lg">${total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Descuento */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setMostrarDescuento(!mostrarDescuento)}
                                    className="mb-3 px-4 py-2 border rounded bg-blue-100 hover:bg-blue-200 w-full"
                                >
                                    {mostrarDescuento ? "Ocultar descuento" : "Agregar descuento"}
                                </button>

                                {mostrarDescuento && (
                                    <div className="p-3 border rounded bg-gray-50 space-y-3">
                                        <div>
                                            <label className="block text-sm mb-1">Descuento</label>
                                            <input
                                                type="number"
                                                value={descuento}
                                                onChange={(e) => setDescuento(Number(e.target.value))}
                                                className="border rounded p-2 w-full"
                                                min="0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1">Descripción</label>
                                            <input
                                                type="text"
                                                value={descDescuento}
                                                onChange={(e) => setDescDescuento(e.target.value)}
                                                className="border rounded p-2 w-full"
                                                placeholder="Ej: Cliente frecuente, producto dañado..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-between mt-6">
                            <button
                                onClick={() => setModalAbierto(false)}
                                className="bg-gray-400 text-white px-4 py-2 rounded"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={registrarVenta}
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
