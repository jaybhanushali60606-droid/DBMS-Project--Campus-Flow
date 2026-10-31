import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User as UserIcon, Bell } from 'lucide-react';
import { Badge } from '../ui/Badge';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  const getRoleBadgeVariant = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'danger';
      case 'FACULTY':
        return 'primary';
      case 'STUDENT':
        return 'success';
      default:
        return 'neutral';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-bold bg-gradient-to-r from-sky-700 to-indigo-800 bg-clip-text text-transparent">
          CampusFlow
        </h2>
        <span className="hidden sm:inline text-xs text-slate-400 font-medium">| College Management System</span>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-800">{user.full_name || user.username}</span>
              <span className="text-xs text-slate-500">{user.email}</span>
            </div>

            <Badge variant={getRoleBadgeVariant(user.role)}>
              {user.role}
            </Badge>

            <div className="h-9 w-9 rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800 font-bold text-sm">
              {(user.full_name || user.username).charAt(0).toUpperCase()}
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
