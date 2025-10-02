import { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "./Navbar";

interface LayoutProps {
  children: ReactNode;
  className?: string;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

const Layout = ({ children, className = "", sidebarOpen, onSidebarToggle }: LayoutProps) => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/auth';

  // Pour la page d'authentification, ne pas utiliser le Layout
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      <Navbar sidebarOpen={sidebarOpen} onSidebarToggle={onSidebarToggle} />
      <main className={`pt-16 ${className}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
