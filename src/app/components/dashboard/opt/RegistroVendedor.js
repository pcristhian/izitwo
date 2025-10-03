import { useState } from "react";

export default function registroVendedor() {
    const [nombre, setNombre] = useState("");
    const [caja, setCaja] = useState("");
    const [vendedores, setVendedores] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const res = await fetch("/api/vendedores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, caja }),
        });

        const data = await res.json();

        if (res.ok) {
            alert("✅ Vendedor agregado");
            setVendedores((prev) => [...prev, ...data.data]);
            setNombre("");
            setCaja("");
        } else {
            alert("❌ " + data.error);
        }
    };

    const cargarVendedores = async () => {
        const res = await fetch("/api/vendedores");
        const data = await res.json();
        if (res.ok) setVendedores(data);
    };

    return (
        <div className="p-4">
            <form
                onSubmit={handleSubmit}
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

            <button
                onClick={cargarVendedores}
                className="mt-4 bg-gray-500 text-white px-4 py-2 rounded"
            >
                Ver Vendedores
            </button>

            <ul className="mt-4">
                {vendedores.map((v) => (
                    <li key={v.id} className="border-b py-1">
                        {v.nombre} — {v.caja} (vendidos: {v.productos_vendidos})
                    </li>
                ))}
            </ul>
        </div>
    );
}
