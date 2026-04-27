import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();
    const [tasaCOP, setTasaCOP] = useState('');
    const [tasaBS, setTasaBS] = useState('');
    const [nuevoProd, setNuevoProd] = useState({ nombre: '', categoria_id: 1, precio_cop: '' });

    const [ventasHoy, setVentasHoy] = useState([]);
    const [productos, setProductos] = useState([]);
    const [editandoId, setEditandoId] = useState(null);
    const [datosEdicion, setDatosEdicion] = useState({ nombre: '', precio_cop: '', categoria_id: 1 });

    const [deudores, setDeudores] = useState([]);
    const [totalCalle, setTotalCalle] = useState(0);

    const cargarDatos = () => {
        fetch('http://localhost:3000/api/tasas').then(res => res.json()).then(data => {
            const cop = data.find(t => t.moneda === 'COP');
            const bs = data.find(t => t.moneda === 'BS');
            if (cop) setTasaCOP(cop.tasa);
            if (bs) setTasaBS(bs.tasa);
        });
        fetch('http://localhost:3000/api/dashboard/ventas-hoy').then(res => res.json()).then(data => setVentasHoy(data));
        fetch('http://localhost:3000/api/productos').then(res => res.json()).then(data => setProductos(data));
        fetch('http://localhost:3000/api/clientes/deudores').then(res => res.json()).then(data => {
            setDeudores(data.clientes || []);
            setTotalCalle(data.total_dinero_en_calle_cop || 0);
        });
    };

    useEffect(() => { cargarDatos(); }, []);

    const actualizarTasa = async (moneda, valor) => {
        await fetch('http://localhost:3000/api/tasas', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moneda, tasa: parseFloat(valor) })
        });
        alert(`Tasa de ${moneda} actualizada correctamente`);
    };

    const agregarProducto = async (e) => {
        e.preventDefault();
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
        await fetch(`http://localhost:3000/api/productos/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: datosEdicion.nombre, categoria_id: parseInt(datosEdicion.categoria_id), precio_venta_cop: parseFloat(datosEdicion.precio_cop) })
        });
        setEditandoId(null);
        cargarDatos();
    };

    const eliminarProducto = async (id, nombre) => {
        if (window.confirm(`¿Eliminar "${nombre}"?`)) {
            await fetch(`http://localhost:3000/api/productos/${id}`, { method: 'DELETE' });
            cargarDatos();
        }
    };

    // NUEVO: Cobrarle a un cliente
    const pagarDeuda = async (cliente_id, nombre, deuda_actual) => {
        const montoStr = window.prompt(`¿Cuánto va a abonar ${nombre}?\nDeuda actual: ${parseFloat(deuda_actual).toLocaleString('es-CO')} COP`);

        if (montoStr && !isNaN(montoStr) && Number(montoStr) > 0) {
            await fetch(`http://localhost:3000/api/clientes/${cliente_id}/pagar-deuda`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ monto_abonado: Number(montoStr) })
            });
            alert("¡Abono registrado con éxito!");
            cargarDatos();
        }
    };

    return (
        <div className="p-10 bg-slate-50 min-h-screen font-sans text-slate-800">
            <div className="flex justify-between items-center mb-10 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h1 className="text-3xl font-black text-slate-900">⚙️ Panel de Control</h1>
                <div className="flex gap-4">
                    <Link to="/pos" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md">Ir a la Caja (POS)</Link>
                    <button onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-red-100 text-red-600 hover:bg-red-200 px-6 py-3 rounded-xl font-bold transition-all">Salir</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">💱 Tasas de Cambio del Día</h2>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-slate-600 w-auto whitespace-nowrap">COP/USD:</span>
                            <input type="number" value={tasaCOP} onChange={e => setTasaCOP(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 outline-none" placeholder="Ej: 3900" />
                            <button onClick={() => actualizarTasa('COP', tasaCOP)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">Guardar</button>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-slate-600 w-auto whitespace-nowrap">BS (Tasa Frontera):</span>
                            <input type="number" step="0.1" value={tasaBS} onChange={e => setTasaBS(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 outline-none" placeholder="Ej: 5 (5000 COP = 1000 BS)" />
                            <button onClick={() => actualizarTasa('BS', tasaBS)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">Guardar</button>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">🍔 Agregar Nuevo Producto</h2>
                    <form onSubmit={agregarProducto} className="space-y-4">
                        <input type="text" placeholder="Nombre (Ej: Perro Caliente Especial)" required value={nuevoProd.nombre} onChange={e => setNuevoProd({ ...nuevoProd, nombre: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none" />
                        <div className="flex gap-4">
                            <input type="number" step="100" placeholder="Precio en COP" required value={nuevoProd.precio_cop} onChange={e => setNuevoProd({ ...nuevoProd, precio_cop: e.target.value })} className="w-1/2 px-4 py-3 rounded-xl border border-slate-300 outline-none" />
                            <select value={nuevoProd.categoria_id} onChange={e => setNuevoProd({ ...nuevoProd, categoria_id: e.target.value })} className="w-1/2 px-4 py-3 rounded-xl border border-slate-300 outline-none">
                                <option value="1">Noche</option>
                                <option value="2">Mañana</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-md mt-2">Crear Producto</button>
                    </form>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-8">
                <h2 className="text-xl font-bold mb-6 text-slate-800">📦 Gestión de Catálogo y Precios</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-100 text-slate-600">
                                <th className="p-4 rounded-l-xl w-1/2">Producto</th>
                                <th className="p-4">Precio (COP)</th>
                                <th className="p-4">Turno</th>
                                <th className="p-4 rounded-r-xl text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productos.map(prod => (
                                <tr key={prod.id} className="border-b border-slate-50 hover:bg-slate-50">
                                    {editandoId === prod.id ? (
                                        <>
                                            <td className="p-2"><input type="text" value={datosEdicion.nombre} onChange={e => setDatosEdicion({ ...datosEdicion, nombre: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" /></td>
                                            <td className="p-2"><input type="number" step="100" value={datosEdicion.precio_cop} onChange={e => setDatosEdicion({ ...datosEdicion, precio_cop: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" /></td>
                                            <td className="p-2">
                                                <select value={datosEdicion.categoria_id} onChange={e => setDatosEdicion({ ...datosEdicion, categoria_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none">
                                                    <option value="1">Noche</option>
                                                    <option value="2">Mañana</option>
                                                </select>
                                            </td>
                                            <td className="p-2 flex gap-2 justify-center">
                                                <button onClick={() => guardarEdicion(prod.id)} className="bg-green-500 text-white px-3 py-2 rounded-lg font-bold text-sm">Guardar</button>
                                                <button onClick={() => setEditandoId(null)} className="bg-slate-300 text-slate-800 px-3 py-2 rounded-lg font-bold text-sm">Cancelar</button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-4 font-bold text-slate-800">{prod.producto || prod.nombre}</td>
                                            <td className="p-4 font-bold text-green-600">{parseFloat(prod.precio_venta_cop).toLocaleString('es-CO')} COP</td>
                                            <td className="p-4 text-slate-500">{prod.turno || (prod.categoria_id === 1 ? 'Noche' : 'Mañana')}</td>
                                            <td className="p-4 flex gap-2 justify-center">
                                                <button onClick={() => iniciarEdicion(prod)} className="bg-blue-100 text-blue-600 px-4 py-2 rounded-lg font-bold text-sm">✏️</button>
                                                <button onClick={() => eliminarProducto(prod.id, prod.producto || prod.nombre)} className="bg-red-50 text-red-500 px-4 py-2 rounded-lg font-bold text-sm">🗑️</button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* LISTA GENERAL DE PEDIDOS (CON ETIQUETAS) */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 mb-8">
                <h2 className="text-xl font-bold mb-6 text-slate-800">📋 Pedidos del Día</h2>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600">
                            <th className="p-4 rounded-l-xl">Ticket #</th>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Total</th>
                            <th className="p-4 text-green-600">Abonado</th>
                            <th className="p-4 text-red-500 rounded-r-xl">Deuda</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ventasHoy.length === 0 ? (
                            <tr><td colSpan="6" className="p-4 text-center text-slate-500">Aún no hay ventas hoy</td></tr>
                        ) : (
                            ventasHoy.map(venta => {
                                // Matemática de etiquetas
                                const esPagado = venta.estado_pago === 'Pagado';
                                const pagadoVisual = esPagado ? venta.total_cop : venta.pagado;
                                const deudaVisual = esPagado ? 0 : (venta.total_cop - venta.pagado);

                                return (
                                    <tr key={venta.id} className="border-b border-slate-50 hover:bg-slate-50">
                                        <td className="p-4 font-bold">#{venta.id}</td>
                                        <td className="p-4">{venta.nombre || 'Cliente de paso'}</td>
                                        <td className="p-4">
                                            {esPagado ? (
                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold text-xs">✅ Pagado</span>
                                            ) : (
                                                <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold text-xs">⏳ Pendiente</span>
                                            )}
                                        </td>
                                        <td className="p-4 font-bold text-slate-700">{parseFloat(venta.total_cop).toLocaleString('es-CO')}</td>
                                        <td className="p-4 font-bold text-green-600">{parseFloat(pagadoVisual).toLocaleString('es-CO')}</td>
                                        <td className="p-4 font-bold text-red-500">{parseFloat(deudaVisual).toLocaleString('es-CO')}</td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* MÓDULO DE CONTROL DE FIADOS (CON BOTÓN DE COBRO) */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 border-l-4 border-l-amber-500">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">⚠️ Control de Fiados (Cuentas por Cobrar)</h2>
                    <span className="font-black text-red-500 text-lg bg-red-50 px-4 py-2 rounded-lg">
                        Total en Calle: {parseFloat(totalCalle).toLocaleString('es-CO')} COP
                    </span>
                </div>
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-100 text-slate-600">
                            <th className="p-4 rounded-l-xl">Cliente</th>
                            <th className="p-4">Cédula</th>
                            <th className="p-4">Monto Adeudado</th>
                            <th className="p-4 rounded-r-xl text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {deudores.length === 0 ? (
                            <tr><td colSpan="4" className="p-4 text-center text-slate-500 font-medium">No hay deudas pendientes 🎉</td></tr>
                        ) : (
                            deudores.map(deudor => (
                                <tr key={deudor.id} className="border-b border-slate-50 hover:bg-red-50 transition-colors">
                                    <td className="p-4 font-bold text-slate-800">{deudor.nombre}</td>
                                    <td className="p-4 text-slate-600">{deudor.cedula}</td>
                                    <td className="p-4 font-black text-red-600">{parseFloat(deudor.deuda_total).toLocaleString('es-CO')} COP</td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => pagarDeuda(deudor.id, deudor.nombre, deudor.deuda_total)}
                                            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm transition-all"
                                        >
                                            💰 Abonar / Saldar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}