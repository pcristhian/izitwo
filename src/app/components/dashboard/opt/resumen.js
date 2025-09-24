"use client";

import { useState } from "react";

export default function Resumen() {
    const [active, setActive] = useState("");

    return (
        <div className="p-6 bg-white rounded shadow">
            <h2 className="text-2xl font-bold mb-6 text-center">Resumen de Productos</h2>

            <div className="flex flex-wrap justify-center gap-4">
                {["Celulares", "Accesorios", "Productos Naturales", "I-Medic", "Pañuelitos"].map((btn) => (
                    <button
                        key={btn}
                        onClick={() => setActive(btn)}
                        className={`px-6 py-2 rounded-lg shadow transition 
                            ${active === btn ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                    >
                        {btn}
                    </button>
                ))}
            </div>
        </div>
    );
}
