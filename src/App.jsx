import { BrowserRouter, Routes, Route } from 'react-router-dom';
import RutaProtegida from './components/RutaProtegida';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route path="/pos" element={
          <RutaProtegida>
            <POS />
          </RutaProtegida>
        } />

        <Route path="/dashboard" element={
          <RutaProtegida rolRequerido="admin">
            <Dashboard />
          </RutaProtegida>
        } />
      </Routes>
    </BrowserRouter>
  );
}