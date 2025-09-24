'use client';
import { useState, useEffect } from "react"
import { supabase } from "../../../lib/supabase"

export default function VendedoresPage() {
    const [nombre, setNombre] = useState("");
    const [caja, setCaja] = useState("");
    const [vendedores, setVendedores] = useState([]);

    // 🔹 Cargar vendedores al montar el componente
    useEffect(() => {
        cargarVendedores();
    }, []);

    const cargarVendedores = async () => {
        const { data, error } = await supabase
            .from("vendedores")
            .select("*")
            .order("id", { ascending: true });

        if (error) {
            console.error(error.message);
            alert("❌ Error al cargar vendedores");
        } else {
            setVendedores(data);
        }
    };

    const agregarVendedor = async (e) => {
        e.preventDefault();

        if (!nombre || !caja) {
            alert("⚠️ Nombre y Caja son obligatorios");
            return;
        }

        const { data, error } = await supabase
            .from("vendedores")
            .insert([{ nombre, caja }])
            .select();

        if (error) {
            console.error(error.message);
            alert("❌ Error al registrar vendedor");
        } else {
            alert("✅ Vendedor agregado");
            setVendedores((prev) => [...prev, ...data]);
            setNombre("");
            setCaja("");
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-xl font-bold mb-4">Gestión de Vendedores</h1>

            <form
                onSubmit={agregarVendedor}
                className="flex flex-col gap-2 border p-4 rounded-lg w-80"
            >
                <input
                    type="text"
                    placeholder="Nombre del vendedor"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="border p-2 rounded"
                />
                <input
                    type="text"
                    placeholder="Caja (Ej: Caja 1)"
                    value={caja}
                    onChange={(e) => setCaja(e.target.value)}
                    className="border p-2 rounded"
                />
                <button
                    type="submit"
                    className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
                >
                    Agregar Vendedor
                </button>
            </form>

            <h2 className="text-lg font-semibold mt-6 mb-2">Lista de Vendedores</h2>
            <ul className="mt-2">
                {vendedores.map((v) => (
                    <li key={v.id} className="border-b py-1">
                        {v.nombre} — {v.caja} (vendidos: {v.productos_vendidos})
                    </li>
                ))}
            </ul>
        </div>
    );
}
