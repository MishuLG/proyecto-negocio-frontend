import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // <-- Aquí estaba el error, ya está arreglado

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // ESTADO: Controlador del Modo Oscuro sincronizado
    const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');

    // Aplicar modo oscuro a todo el HTML
    useEffect(() => {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('rol', data.usuario.rol);
                localStorage.setItem('username', data.usuario.username);

                // Redirección inteligente: Si es admin va al Dashboard, si es cajero va al POS
                if (data.usuario.rol === 'admin') {
                    navigate('/dashboard');
                } else {
                    navigate('/pos');
                }
            } else {
                setError(data.error || 'Credenciales incorrectas');
            }
        } catch (err) {
            setError('Error conectando con el servidor de L&L Burgers');
        }
    };

    return (
        <div className={isDark ? 'dark' : ''}>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-300 p-4"
            >
                {/* BOTÓN MODO OSCURO (Discreto en la esquina) */}
                <motion.button
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsDark(!isDark)}
                    className="absolute top-6 right-6 bg-white dark:bg-slate-800 text-slate-800 dark:text-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 font-bold text-sm transition-colors"
                >
                    {isDark ? '☀️ Claro' : '🌙 Oscuro'}
                </motion.button>

                <motion.div
                    initial={{ scale: 0.9, y: 40, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    className="bg-white dark:bg-slate-800 p-10 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md transition-colors"
                >
                    <div className="text-center mb-8">
                        <motion.div
                            initial={{ rotate: -10, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                            className="w-20 h-20 bg-blue-600 dark:bg-blue-500 rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-6"
                        >
                            <span className="text-4xl text-white">🍔</span>
                        </motion.div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">L&L Burgers</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Sistema de Gestión y Ventas</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Usuario</label>
                            <input
                                type="text"
                                placeholder="Ingresa tu usuario"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-5 py-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all font-medium"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Contraseña</label>
                            <input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-4 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-700 transition-all font-medium"
                                required
                            />
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-600 dark:text-red-400 p-3 rounded-r-lg font-bold text-sm"
                                >
                                    ⚠️ {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-lg mt-4"
                        >
                            Iniciar Sesión
                        </motion.button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">V 1.0.0 • Entorno Seguro</p>
                    </div>
                </motion.div>

            </motion.div>
        </div>
    );
}