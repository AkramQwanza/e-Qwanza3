import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Plus, 
  FileText, 
  Trash2, 
  Upload, 
  MessageSquare, 
  Calendar,
  Clock,
  MoreVertical,
  Settings,
  History
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { PersonalProject, ProjectDocument, ProjectMessage, ProjectSession } from "@/types/Project";
import { ChatInterface, Message } from "@/components/ChatInterface";
import { personalApiClient } from "@/lib/api";
import { personalProjectsApi } from "@/services/personalProjectsApi";

const PersonalProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [project, setProject] = useState<PersonalProject | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [sessions, setSessions] = useState<ProjectSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionMessages, setSessionMessages] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'documents' | 'history'>('documents');

  // Charger les données du projet
  useEffect(() => {
    if (!projectId) return;
    loadProjectData();
  }, [projectId]);

  const loadProjectData = async () => {
    if (!projectId) return;

    try {
      // Charger le projet depuis l'API
      const numericProjectId = parseInt(projectId);
      const apiProject = await personalProjectsApi.getProject(numericProjectId);
      
      // Fixer l'API client personnel sur le bon projet pour les appels (assets, upload, etc.)
      personalApiClient.setProjectId(numericProjectId);
      
      const projectData: PersonalProject = {
        id: apiProject.project_id.toString(),
        name: apiProject.nom_projet || 'Projet sans nom',
        description: apiProject.description_projet || '',
        createdAt: new Date(apiProject.created_at),
        updatedAt: new Date(apiProject.updated_at),
        lastActivity: new Date(apiProject.updated_at),
        documentCount: 0, // sera mis à jour après la récupération des assets
        messageCount: 0, // TODO: Récupérer depuis l'API
      };
      setProject(projectData);

      // Récupérer les documents (assets) du backend pour ce projet
      const assetsRes = await personalApiClient.listAssets();
      if (assetsRes.ok) {
        const docsFromApi: ProjectDocument[] = assetsRes.data.assets.map((a) => ({
          id: `${a.asset_id}`,
          name: a.asset_name,
          size: a.asset_size ?? 0,
          type: a.asset_name.split('.').pop() || 'file',
          uploadedAt: a.created_at ? new Date(a.created_at) : new Date(),
          status: 'processed',
        }));
        setDocuments(docsFromApi);
        setProject((prev) => prev ? { ...prev, documentCount: docsFromApi.length } : prev);
        // Persister localement pour cohérence avec le reste du flux
        localStorage.setItem(`project_${projectId}_documents`, JSON.stringify(docsFromApi));
      } else {
        console.error('Erreur lors du chargement des assets:', assetsRes.error);
        // Fallback sur localStorage si l'API échoue
        const savedDocuments = localStorage.getItem(`project_${projectId}_documents`);
        if (savedDocuments) {
          const documentsData = JSON.parse(savedDocuments);
          const documentsWithDates = documentsData.map((doc: any) => ({
            ...doc,
            uploadedAt: new Date(doc.uploadedAt),
          }));
          setDocuments(documentsWithDates);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du projet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le projet",
        variant: "destructive",
      });
      navigate('/personal');
      return;
    }

    // Charger les sessions
    const savedSessions = localStorage.getItem(`project_${projectId}_sessions`);
    if (savedSessions) {
      const sessionsData = JSON.parse(savedSessions);
      const sessionsWithDates = sessionsData.map((session: any) => ({
        ...session,
        timestamp: new Date(session.timestamp),
      }));
      setSessions(sessionsWithDates);
    }

    // Charger les messages
    const savedMessages = localStorage.getItem(`project_${projectId}_messages`);
    if (savedMessages) {
      const messagesData = JSON.parse(savedMessages);
      const messagesWithDates: Record<string, Message[]> = {};
      Object.keys(messagesData).forEach(sessionId => {
        messagesWithDates[sessionId] = messagesData[sessionId].map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      });
      setSessionMessages(messagesWithDates);
    }
  };

  // Sauvegarder les documents
  const saveDocuments = (updatedDocuments: ProjectDocument[]) => {
    setDocuments(updatedDocuments);
    localStorage.setItem(`project_${projectId}_documents`, JSON.stringify(updatedDocuments));
  };

  // Sauvegarder les sessions
  const saveSessions = (updatedSessions: ProjectSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem(`project_${projectId}_sessions`, JSON.stringify(updatedSessions));
  };

  // Sauvegarder les messages
  const saveMessages = (updatedMessages: Record<string, Message[]>) => {
    setSessionMessages(updatedMessages);
    localStorage.setItem(`project_${projectId}_messages`, JSON.stringify(updatedMessages));
  };

  // Créer une nouvelle session
  const createNewSession = useCallback(() => {
    if (!projectId) return;
    
    const newSessionId = Date.now().toString();
    const newSession: ProjectSession = {
      id: newSessionId,
      projectId,
      title: "Nouvelle conversation",
      lastMessage: "Conversation créée",
      timestamp: new Date(),
      messageCount: 0,
    };
    
    const updatedSessions = [newSession, ...sessions];
    saveSessions(updatedSessions);
    setCurrentSessionId(newSessionId);
    setMessages([]);
  }, [projectId, sessions]);

  // Sélectionner une session
  const handleSessionSelect = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    const sessionMsgs = sessionMessages[sessionId] || [];
    setMessages(sessionMsgs);
  }, [sessionMessages]);

  // Supprimer une session
  const handleDeleteSession = useCallback((sessionId: string) => {
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    saveSessions(updatedSessions);
    
    const updatedMessages = { ...sessionMessages };
    delete updatedMessages[sessionId];
    saveMessages(updatedMessages);
    
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
    
    toast({
      title: "Session supprimée",
      description: "La conversation a été supprimée avec succès.",
    });
  }, [sessions, sessionMessages, currentSessionId, toast]);

  // Renommer une session
  const handleRenameSession = useCallback((sessionId: string, newTitle: string) => {
    const updatedSessions = sessions.map(s => 
      s.id === sessionId ? { ...s, title: newTitle } : s
    );
    saveSessions(updatedSessions);
    
    toast({
      title: "Session renommée",
      description: "Le nom de la conversation a été mis à jour.",
    });
  }, [sessions, toast]);

  // Upload de document
  const handleDocumentUpload = useCallback(async (file: File) => {
    if (!projectId) return;

    const newDocument: ProjectDocument = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date(),
      status: 'uploading',
    };

    const updatedDocuments = [...documents, newDocument];
    saveDocuments(updatedDocuments);
    setIsUploading(true);

    try {
      // Upload du fichier
      const uploadRes = await personalApiClient.uploadFile(file);
      if (!uploadRes.ok) {
        throw new Error((uploadRes as { ok: false; error: string }).error);
      }
      const fileId = uploadRes.data.asset_name || uploadRes.data.file_id;

      // Traitement du fichier
      const processRes = await personalApiClient.processFiles({ 
        chunk_size: 800, 
        overlap_size: 100, 
        do_reset: 0, 
        file_id: fileId 
      });
      if (!processRes.ok) {
        throw new Error((processRes as { ok: false; error: string }).error);
      }

      // Indexation
      const pushRes = await personalApiClient.pushToIndex({ do_reset: false });
      if (!pushRes.ok) {
        throw new Error((pushRes as { ok: false; error: string }).error);
      }

      // Mettre à jour le statut
      const finalDocuments = documents.map(doc => 
        doc.id === newDocument.id 
          ? { ...doc, status: 'processed' as const }
          : doc
      );
      saveDocuments(finalDocuments);

      // Mettre à jour le projet
      if (project) {
        const updatedProject = {
          ...project,
          documentCount: project.documentCount + 1,
          updatedAt: new Date(),
          lastActivity: new Date(),
        };
        const savedProjects = localStorage.getItem('personalProjects');
        if (savedProjects) {
          const projects: PersonalProject[] = JSON.parse(savedProjects);
          const updatedProjects = projects.map(p => 
            p.id === projectId ? updatedProject : p
          );
          localStorage.setItem('personalProjects', JSON.stringify(updatedProjects));
          setProject(updatedProject);
        }
      }

      toast({
        title: "Document ajouté",
        description: `${file.name} a été ajouté avec succès.`,
      });
    } catch (error: any) {
      const finalDocuments = documents.map(doc => 
        doc.id === newDocument.id 
          ? { ...doc, status: 'error' as const }
          : doc
      );
      saveDocuments(finalDocuments);
      
      toast({
        title: "Erreur d'upload",
        description: error?.message || "Une erreur est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setShowUploadDialog(false);
      setUploadFile(null);
    }
  }, [projectId, documents, project, toast]);

  // Supprimer un document (API + état local)
  const handleDeleteDocument = useCallback(async (documentId: string) => {
    const docToDelete = documents.find(d => d.id === documentId);
    try {
      if (docToDelete) {
        await personalApiClient.deleteAsset(docToDelete.name);
      }
    } catch (e: any) {
      toast({
        title: "Suppression côté serveur échouée",
        description: e?.message || "Impossible de supprimer le document sur le serveur.",
        variant: "destructive",
      });
    }

    const updatedDocuments = documents.filter(doc => doc.id !== documentId);
    saveDocuments(updatedDocuments);
    
    if (project) {
      const updatedProject = {
        ...project,
        documentCount: Math.max(0, project.documentCount - 1),
        updatedAt: new Date(),
      };
      const savedProjects = localStorage.getItem('personalProjects');
      if (savedProjects) {
        const projects: PersonalProject[] = JSON.parse(savedProjects);
        const updatedProjects = projects.map(p => 
          p.id === projectId ? updatedProject : p
        );
        localStorage.setItem('personalProjects', JSON.stringify(updatedProjects));
        setProject(updatedProject);
      }
    }
    
    toast({
      title: "Document supprimé",
      description: "Le document a été retiré du projet.",
    });
  }, [documents, project, projectId, toast]);

  // Envoyer un message
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
    saveMessages({
      ...sessionMessages,
      [currentSessionId]: newMessages
    });
    setIsLoading(true);

    // Mettre à jour la session
    const updatedSessions = sessions.map(s => 
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
    );
    saveSessions(updatedSessions);

    try {
      const res = await personalApiClient.answer({ text: content, limit: 4 });
      if (!res.ok) {
        throw new Error((res as { ok: false; error: string }).error);
      }
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: res.data.answer,
        type: "bot",
        timestamp: new Date(),
      };

      const finalMessages = [...newMessages, botMessage];
      setMessages(finalMessages);
      saveMessages({
        ...sessionMessages,
        [currentSessionId]: finalMessages
      });

      // Mettre à jour le projet
      if (project) {
        const updatedProject = {
          ...project,
          messageCount: project.messageCount + 1,
          updatedAt: new Date(),
          lastActivity: new Date(),
        };
        const savedProjects = localStorage.getItem('personalProjects');
        if (savedProjects) {
          const projects: PersonalProject[] = JSON.parse(savedProjects);
          const updatedProjects = projects.map(p => 
            p.id === projectId ? updatedProject : p
          );
          localStorage.setItem('personalProjects', JSON.stringify(updatedProjects));
          setProject(updatedProject);
        }
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
  }, [currentSessionId, createNewSession, messages, sessionMessages, sessions, project, projectId, toast]);

  if (!project) {
    return (
      <Layout>
        <div className="h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-4">Projet non trouvé</h2>
            <Button onClick={() => navigate('/personal')}>
              Retour aux projets
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)] flex bg-gradient-background">
      {/* Sidebar - Documents et Sessions */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 border-r border-border bg-card/50 backdrop-blur-sm overflow-hidden flex-shrink-0`}>
        <div className="h-full flex flex-col">
          {/* Header Sidebar */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/personal')}
                className="hover:bg-sidebar-accent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
            <div>
              <h2 className="font-semibold text-lg truncate" title={project.name}>
                {project.name}
              </h2>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('documents')}
              className={`flex-1 rounded-none ${activeTab === 'documents' ? 'border-b-2 border-primary' : ''}`}
            >
              <FileText className="w-4 h-4 mr-2" />
              Documents
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab('history')}
              className={`flex-1 rounded-none ${activeTab === 'history' ? 'border-b-2 border-primary' : ''}`}
            >
              <History className="w-4 h-4 mr-2" />
              Historique
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            {activeTab === 'documents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Documents</h3>
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Ajouter
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Ajouter un document</DialogTitle>
                      <DialogDescription>
                        Sélectionnez un fichier à ajouter à votre projet.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="file">Fichier</Label>
                        <Input
                          id="file"
                          type="file"
                          onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowUploadDialog(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={() => uploadFile && handleDocumentUpload(uploadFile)}
                        disabled={!uploadFile || isUploading}
                      >
                        {isUploading ? "Ajout..." : "Ajouter"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-2">
                {documents.map((doc) => (
                  <Card key={doc.id} className="p-0 overflow-hidden">
                    {/* <div className="p-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis" title={doc.name}></div> */}
                    <div className="p-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0 ">
                        <div className="font-medium text-sm truncate" title={doc.name}>
                          {doc.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span>{Math.round(doc.size / 1024)} Ko</span>
                          <span>•</span>
                          <span>{doc.uploadedAt.toLocaleDateString('fr-FR')}</span>
                          <Badge 
                            variant={doc.status === 'processed' ? 'default' : doc.status === 'error' ? 'destructive' : 'secondary'}
                            className="text-[10px] px-1 py-0"
                          >
                            {doc.status === 'uploading' ? 'Traitement...' : 
                             doc.status === 'processed' ? 'Traité' : 'Erreur'}
                          </Badge>
                        </div>
                      </div>
                      {/* Menu déroulant pour les actions (Suppression) */}
                      {/* <div className="flex-shrink-0 flex items-center"> */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Vous pourriez ajouter 'Télécharger' ou 'Renommer' ici si besoin */}
                            <DropdownMenuItem
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      {/* </div> */}
                    </div>
                  </Card>
                ))}
                
                {documents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun document</p>
                  </div>
                )}
              </div>
            </div>
            )}

            {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Conversations</h3>
                <Button size="sm" onClick={createNewSession}>
                  <Plus className="w-4 h-4 mr-1" />
                  Nouvelle
                </Button>
              </div>

              <div className="space-y-2">
                {sessions.map((session) => (
                  <Card 
                    key={session.id} 
                    className={`p-3 cursor-pointer transition-colors ${
                      currentSessionId === session.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleSessionSelect(session.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate" title={session.title}>
                          {session.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
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
                  </Card>
                ))}
                
                {sessions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune conversation</p>
                  </div>
                )}
              </div>
            </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Main Content - Chat */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="bg-card/50 backdrop-blur-sm border-b border-border p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover:bg-sidebar-accent"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                {documents.length} document{documents.length !== 1 ? 's' : ''} • {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </header>

        {/* Chat Interface */}
        <div className="flex-1 relative overflow-hidden">
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

export default PersonalProjectDetail;
