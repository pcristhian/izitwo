"use client";

import { useState, useEffect } from "react";
import Resumen from "./opt/resumen";
import Ventas from "./opt/RegistrarVentas";
import Vendedores from "./opt/vendedores";
import { supabase } from "../../lib/supabase";

export default function DashboardContent() {
    const [activePage, setActivePage] = useState("home");
    const [sucursales, setSucursales] = useState([]);
    const [sucursalSeleccionada, setSucursalSeleccionada] = useState(null);

    // Cargar sucursales
    useEffect(() => {
        const fetchSucursales = async () => {
            const { data, error } = await supabase.from("sucursales").select("*");
            if (!error && data && data.length > 0) {
                setSucursales(data);

                // Revisar si hay sucursal guardada en localStorage
                const guardada = localStorage.getItem("sucursalSeleccionada");
                if (guardada) {
                    const suc = data.find((s) => s.id === Number(guardada));
                    if (suc) {
                        setSucursalSeleccionada(suc);
                        return;
                    }
                }

                // Por defecto, seleccionar la primera sucursal
                setSucursalSeleccionada(data[0]);
                localStorage.setItem("sucursalSeleccionada", data[0].id);
            }
        };
        fetchSucursales();
    }, []);

    // Cambiar sucursal y guardar en localStorage
    const cambiarSucursal = (suc) => {
        setSucursalSeleccionada(suc);
        localStorage.setItem("sucursalSeleccionada", suc.id);
    };

    const renderContent = () => {
        switch (activePage) {
            case "home":
                return <Resumen sucursal={sucursalSeleccionada} />;

            case "ventas":
                // Pasar sucursalSeleccionada al componente Ventas
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Ventas</h2>
                        {sucursalSeleccionada ? (
                            <Ventas sucursal={sucursalSeleccionada} />
                        ) : (
                            <p>Cargando sucursal...</p>
                        )}
                    </div>
                );

            case "vendedores":
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Cajas</h2>
                        {sucursalSeleccionada ? (
                            <Vendedores sucursal={sucursalSeleccionada} />
                        ) : (
                            <p>Cargando sucursal...</p>
                        )}
                    </div>
                );

            case "reportes":
                return (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Reportes</h2>
                        <p>Aquí se mostrarán los reportes.</p>
                    </div>
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
        <div className="min-h-screen flex bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-sky-100 shadow-md p-6 flex flex-col">
                <h1 className="text-2xl font-bold mb-2">MultiCentro</h1>

                {/* Selector de sucursal */}
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

                {/* Menú lateral */}
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
                        onClick={() => setActivePage("vendedores")}
                        className={`text-left px-3 py-2 rounded ${activePage === "vendedores" ? "bg-blue-500 text-white" : "hover:bg-gray-200"}`}
                    >
                        Cajas
                    </button>
                    <button
                        onClick={() => setActivePage("suministros")}
                        className={`text-left px-3 py-2 rounded ${activePage === "suministros" ? "bg-blue-500 text-white" : "hover:bg-gray-200"}`}
                    >
                        Suministros
                    </button>
                    <button
                        onClick={() => setActivePage("inventario")}
                        className={`text-left px-3 py-2 rounded ${activePage === "inventario" ? "bg-blue-500 text-white" : "hover:bg-gray-200"}`}
                    >
                        Inventario
                    </button>
                    <button
                        onClick={() => setActivePage("reportes")}
                        className={`text-left px-3 py-2 rounded ${activePage === "reportes" ? "bg-blue-500 text-white" : "hover:bg-gray-200"}`}
                    >
                        Reportes
                    </button>
                    <button
                        onClick={handleLogout}
                        className="mt-auto px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                        Logout
                    </button>
                </nav>
            </aside>

            {/* Contenido dinámico */}
            <main className="flex-1 p-6">{renderContent()}</main>
        </div>
    );
}
