import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts';

// --- FUNCIONES MAESTRAS DE FECHA ---
// Extrae la fecha local del cajero evitando desfases de Zona Horaria (UTC-4)
const getHoyStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; // Ej: "2026-04-28"
};

// Calcula si una fecha exacta cae dentro de la semana actual (Domingo a Sábado)
const esMismaSemana = (fechaLimpia) => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day;
    const inicioSemana = new Date(d.getFullYear(), d.getMonth(), diff);
    inicioSemana.setHours(0, 0, 0, 0);

    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);

    // Forzamos la fecha del gasto al mediodía para evitar saltos de día por horas
    const [year, month, date] = fechaLimpia.split('-');
    const gDate = new Date(year, month - 1, date, 12, 0, 0);

    return gDate >= inicioSemana && gDate <= finSemana;
};

export default function Gastos() {
    const navigate = useNavigate();
    const [gastos, setGastos] = useState([]);
    const [ventas, setVentas] = useState([]);
    const [nuevoGasto, setNuevoGasto] = useState({ concepto: '', monto_cop: '', fecha: getHoyStr() });

    // Filtros de la tabla interactiva
    const [filtroTabla, setFiltroTabla] = useState('Todos');

    const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

    const cargarDatos = async () => {
        try {
            const [resGastos, resVentas] = await Promise.all([
                fetch('http://localhost:3000/api/gastos'),
                fetch('http://localhost:3000/api/ventas/todas')
            ]);
            if (resGastos.ok) setGastos(await resGastos.json());
            if (resVentas.ok) setVentas(await resVentas.json());
        } catch (error) {
            console.error("Error conectando con la API de gastos y ventas", error);
        }
    };

    useEffect(() => { cargarDatos(); }, []);

    useEffect(() => {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [isDark]);

    // --- MOTOR DE CÁLCULOS DE INTELIGENCIA ---
    const analitica = useMemo(() => {
        const hoy = getHoyStr();
        const mesActual = hoy.substring(0, 7);
        const añoActual = hoy.substring(0, 4);

        let resumen = {
            vHoy: 0, gHoy: 0,
            vSemana: 0, gSemana: 0,
            vMes: 0, gMes: 0,
            vAño: 0, gAño: 0
        };

        // Procesar Ventas para los Totales
        ventas.forEach(v => {
            const f = v.fecha_hora.split('T')[0];
            const m = parseFloat(v.total_cop);
            if (f === hoy) resumen.vHoy += m;
            if (esMismaSemana(f)) resumen.vSemana += m;
            if (f.startsWith(mesActual)) resumen.vMes += m;
            if (f.startsWith(añoActual)) resumen.vAño += m;
        });

        // Procesar Gastos para los Totales
        gastos.forEach(g => {
            const f = (g.fecha || "").split('T')[0];
            if (!f) return;
            const m = parseFloat(g.monto_cop);
            if (f === hoy) resumen.gHoy += m;
            if (esMismaSemana(f)) resumen.gSemana += m;
            if (f.startsWith(mesActual)) resumen.gMes += m;
            if (f.startsWith(añoActual)) resumen.gAño += m;
        });

        // Generar datos para las Gráficas (Agrupados por fecha de más antiguo a más reciente)
        const historialMap = {};
        ventas.forEach(v => {
            const f = v.fecha_hora.split('T')[0];
            if (!historialMap[f]) historialMap[f] = { fecha: f, ingresos: 0, gastos: 0, ganancia: 0 };
            historialMap[f].ingresos += parseFloat(v.total_cop);
        });
        gastos.forEach(g => {
            const f = (g.fecha || "").split('T')[0];
            if (!f) return;
            if (!historialMap[f]) historialMap[f] = { fecha: f, ingresos: 0, gastos: 0, ganancia: 0 };
            historialMap[f].gastos += parseFloat(g.monto_cop);
        });

        const chartData = Object.values(historialMap)
            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
            .map(d => ({ ...d, ganancia: d.ingresos - d.gastos }))
            .slice(-15); // Tomamos solo los últimos 15 días con movimientos para las gráficas

        return { resumen, chartData };
    }, [gastos, ventas]);

    const registrarGasto = async (e) => {
        e.preventDefault();
        if (!nuevoGasto.concepto.trim() || parseFloat(nuevoGasto.monto_cop) <= 0) {
            alert("⚠️ El concepto es obligatorio y el monto debe ser mayor a 0.");
            return;
        }

        try {
            await fetch('http://localhost:3000/api/gastos', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    concepto: nuevoGasto.concepto,
                    monto_cop: parseFloat(nuevoGasto.monto_cop),
                    fecha: nuevoGasto.fecha
                })
            });
            cargarDatos();
            setNuevoGasto({ concepto: '', monto_cop: '', fecha: getHoyStr() });
            alert("✅ Gasto registrado con éxito.");
        } catch (error) {
            alert("Error al registrar el gasto. Revisa la consola.");
        }
    };

    const eliminarGasto = async (id) => {
        if (window.confirm("¿Estás seguro de eliminar este gasto? Esto afectará los cálculos de ganancias y gráficas al instante.")) {
            await fetch(`http://localhost:3000/api/gastos/${id}`, { method: 'DELETE' });
            cargarDatos();
        }
    };

    // Aplicar Filtro Visual a la Tabla Inferior
    const gastosFiltrados = gastos.filter(gasto => {
        const fechaLimpia = (gasto.fecha || "").split('T')[0];
        const hoyStr = getHoyStr();

        if (filtroTabla === 'Hoy') return fechaLimpia === hoyStr;
        if (filtroTabla === 'Semana') return esMismaSemana(fechaLimpia);
        if (filtroTabla === 'Mes') return fechaLimpia.startsWith(hoyStr.substring(0, 7));
        if (filtroTabla === 'Año') return fechaLimpia.startsWith(hoyStr.substring(0, 4));
        return true; // Todos
    });

    return (
        <div className={isDark ? 'dark' : ''}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="p-10 bg-slate-50 dark:bg-slate-900 min-h-screen font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300">

                {/* HEADER */}
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-between items-center mb-10 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard" className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm">⬅ Volver al Panel</Link>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">📉 Inteligencia de Negocios y Gastos</h1>
                    </div>
                    <div className="flex gap-4">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsDark(!isDark)} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-4 py-3 rounded-xl font-bold transition-colors">
                            {isDark ? '☀️ Claro' : '🌙 Oscuro'}
                        </motion.button>
                        <Link to="/pos" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-colors block">Caja (POS)</Link>
                    </div>
                </motion.div>

                {/* TARJETAS DE GANANCIA REAL (Ventas - Gastos) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6 rounded-3xl text-white shadow-lg">
                        <h3 className="font-bold opacity-80 uppercase text-xs">Ganancia Neta (Hoy)</h3>
                        <p className="text-3xl font-black mt-1">${(analitica.resumen.vHoy - analitica.resumen.gHoy).toLocaleString()}</p>
                        <p className="text-[10px] mt-2 font-medium opacity-90">Ingresos: ${analitica.resumen.vHoy.toLocaleString()} | Egresos: ${analitica.resumen.gHoy.toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-6 rounded-3xl text-white shadow-lg">
                        <h3 className="font-bold opacity-80 uppercase text-xs">Ganancia Neta (Semana)</h3>
                        <p className="text-3xl font-black mt-1">${(analitica.resumen.vSemana - analitica.resumen.gSemana).toLocaleString()}</p>
                        <p className="text-[10px] mt-2 font-medium opacity-90">Ingresos: ${analitica.resumen.vSemana.toLocaleString()} | Egresos: ${analitica.resumen.gSemana.toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-3xl text-white shadow-lg">
                        <h3 className="font-bold opacity-80 uppercase text-xs">Utilidad (Mes Actual)</h3>
                        <p className="text-3xl font-black mt-1">${(analitica.resumen.vMes - analitica.resumen.gMes).toLocaleString()}</p>
                        <p className="text-[10px] mt-2 font-medium opacity-90">Ingresos: ${analitica.resumen.vMes.toLocaleString()} | Egresos: ${analitica.resumen.gMes.toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-6 rounded-3xl text-white shadow-lg">
                        <h3 className="font-bold opacity-80 uppercase text-xs">Rendimiento (Año)</h3>
                        <p className="text-3xl font-black mt-1">${(analitica.resumen.vAño - analitica.resumen.gAño).toLocaleString()}</p>
                        <p className="text-[10px] mt-2 font-medium opacity-90">Ingresos: ${analitica.resumen.vAño.toLocaleString()} | Egresos: ${analitica.resumen.gAño.toLocaleString()}</p>
                    </div>
                </div>

                {/* SECCIÓN DE GRÁFICAS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Gráfica 1: Ingresos vs Gastos Diarios */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                        <h3 className="font-bold mb-4 text-slate-800 dark:text-white">Movimiento Diario (Ventas vs Gastos)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analitica.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.2} />
                                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip contentStyle={{ borderRadius: '15px', backgroundColor: '#1e293b', color: '#fff', border: 'none' }} />
                                    <Legend />
                                    <Bar dataKey="ingresos" name="Ventas" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfica 2: Tendencia de Ganancia Neta */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                        <h3 className="font-bold mb-4 text-slate-800 dark:text-white">Flujo de Ganancia Neta</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analitica.chartData}>
                                    <defs>
                                        <linearGradient id="colorGanancia" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.2} />
                                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip contentStyle={{ borderRadius: '15px', backgroundColor: '#1e293b', color: '#fff', border: 'none' }} />
                                    <Area type="monotone" dataKey="ganancia" name="Utilidad Neta" stroke="#6366f1" fillOpacity={1} fill="url(#colorGanancia)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfica 3: Crecimiento y Tendencia de Ventas */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 lg:col-span-2 transition-colors">
                        <h3 className="font-bold mb-4 text-slate-800 dark:text-white">Análisis de Crecimiento en Ventas</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={analitica.chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" opacity={0.2} />
                                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <Tooltip contentStyle={{ borderRadius: '15px', backgroundColor: '#1e293b', color: '#fff', border: 'none' }} />
                                    <Line type="stepAfter" dataKey="ingresos" name="Ventas Brutas" stroke="#f59e0b" strokeWidth={3} dot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* FORMULARIO DE GASTOS */}
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="lg:col-span-1 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit transition-colors">
                        <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">🛒 Registrar Nuevo Gasto</h2>
                        <form onSubmit={registrarGasto} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Concepto o Insumo</label>
                                <input type="text" placeholder="Ej: 5 Paquetes de Pan de Perro..." required value={nuevoGasto.concepto} onChange={e => setNuevoGasto({ ...nuevoGasto, concepto: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 transition-all font-bold" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Monto gastado en COP</label>
                                <input type="number" min="100" placeholder="Ej: 45000" required value={nuevoGasto.monto_cop} onChange={e => setNuevoGasto({ ...nuevoGasto, monto_cop: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 transition-all font-bold" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Fecha de la compra</label>
                                <input type="date" required value={nuevoGasto.fecha} onChange={e => setNuevoGasto({ ...nuevoGasto, fecha: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 transition-all font-bold cursor-pointer" />
                            </div>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-bold text-lg shadow-md mt-4 transition-colors">
                                Registrar Gasto
                            </motion.button>
                        </form>
                    </motion.div>

                    {/* TABLA DE GASTOS Y FILTROS RESTAURADOS */}
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors flex flex-col h-full max-h-[600px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">🧾 Historial de Compras</h2>

                            {/* Píldoras de Filtro (Restauradas) */}
                            <div className="flex gap-2">
                                {['Todos', 'Hoy', 'Semana', 'Mes', 'Año'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFiltroTabla(f)}
                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${filtroTabla === f
                                                ? 'bg-amber-500 text-white scale-105'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 z-10 bg-white dark:bg-slate-800">
                                    <tr className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400">
                                        <th className="p-4 rounded-l-xl">Fecha</th>
                                        <th className="p-4">Concepto / Insumo</th>
                                        <th className="p-4">Costo (COP)</th>
                                        <th className="p-4 rounded-r-xl text-center">Acción</th>
                                    </tr>
                                </thead>
                                <AnimatePresence>
                                    <tbody>
                                        {gastosFiltrados.length === 0 ? (
                                            <tr><td colSpan="4" className="p-8 text-center text-slate-500 font-medium">No hay gastos para este filtro.</td></tr>
                                        ) : (
                                            gastosFiltrados.map(gasto => {
                                                const fechaLimpia = (gasto.fecha || "").split('T')[0];
                                                return (
                                                    <motion.tr
                                                        key={gasto.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        layout
                                                        className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                                    >
                                                        <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">{fechaLimpia}</td>
                                                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{gasto.concepto}</td>
                                                        <td className="p-4 font-black text-red-500 dark:text-red-400">-{parseFloat(gasto.monto_cop).toLocaleString('es-CO')}</td>
                                                        <td className="p-4 text-center">
                                                            {/* Botón de borrar restaurado */}
                                                            <button onClick={() => eliminarGasto(gasto.id)} className="bg-red-50 dark:bg-red-900/30 text-red-500 px-3 py-2 rounded-lg font-bold text-xs hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">🗑️ Borrar</button>
                                                        </td>
                                                    </motion.tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                </AnimatePresence>
                            </table>
                        </div>
                    </motion.div>
                </div>

            </motion.div>
        </div>
    );
}