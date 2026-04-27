import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function POS() {
    const [productos, setProductos] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [turnoActivo, setTurnoActivo] = useState('Noche');
    const [tasas, setTasas] = useState({ COP: 1, BS: 1 });

    const [cedula, setCedula] = useState('');
    const [nombre, setNombre] = useState('');
    const [pedidosAbiertos, setPedidosAbiertos] = useState([]);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState('');
    const [abono, setAbono] = useState('');

    const [facturaActiva, setFacturaActiva] = useState(null);
    const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

    const navigate = useNavigate();
    const rol = localStorage.getItem('rol');

    useEffect(() => {
        fetch('http://localhost:3000/api/productos').then(res => res.json()).then(data => setProductos(data));
        fetch('http://localhost:3000/api/tasas').then(res => res.json()).then(data => {
            const cop = data.find(t => t.moneda === 'COP')?.tasa || 1;
            const bs = data.find(t => t.moneda === 'BS')?.tasa || 1;
            setTasas({ COP: parseFloat(cop), BS: parseFloat(bs) });
        });
        cargarPedidosAbiertos();
    }, []);

    useEffect(() => {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    const cargarPedidosAbiertos = () => {
        fetch('http://localhost:3000/api/pedidos/abiertos').then(res => res.json()).then(data => setPedidosAbiertos(data));
    };

    const manejarCambioCedula = async (e) => {
        const valorLimpio = e.target.value.replace(/\D/g, '');
        setCedula(valorLimpio);

        if (valorLimpio.length >= 6) {
            try {
                const res = await fetch(`http://localhost:3000/api/clientes/cedula/${valorLimpio}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.nombre) setNombre(data.nombre);
                }
            } catch (error) {
                console.error("Error buscando cliente", error);
            }
        }
    };

    const manejarCambioNombre = (e) => {
        const valorLimpio = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
        setNombre(valorLimpio);
    };

    const totalCOP = carrito.reduce((sum, item) => sum + (parseFloat(item.precio_venta_cop) * item.cantidad), 0);

    const procesarVenta = async () => {
        if (!pedidoSeleccionado && (!cedula.trim() || !nombre.trim())) {
            alert("⚠️ OBLIGATORIO: Debes ingresar la Cédula y el Nombre del cliente para registrar la venta.");
            return;
        }

        if (abono !== '') {
            const valorAbono = parseFloat(abono);
            if (valorAbono < 0) {
                alert("⚠️ El abono no puede ser un número negativo.");
                return;
            }
            if (valorAbono > totalCOP) {
                alert("⚠️ El abono no puede ser mayor al total del ticket. Registre solo el costo del pedido.");
                return;
            }
        }

        const respuesta = await fetch('http://localhost:3000/api/checkout', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cedula, nombre, turno: turnoActivo, carrito, pedido_id_existente: pedidoSeleccionado || null, abono })
        });

        const data = await respuesta.json();

        if (!respuesta.ok) {
            alert("⚠️ " + (data.error || "Error al procesar la venta"));
            return;
        }

        const pagoAbonado = abono !== '' ? parseFloat(abono) : totalCOP;
        const deudaRestante = totalCOP - pagoAbonado;

        setFacturaActiva({
            ticket_id: data.pedido_id || 'N/A',
            fecha: new Date().toLocaleString('es-VE'),
            cliente: nombre || 'Cliente de Pedido Abierto',
            ci: cedula || '-',
            items: [...carrito],
            totalCOP: totalCOP,
            abono: pagoAbonado,
            deuda: deudaRestante > 0 ? deudaRestante : 0
        });

        setCarrito([]); setCedula(''); setNombre(''); setPedidoSeleccionado(''); setAbono('');
        cargarPedidosAbiertos();
    };

    const agregarAlTicket = (prod) => {
        setCarrito(prev => {
            const existe = prev.find(item => item.id === prod.id);
            if (existe) return prev.map(item => item.id === prod.id ? { ...item, cantidad: item.cantidad + 1 } : item);
            return [...prev, { ...prod, cantidad: 1 }];
        });
    };

    const quitarDelTicket = (id) => {
        setCarrito(prev => prev.map(item => item.id === id ? { ...item, cantidad: item.cantidad - 1 } : item).filter(item => item.cantidad > 0));
    };

    const limpiarTicket = () => setCarrito([]);

    const totalUSD = tasas.COP > 0 ? (totalCOP / tasas.COP) : 0;
    const totalBS = tasas.BS > 0 ? (totalCOP / tasas.BS) : 0;

    const menuDelTurno = productos.filter(p => p.turno === turnoActivo || p.turno === 'Ambos');

    return (
        <div className={isDark ? 'dark' : ''}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 transition-colors duration-300"
            >

                <style>{`
          @media print {
            body * { visibility: hidden; }
            #zona-impresion, #zona-impresion * { visibility: visible; }
            #zona-impresion { position: absolute; left: 0; top: 0; width: 300px; padding: 10px; margin: 0; }
          }
        `}</style>

                {/* PANEL IZQUIERDO (MENÚ) - Entra desde la izquierda */}
                <motion.div
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="flex-1 flex flex-col h-full overflow-hidden"
                >
                    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-8 py-5 flex justify-between items-center shadow-sm z-10 border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">L&L Punto de Venta</h1>
                            <div className="flex gap-4 mt-2">
                                <button onClick={() => setTurnoActivo('Mañana')} className={`text-sm font-bold pb-1 transition-all ${turnoActivo === 'Mañana' ? 'text-amber-500 border-b-2 border-amber-500 scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-amber-400'}`}>☀️ Mañana</button>
                                <button onClick={() => setTurnoActivo('Noche')} className={`text-sm font-bold pb-1 transition-all ${turnoActivo === 'Noche' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 scale-105' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-400'}`}>🌙 Noche</button>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsDark(!isDark)} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                                {isDark ? '☀️ Claro' : '🌙 Oscuro'}
                            </motion.button>

                            {rol === 'admin' && (
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Link to="/dashboard" className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors block">⚙️ Dashboard</Link>
                                </motion.div>
                            )}
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                                Salir
                            </motion.button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        <motion.div layout className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                            <AnimatePresence>
                                {menuDelTurno.map((prod, index) => (
                                    <motion.button
                                        key={prod.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        transition={{ delay: index * 0.05, type: "spring", stiffness: 200 }}
                                        whileHover={{ scale: 1.03, y: -5 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => agregarAlTicket(prod)}
                                        className="bg-white dark:bg-slate-800 p-5 rounded-3xl text-left flex flex-col justify-between h-32 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl transition-shadow"
                                    >
                                        <span className="font-bold text-slate-700 dark:text-slate-200 leading-tight">{prod.producto}</span>
                                        <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-black px-3 py-1 rounded-full w-fit">{parseFloat(prod.precio_venta_cop).toLocaleString('es-CO')}</span>
                                    </motion.button>
                                ))}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </motion.div>

                {/* PANEL DERECHO (TICKET) - Entra desde la derecha */}
                <motion.div
                    initial={{ x: 30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="w-[450px] bg-white dark:bg-slate-800 border-l border-slate-100 dark:border-slate-700 shadow-2xl flex flex-col z-20 transition-colors duration-300"
                >
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Detalles del Cliente</h3>

                        <select value={pedidoSeleccionado} onChange={(e) => setPedidoSeleccionado(e.target.value)} className="w-full mb-3 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 outline-none bg-white dark:bg-slate-700 font-bold text-slate-700 dark:text-white transition-colors cursor-pointer">
                            <option value="">🛒 Nuevo Pedido (Mesa Nueva)</option>
                            {pedidosAbiertos.map(p => (
                                <option key={p.id} value={p.id}>➕ Sumar al Ticket #{p.id} - {p.nombre || 'Sin nombre'}</option>
                            ))}
                        </select>

                        <AnimatePresence>
                            {!pedidoSeleccionado && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="flex gap-2 overflow-hidden"
                                >
                                    <input
                                        type="text" placeholder="Cédula" value={cedula} onChange={manejarCambioCedula}
                                        className="w-1/3 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors font-bold"
                                    />
                                    <input
                                        type="text" placeholder="Nombre y Apellido" value={nombre} onChange={manejarCambioNombre}
                                        className="w-2/3 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors font-bold"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <div className="px-8 py-4 bg-slate-900 dark:bg-black text-white flex justify-between items-center transition-colors">
                        <h2 className="text-lg font-bold">🧾 Orden Actual</h2>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={limpiarTicket} className="text-sm font-bold text-red-400 hover:text-red-300 transition-colors">Vaciar</motion.button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8">
                        {carrito.length === 0 ? (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-slate-400 font-medium mt-10">Orden vacía</motion.p>
                        ) : (
                            <ul className="space-y-5">
                                <AnimatePresence>
                                    {carrito.map((item, index) => (
                                        <motion.li
                                            key={item.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20, scale: 0.9 }}
                                            layout
                                            className="flex gap-4 items-start"
                                        >
                                            <div className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold px-3 py-1 rounded-lg text-sm mt-1 transition-colors">x{item.cantidad}</div>
                                            <div className="flex-1 cursor-pointer" onClick={() => quitarDelTicket(item.id)}>
                                                <p className="font-bold text-slate-800 dark:text-slate-100 leading-tight hover:line-through hover:text-red-500 transition-colors">{item.producto}</p>
                                            </div>
                                            <span className="font-bold text-slate-900 dark:text-white">{(parseFloat(item.precio_venta_cop) * item.cantidad).toLocaleString('es-CO')}</span>
                                        </motion.li>
                                    ))}
                                </AnimatePresence>
                            </ul>
                        )}
                    </div>

                    <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 transition-colors">
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-4 mb-6 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
                            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Abono Entregado (COP)</label>
                            <input type="number" min="0" placeholder={`Ej: ${totalCOP}`} value={abono} onChange={(e) => setAbono(e.target.value)} className="w-full outline-none font-black text-xl text-slate-800 dark:text-white bg-transparent placeholder-slate-300 dark:placeholder-slate-500" />
                        </div>

                        <div className="space-y-2 mb-6">
                            <div className="flex justify-between items-center text-slate-800 dark:text-white font-black text-xl border-b border-slate-200 dark:border-slate-700 pb-2">
                                <span>TOTAL COP</span>
                                <motion.span layout className="text-blue-600 dark:text-blue-400">{totalCOP.toLocaleString('es-CO')} COP</motion.span>
                            </div>
                            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-bold text-sm mt-2">
                                <span>USD (Tasa: {tasas.COP})</span>
                                <span>${totalUSD.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-bold text-sm">
                                <span>BS (Tasa Frontera: {tasas.BS})</span>
                                <span>{totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BS</span>
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: carrito.length > 0 ? 1.02 : 1 }}
                            whileTap={{ scale: carrito.length > 0 ? 0.98 : 1 }}
                            onClick={procesarVenta}
                            disabled={carrito.length === 0}
                            className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-colors text-lg"
                        >
                            {pedidoSeleccionado ? '➕ Sumar al Pedido' : '💰 Cobrar y Generar Factura'}
                        </motion.button>
                    </div>
                </motion.div>

                {/* MODAL DE FACTURA ANIMADO */}
                <AnimatePresence>
                    {facturaActiva && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 30, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.9, y: 30, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 250, damping: 25 }}
                                className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col w-[380px] max-h-[90vh]"
                            >
                                <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                                    <h3 className="font-bold text-slate-800">Vista Previa de Factura</h3>
                                    <button onClick={() => setFacturaActiva(null)} className="text-slate-400 hover:text-red-500 font-bold transition-colors">✕ Cerrar</button>
                                </div>

                                <div id="zona-impresion" className="p-8 overflow-y-auto bg-white text-black font-mono text-sm">
                                    <div className="text-center mb-6">
                                        <h2 className="font-black text-2xl tracking-tighter">L&L BURGERS</h2>
                                        <p className="text-xs mt-1">San Cristóbal, Táchira</p>
                                        <p className="text-xs">--------------------------------</p>
                                        <p className="font-bold mt-2">TICKET #{facturaActiva.ticket_id}</p>
                                        <p className="text-xs">{facturaActiva.fecha}</p>
                                    </div>

                                    <div className="mb-4">
                                        <p><span className="font-bold">CLIENTE:</span> {facturaActiva.cliente}</p>
                                        <p><span className="font-bold">C.I:</span> {facturaActiva.ci}</p>
                                    </div>

                                    <div className="border-t border-b border-dashed border-black py-2 mb-4 space-y-2">
                                        {facturaActiva.items.map((item, i) => (
                                            <div key={i} className="flex justify-between items-start gap-2">
                                                <span className="flex-1">{item.cantidad}x {item.producto}</span>
                                                <span className="font-bold">{(item.precio_venta_cop * item.cantidad).toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="space-y-1 mb-6">
                                        <div className="flex justify-between items-end">
                                            <span className="font-bold text-lg">TOTAL A PAGAR:</span>
                                            <span className="font-black text-xl">{facturaActiva.totalCOP.toLocaleString()} COP</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span>Su Abono:</span>
                                            <span>{facturaActiva.abono.toLocaleString()} COP</span>
                                        </div>
                                        {facturaActiva.deuda > 0 && (
                                            <div className="flex justify-between items-center font-bold mt-2 pt-2 border-t border-black">
                                                <span>SALDO PENDIENTE:</span>
                                                <span>{facturaActiva.deuda.toLocaleString()} COP</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-center text-xs mt-8">
                                        <p>¡Gracias por su compra!</p>
                                        <p>Vuelva pronto</p>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => window.print()} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-md transition-colors flex justify-center items-center gap-2">
                                        🖨️ Imprimir Ticket
                                    </motion.button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </motion.div>
        </div>
    );
}