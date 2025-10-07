import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { accessToken } = useAuth();
  if (!accessToken) return <Navigate to="/auth" replace />;
  return children;
};


