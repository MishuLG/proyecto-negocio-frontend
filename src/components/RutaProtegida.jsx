import { Navigate } from 'react-router-dom';

export default function RutaProtegida({ children, rolRequerido }) {
    const token = localStorage.getItem('token');
    const rol = localStorage.getItem('rol');

    if (!token) return <Navigate to="/" />;
    if (rolRequerido && rol !== rolRequerido) return <Navigate to="/pos" />;

    return children;
}