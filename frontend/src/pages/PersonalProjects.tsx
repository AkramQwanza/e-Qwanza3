import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, Calendar, FileText, MessageSquare } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { PersonalProject } from "@/types/Project";
import { personalProjectsApi, PersonalProject as ApiPersonalProject } from "@/services/personalProjectsApi";

const PersonalProjects = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState<PersonalProject[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Charger les projets depuis l'API
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const apiProjects = await personalProjectsApi.getProjects();
      // Convertir les projets API en format local
      const projectsWithDates = apiProjects.map((project: ApiPersonalProject) => ({
        id: project.project_id.toString(),
        name: project.nom_projet || 'Projet sans nom',
        description: project.description_projet || '',
        createdAt: new Date(project.created_at),
        updatedAt: new Date(project.updated_at),
        lastActivity: new Date(project.updated_at),
        documentCount: 0, // TODO: Récupérer depuis l'API
        messageCount: 0, // TODO: Récupérer depuis l'API
      }));
      setProjects(projectsWithDates);
    } catch (error) {
      console.error('Erreur lors du chargement des projets:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les projets",
        variant: "destructive",
      });
    }
  };

  // Créer un nouveau projet
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du projet est requis.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const newProject = await personalProjectsApi.createProject({
        nom_projet: newProjectName.trim(),
        description_projet: newProjectDescription.trim(),
        user_id: 1, // TODO: Récupérer l'ID utilisateur depuis l'auth
      });

      // Recharger la liste des projets
      await loadProjects();

      // Réinitialiser le formulaire
      setNewProjectName("");
      setNewProjectDescription("");
      setIsCreateDialogOpen(false);

      toast({
        title: "Projet créé",
        description: `Le projet "${newProject.nom_projet}" a été créé avec succès.`,
      });
    } catch (error) {
      console.error('Erreur lors de la création du projet:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du projet.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Supprimer un projet
  const handleDeleteProject = async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    try {
      await personalProjectsApi.deleteProject(parseInt(projectId));
      
      // Recharger la liste des projets
      await loadProjects();

      toast({
        title: "Projet supprimé",
        description: `Le projet "${project.name}" a été supprimé.`,
      });
    } catch (error) {
      console.error('Erreur lors de la suppression du projet:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le projet",
        variant: "destructive",
      });
    }
  };

  // Ouvrir un projet
  const handleOpenProject = (projectId: string) => {
    navigate(`/personal/project/${projectId}`);
  };

  // Filtrer les projets
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.description && project.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-background">
        {/* Main Content */}
        <main className="max-w-7xl mx-auto p-6">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Mes Projets Personnels</h1>
            <p className="text-muted-foreground">
              Gérez vos projets et documents personnels
            </p>
          </div>

          {/* Search and Create Section */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Rechercher un projet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              <Badge variant="secondary" className="text-sm">
                {filteredProjects.length} projet{filteredProjects.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un projet
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Créer un nouveau projet</DialogTitle>
                  <DialogDescription>
                    Donnez un nom et une description à votre nouveau projet.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Nom du projet *</Label>
                    <Input
                      id="name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Mon nouveau projet"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description (optionnel)</Label>
                    <Textarea
                      id="description"
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      placeholder="Description de votre projet..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateProject}
                    disabled={isCreating || !newProjectName.trim()}
                  >
                    {isCreating ? "Création..." : "Créer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {/* Create Project Card */}
          <Card 
            className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer group"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <CardContent className="flex flex-col items-center justify-center p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Créer un projet</h3>
              <p className="text-sm text-muted-foreground">
                Commencez un nouveau projet avec vos documents
              </p>
            </CardContent>
          </Card>

          {/* Project Cards */}
          {filteredProjects.map((project) => (
            <Card 
              key={project.id} 
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => handleOpenProject(project.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate" title={project.name}>
                      {project.name}
                    </CardTitle>
                    {project.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenProject(project.id)}>
                        Ouvrir
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-destructive"
                      >
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      <span>{project.documentCount} document{project.documentCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{project.messageCount} message{project.messageCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>
                      Créé le {project.createdAt.toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  {project.lastActivity && (
                    <div className="text-xs text-muted-foreground">
                      Dernière activité : {project.lastActivity.toLocaleDateString('fr-FR')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredProjects.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun projet trouvé</h3>
            <p className="text-muted-foreground">
              Aucun projet ne correspond à votre recherche "{searchTerm}".
            </p>
          </div>
        )}

        {projects.length === 0 && !searchTerm && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun projet pour le moment</h3>
            <p className="text-muted-foreground mb-6">
              Créez votre premier projet pour commencer à organiser vos documents.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Créer votre premier projet
            </Button>
          </div>
        )}
      </main>
      </div>
    </Layout>
  );
};

export default PersonalProjects;
