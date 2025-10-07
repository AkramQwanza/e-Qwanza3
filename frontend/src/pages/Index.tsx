import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChatInterface, Message } from "@/components/ChatInterface";
import { ChatSidebar, ChatSession } from "@/components/ChatSidebar";
import { DocumentUpload, UploadedDocument } from "@/components/DocumentUpload";
import { ModeSelector, ChatMode } from "@/components/ModeSelector";
import { ThemeToggle } from "@/components/ThemeToggle";
import { RagSettings, RagConfig } from "@/components/RagSettings";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, FilePlus2, Plus, MoreVertical, MessageSquare } from "lucide-react";
import { Menu, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { enterpriseApiClient, personalApiClient } from "@/lib/api";

const Index = () => {
  const navigate = useNavigate();
  const [chatMode, setChatMode] = useState<ChatMode>('enterprise');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionMessages, setSessionMessages] = useState<Record<string, Message[]>>({});
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
  const createNewSession = useCallback(async () => {
    try {
      const apiClient = chatMode === 'personal' ? personalApiClient : enterpriseApiClient;
      const conversationRes = await apiClient.createConversation("Nouvelle conversation", "Conversation créée");
      
      if (conversationRes.ok) {
        const newSession: ChatSession = {
          id: conversationRes.data.conversation_id.toString(),
          title: "Nouvelle conversation",
          lastMessage: "Conversation créée",
          timestamp: new Date(),
          messageCount: 0,
        };
        
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setMessages([]);
        setSidebarOpen(false);
      } else {
        console.error('Erreur lors de la création de la conversation:', (conversationRes as { ok: false; error: string }).error);
        toast({
          title: "Erreur",
          description: "Impossible de créer une nouvelle conversation",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur lors de la création de la conversation:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer une nouvelle conversation",
        variant: "destructive",
      });
    }
  }, [chatMode, toast]);

  // Fonction pour sélectionner une session
  const handleSessionSelect = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    
    // Charger les messages de la session depuis l'API
    try {
      const apiClient = chatMode === 'personal' ? personalApiClient : enterpriseApiClient;
      const messagesRes = await apiClient.listMessages(parseInt(sessionId));
      
      if (messagesRes.ok) {
        const messagesFromApi: Message[] = messagesRes.data.map((msg) => ({
          id: msg.message_id.toString(),
          content: msg.message_content,
          type: msg.message_sender === 'user' ? 'user' : 'bot',
          timestamp: new Date(), // TODO: récupérer depuis l'API si disponible
        }));
        setMessages(messagesFromApi);
        setSessionMessages(prev => ({
          ...prev,
          [sessionId]: messagesFromApi
        }));
      } else {
        console.error('Erreur lors du chargement des messages:', (messagesRes as { ok: false; error: string }).error);
        // Fallback sur les messages en mémoire
        const sessionMsgs = sessionMessages[sessionId] || [];
        setMessages(sessionMsgs);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      // Fallback sur les messages en mémoire
      const sessionMsgs = sessionMessages[sessionId] || [];
      setMessages(sessionMsgs);
    }
    setSidebarOpen(false);
  }, [sessionMessages, chatMode]);

  // Fonction pour supprimer une session
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      const apiClient = chatMode === 'personal' ? personalApiClient : enterpriseApiClient;
      await apiClient.deleteConversation(parseInt(sessionId));

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      // Supprimer aussi les messages de cette session
      setSessionMessages(prev => {
        const newSessionMessages = { ...prev } as Record<string, Message[]>;
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
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message || "Impossible de supprimer la conversation.",
        variant: "destructive",
      });
    }
  }, [currentSessionId, toast, chatMode]);

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
    
    // Rediriger vers la page des projets personnels si on passe en mode personnel
    if (mode === 'personal') {
      navigate('/personal');
      return;
    }
    
    toast({
      title: `Mode ${mode === 'enterprise' ? 'Entreprise' : 'Personnel'}`,
      description: `Vous êtes maintenant en mode ${mode === 'enterprise' ? 'entreprise avec historique' : 'personnel avec documents'}.`,
    });
  }, [toast, navigate]);

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

  // Charger les conversations depuis l'API
  const loadConversations = useCallback(async () => {
    try {
      const apiClient = chatMode === 'personal' ? personalApiClient : enterpriseApiClient;
      const conversationsRes = await apiClient.listConversations();
      
      if (conversationsRes.ok) {
        const sessionsFromApi: ChatSession[] = conversationsRes.data.map((conv) => ({
          id: conv.conversation_id.toString(),
          title: conv.conversation_title,
          lastMessage: conv.conversation_description || "Conversation créée",
          timestamp: new Date(), // TODO: récupérer depuis l'API si disponible
          messageCount: 0, // sera mis à jour après la récupération des messages
        }));
        setSessions(sessionsFromApi);

        // Charger les messages pour chaque conversation
        const allMessages: Record<string, Message[]> = {};
        for (const session of sessionsFromApi) {
          const messagesRes = await apiClient.listMessages(parseInt(session.id));
          if (messagesRes.ok) {
            const messagesFromApi: Message[] = messagesRes.data.map((msg) => ({
              id: msg.message_id.toString(),
              content: msg.message_content,
              type: msg.message_sender === 'user' ? 'user' : 'bot',
              timestamp: new Date(), // TODO: récupérer depuis l'API si disponible
            }));
            allMessages[session.id] = messagesFromApi;
          }
        }
        setSessionMessages(allMessages);
      } else {
        console.error('Erreur lors du chargement des conversations:', (conversationsRes as { ok: false; error: string }).error);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error);
    }
  }, [chatMode]);

  // Charger les assets et conversations au démarrage
  useEffect(() => {
    loadAssets();
    loadConversations();
  }, [loadAssets, loadConversations]);

  // Fonction pour envoyer un message
  const handleSendMessage = useCallback(async (content: string) => {
    if (!currentSessionId) {
      await createNewSession();
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

    // Sauvegarder le message utilisateur dans la base de données
    try {
      const apiClient = chatMode === 'personal' ? personalApiClient : enterpriseApiClient;
      await apiClient.createMessage(content, "user", parseInt(currentSessionId));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du message utilisateur:', error);
    }

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

    // Après mise à jour locale, persister le titre si nécessaire
    const session = sessions.find(s => s.id === currentSessionId);
    const nextTitle = session && session.title === "Nouvelle conversation" 
      ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
      : session?.title;
    if (nextTitle && nextTitle !== "Nouvelle conversation") {
      try {
        const apiClient = chatMode === 'personal' ? personalApiClient : enterpriseApiClient;
        await apiClient.updateConversation(parseInt(currentSessionId), nextTitle);
      } catch (e) {
        console.error('Erreur lors de la mise à jour du titre de conversation:', e);
      }
    }

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

      // Sauvegarder le message bot dans la base de données
      try {
        await apiClient.createMessage(res.data.answer, "assistant", parseInt(currentSessionId));
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du message bot:', error);
      }

    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error?.message || "Une erreur s'est produite lors de l'envoi du message.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, createNewSession, toast, messages, chatMode, sessions]);

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
    <Layout 
      className="h-screen" 
      sidebarOpen={sidebarOpen} 
      onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
    >
        <div className="h-full flex bg-gradient-background">
        {/* Sidebar - Desktop */}
        <div className={cn(
          "hidden md:block transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0"
        )}>
          {sidebarOpen && (
            <>
              {chatMode === 'enterprise' ? (
                <div className="h-full flex flex-col bg-card/50 backdrop-blur-sm">
                  {/* Historique des conversations */}
                  <div className="flex-1 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Conversations</h3>
                      <Button size="sm" onClick={handleNewChat}>
                        <Plus className="w-4 h-4 mr-1" />
                        Nouvelle
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-[calc(100vh-100px)]">
                      <div className="space-y-2">
                        {sessions.map((session) => (
                          <div
                            key={session.id}
                            className={cn(
                              "p-3 rounded-lg cursor-pointer transition-colors",
                              currentSessionId === session.id
                                ? "bg-primary/10 border border-primary/20"
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => handleSessionSelect(session.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate" title={session.title}>
                                  {session.title}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {session.messageCount} message{session.messageCount !== 1 ? 's' : ''} • {session.timestamp.toLocaleDateString('fr-FR')}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleSessionSelect(session.id)}>
                                    Ouvrir
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteSession(session.id)}
                                    className="text-destructive"
                                  >
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                        
                        {sessions.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Aucune conversation</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
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
            <div className="fixed left-0 top-0 h-full w-80 bg-card/95 backdrop-blur-sm">
              {chatMode === 'enterprise' ? (
                <div className="h-full flex flex-col">
                  {/* Header mobile */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-lg">Mode Entreprise</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarOpen(false)}
                        className="hover:bg-sidebar-accent"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Historique des conversations */}
                  <div className="flex-1 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Conversations</h3>
                      <Button size="sm" onClick={handleNewChat}>
                        <Plus className="w-4 h-4 mr-1" />
                        Nouvelle
                      </Button>
                    </div>
                    
                    <ScrollArea className="h-[calc(100vh-200px)]">
                      <div className="space-y-2">
                        {sessions.map((session) => (
                          <div
                            key={session.id}
                            className={cn(
                              "p-3 rounded-lg cursor-pointer transition-colors",
                              currentSessionId === session.id
                                ? "bg-primary/10 border border-primary/20"
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => handleSessionSelect(session.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate" title={session.title}>
                                  {session.title}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {session.messageCount} message{session.messageCount !== 1 ? 's' : ''} • {session.timestamp.toLocaleDateString('fr-FR')}
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleSessionSelect(session.id)}>
                                    Ouvrir
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteSession(session.id)}
                                    className="text-destructive"
                                  >
                                    Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                        
                        {sessions.length === 0 && (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Aucune conversation</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
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
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Chat Interface - Takes full height */}
          <div className="flex-1 min-h-0">
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
      </Layout>
  );
};

export default Index;