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
    const [descuento, setDescuento] = useState("");
    const [descDescuento, setDescDescuento] = useState("");
    const [mostrarDescuento, setMostrarDescuento] = useState(false);
    const [vendedorSeleccionado, setVendedorSeleccionado] = useState(null);

    // Mostrar todas las ventas del día al inicio
    useEffect(() => {
        if (sucursal) {
            setCategoriaSeleccionada(null);
            setVendedorSeleccionado(null);
            cargarVentas(null, true, null);
        }
    }, [sucursal]);

    // Cargar categorías y vendedores
    useEffect(() => {
        const fetchData = async () => {
            const { data: cats } = await supabase
                .from("categorias")
                .select("*")
                .order("id", { ascending: true });

            const { data: vends } = await supabase
                .from("vendedores")
                .select("*")
                .eq("sucursal_id", sucursal.id);

            setCategorias(cats || []);
            setVendedores(vends || []);
        };
        fetchData();
    }, [sucursal]);

    // Cargar ventas
    const cargarVentas = async (categoria = null, todas = false, vendedor = null) => {
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
          vendedor:vendedor_id(id,nombre,caja),
          sucursal_id,
          total
      `)
            .gte("fecha", inicioDia.toISOString())
            .lte("fecha", finDia.toISOString())
            .eq("sucursal_id", sucursal.id)
            .order("fecha", { ascending: true });

        if (!error && data) {
            let ventasFiltradas = data;

            if (!todas && categoria) {
                ventasFiltradas = ventasFiltradas.filter(
                    (venta) => Number(venta.producto?.categoria_id) === Number(categoria.id)
                );
            }

            if (vendedor) {
                ventasFiltradas = ventasFiltradas.filter(
                    (venta) => Number(venta.vendedor?.id) === Number(vendedor.id)
                );
            }

            setVentas(ventasFiltradas);
        }
    };

    const seleccionarCategoria = (cat) => {
        setCategoriaSeleccionada(cat);
        cargarVentas(cat, cat === null, vendedorSeleccionado);
    };

    const seleccionarVendedor = (vend) => {
        setVendedorSeleccionado(vend);
        cargarVentas(categoriaSeleccionada, categoriaSeleccionada === null, vend);
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

        const subtotal = producto.precio * cantidad;
        const total = Math.max(0, subtotal - (descuento || 0));

        const { error } = await supabase.from("ventas").insert([
            {
                producto_id: producto.id,
                vendedor_id: vendedorId,
                sucursal_id: sucursal.id,
                cantidad,
                precio_unitario: producto.precio,
                total,
                descuento: descuento || 0,
                desc_descuento,
                fecha: fecha || new Date().toISOString(),
            },
        ]);

        if (!error) {
            await supabase
                .from("inventarios")
                .update({ stock_actual: producto.stockActual - cantidad })
                .eq("producto_id", producto.id)
                .eq("sucursal_id", sucursal.id);

            setMensaje("✅ Venta registrada con éxito");

            // Limpiar modal después de guardar
            abrirModal();
            setModalAbierto(false);
            cargarVentas(categoriaSeleccionada, categoriaSeleccionada === null, vendedorSeleccionado);
        } else {
            console.error(error);
            setMensaje("❌ Error al registrar la venta");
        }
    };

    const subtotal = producto ? producto.precio * cantidad : 0;
    const total = Math.max(0, subtotal - (descuento || 0));

    const abrirModal = () => {
        setCodigo("");
        setProducto(null);
        setCantidad(1);
        setVendedorId("");
        setFecha(
            new Date().toLocaleString("sv-SE", { timeZone: "America/La_Paz" }).slice(0, 16)
        ); // Formato YYYY-MM-DDTHH:mm
        setDescuento("");
        setDescDescuento("");
        setMostrarDescuento(false);
        setMensaje("");
        setModalAbierto(true);
    };

    return (
        <div className="p-2">
            {/* Selector de categoría */}
            <div className="text-xl font-bold mb-1 sticky top-0 bg-white z-50 px-2 p-1">
                <h3>
                    Registro de Ventas
                </h3>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mb-1 sticky top-0 bg-white z-50 p-2">
                <button
                    onClick={() => seleccionarCategoria(null)}
                    className={`px-4 py-2 rounded-lg ${categoriaSeleccionada === null ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                >
                    TODO
                </button>

                {categorias.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => seleccionarCategoria(cat)}
                        className={`px-4 py-2 rounded-lg ${categoriaSeleccionada?.id === cat.id ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                    >
                        {cat.nombre.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Filtro por vendedores */}
            <div className="flex flex-wrap gap-2 justify-center mb-2 sticky top-[50px] bg-white z-40 p-2">
                <button
                    onClick={() => seleccionarVendedor(null)}
                    className={`px-4 py-2 rounded-lg ${vendedorSeleccionado === null ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                >
                    TODO
                </button>

                {vendedores.map((v) => (
                    <button
                        key={v.id}
                        onClick={() => seleccionarVendedor(v)}
                        className={`px-4 py-2 rounded-lg ${vendedorSeleccionado?.id === v.id ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                    >
                        {v.caja.toUpperCase()}
                    </button>
                ))}
            </div>



            {/* Vista de ventas */}
            <div className="max-w-2xl mx-auto relative">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">
                        {categoriaSeleccionada
                            ? `Ventas de ${categoriaSeleccionada.nombre} en ${sucursal?.nombre} (Hoy)`
                            : `Ventas de todas las categorías en ${sucursal?.nombre} (Hoy)`}
                    </h2>

                    <button
                        onClick={abrirModal}
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
                                        <strong>Código:</strong> {venta.producto?.codigo} — <strong>Vendedor:</strong> {venta.vendedor?.nombre} ({venta.vendedor?.caja})
                                    </p>
                                    <p>
                                        <strong>Cantidad:</strong> {venta.cantidad} — <strong>Total:</strong> Bs. {(venta.total ?? (venta.cantidad * venta.precio_unitario - (venta.descuento || 0))).toFixed(2)}
                                    </p>
                                    {venta.descuento > 0 && (
                                        <p className="text-red-600 text-sm">Descuento: -Bs. {venta.descuento} ({venta.desc_descuento})</p>
                                    )}
                                    <p>
                                        <strong>Producto:</strong> {venta.producto?.nombre}
                                    </p>
                                </div>
                                <div className="text-sm text-gray-600">
                                    {new Date(venta.fecha).toLocaleString("es-ES", { timeZone: "America/La_Paz", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </div>
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
                                    <label className="block mb-1">Fecha de venta</label>
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
                                                onChange={(e) => setDescuento(e.target.value === "" ? "" : Number(e.target.value))}
                                                className="border rounded p-2 w-full"
                                                min="0"
                                                placeholder="0"
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
