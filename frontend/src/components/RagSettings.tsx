import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface RagConfig {
  embeddingProvider: "cohere" | "ollama" | "openai";
  embeddingModel: string;
  textProvider: "openai" | "ollama";
  textModel: string;
  cohereApiKey?: string;
  openaiApiKey?: string;
}

const EMBEDDING_MODELS = {
  cohere: ["embed-multilingual-v3.0", "embed-multilingual-light-v3.0"],
  ollama: ["all-minilm"],
  openai: ["text-embedding-3-small", "text-embedding-3-large"]
} as const;

const TEXT_MODELS = {
  openai: ["gpt-4o-mini", "gpt-4o"],
  ollama: ["llama3.1:8b-text-fp16", "mistral-small:22b-instruct-2409-q5_K_M", "qwen3:14b"]
} as const;

const DEFAULT_CONFIG: RagConfig = {
  embeddingProvider: "openai",
  embeddingModel: "text-embedding-3-small",
  textProvider: "openai", 
  textModel: "gpt-4o-mini",
};

interface RagSettingsProps {
  ragConfig: RagConfig;
  onConfigChange: (config: RagConfig) => void;
}

export const RagSettings = ({ ragConfig, onConfigChange }: RagSettingsProps) => {
  const [config, setConfig] = useState<RagConfig>(ragConfig);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    // Validation des API keys
    if (config.embeddingProvider === "cohere" && !config.cohereApiKey?.trim()) {
      toast({
        title: "Erreur",
        description: "La clé API Cohere est requise pour utiliser les modèles Cohere.",
        variant: "destructive",
      });
      return;
    }

    if ((config.embeddingProvider === "openai" || config.textProvider === "openai") && !config.openaiApiKey?.trim()) {
      toast({
        title: "Erreur", 
        description: "La clé API OpenAI est requise pour utiliser les modèles OpenAI.",
        variant: "destructive",
      });
      return;
    }

    onConfigChange(config);
    setOpen(false);
    toast({
      title: "Configuration sauvegardée",
      description: "Les paramètres RAG ont été mis à jour avec succès.",
    });
  };

  const handleEmbeddingProviderChange = (provider: "cohere" | "ollama" | "openai") => {
    const defaultModel = EMBEDDING_MODELS[provider][0];
    setConfig(prev => ({
      ...prev,
      embeddingProvider: provider,
      embeddingModel: defaultModel
    }));
  };

  const handleTextProviderChange = (provider: "openai" | "ollama") => {
    const defaultModel = TEXT_MODELS[provider][0];
    setConfig(prev => ({
      ...prev,
      textProvider: provider,
      textModel: defaultModel
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="hover:bg-sidebar-accent">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paramètres RAG</DialogTitle>
          <DialogDescription>
            Configurez les providers d'embedding et de génération de texte pour votre assistant personnel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Embedding Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration d'Embedding</CardTitle>
              <CardDescription>
                Choisissez le provider et le modèle pour l'embedding des documents.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="embedding-provider">Provider d'Embedding</Label>
                <Select 
                  value={config.embeddingProvider} 
                  onValueChange={handleEmbeddingProviderChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cohere">Cohere</SelectItem>
                    <SelectItem value="ollama">Ollama</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="embedding-model">Modèle d'Embedding</Label>
                <Select 
                  value={config.embeddingModel} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, embeddingModel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMBEDDING_MODELS[config.embeddingProvider].map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {config.embeddingProvider === "cohere" && (
                <div className="space-y-2">
                  <Label htmlFor="cohere-key">Clé API Cohere</Label>
                  <Input
                    id="cohere-key"
                    type="password"
                    placeholder="Entrez votre clé API Cohere"
                    value={config.cohereApiKey || ""}
                    onChange={(e) => setConfig(prev => ({ ...prev, cohereApiKey: e.target.value }))}
                  />
                </div>
              )}

              {config.embeddingProvider === "openai" && (
                <div className="space-y-2">
                  <Label htmlFor="openai-embedding-key">Clé API OpenAI</Label>
                  <Input
                    id="openai-embedding-key"
                    type="password"
                    placeholder="Entrez votre clé API OpenAI"
                    value={config.openaiApiKey || ""}
                    onChange={(e) => setConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Text Generation Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration de Génération de Texte</CardTitle>
              <CardDescription>
                Choisissez le provider et le modèle pour la génération des réponses.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-provider">Provider de Génération</Label>
                <Select 
                  value={config.textProvider} 
                  onValueChange={handleTextProviderChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="ollama">Ollama</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="text-model">Modèle de Génération</Label>
                <Select 
                  value={config.textModel} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, textModel: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEXT_MODELS[config.textProvider].map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {config.textProvider === "openai" && (
                <div className="space-y-2">
                  <Label htmlFor="openai-key">Clé API OpenAI</Label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="Entrez votre clé API OpenAI"
                    value={config.openaiApiKey || ""}
                    onChange={(e) => setConfig(prev => ({ ...prev, openaiApiKey: e.target.value }))}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave}>
              Sauvegarder
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};