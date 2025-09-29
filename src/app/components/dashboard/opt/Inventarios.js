"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";

export default function Inventarios({ sucursal, sucursales = [] }) {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [categoriaFiltro, setCategoriaFiltro] = useState("");

    // Modales
    const [modalIngreso, setModalIngreso] = useState(false);
    const [modalNuevo, setModalNuevo] = useState(false);
    const [modalGestion, setModalGestion] = useState(false);
    const [modalTraslado, setModalTraslado] = useState(false);
    const [modalEditar, setModalEditar] = useState(false);

    // Ingreso múltiple
    const [busqueda, setBusqueda] = useState(""); // para modalIngreso
    const [productosCantidad, setProductosCantidad] = useState({}); // { [productoId]: cantidad }

    // Nuevo producto
    const [codigo, setCodigo] = useState("");
    const [nombre, setNombre] = useState("");
    const [descripcion, setDescripcion] = useState("");
    const [categoriaId, setCategoriaId] = useState("");
    const [precio, setPrecio] = useState("");
    const [costo, setCosto] = useState("");
    const [stockInicial, setStockInicial] = useState("");
    const [codigoError, setCodigoError] = useState("");

    // Gestión
    const [modalBusqueda, setModalBusqueda] = useState("");
    const [modalCategoria, setModalCategoria] = useState("");

    // Modal editar producto
    const [productoEditar, setProductoEditar] = useState(null);

    // Traslado
    const [buscarProducto, setBuscarProducto] = useState("");
    const [cantidadesTraslado, setCantidadesTraslado] = useState({});
    const [sucursalDestino, setSucursalDestino] = useState("");

    useEffect(() => {
        if (sucursal) {
            fetchProductos();
            fetchCategorias();
        }
    }, [sucursal]);

    const fetchProductos = async () => {
        const { data, error } = await supabase
            .from("inventarios")
            .select(
                "id, stock_actual, stock_minimo, productos(id, codigo, nombre, precio, categoria_id, categorias(nombre))"
            )
            .eq("sucursal_id", sucursal.id);

        if (!error && data) {
            setProductos(data.sort((a, b) => a.productos.codigo.localeCompare(b.productos.codigo)));
        }
    };

    const fetchCategorias = async () => {
        const { data, error } = await supabase.from("categorias").select("*");
        if (!error && data) setCategorias(data);
    };

    /*** FUNCIONES ***/
    const abrirEditarProducto = (producto) => {
        setProductoEditar({
            id: producto.productos.id,
            codigo: producto.productos.codigo,
            nombre: producto.productos.nombre,
            descripcion: producto.productos.descripcion || "",
            categoria_id: producto.productos.categoria_id,
            precio: producto.productos.precio,
            costo: producto.productos.costo || 0,
        });
        setModalEditar(true);
    };

    const guardarEdicionProducto = async () => {
        if (!productoEditar.codigo || !productoEditar.nombre || !productoEditar.categoria_id || !productoEditar.precio) return;

        const { error } = await supabase
            .from("productos")
            .update({
                codigo: productoEditar.codigo,
                nombre: productoEditar.nombre,
                descripcion: productoEditar.descripcion,
                categoria_id: productoEditar.categoria_id,
                precio: productoEditar.precio,
                costo: productoEditar.costo,
            })
            .eq("id", productoEditar.id);

        if (error) {
            console.error("Error al editar producto:", error);
            return;
        }

        fetchProductos();
        setModalEditar(false);
        setProductoEditar(null);
    };

    const eliminarProducto = async (productoId) => {
        if (!confirm("⚠️ ¿Seguro que deseas eliminar este producto?")) return;

        await supabase.from("inventarios").delete().eq("producto_id", productoId);
        const { error } = await supabase.from("productos").delete().eq("id", productoId);

        if (error) {
            console.error("Error al eliminar producto:", error.message || error);
            return;
        }

        fetchProductos();
    };

    const registrarIngresoMultipleIndividual = async () => {
        const productosAIngresar = Object.entries(productosCantidad)
            .filter(([_, cantidad]) => cantidad > 0);

        if (productosAIngresar.length === 0) return;

        const { data: movimiento, error } = await supabase
            .from("movimientos")
            .insert({
                sucursal_destino: sucursal.id,
                tipo: "ingreso",
            })
            .select()
            .single();

        if (error) {
            console.error(error);
            return;
        }

        for (let [productoId, cantidad] of productosAIngresar) {
            await supabase.from("movimientos_detalle").insert({
                movimiento_id: movimiento.id,
                producto_id: productoId,
                cantidad,
            });

            const { data: inventario } = await supabase
                .from("inventarios")
                .select("id, stock_actual")
                .eq("producto_id", productoId)
                .eq("sucursal_id", sucursal.id)
                .single();

            if (inventario) {
                await supabase
                    .from("inventarios")
                    .update({ stock_actual: inventario.stock_actual + cantidad })
                    .eq("id", inventario.id);
            }
        }

        fetchProductos();
        setModalIngreso(false);
        setBusqueda("");
        setProductosCantidad({});
    };

    const registrarTrasladoMultiple = async () => {
        if (!sucursalDestino) return;

        const productosSeleccionados = Object.entries(cantidadesTraslado)
            .filter(([id, qty]) => qty && qty > 0);

        if (productosSeleccionados.length === 0) {
            alert("Seleccione al menos un producto con cantidad válida");
            return;
        }

        for (const [productoId, cantidad] of productosSeleccionados) {
            const { data: movimiento, error } = await supabase
                .from("movimientos")
                .insert({
                    sucursal_origen: sucursal.id,
                    sucursal_destino: parseInt(sucursalDestino),
                    tipo: "traslado",
                    observaciones: `Traslado de ${cantidad} unidades`,
                })
                .select()
                .single();

            if (error) {
                console.error(error);
                continue;
            }

            await supabase.from("movimientos_detalle").insert({
                movimiento_id: movimiento.id,
                producto_id: parseInt(productoId),
                cantidad: parseInt(cantidad),
            });

            const { data: inventarioOrigen } = await supabase
                .from("inventarios")
                .select("id, stock_actual")
                .eq("producto_id", productoId)
                .eq("sucursal_id", sucursal.id)
                .single();

            if (inventarioOrigen) {
                await supabase
                    .from("inventarios")
                    .update({ stock_actual: inventarioOrigen.stock_actual - parseInt(cantidad) })
                    .eq("id", inventarioOrigen.id);
            }

            const { data: inventarioDestino } = await supabase
                .from("inventarios")
                .select("id, stock_actual")
                .eq("producto_id", productoId)
                .eq("sucursal_id", parseInt(sucursalDestino))
                .single();

            if (inventarioDestino) {
                await supabase
                    .from("inventarios")
                    .update({ stock_actual: inventarioDestino.stock_actual + parseInt(cantidad) })
                    .eq("id", inventarioDestino.id);
            } else {
                await supabase.from("inventarios").insert({
                    producto_id: parseInt(productoId),
                    sucursal_id: parseInt(sucursalDestino),
                    stock_actual: parseInt(cantidad),
                });
            }
        }

        fetchProductos();
        setModalTraslado(false);
        setBuscarProducto("");
        setCantidadesTraslado({});
        setSucursalDestino("");
    };


    return (
        <div className="p-4">
            {/* Botones principales */}
            <div className="flex gap-4 mb-4">
                <button onClick={() => setModalIngreso(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg">Ingreso</button>
                <button onClick={() => setModalNuevo(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Nuevo Producto</button>
                <button onClick={() => setModalGestion(true)} className="px-4 py-2 bg-red-600 text-white rounded-lg">Gestión de Productos</button>
                <button onClick={() => setModalTraslado(true)} className="px-4 py-2 bg-purple-600 text-white rounded-lg">Traslado</button>
                <select value={categoriaFiltro} onChange={e => setCategoriaFiltro(e.target.value)} className="border p-2 rounded">
                    <option value="">Todas las categorías</option>
                    {categorias.map(c => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                </select>
            </div>

            {/* Tabla de inventario */}
            <table className="w-full bg-white rounded-lg shadow">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="p-2 text-left">Código</th>
                        <th className="p-2 text-left">Producto</th>
                        <th className="p-2 text-left">Categoría</th>
                        <th className="p-2 text-left">Precio</th>
                        <th className="p-2 text-center">Stock Actual</th>
                    </tr>
                </thead>
                <tbody>
                    {productos
                        .filter(p => !categoriaFiltro || p.productos.categoria_id === parseInt(categoriaFiltro))
                        .map(p => (

                            <tr key={p.id} className="border-t">
                                <td className="p-2 w-1/9">{p.productos.codigo}</td>
                                <td className="p-2 w-3/8">{p.productos.nombre}</td>
                                <td className="p-2 ">{p.productos.categorias?.nombre}</td>
                                <td className="p-2 text-left">Bs. {p.productos.precio}</td>
                                <td className="p-2 text-center">
                                    <span
                                        className={
                                            p.stock_actual <= p.stock_minimo
                                                ? "text-red-600 font-bold"
                                                : "text-green-600 font-semibold"
                                        }
                                    >
                                        {p.stock_actual}
                                    </span>
                                    {p.stock_actual <= p.stock_minimo && (
                                        <span className="ml-2">⚠️</span>
                                    )}
                                </td>

                            </tr>
                        ))}
                </tbody>
            </table>
            {/*Modal de ingresos a productos existentes */}
            {modalIngreso && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-[800px] max-h-[90vh] min-h-[600px] flex flex-col">
                        <h2 className="text-lg font-bold mb-2">Registrar Ingreso Múltiple</h2>

                        {/* Filtros */}
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="Buscar por código o nombre"
                                value={busqueda}
                                onChange={e => setBusqueda(e.target.value)}
                                className="flex-1 border p-2"
                            />
                            <select
                                value={categoriaFiltro || ""}
                                onChange={e => setCategoriaFiltro(e.target.value)}
                                className="border p-2"
                            >
                                <option value="">Todas las categorías</option>
                                {categorias.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tabla filtrada */}
                        <div className="flex-1 min-h-[200px] overflow-auto border mb-2">
                            <table className="table-auto border-collapse border border-gray-400 w-full text-left">
                                <thead className="bg-gray-200 sticky top-0 z-10 text-center">
                                    <tr className="table w-full table-fixed">
                                        <th className="border border-gray-400 px-2 py-1 w-1/6">Código</th>
                                        <th className="border border-gray-400 px-2 py-1 w-3/6">Producto</th>
                                        <th className="border border-gray-400 px-2 py-1 w-1/6">Stock Actual</th>
                                        <th className="border border-gray-400 px-2 py-1 w-1/6">Cantidad a Ingresa</th>
                                    </tr>
                                </thead>
                                <tbody className="block overflow-auto w-full min-h-[100px]">
                                    {productos
                                        .filter(p =>
                                            (!categoriaFiltro || p.productos.categoria_id === parseInt(categoriaFiltro)) &&
                                            (p.productos.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                                                p.productos.codigo.toLowerCase().includes(busqueda.toLowerCase()))
                                        )
                                        .map(p => (
                                            <tr key={p.productos.id} className="table w-full table-fixed">
                                                <td className="border border-gray-400 px-2 py-1 w-1/6">{p.productos.codigo}</td>
                                                <td className="border border-gray-400 px-2 py-1 w-3/6">{p.productos.nombre}</td>
                                                <td className="border border-gray-400 px-2 py-1 w-1/6 text-center">{p.stock_actual}</td>

                                                <td className="border border-gray-400 px-2 py-1 w-1/6 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={productosCantidad[p.productos.id] || ""}
                                                        onWheel={e => e.target.blur()}
                                                        onChange={e =>
                                                            setProductosCantidad({
                                                                ...productosCantidad,
                                                                [p.productos.id]:
                                                                    e.target.value === "" ? "" : parseInt(e.target.value),
                                                            })
                                                        }
                                                        className="w-20 border p-1 appearance-none"
                                                        onKeyDown={e => {
                                                            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                                                e.preventDefault(); // evita cambiar valor con flechas
                                                            }
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}

                                    {/* Mensaje si no hay resultados */}
                                    {productos.filter(p =>
                                        (!categoriaFiltro || p.productos.categoria_id === parseInt(categoriaFiltro)) &&
                                        (p.productos.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                                            p.productos.codigo.toLowerCase().includes(busqueda.toLowerCase()))
                                    ).length === 0 && (
                                            <tr className="table w-full table-fixed">
                                                <td colSpan={3} className="p-4 text-center text-gray-500">
                                                    No se encontraron productos.
                                                </td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                            <button
                                onClick={() => {
                                    setModalIngreso(false);
                                    setBusqueda("");
                                    setProductosCantidad({});
                                }}
                                className="px-4 py-2 bg-gray-300 rounded"
                            >
                                Cancelar
                            </button>
                            <button onClick={registrarIngresoMultipleIndividual} className="px-4 py-2 bg-green-600 text-white rounded">
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Nuevo Producto */}
            {modalNuevo && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-[800px] max-h-[80vh] min-h-[450px] flex flex-col overflow-auto">
                        <h2 className="text-lg font-bold mb-4">Nuevo Producto</h2>

                        {/* ALERTA DE ERROR */}
                        {codigoError && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-200 flex items-center mb-4">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{codigoError}</span>
                            </div>
                        )}

                        <div className="flex flex-col gap-4">
                            {/* Nombre */}
                            <div className="flex flex-col w-full">
                                <span className="text-gray-700 mb-1">Nombre</span>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={e => setNombre(e.target.value.toUpperCase())}
                                    className="w-full border p-2 rounded"
                                />
                            </div>

                            {/* Descripción */}
                            <div className="flex flex-col w-full">
                                <span className="text-gray-700 mb-1">Descripción</span>
                                <textarea
                                    value={descripcion}
                                    onChange={e => setDescripcion(e.target.value.toUpperCase())}
                                    className="w-full border p-2 rounded h-28 resize-none"
                                />
                            </div>

                            {/* Fila de inputs cortos */}
                            <div className="flex flex-wrap gap-4">
                                {/* Código */}
                                <div className="flex flex-col flex-1 min-w-[120px] max-w-[200px]">
                                    <span className="text-gray-700 mb-1">Código</span>
                                    <input
                                        type="text"
                                        value={codigo}
                                        onChange={async e => {
                                            let value = e.target.value.toUpperCase();
                                            setCodigo(value);

                                            if (/\s/.test(value)) {
                                                setCodigoError("⚠️ El código no puede contener espacios.");
                                                return;
                                            } else {
                                                setCodigoError("");
                                            }

                                            if (!value) return;

                                            const { data: existing } = await supabase
                                                .from("productos")
                                                .select("id")
                                                .eq("codigo", value)
                                                .single();

                                            if (existing) {
                                                setCodigoError("⚠️ Este código ya existe.");
                                            } else {
                                                setCodigoError("");
                                            }
                                        }}
                                        className={`w-full border p-2 rounded ${codigoError ? "border-red-500" : ""}`}
                                    />
                                </div>

                                {/* Categoría */}
                                <div className="flex flex-col flex-1 min-w-[120px] max-w-[200px]">
                                    <span className="text-gray-700 mb-1">Categoría</span>
                                    <select
                                        value={categoriaId}
                                        onChange={e => setCategoriaId(e.target.value.toUpperCase())}
                                        className="w-full border p-2 rounded"
                                    >
                                        <option value="">Seleccione categoría</option>
                                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre.toUpperCase()}</option>)}
                                    </select>
                                </div>

                                {/* Precio */}
                                <div className="flex flex-col flex-1 min-w-[100px] max-w-[150px]">
                                    <span className="text-gray-700 mb-1">Precio</span>
                                    <input
                                        type="number"
                                        value={precio}
                                        onChange={e => setPrecio(e.target.value)}
                                        className="w-full border p-2 rounded"
                                    />
                                </div>

                                {/* Costo */}
                                <div className="flex flex-col flex-1 min-w-[100px] max-w-[150px]">
                                    <span className="text-gray-700 mb-1">Costo</span>
                                    <input
                                        type="number"
                                        value={costo}
                                        onChange={e => setCosto(e.target.value)}
                                        className="w-full border p-2 rounded"
                                    />
                                </div>

                                {/* Stock inicial */}
                                <div className="flex flex-col flex-1 min-w-[100px] max-w-[150px]">
                                    <span className="text-gray-700 mb-1">Stock inicial</span>
                                    <input
                                        type="number"
                                        value={stockInicial}
                                        onChange={e => setStockInicial(e.target.value === "" ? "" : parseInt(e.target.value))}
                                        className="w-full border p-2 rounded"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => {
                                setCodigo("");
                                setNombre("");
                                setDescripcion("");
                                setCategoriaId("");
                                setPrecio("");
                                setCosto("");
                                setStockInicial("");
                                setModalNuevo(false)
                            }
                            } className="px-4 py-2 bg-gray-300 rounded">Cancelar</button>
                            <button
                                onClick={async () => {
                                    const nuevoCodigo = codigo.trim().toUpperCase();

                                    if (codigoError || !nuevoCodigo || !nombre || !categoriaId || !precio) {
                                        setCodigoError("⚠️ Complete todos los campos obligatorios correctamente.");
                                        return;
                                    }

                                    const { data: nuevoProducto, error } = await supabase
                                        .from("productos")
                                        .insert({
                                            codigo: nuevoCodigo,
                                            nombre,
                                            descripcion,
                                            categoria_id: categoriaId,
                                            precio,
                                            costo,
                                        })
                                        .select()
                                        .single();

                                    if (error) {
                                        setCodigoError("⚠️ Error al crear el producto.");
                                        console.error("Error al insertar producto:", error);
                                        return;
                                    }

                                    await supabase.from("inventarios").insert({
                                        producto_id: nuevoProducto.id,
                                        sucursal_id: sucursal.id,
                                        stock_actual: stockInicial ? parseInt(stockInicial) : 0,
                                    });

                                    fetchProductos();
                                    setModalNuevo(false);
                                    setCodigo("");
                                    setNombre("");
                                    setDescripcion("");
                                    setCategoriaId("");
                                    setPrecio("");
                                    setCosto("");
                                    setStockInicial("");
                                    setCodigoError("");
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded"
                                disabled={!!codigoError || !codigo}
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {modalGestion && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-[1000px] max-h-[80vh] min-h-[80vh] flex flex-col">
                        <h2 className="text-lg font-bold mb-4">Gestión de Productos</h2>

                        {/* Filtros */}
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Buscar por código o nombre"
                                value={modalBusqueda}
                                onChange={e => setModalBusqueda(e.target.value)}
                                className="flex-1 border p-2 rounded"
                            />
                            <select
                                value={modalCategoria}
                                onChange={e => setModalCategoria(e.target.value)}
                                className="border p-2 rounded"
                            >
                                <option value="">Todas las categorías</option>
                                {categorias.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tabla de productos */}
                        <div className="flex-1 overflow-auto border rounded min-h-[200px]">
                            <table className="w-full table-auto border-collapse border border-gray-400">
                                <thead className="bg-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-2 text-left border border-gray-400 w-1/9">Código</th>
                                        <th className="p-2 text-left border border-gray-400 w-4/9">Nombre</th>
                                        <th className="p-2 text-center border border-gray-400 w-1/9">Categoría</th>
                                        <th className="p-2 text-center border border-gray-400 w-1/9">Stock Actual</th>
                                        <th className="p-2 text-center border border-gray-400 w-2/9">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="min-h-[200px]">
                                    {productos
                                        .filter(p =>
                                            (!modalCategoria || p.productos.categoria_id === parseInt(modalCategoria)) &&
                                            (p.productos.nombre.toLowerCase().includes(modalBusqueda.toLowerCase()) ||
                                                p.productos.codigo.toLowerCase().includes(modalBusqueda.toLowerCase()))
                                        )
                                        .map(p => (
                                            <tr key={p.productos.id} className="border-t">
                                                <td className="p-2 border border-gray-400 text-left">{p.productos.codigo}</td>
                                                <td className="p-2 border border-gray-400 text-left">{p.productos.nombre}</td>
                                                <td className="p-2 border border-gray-400 text-center">{p.productos.categorias?.nombre}</td>
                                                <td className="p-2 border border-gray-400 text-center">{p.stock_actual}</td>
                                                <td className="p-2 text-center">
                                                    <button
                                                        onClick={() => abrirEditarProducto(p)}
                                                        className="px-3 py-1 bg-yellow-500 text-white rounded mr-2"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => eliminarProducto(p.productos.id)}
                                                        className="px-3 py-1 bg-red-600 text-white rounded"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                    {/* Mantener altura aunque no haya productos */}
                                    {productos.filter(p =>
                                        (!modalCategoria || p.productos.categoria_id === parseInt(modalCategoria)) &&
                                        (p.productos.nombre.toLowerCase().includes(modalBusqueda.toLowerCase()) ||
                                            p.productos.codigo.toLowerCase().includes(modalBusqueda.toLowerCase()))
                                    ).length === 0 && (
                                            <tr className="h-[200px]">
                                                <td colSpan={5} className="p-4 text-center text-gray-500">
                                                    No se encontraron productos.
                                                </td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => {
                                    setModalGestion(false);
                                    setModalBusqueda("");
                                    setModalCategoria("");
                                }}
                                className="px-4 py-2 bg-gray-300 rounded"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/**modal editar dentro de modal gestiones */}
            {modalEditar && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-[800px] max-h-[80vh] min-h-[450px] flex flex-col overflow-auto">
                        <h2 className="text-lg font-bold mb-4">Editar Producto</h2>

                        <div className="flex flex-col gap-4">
                            {/* Nombre */}
                            <div className="flex flex-col w-full">
                                <span className="text-gray-700 mb-1">Nombre</span>
                                <input
                                    type="text"
                                    value={productoEditar.nombre}
                                    onChange={e => setProductoEditar({ ...productoEditar, nombre: e.target.value.toUpperCase() })}
                                    className="w-full border p-2 rounded"
                                />
                            </div>

                            {/* Descripción */}
                            <div className="flex flex-col w-full">
                                <span className="text-gray-700 mb-1">Descripción</span>
                                <textarea
                                    value={productoEditar.descripcion}
                                    onChange={e => setProductoEditar({ ...productoEditar, descripcion: e.target.value.toUpperCase() })}
                                    className="w-full border p-2 rounded h-28 resize-none"
                                />
                            </div>

                            {/* Fila de inputs cortos: Código, Categoría, Precio */}
                            <div className="flex flex-wrap gap-4">
                                {/* Código */}
                                <div className="flex flex-col flex-1 min-w-[120px] max-w-[200px]">
                                    <span className="text-gray-700 mb-1">Código</span>
                                    <input
                                        type="text"
                                        value={productoEditar.codigo}
                                        onChange={e => setProductoEditar({ ...productoEditar, codigo: e.target.value.toUpperCase() })}
                                        className="w-full border p-2 rounded"
                                    />
                                </div>

                                {/* Categoría */}
                                <div className="flex flex-col flex-1 min-w-[120px] max-w-[200px]">
                                    <span className="text-gray-700 mb-1">Categoría</span>
                                    <select
                                        value={productoEditar.categoria_id}
                                        onChange={e => setProductoEditar({ ...productoEditar, categoria_id: e.target.value })}
                                        className="w-full border p-2 rounded"
                                    >
                                        <option value="">Seleccione categoría</option>
                                        {categorias.map(c => (
                                            <option key={c.id} value={c.id}>{c.nombre.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Precio */}
                                <div className="flex flex-col flex-1 min-w-[100px] max-w-[150px]">
                                    <span className="text-gray-700 mb-1">Precio</span>
                                    <input
                                        type="number"
                                        value={productoEditar.precio}
                                        onChange={e => setProductoEditar({ ...productoEditar, precio: e.target.value })}
                                        className="w-full border p-2 rounded"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Botones al final */}
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setModalEditar(false)}
                                className="px-4 py-2 bg-gray-300 rounded"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={guardarEdicionProducto}
                                className="px-4 py-2 bg-yellow-500 text-white rounded"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {modalTraslado && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg w-[800px] max-h-[90vh] min-h-[600px] flex flex-col">
                        <h2 className="text-lg font-bold mb-2">Traslado de Productos</h2>

                        {/* Filtros */}
                        <div className="flex gap-2 mb-2">
                            <input
                                type="text"
                                placeholder="Ingrese código o nombre de producto."
                                className="flex-1 border p-2"
                                value={buscarProducto}
                                onChange={e => setBuscarProducto(e.target.value)}
                            />
                            <select
                                value={categoriaFiltro || ""}
                                onChange={e => setCategoriaFiltro(e.target.value)}
                                className="border p-2"
                            >
                                <option value="">Todas las categorías</option>
                                {categorias.map(c => (
                                    <option key={c.id} value={c.id}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tabla filtrada */}
                        <div className="flex-1 min-h-[200px] overflow-auto border">
                            <table className="table-auto border-collapse border border-gray-400 w-full text-left">
                                <thead className="bg-gray-200 sticky top-0 z-10 text-center">
                                    <tr className="table w-full table-fixed">
                                        <th className="border border-gray-400 px-2 py-1 w-1/6">Código</th>
                                        <th className="border border-gray-400 px-2 py-1 w-3/6">Nombre</th>
                                        <th className="border border-gray-400 px-2 py-1 w-1/6">Stock actual</th>
                                        <th className="border border-gray-400 px-2 py-1 w-1/6">Cantidad a Trasladar</th>
                                    </tr>
                                </thead>

                                <tbody className="block overflow-auto w-full min-h-[100px]">
                                    {productos
                                        .filter(p =>
                                            (!categoriaFiltro || p.productos.categoria_id === parseInt(categoriaFiltro)) &&
                                            (p.productos.nombre.toLowerCase().includes(buscarProducto.toLowerCase()) ||
                                                p.productos.codigo.toLowerCase().includes(buscarProducto.toLowerCase()))
                                        )
                                        .map(p => (
                                            <tr key={p.productos.id} className="table w-full table-fixed">
                                                <td className="border border-gray-400 px-2 py-1 w-1/6">{p.productos.codigo}</td>
                                                <td className="border border-gray-400 px-2 py-1 w-3/6">{p.productos.nombre}</td>
                                                <td className="border border-gray-400 px-2 py-1 w-1/6 text-center">{p.stock_actual}</td>
                                                <td className="border border-gray-400 px-2 py-1 w-1/6 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder=""
                                                        value={cantidadesTraslado[p.productos.id] || ""}
                                                        onChange={e =>
                                                            setCantidadesTraslado({
                                                                ...cantidadesTraslado,
                                                                [p.productos.id]:
                                                                    e.target.value === "" ? "" : parseInt(e.target.value),
                                                            })
                                                        }
                                                        className="w-20 border p-1 appearance-none"
                                                        onWheel={e => e.target.blur()} // evita cambio con la rueda del mouse
                                                        onKeyDown={e => {
                                                            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                                                                e.preventDefault(); // evita cambiar valor con flechas
                                                            }
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}

                                    {/* Mensaje si no hay resultados */}
                                    {productos.filter(p =>
                                        (!categoriaFiltro || p.productos.categoria_id === parseInt(categoriaFiltro)) &&
                                        (p.productos.nombre.toLowerCase().includes(buscarProducto.toLowerCase()) ||
                                            p.productos.codigo.toLowerCase().includes(buscarProducto.toLowerCase()))
                                    ).length === 0 && (
                                            <tr className="table w-full table-fixed">
                                                <td colSpan={4} className="p-4 text-center text-gray-500">
                                                    No se encontraron productos.
                                                </td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                        </div>

                        {/* Sucursal destino */}
                        <select
                            value={sucursalDestino || ""}
                            onChange={(e) => setSucursalDestino(e.target.value)}
                            className="w-full border p-2 mb-2 mt-2 "
                        >
                            <option value="">Seleccione sucursal destino</option>
                            {sucursales
                                .filter((s) => s.id !== sucursal.id)
                                .map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.nombre}
                                    </option>
                                ))}
                        </select>

                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => {
                                setModalTraslado(false)
                                setBuscarProducto("");
                                setCantidadesTraslado({});
                            }
                            } className="px-4 py-2 bg-gray-300 rounded">Cancelar</button>
                            <button onClick={registrarTrasladoMultiple} className="px-4 py-2 bg-purple-600 text-white rounded">Guardar</button>
                        </div>
                    </div>
                </div>
            )
            }

        </div >
    );
}
