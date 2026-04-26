import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function POS() {
    const [productos, setProductos] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [turnoActivo, setTurnoActivo] = useState('Noche');
    const [tasas, setTasas] = useState({ COP: 1, BS: 1 });
    const navigate = useNavigate();
    const rol = localStorage.getItem('rol');

    useEffect(() => {
        fetch('http://localhost:3000/api/productos')
            .then(res => res.json())
            .then(data => setProductos(data));

        fetch('http://localhost:3000/api/tasas')
            .then(res => res.json())
            .then(data => {
                const cop = data.find(t => t.moneda === 'COP')?.tasa || 1;
                const bs = data.find(t => t.moneda === 'BS')?.tasa || 1;
                setTasas({ COP: parseFloat(cop), BS: parseFloat(bs) });
            });
    }, []);

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

    const totalUSD = carrito.reduce((sum, item) => sum + (parseFloat(item.precio_venta_usd) * item.cantidad), 0);
    const totalCOP = totalUSD * tasas.COP;
    const totalBS = totalUSD * tasas.BS;
    const menuDelTurno = productos.filter(p => p.turno === turnoActivo || p.turno === 'Ambos');

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="bg-white/90 backdrop-blur-md px-8 py-5 flex justify-between items-center shadow-sm z-10 border-b border-slate-200">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">L&L Punto de Venta</h1>
                        <div className="flex gap-4 mt-2">
                            <button onClick={() => setTurnoActivo('Mañana')} className={`text-sm font-bold pb-1 ${turnoActivo === 'Mañana' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-slate-400'}`}>☀️ Mañana</button>
                            <button onClick={() => setTurnoActivo('Noche')} className={`text-sm font-bold pb-1 ${turnoActivo === 'Noche' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400'}`}>🌙 Noche</button>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {rol === 'admin' && (
                            <Link to="/dashboard" className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded-lg font-bold text-sm transition-all">⚙️ Dashboard</Link>
                        )}
                        <button onClick={() => { localStorage.clear(); navigate('/'); }} className="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg font-bold text-sm transition-all">Salir</button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                        {menuDelTurno.map((prod) => (
                            <button key={prod.id} onClick={() => agregarAlTicket(prod)} className="bg-white p-5 rounded-3xl text-left flex flex-col justify-between h-32 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-95 transition-all">
                                <span className="font-bold text-slate-700 leading-tight">{prod.producto}</span>
                                <span className="bg-slate-100 text-slate-600 text-sm font-black px-3 py-1 rounded-full w-fit">${parseFloat(prod.precio_venta_usd).toFixed(2)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="w-[420px] bg-white border-l border-slate-100 shadow-2xl flex flex-col z-20">
                <div className="px-8 py-6 border-b border-slate-100 bg-slate-900 text-white flex justify-between items-center">
                    <h2 className="text-lg font-bold">🧾 Orden Actual</h2>
                    <button onClick={limpiarTicket} className="text-sm font-bold text-red-400 hover:text-red-300">Vaciar</button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                    {carrito.length === 0 ? (
                        <p className="text-center text-slate-400 font-medium mt-10">Orden vacía</p>
                    ) : (
                        <ul className="space-y-5">
                            {carrito.map((item, index) => (
                                <li key={index} className="flex gap-4 items-start">
                                    <div className="bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-lg text-sm mt-1">x{item.cantidad}</div>
                                    <div className="flex-1 cursor-pointer" onClick={() => quitarDelTicket(item.id)}>
                                        <p className="font-bold text-slate-800 leading-tight hover:line-through hover:text-red-500">{item.producto}</p>
                                    </div>
                                    <span className="font-bold text-slate-900">${(parseFloat(item.precio_venta_usd) * item.cantidad).toFixed(2)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="p-8 bg-slate-50 border-t border-slate-200">
                    <div className="space-y-2 mb-6">
                        <div className="flex justify-between items-center text-slate-500 font-bold text-sm">
                            <span>Total COP (Tasa: {tasas.COP})</span>
                            <span>{totalCOP.toLocaleString('es-CO')} COP</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-500 font-bold text-sm">
                            <span>Total BS (Tasa: {tasas.BS})</span>
                            <span>{totalBS.toLocaleString('es-VE')} BS</span>
                        </div>
                        <div className="flex justify-between items-end pt-3 border-t border-slate-200 mt-2">
                            <span className="text-slate-800 font-black text-lg">TOTAL USD</span>
                            <span className="text-4xl font-black text-green-600">${totalUSD.toFixed(2)}</span>
                        </div>
                    </div>
                    <button disabled={carrito.length === 0} className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95 text-lg">
                        💰 Procesar Venta
                    </button>
                </div>
            </div>
        </div>
    );
}