import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Landmark, Bell, Menu, X, LogOut } from 'lucide-react';

export default function Navbar({ notifications = 0, variant = 'default' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate('/login');
  };

  if (variant === 'admin') {
    return (
      <header className="flex items-center justify-between px-4 md:px-8 py-4 bg-white shadow-sm z-10 relative">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Landmark className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">GCE Srirangam</h1>
              <p className="text-xs text-gray-500">Placement Cell</p>
            </div>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm text-gray-500">
            <Link to="/admin/dashboard" className="hover:text-blue-600 transition-colors">Home</Link>
            <Link to="/admin/students" className="hover:text-blue-600 transition-colors">Students</Link>
            <Link to="/admin/notifications" className="hover:text-blue-600 transition-colors">Notifications</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/admin/notifications" className="relative cursor-pointer">
            <Bell className="w-5 h-5 text-gray-600" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                {notifications > 9 ? '9+' : notifications}
              </span>
            )}
          </Link>
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            A
          </div>
          <button onClick={handleLogout} className="hidden md:flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between px-4 md:px-10 py-4 bg-white shadow-sm z-10 relative">
      <Link to="/" className="flex items-center gap-3">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Landmark className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-none">GCE Srirangam</h1>
          <p className="text-xs text-gray-500">Placement Cell</p>
        </div>
      </Link>

      <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
        <a href="#vision" className="hover:text-blue-600 transition-colors">Vision</a>
        <a href="#mission" className="hover:text-blue-600 transition-colors">Mission</a>
        <Link to="/login" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          Login
        </Link>
      </nav>

      <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-white shadow-lg py-4 px-6 flex flex-col gap-4 text-sm md:hidden">
          <a href="#vision" onClick={() => setMenuOpen(false)}>Vision</a>
          <a href="#mission" onClick={() => setMenuOpen(false)}>Mission</a>
          <Link to="/login" onClick={() => setMenuOpen(false)} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-center font-medium">
            Login
          </Link>
        </div>
      )}
    </header>
  );
}
