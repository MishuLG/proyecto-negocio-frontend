import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
    const navigate = useNavigate();
    const [tasaCOP, setTasaCOP] = useState('');
    const [tasaBS, setTasaBS] = useState('');
    const [nuevoProd, setNuevoProd] = useState({ nombre: '', categoria_id: 1, precio_cop: '' });

    const [ventasFiltro, setVentasFiltro] = useState([]);
    const [fechaFiltro, setFechaFiltro] = useState(new Date().toLocaleDateString('en-CA'));

    const [productos, setProductos] = useState([]);
    const [editandoId, setEditandoId] = useState(null);
    const [datosEdicion, setDatosEdicion] = useState({ nombre: '', precio_cop: '', categoria_id: 1 });

    const [turnoCatalogo, setTurnoCatalogo] = useState('Todos');

    const [deudores, setDeudores] = useState([]);
    const [totalCalle, setTotalCalle] = useState(0);

    // ESTADO: Controlador del Modo Oscuro
    const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

    const cargarDatos = () => {
        fetch('http://localhost:3000/api/tasas').then(res => res.json()).then(data => {
            const cop = data.find(t => t.moneda === 'COP');
            const bs = data.find(t => t.moneda === 'BS');
            if (cop) setTasaCOP(cop.tasa);
            if (bs) setTasaBS(bs.tasa);
        });
        fetch('http://localhost:3000/api/productos').then(res => res.json()).then(data => setProductos(data));
        fetch('http://localhost:3000/api/clientes/deudores').then(res => res.json()).then(data => {
            setDeudores(data.clientes || []);
            setTotalCalle(data.total_dinero_en_calle_cop || 0);
        });
    };

    const cargarVentasPorFecha = () => {
        fetch(`http://localhost:3000/api/dashboard/ventas?fecha=${fechaFiltro}`)
            .then(res => res.json())
            .then(data => setVentasFiltro(data));
    };

    useEffect(() => { cargarDatos(); }, []);
    useEffect(() => { cargarVentasPorFecha(); }, [fechaFiltro]);

    // Guardar preferencia de modo oscuro
    useEffect(() => {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    const actualizarTasa = async (moneda, valor) => {
        // VALIDACIÓN: Tasa real mayor a cero
        if (!valor || parseFloat(valor) <= 0) {
            alert(`⚠️ La tasa de ${moneda} debe ser un número mayor a 0`);
            return;
        }
        await fetch('http://localhost:3000/api/tasas', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moneda, tasa: parseFloat(valor) })
        });
        alert(`Tasa de ${moneda} actualizada correctamente`);
    };

    const agregarProducto = async (e) => {
        e.preventDefault();
        // VALIDACIÓN: Precio real
        if (parseFloat(nuevoProd.precio_cop) <= 0) {
            alert("⚠️ El precio del producto debe ser mayor a 0");
            return;
        }

        await fetch('http://localhost:3000/api/productos', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevoProd.nombre, categoria_id: parseInt(nuevoProd.categoria_id), precio_venta_cop: parseFloat(nuevoProd.precio_cop) })
        });
        setNuevoProd({ nombre: '', categoria_id: 1, precio_cop: '' });
        cargarDatos();
    };

    const iniciarEdicion = (prod) => {
        setEditandoId(prod.id);
        setDatosEdicion({ nombre: prod.producto || prod.nombre, precio_cop: prod.precio_venta_cop, categoria_id: prod.categoria_id || 1 });
    };

    const guardarEdicion = async (id) => {
        // VALIDACIÓN: Datos completos al editar
        if (!datosEdicion.nombre.trim() || parseFloat(datosEdicion.precio_cop) <= 0) {
            alert("⚠️ El nombre es obligatorio y el precio debe ser mayor a 0");
            return;
        }

        await fetch(`http://localhost:3000/api/productos/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: datosEdicion.nombre, categoria_id: parseInt(datosEdicion.categoria_id), precio_venta_cop: parseFloat(datosEdicion.precio_cop) })
        });
        setEditandoId(null);
        cargarDatos();
    };

    const eliminarProducto = async (id, nombre) => {
        if (window.confirm(`¿Estás seguro de eliminar "${nombre}"? Esta acción no se puede deshacer.`)) {
            await fetch(`http://localhost:3000/api/productos/${id}`, { method: 'DELETE' });
            cargarDatos();
        }
    };

    const pagarDeuda = async (cliente_id, nombre, deuda_actual) => {
        const montoStr = window.prompt(`¿Cuánto va a abonar ${nombre}?\nDeuda actual: ${parseFloat(deuda_actual).toLocaleString('es-CO')} COP`);

        if (montoStr) {
            const valorAbonado = parseFloat(montoStr);

            // VALIDACIONES FRONTEND PARA DEUDAS
            if (isNaN(valorAbonado) || valorAbonado <= 0) {
                alert("⚠️ Ingresa un monto válido mayor a 0.");
                return;
            }
            if (valorAbonado > parseFloat(deuda_actual)) {
                alert("⚠️ No puedes abonar más de lo que el cliente debe.");
                return;
            }

            await fetch(`http://localhost:3000/api/clientes/${cliente_id}/pagar-deuda`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monto_abonado: valorAbonado })
            });
            alert("¡Abono registrado con éxito!");
            cargarDatos();
            cargarVentasPorFecha();
        }
    };

    const productosFiltrados = turnoCatalogo === 'Todos'
        ? productos
        : productos.filter(p => p.turno === turnoCatalogo || p.turno === 'Ambos' || (turnoCatalogo === 'Noche' && p.categoria_id === 1) || (turnoCatalogo === 'Mañana' && p.categoria_id === 2));

    return (
        <div className={isDark ? 'dark' : ''}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="p-10 bg-slate-50 dark:bg-slate-900 min-h-screen font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300"
            >

                {/* HEADER ANIMADO */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100 }}
                    className="flex justify-between items-center mb-10 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"
                >
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">⚙️ Panel de Control</h1>
                    <div className="flex gap-4">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsDark(!isDark)} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-4 py-3 rounded-xl font-bold transition-colors">
                            {isDark ? '☀️ Claro' : '🌙 Oscuro'}
                        </motion.button>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Link to="/pos" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-md transition-colors block">Ir a la Caja (POS)</Link>
                        </motion.div>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 px-6 py-3 rounded-xl font-bold transition-colors">
                            Salir
                        </motion.button>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* MÓDULO TASAS */}
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                        className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                        <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">💱 Tasas de Cambio del Día</h2>
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-slate-600 dark:text-slate-400 w-auto whitespace-nowrap">COP/USD:</span>
                                <input type="number" min="0" value={tasaCOP} onChange={e => setTasaCOP(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Ej: 3900" />
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => actualizarTasa('COP', tasaCOP)} className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md">Guardar</motion.button>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-slate-600 dark:text-slate-400 w-auto whitespace-nowrap">BS (Frontera):</span>
                                <input type="number" min="0" step="0.1" value={tasaBS} onChange={e => setTasaBS(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Ej: 5" />
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => actualizarTasa('BS', tasaBS)} className="bg-slate-900 dark:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-md">Guardar</motion.button>
                            </div>
                        </div>
                    </motion.div>

                    {/* AGREGAR PRODUCTO */}
                    <motion.div
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                        className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"
                    >
                        <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">🍔 Agregar Nuevo Producto</h2>
                        <form onSubmit={agregarProducto} className="space-y-4">
                            <input type="text" placeholder="Nombre (Ej: Perro Caliente Especial)" required value={nuevoProd.nombre} onChange={e => setNuevoProd({ ...nuevoProd, nombre: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-green-500 transition-all" />
                            <div className="flex gap-4">
                                <input type="number" min="100" step="100" placeholder="Precio en COP" required value={nuevoProd.precio_cop} onChange={e => setNuevoProd({ ...nuevoProd, precio_cop: e.target.value })} className="w-1/2 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-green-500 transition-all" />
                                <select value={nuevoProd.categoria_id} onChange={e => setNuevoProd({ ...nuevoProd, categoria_id: e.target.value })} className="w-1/2 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-green-500 transition-all">
                                    <option value="1">Noche (Hamburguesas/Perros)</option>
                                    <option value="2">Mañana (Pasteles/Desayunos)</option>
                                </select>
                            </div>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg shadow-md mt-2 transition-colors">Crear Producto</motion.button>
                        </form>
                    </motion.div>
                </div>

                {/* GESTIÓN DE CATÁLOGO */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
                    className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 transition-colors"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">📦 Gestión de Catálogo y Precios</h2>
                        <div className="flex gap-2">
                            <button onClick={() => setTurnoCatalogo('Todos')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${turnoCatalogo === 'Todos' ? 'bg-slate-800 dark:bg-slate-600 text-white shadow-md scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>📦 Todos</button>
                            <button onClick={() => setTurnoCatalogo('Mañana')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${turnoCatalogo === 'Mañana' ? 'bg-amber-500 text-white shadow-md scale-105' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50'}`}>☀️ Mañana</button>
                            <button onClick={() => setTurnoCatalogo('Noche')} className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${turnoCatalogo === 'Noche' ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'}`}>🌙 Noche</button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400">
                                    <th className="p-4 rounded-l-xl w-1/2">Producto</th>
                                    <th className="p-4">Precio (COP)</th>
                                    <th className="p-4">Turno</th>
                                    <th className="p-4 rounded-r-xl text-center">Acciones</th>
                                </tr>
                            </thead>
                            <AnimatePresence>
                                <tbody>
                                    {productosFiltrados.length === 0 ? (
                                        <tr><td colSpan="4" className="p-4 text-center text-slate-500 dark:text-slate-400 font-medium">No hay productos en este turno</td></tr>
                                    ) : (
                                        productosFiltrados.map(prod => (
                                            <motion.tr
                                                key={prod.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                layout
                                                className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                            >
                                                {editandoId === prod.id ? (
                                                    <>
                                                        <td className="p-2"><input type="text" value={datosEdicion.nombre} onChange={e => setDatosEdicion({ ...datosEdicion, nombre: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500" /></td>
                                                        <td className="p-2"><input type="number" min="0" value={datosEdicion.precio_cop} onChange={e => setDatosEdicion({ ...datosEdicion, precio_cop: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500" /></td>
                                                        <td className="p-2">
                                                            <select value={datosEdicion.categoria_id} onChange={e => setDatosEdicion({ ...datosEdicion, categoria_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white">
                                                                <option value="1">Noche</option>
                                                                <option value="2">Mañana</option>
                                                            </select>
                                                        </td>
                                                        <td className="p-2 flex gap-2 justify-center">
                                                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => guardarEdicion(prod.id)} className="bg-green-500 text-white px-3 py-2 rounded-lg font-bold text-sm">Guardar</motion.button>
                                                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setEditandoId(null)} className="bg-slate-300 dark:bg-slate-600 text-slate-800 dark:text-white px-3 py-2 rounded-lg font-bold text-sm">Cancelar</motion.button>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{prod.producto || prod.nombre}</td>
                                                        <td className="p-4 font-bold text-green-600 dark:text-green-400">{parseFloat(prod.precio_venta_cop).toLocaleString('es-CO')} COP</td>
                                                        <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">{prod.turno || (prod.categoria_id === 1 ? 'Noche' : 'Mañana')}</td>
                                                        <td className="p-4 flex gap-2 justify-center">
                                                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => iniciarEdicion(prod)} className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-lg font-bold text-sm">✏️</motion.button>
                                                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => eliminarProducto(prod.id, prod.producto || prod.nombre)} className="bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 px-4 py-2 rounded-lg font-bold text-sm">🗑️</motion.button>
                                                        </td>
                                                    </>
                                                )}
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </AnimatePresence>
                        </table>
                    </div>
                </motion.div>

                {/* HISTORIAL DE PEDIDOS */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
                    className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 transition-colors"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">📋 Historial de Pedidos</h2>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-500 dark:text-slate-400">Filtrar Fecha:</span>
                            <input
                                type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)}
                                className="px-4 py-2 rounded-xl border-2 border-slate-200 dark:border-slate-600 outline-none font-bold text-slate-700 dark:text-white bg-slate-50 dark:bg-slate-700 focus:border-blue-500 transition-all cursor-pointer"
                            />
                        </div>
                    </div>

                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400">
                                <th className="p-4 rounded-l-xl">Ticket #</th>
                                <th className="p-4">Hora</th>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4">Total</th>
                                <th className="p-4 text-green-600 dark:text-green-400">Abonado</th>
                                <th className="p-4 text-red-500 dark:text-red-400 rounded-r-xl">Deuda</th>
                            </tr>
                        </thead>
                        <AnimatePresence>
                            <tbody>
                                {ventasFiltro.length === 0 ? (
                                    <tr><td colSpan="7" className="p-4 text-center text-slate-500 dark:text-slate-400 font-medium">No hay ventas registradas en esta fecha</td></tr>
                                ) : (
                                    ventasFiltro.map((venta, index) => {
                                        const esPagado = venta.estado_pago === 'Pagado';
                                        const pagadoVisual = esPagado ? venta.total_cop : venta.pagado;
                                        const deudaVisual = esPagado ? 0 : (venta.total_cop - venta.pagado);
                                        const horaExacta = new Date(venta.fecha_hora).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });

                                        return (
                                            <motion.tr
                                                key={venta.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                            >
                                                <td className="p-4 font-bold text-slate-800 dark:text-slate-200">#{venta.id}</td>
                                                <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">{horaExacta}</td>
                                                <td className="p-4 text-slate-800 dark:text-slate-200">{venta.nombre || 'Cliente de paso'}</td>
                                                <td className="p-4">
                                                    {esPagado ? (
                                                        <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full font-bold text-xs shadow-sm">✅ Pagado</span>
                                                    ) : (
                                                        <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full font-bold text-xs shadow-sm">⏳ Pendiente</span>
                                                    )}
                                                </td>
                                                <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{parseFloat(venta.total_cop).toLocaleString('es-CO')}</td>
                                                <td className="p-4 font-bold text-green-600 dark:text-green-400">{parseFloat(pagadoVisual).toLocaleString('es-CO')}</td>
                                                <td className="p-4 font-bold text-red-500 dark:text-red-400">{parseFloat(deudaVisual).toLocaleString('es-CO')}</td>
                                            </motion.tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </AnimatePresence>
                    </table>
                </motion.div>

                {/* CUENTAS POR COBRAR */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
                    className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 border-l-4 border-l-amber-500 transition-colors"
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">⚠️ Control de Fiados (Cuentas por Cobrar)</h2>
                        <span className="font-black text-red-500 dark:text-red-400 text-lg bg-red-50 dark:bg-red-900/30 px-4 py-2 rounded-lg shadow-sm">
                            Total en Calle: {parseFloat(totalCalle).toLocaleString('es-CO')} COP
                        </span>
                    </div>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-100 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400">
                                <th className="p-4 rounded-l-xl">Cliente</th>
                                <th className="p-4">Cédula</th>
                                <th className="p-4">Monto Adeudado</th>
                                <th className="p-4 rounded-r-xl text-right">Acción</th>
                            </tr>
                        </thead>
                        <AnimatePresence>
                            <tbody>
                                {deudores.length === 0 ? (
                                    <tr><td colSpan="4" className="p-4 text-center text-slate-500 dark:text-slate-400 font-medium">No hay deudas pendientes 🎉</td></tr>
                                ) : (
                                    deudores.map(deudor => (
                                        <motion.tr
                                            key={deudor.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            layout
                                            className="border-b border-slate-50 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <td className="p-4 font-bold text-slate-800 dark:text-slate-200">{deudor.nombre}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-400">{deudor.cedula}</td>
                                            <td className="p-4 font-black text-red-600 dark:text-red-400">{parseFloat(deudor.deuda_total).toLocaleString('es-CO')} COP</td>
                                            <td className="p-4 text-right">
                                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => pagarDeuda(deudor.id, deudor.nombre, deudor.deuda_total)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-colors">
                                                    💰 Abonar / Saldar
                                                </motion.button>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </tbody>
                        </AnimatePresence>
                    </table>
                </motion.div>

            </motion.div>
        </div>
    );
}