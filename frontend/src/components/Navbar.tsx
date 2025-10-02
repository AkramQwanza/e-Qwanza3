import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Settings, 
  LogOut, 
  User, 
  Home,
  FolderOpen,
  MessageSquare,
  Menu,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface NavbarProps {
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
}

const Navbar = ({ sidebarOpen, onSidebarToggle }: NavbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Déterminer si on est sur une page personnelle
  const isPersonalPage = location.pathname.startsWith('/personal');
  const isAuthPage = location.pathname === '/auth';
  const isEnterprisePage = location.pathname === '/';

  // Gérer la déconnexion
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Ici vous pouvez ajouter la logique de déconnexion (appel API, suppression des tokens, etc.)
      // Pour l'instant, on simule juste un délai
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Rediriger vers la page d'authentification
      navigate('/auth');
      
      toast({
        title: "Déconnexion réussie",
        description: "Vous avez été déconnecté avec succès.",
      });
    } catch (error) {
      toast({
        title: "Erreur de déconnexion",
        description: "Une erreur est survenue lors de la déconnexion.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Gérer les paramètres
  const handleSettings = () => {
    toast({
      title: "Paramètres",
      description: "Fonctionnalité de paramètres à venir.",
    });
  };

  // Navigation
  const handleHome = () => {
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handlePersonalProjects = () => {
    navigate('/personal');
    setMobileMenuOpen(false);
  };

  // Ne pas afficher la navbar sur la page d'authentification
  if (isAuthPage) {
    return null;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-foreground">
                e-Qwanza
              </h1>
            </div>
            
            {/* Bouton toggle sidebar pour entreprise */}
            {isEnterprisePage && onSidebarToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSidebarToggle}
                className="ml-4 hover:bg-sidebar-accent"
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            )}
          </div>

          {/* Navigation principale - Desktop */}
          <div className="hidden md:flex items-center space-x-1">
            <Button
              variant={location.pathname === '/' ? 'default' : 'ghost'}
              size="sm"
              onClick={handleHome}
              className="flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span>Entreprise</span>
            </Button>
            
            <Button
              variant={isPersonalPage ? 'default' : 'ghost'}
              size="sm"
              onClick={handlePersonalProjects}
              className="flex items-center space-x-2"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Personnel</span>
            </Button>
          </div>

          {/* Actions - Profil et Thème */}
          <div className="flex items-center space-x-2">
            {/* Toggle de thème */}
            <ThemeToggle />

            {/* Menu de profil */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/profile.png" alt="Profil" />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Utilisateur</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      utilisateur@example.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Paramètres</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Menu mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Menu mobile */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-card/95 backdrop-blur-sm">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Button
                variant={location.pathname === '/' ? 'default' : 'ghost'}
                size="sm"
                onClick={handleHome}
                className="w-full justify-start flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Entreprise</span>
              </Button>
              
              <Button
                variant={isPersonalPage ? 'default' : 'ghost'}
                size="sm"
                onClick={handlePersonalProjects}
                className="w-full justify-start flex items-center space-x-2"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Personnel</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
