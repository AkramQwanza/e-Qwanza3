import { Button } from "@/components/ui/button";
import { Building2, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatMode = 'enterprise' | 'personal';

interface ModeSelectorProps {
  currentMode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
}

export const ModeSelector = ({ currentMode, onModeChange }: ModeSelectorProps) => {
  return (
    <div className="flex gap-2 p-2 bg-secondary rounded-lg">
      <Button
        variant={currentMode === 'enterprise' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('enterprise')}
        className={cn(
          "flex-1 gap-2 transition-all",
          currentMode === 'enterprise' 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Building2 className="w-4 h-4" />
        Entreprise
      </Button>
      <Button
        variant={currentMode === 'personal' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onModeChange('personal')}
        className={cn(
          "flex-1 gap-2 transition-all",
          currentMode === 'personal' 
            ? "bg-primary text-primary-foreground shadow-sm" 
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <User className="w-4 h-4" />
        Personnel
      </Button>
    </div>
  );
};