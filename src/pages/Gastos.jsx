import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [nuevoGasto, setNuevoGasto] = useState({ concepto: '', monto_cop: '', fecha: getHoyStr() });

    // Filtros de la tabla interactiva
    const [filtroTabla, setFiltroTabla] = useState('Todos');

    const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
    const [totales, setTotales] = useState({ diario: 0, semanal: 0, mensual: 0, anual: 0 });

    const cargarGastos = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/gastos');
            if (res.ok) {
                const data = await res.json();
                setGastos(data);
            }
        } catch (error) {
            console.error("Error conectando con la API de gastos", error);
        }
    };

    useEffect(() => { cargarGastos(); }, []);

    useEffect(() => {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    }, [isDark]);

    // Motor Recalculador de Totales a prueba de balas
    useEffect(() => {
        let tDiario = 0, tSemanal = 0, tMensual = 0, tAnual = 0;
        const hoyStr = getHoyStr();
        const mesHoy = hoyStr.substring(0, 7); // "2026-04"
        const anoHoy = hoyStr.substring(0, 4); // "2026"

        gastos.forEach(gasto => {
            const monto = parseFloat(gasto.monto_cop);
            // Si viene de postgres puede traer "T00:00:00.000Z", cortamos solo la fecha
            const fechaLimpia = (gasto.fecha || "").split('T')[0];

            if (!fechaLimpia) return;

            // Diario exacto
            if (fechaLimpia === hoyStr) tDiario += monto;
            // Semanal exacto
            if (esMismaSemana(fechaLimpia)) tSemanal += monto;
            // Mensual exacto
            if (fechaLimpia.startsWith(mesHoy)) tMensual += monto;
            // Anual exacto
            if (fechaLimpia.startsWith(anoHoy)) tAnual += monto;
        });

        setTotales({ diario: tDiario, semanal: tSemanal, mensual: tMensual, anual: tAnual });
    }, [gastos]);

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
            cargarGastos();
            setNuevoGasto({ concepto: '', monto_cop: '', fecha: getHoyStr() });
            alert("✅ Gasto registrado con éxito.");
        } catch (error) {
            alert("Error al registrar el gasto. Revisa la consola.");
        }
    };

    const eliminarGasto = async (id) => {
        if (window.confirm("¿Estás seguro de eliminar este gasto? Esto afectará los totales calculados.")) {
            await fetch(`http://localhost:3000/api/gastos/${id}`, { method: 'DELETE' });
            cargarGastos();
        }
    };

    // Aplicar Filtro Visual a la Tabla
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
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">📉 Control de Gastos</h1>
                    </div>
                    <div className="flex gap-4">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsDark(!isDark)} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-4 py-3 rounded-xl font-bold transition-colors">
                            {isDark ? '☀️ Claro' : '🌙 Oscuro'}
                        </motion.button>
                        <Link to="/pos" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-colors block">Caja (POS)</Link>
                    </div>
                </motion.div>

                {/* TARJETAS DE MÉTRICAS */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    {[
                        { titulo: "Gasto de Hoy", valor: totales.diario, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20" },
                        { titulo: "Esta Semana", valor: totales.semanal, color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20" },
                        { titulo: "Este Mes", valor: totales.mensual, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20" },
                        { titulo: "Gasto Anual", valor: totales.anual, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20" }
                    ].map((card, index) => (
                        <motion.div key={index} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: index * 0.1 }} className={`p-6 rounded-3xl border border-slate-200 dark:border-slate-700 ${card.bg} transition-colors`}>
                            <h3 className="text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider">{card.titulo}</h3>
                            <p className={`text-3xl font-black mt-2 ${card.color}`}>${card.valor.toLocaleString('es-CO')}</p>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* FORMULARIO */}
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

                    {/* TABLA DE GASTOS Y FILTROS */}
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors flex flex-col h-full max-h-[600px]">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">🧾 Historial de Compras</h2>

                            {/* Píldoras de Filtro */}
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