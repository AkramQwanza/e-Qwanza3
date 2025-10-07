import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/LoginForm";
import { RegisterForm } from "@/components/RegisterForm";
import { useToast } from "@/hooks/use-toast";
import { Bot, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, register } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const ok = await login(email, password);
      if (!ok) throw new Error("Email ou mot de passe incorrect");
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Erreur de connexion",
        description: error?.message || "Email ou mot de passe incorrect",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    setIsLoading(true);
    try {
      const ok = await register(data.firstName, data.lastName, data.email, data.password);
      if (!ok) throw new Error("Impossible de créer le compte");
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Erreur d'inscription",
        description: error?.message || "Impossible de créer le compte",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header avec logo */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl shadow-lg">
                <Bot className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              e-Qwanza
            </h1>
            <p className="text-muted-foreground mt-2">
              Votre assistant IA intelligent
            </p>
          </div>

          {/* Tabs pour Login/Register */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Connexion
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Inscription
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <LoginForm onLogin={handleLogin} isLoading={isLoading} />
            </TabsContent>
            
            <TabsContent value="register">
              <RegisterForm onRegister={handleRegister} isLoading={isLoading} />
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>© 2025 e-Qwanza. Tous droits réservés.</p>
          </div>
        </div>
      </div>
  );
};

export default Auth;
