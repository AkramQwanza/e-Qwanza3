import { useState, useCallback } from "react";
import { ChatInterface, Message } from "@/components/ChatInterface";
import { ChatSidebar, ChatSession } from "@/components/ChatSidebar";
import { DocumentUpload, UploadedDocument } from "@/components/DocumentUpload";
import { ModeSelector, ChatMode } from "@/components/ModeSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RagSettings, RagConfig } from "@/components/RagSettings";
import { ThemeProvider } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, FilePlus2 } from "lucide-react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { enterpriseApiClient, personalApiClient } from "@/lib/api";

const Index = () => {
  const [chatMode, setChatMode] = useState<ChatMode>('enterprise');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionMessages, setSessionMessages] = useState<Record<string, Message[]>>({});
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ragConfig, setRagConfig] = useState<RagConfig>(() => {
    const saved = localStorage.getItem('ragConfig');
    return saved ? JSON.parse(saved) : {
      embeddingProvider: "openai",
      embeddingModel: "text-embedding-3-small",
      textProvider: "openai",
      textModel: "gpt-4o-mini",
    };
  });
  const { toast } = useToast();

  // Assets Entreprise (projet 7)
  type ProjectAsset = { asset_id: number; asset_name: string; asset_size: number; created_at?: string };
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assets, setAssets] = useState<ProjectAsset[]>([]);
  const [assetUploading, setAssetUploading] = useState(false);
  const [assetFile, setAssetFile] = useState<File | null>(null);

  // Fonction pour créer une nouvelle session
  const createNewSession = useCallback(() => {
    const newSessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: newSessionId,
      title: "Nouvelle conversation",
      lastMessage: "Conversation créée",
      timestamp: new Date(),
      messageCount: 0,
    };
    
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
    setMessages([]);
    setSidebarOpen(false);
  }, []);

  // Fonction pour sélectionner une session
  const handleSessionSelect = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    // Charger les messages de la session sélectionnée
    const sessionMsgs = sessionMessages[sessionId] || [];
    setMessages(sessionMsgs);
    setSidebarOpen(false);
  }, [sessionMessages]);

  // Fonction pour supprimer une session
  const handleDeleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    // Supprimer aussi les messages de cette session
    setSessionMessages(prev => {
      const newSessionMessages = { ...prev };
      delete newSessionMessages[sessionId];
      return newSessionMessages;
    });
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
    toast({
      title: "Session supprimée",
      description: "La conversation a été supprimée avec succès.",
    });
  }, [currentSessionId, toast]);

  // Fonction pour renommer une session
  const handleRenameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, title: newTitle } : s
    ));
    toast({
      title: "Session renommée",
      description: "Le nom de la conversation a été mis à jour.",
    });
  }, [toast]);

  // Fonctions pour gérer les documents
  const handleDocumentUpload = useCallback(async (files: FileList) => {
    const newDocuments = Array.from(files).map(file => ({
      id: Date.now().toString() + Math.random().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      status: 'uploading' as const,
    }));
    
    setDocuments(prev => [...prev, ...newDocuments]);
    
    // Utilise le client API selon le mode (personnel = project_id 2)
    const apiClient = chatMode === 'personal' ? personalApiClient : enterpriseApiClient;
    
    // Upload + process + index pour chaque fichier
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploadRes = await apiClient.uploadFile(file);
        if (!uploadRes.ok) {
          const message = (uploadRes as { ok: false; error: string }).error;
          throw new Error(message);
        }
        const fileId = uploadRes.data.asset_name || uploadRes.data.file_id;

        const processRes = await apiClient.processFiles({ chunk_size: 800, overlap_size: 100, do_reset: 0, file_id: fileId });
        if (!processRes.ok) {
          const message = (processRes as { ok: false; error: string }).error;
          throw new Error(message);
        }

        const pushRes = await apiClient.pushToIndex({ do_reset: false });
        if (!pushRes.ok) {
          const message = (pushRes as { ok: false; error: string }).error;
          throw new Error(message);
        }

        setDocuments(prev => prev.map(doc => 
          doc.name === file.name && doc.size === file.size
            ? { ...doc, status: 'processed' as const }
            : doc
        ));
      } catch (e: any) {
        setDocuments(prev => prev.map(doc => 
          doc.name === file.name && doc.size === file.size
            ? { ...doc, status: 'error' as const }
            : doc
        ));
        toast({
          title: "Erreur d'upload/traitement",
          description: e?.message || "Une erreur est survenue",
          variant: "destructive",
        });
      }
    }
    
    toast({
      title: "Documents traités",
      description: `${newDocuments.length} document(s) ont été ajoutés à votre base de connaissances.`,
    });
  }, [toast, chatMode]);

  const handleDocumentDelete = useCallback((documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
    toast({
      title: "Document supprimé",
      description: "Le document a été retiré de votre base de connaissances.",
    });
  }, [toast]);

  const handleModeChange = useCallback((mode: ChatMode) => {
    setChatMode(mode);
    // Réinitialiser les données quand on change de mode
    setCurrentSessionId(null);
    setMessages([]);
    setSidebarOpen(false);
    
    toast({
      title: `Mode ${mode === 'enterprise' ? 'Entreprise' : 'Personnel'}`,
      description: `Vous êtes maintenant en mode ${mode === 'enterprise' ? 'entreprise avec historique' : 'personnel avec documents'}.`,
    });
  }, [toast]);

  // Charger les assets (entreprise)
  const loadAssets = useCallback(async () => {
    setAssetsLoading(true);
    try {
      const res = await enterpriseApiClient.listAssets();
      if (!res.ok) throw new Error((res as { ok: false; error: string }).error);
      setAssets(res.data.assets || []);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message || "Impossible de charger les documents.", variant: "destructive" });
    } finally {
      setAssetsLoading(false);
    }
  }, [toast]);

  // Upload simple côté entreprise (même pipeline: upload -> process -> push)
  const handleEnterpriseUpload = useCallback(async () => {
    if (!assetFile) return;
    setAssetUploading(true);
    try {
      const uploadRes = await enterpriseApiClient.uploadFile(assetFile);
      if (!uploadRes.ok) {
        const message = (uploadRes as { ok: false; error: string }).error;
        throw new Error(message);
      }
      const fileId = uploadRes.data.asset_name || uploadRes.data.file_id;
      const processRes = await enterpriseApiClient.processFiles({ chunk_size: 800, overlap_size: 100, do_reset: 0, file_id: fileId });
      if (!processRes.ok) {
        const message = (processRes as { ok: false; error: string }).error;
        throw new Error(message);
      }
      const pushRes = await enterpriseApiClient.pushToIndex({ do_reset: false });
      if (!pushRes.ok) {
        const message = (pushRes as { ok: false; error: string }).error;
        throw new Error(message);
      }
      toast({ title: "Document ajouté", description: "Le document a été indexé avec succès." });
      setAssetFile(null);
      await loadAssets();
    } catch (e: any) {
      toast({ title: "Erreur d'upload", description: e?.message || "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setAssetUploading(false);
    }
  }, [assetFile, loadAssets, toast]);

  // Suppression d'un asset
  const handleEnterpriseDelete = useCallback(async (assetName: string) => {
    try {
      const res = await enterpriseApiClient.deleteAsset(assetName);
      if (!res.ok) {
        const message = (res as { ok: false; error: string }).error;
        throw new Error(message);
      }
      toast({ title: "Document supprimé", description: `${assetName} supprimé.` });
      await loadAssets();
    } catch (e: any) {
      toast({ title: "Erreur de suppression", description: e?.message || "Impossible de supprimer.", variant: "destructive" });
    }
  }, [loadAssets, toast]);

  // Fonction pour envoyer un message
  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentSessionId) {
      createNewSession();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      type: "user",
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    // Sauvegarder les messages dans la session
    setSessionMessages(prev => ({
      ...prev,
      [currentSessionId]: newMessages
    }));
    setIsLoading(true);

    // Mettre à jour la session avec le dernier message
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
        ? { 
            ...s, 
            lastMessage: content,
            timestamp: new Date(),
            messageCount: s.messageCount + 1,
            title: s.title === "Nouvelle conversation" 
              ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
              : s.title
          } 
        : s
    ));

    try {
      // Utilise le client API selon le mode
      const apiClient = chatMode === 'personal' ? personalApiClient : enterpriseApiClient;
      const res = await apiClient.answer({ text: content, limit: 4 });
      if (!res.ok) {
        const message = (res as { ok: false; error: string }).error;
        throw new Error(message);
      }
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: res.data.answer,
        type: "bot",
        timestamp: new Date(),
      };

      const finalMessages = [...newMessages, botMessage];
      setMessages(finalMessages);
      setSessionMessages(prev => ({
        ...prev,
        [currentSessionId]: finalMessages
      }));
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, messageCount: s.messageCount + 1 }
          : s
      ));

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Une erreur s'est produite lors de l'envoi du message.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, createNewSession, toast, messages]);

  // Créer une nouvelle session au premier chargement
  const handleNewChat = useCallback(() => {
    createNewSession();
  }, [createNewSession]);

  // Fonction pour gérer la configuration RAG
  const handleRagConfigChange = useCallback((newConfig: RagConfig) => {
    setRagConfig(newConfig);
    localStorage.setItem('ragConfig', JSON.stringify(newConfig));
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="chatbot-theme">
      <div className="h-screen flex bg-gradient-background">
        {/* Sidebar - Desktop */}
        <div className={cn(
          "hidden md:block transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0"
        )}>
          {sidebarOpen && (
            <>
              {chatMode === 'enterprise' ? (
                <ChatSidebar
                  sessions={sessions}
                  currentSessionId={currentSessionId}
                  onSessionSelect={handleSessionSelect}
                  onNewChat={handleNewChat}
                  onDeleteSession={handleDeleteSession}
                  onRenameSession={handleRenameSession}
                />
              ) : (
                <DocumentUpload
                  documents={documents}
                  onDocumentUpload={handleDocumentUpload}
                  onDocumentDelete={handleDocumentDelete}
                />
              )}
            </>
          )}
        </div>

        {/* Sidebar - Mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
            <div className="fixed left-0 top-0 h-full">
              {chatMode === 'enterprise' ? (
                <ChatSidebar
                  sessions={sessions}
                  currentSessionId={currentSessionId}
                  onSessionSelect={handleSessionSelect}
                  onNewChat={handleNewChat}
                  onDeleteSession={handleDeleteSession}
                  onRenameSession={handleRenameSession}
                />
              ) : (
                <DocumentUpload
                  documents={documents}
                  onDocumentUpload={handleDocumentUpload}
                  onDocumentDelete={handleDocumentDelete}
                />
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-screen">
          {/* Header - Fixed */}
          <header className="bg-card/50 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hover:bg-sidebar-accent"
              >
                {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
              <h1 className="text-lg font-semibold text-foreground">
                e-Qwanza
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {chatMode === 'enterprise' && (
                <Sheet open={assetsOpen} onOpenChange={(open) => { setAssetsOpen(open); if (open) { loadAssets(); } }}>
                  <SheetTrigger asChild>
                    <Button variant="secondary" size="sm">Documents du projet</Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[420px] sm:w-[480px] p-0">
                    <SheetHeader className="p-4 border-b">
                      <SheetTitle>Documents du projet 7</SheetTitle>
                    </SheetHeader>
                    <div className="p-4 space-y-4">
                      <div className="flex items-center gap-2">
                        <Input type="file" onChange={(e) => setAssetFile(e.target.files?.[0] || null)} />
                        <Button size="sm" onClick={handleEnterpriseUpload} disabled={!assetFile || assetUploading}>
                          <FilePlus2 className="w-4 h-4 mr-1" /> Ajouter
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {assetsLoading ? "Chargement..." : `${assets.length} document(s)`}
                      </div>
                      <ScrollArea className="h-[60vh] pr-2">
                        <div className="space-y-2">
                          {assets.map((a) => (
                            <div key={a.asset_id} className="flex items-center justify-between rounded-md border p-2">
                              <div className="min-w-0">
                                <div className="font-medium truncate max-w-[220px]">{a.asset_name}</div>
                                <div className="text-xs text-muted-foreground">{Math.round(a.asset_size / 1024)} Ko</div>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => handleEnterpriseDelete(a.asset_name)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          {!assetsLoading && assets.length === 0 && (
                            <div className="text-sm text-muted-foreground">Aucun document pour le moment.</div>
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
              <ModeSelector
                currentMode={chatMode}
                onModeChange={handleModeChange}
              />
              {chatMode === 'personal' && (
                <RagSettings 
                  ragConfig={ragConfig}
                  onConfigChange={handleRagConfigChange}
                />
              )}
              <ThemeToggle />
            </div>
          </header>

          {/* Chat Interface - Takes remaining height */}
          <div className="flex-1 min-h-0">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default Index;