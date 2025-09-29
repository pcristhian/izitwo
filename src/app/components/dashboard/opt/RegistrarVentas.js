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
                total,
                producto:productos(id,codigo,nombre,categoria_id,categorias(nombre)),
                vendedor:vendedores(id,nombre,caja),
                sucursal_id
            `)
            .gte("fecha", inicioDia.toISOString())
            .lte("fecha", finDia.toISOString())
            .eq("sucursal_id", sucursal.id)
            .order("fecha", { ascending: false });

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
                .select(`stock_actual, productos(id,codigo,nombre,precio,categoria_id,categorias(nombre))`)
                .eq("sucursal_id", sucursal.id);

            if (error || !inventarios) {
                setProducto(null);
                setMensaje("❌ Error al buscar producto");
                return;
            }

            const prodEncontrado = inventarios.find(
                (inv) =>
                    inv.productos?.codigo?.trim().toUpperCase() === codigo.trim().toUpperCase() &&
                    Number(inv.productos?.categoria_id) === Number(categoriaSeleccionada.id)
            );

            if (!prodEncontrado) {
                setProducto(null);
                setMensaje("❌ Producto no encontrado en esta sucursal/categoría");
            } else {
                setProducto({ ...prodEncontrado.productos, stockActual: prodEncontrado.stock_actual });
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
        // Aquí va el mismo return que ya tienes, no cambia por la base de datos
        <div className="p-2">
            {/* Resto del JSX permanece igual */}
        </div>
    );
}
