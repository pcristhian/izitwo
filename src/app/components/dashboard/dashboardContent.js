"use client";

import { useState, useEffect } from "react";
import Resumen from "./opt/Resumen";
import Ventas from "./opt/RegistrarVentas";
import Vendedores from "./opt/Vendedores";
import Inventarios from "./opt/Inventarios";


import ReporteInventario from "./opt/ReporteInventario";

import { supabase } from "../../lib/supabase";

export default function DashboardContent() {
    const [activePage, setActivePage] = useState("home");
    const [sucursales, setSucursales] = useState([]);
    const [sucursalSeleccionada, setSucursalSeleccionada] = useState(null);

    useEffect(() => {
        const fetchSucursales = async () => {
            const { data, error } = await supabase.from("sucursales").select("*");
            if (!error && data && data.length > 0) {
                setSucursales(data);

                const guardada = localStorage.getItem("sucursalSeleccionada");
                if (guardada) {
                    const suc = data.find((s) => s.id === Number(guardada));
                    if (suc) {
                        setSucursalSeleccionada(suc);
                        return;
                    }
                }

                setSucursalSeleccionada(data[0]);
                localStorage.setItem("sucursalSeleccionada", data[0].id);
            }
        };
        fetchSucursales();
    }, []);

    const cambiarSucursal = (suc) => {
        setSucursalSeleccionada(suc);
        localStorage.setItem("sucursalSeleccionada", suc.id);
    };

    const renderContent = () => {
        switch (activePage) {
            case "home":
                return <Resumen sucursal={sucursalSeleccionada} />;

            case "ventas":
                return (
                    <Ventas
                        sucursal={sucursalSeleccionada}
                        sucursales={sucursales}
                    />
                );
            case "inventarios":
                return (
                    <Inventarios
                        sucursal={sucursalSeleccionada}
                        sucursales={sucursales}
                    />
                );



            case "ReporteInventario":
                return (
                    <ReporteInventario sucursal={sucursalSeleccionada} />
                );

            case "Vendedores":
                return (
                    <Vendedores sucursal={sucursalSeleccionada} />
                );

            default:
                return <p>Página no encontrada</p>;
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem("isLoggedIn");
        location.href = "/components/loginForm";
    };

    return (
        <div className="h-screen flex bg-gray-100">
            {/* Sidebar fijo */}
            <aside className="w-64 bg-sky-100 shadow-md p-6 flex flex-col">
                <h1 className="text-2xl font-bold mb-2">MultiCentro</h1>

                {sucursales.length > 0 && (
                    <select
                        value={sucursalSeleccionada?.id || ""}
                        onChange={(e) => {
                            const suc = sucursales.find((s) => s.id === Number(e.target.value));
                            if (suc) cambiarSucursal(suc);
                        }}
                        className="mb-6 p-2 border rounded w-full"
                    >
                        {sucursales.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.nombre}
                            </option>
                        ))}
                    </select>
                )}

                <nav className="flex flex-col space-y-3">
                    <button
                        onClick={() => setActivePage("home")}
                        className={`text-left px-3 py-2 rounded ${activePage === "home" ? "bg-blue-500 text-white" : "hover:bg-gray-200"}`}
                    >
                        Resumen
                    </button>
                    <button
                        onClick={() => setActivePage("ventas")}
                        className={`text-left px-3 py-2 rounded ${activePage === "ventas" ? "bg-blue-500 text-white" : "hover:bg-gray-200"}`}
                    >
                        Ventas
                    </button>
                    <button
                        onClick={() => setActivePage("inventarios")}
                        className={`text-left px-3 py-2 rounded ${activePage === "inventarios" ? "bg-blue-500 text-white" : "hover:bg-gray-200"}`}
                    >
                        Inventarios
                    </button>
                    <button
                        onClick={() => setActivePage("ReporteInventario")}
                        className={`text-left px-3 py-2 rounded ${activePage === "reportes" ? "bg-blue-500 text-white" : "hover:bg-gray-200"}`}
                    >
                        Reportes
                    </button>

                    <button
                        onClick={() => setActivePage("Vendedores")}
                        className={`text-left px-3 py-2 rounded ${activePage === "Vendedores" ? "bg-blue-500 text-white" : "hover:bg-gray-200"}`}
                    >
                        Cajas
                    </button>

                    <button
                        onClick={handleLogout}
                        className="mt-auto px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Logout
                    </button>
                </nav>
            </aside>

            {/* Contenido fijo, con scroll solo dentro */}
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto p-6">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
}
