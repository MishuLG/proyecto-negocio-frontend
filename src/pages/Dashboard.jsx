import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();
    const [tasaCOP, setTasaCOP] = useState('');
    const [tasaBS, setTasaBS] = useState('');
    const [nuevoProd, setNuevoProd] = useState({ nombre: '', categoria_id: 1, precio_usd: '' });

    useEffect(() => {
        fetch('http://localhost:3000/api/tasas')
            .then(res => res.json())
            .then(data => {
                const cop = data.find(t => t.moneda === 'COP');
                const bs = data.find(t => t.moneda === 'BS');
                if (cop) setTasaCOP(cop.tasa);
                if (bs) setTasaBS(bs.tasa);
            });
    }, []);

    const actualizarTasa = async (moneda, valor) => {
        await fetch('http://localhost:3000/api/tasas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moneda, tasa: parseFloat(valor) })
        });
        alert(`Tasa de ${moneda} actualizada correctamente`);
    };

    const agregarProducto = async (e) => {
        e.preventDefault();
        await fetch('http://localhost:3000/api/productos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevoProd.nombre, categoria_id: parseInt(nuevoProd.categoria_id), precio_venta_usd: parseFloat(nuevoProd.precio_usd) })
        });
        alert('¡Producto agregado al menú!');
        setNuevoProd({ nombre: '', categoria_id: 1, precio_usd: '' });
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Módulo Tasas */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">💱 Tasas de Cambio del Día</h2>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-slate-600 w-16">COP:</span>
                            <input type="number" value={tasaCOP} onChange={e => setTasaCOP(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 outline-none" placeholder="Ej: 3900" />
                            <button onClick={() => actualizarTasa('COP', tasaCOP)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">Guardar</button>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-slate-600 w-16">BS:</span>
                            <input type="number" value={tasaBS} onChange={e => setTasaBS(e.target.value)} className="flex-1 px-4 py-3 rounded-xl border border-slate-300 outline-none" placeholder="Ej: 38.50" />
                            <button onClick={() => actualizarTasa('BS', tasaBS)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold">Guardar</button>
                        </div>
                    </div>
                </div>

                {/* Módulo Productos */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold mb-6 text-slate-800">🍔 Agregar Nuevo Producto</h2>
                    <form onSubmit={agregarProducto} className="space-y-4">
                        <input type="text" placeholder="Nombre (Ej: Perro Caliente Especial)" required value={nuevoProd.nombre} onChange={e => setNuevoProd({ ...nuevoProd, nombre: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none" />
                        <div className="flex gap-4">
                            <input type="number" step="0.01" placeholder="Precio en USD" required value={nuevoProd.precio_usd} onChange={e => setNuevoProd({ ...nuevoProd, precio_usd: e.target.value })} className="w-1/2 px-4 py-3 rounded-xl border border-slate-300 outline-none" />
                            <select value={nuevoProd.categoria_id} onChange={e => setNuevoProd({ ...nuevoProd, categoria_id: e.target.value })} className="w-1/2 px-4 py-3 rounded-xl border border-slate-300 outline-none">
                                <option value="1">Hamburguesas (Noche)</option>
                                <option value="2">Desayunos (Mañana)</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white py-4 rounded-xl font-bold text-lg transition-all shadow-md mt-2">Crear Producto</button>
                    </form>
                </div>
            </div>
        </div>
    );
}