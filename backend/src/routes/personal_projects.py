from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from helpers.config import get_settings, Settings
from models.ProjectModel import ProjectModel
from models.db_schemes import Project
from sqlalchemy import and_

personal_projects_router = APIRouter(
    prefix="/api/v1/personal-projects",
    tags=["api_v1", "personal-projects"],
)

@personal_projects_router.post("/", status_code=status.HTTP_201_CREATED)
async def create_personal_project(request: Request, payload: dict, app_settings: Settings = Depends(get_settings)):
    """Créer un nouveau projet personnel"""
    try:
        model = await ProjectModel.create_instance(db_client=request.app.db_client)
        
        # Créer le projet avec nom et description
        nom_projet = payload.get("nom_projet")
        if not nom_projet or not nom_projet.strip():
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "signal": "project_creation_error",
                    "error": "Le nom du projet est requis"
                }
            )
        
        project_data = {
            "nom_projet": nom_projet.strip(),
            "description_projet": payload.get("description_projet"),
            "user_id": payload.get("user_id", 1)  # Par défaut user_id = 1 pour les projets personnels
        }
        
        created_project = await model.create_project_with_details(**project_data)
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "signal": "project_created_success",
                "project": {
                    "project_id": created_project.project_id,
                    "project_uuid": str(created_project.project_uuid),
                    "nom_projet": created_project.nom_projet,
                    "description_projet": created_project.description_projet,
                    "created_at": created_project.created_at.isoformat() if created_project.created_at else None,
                    "updated_at": created_project.updated_at.isoformat() if created_project.updated_at else None,
                }
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": "project_creation_error",
                "error": str(e)
            }
        )

@personal_projects_router.get("/")
async def get_personal_projects(request: Request, user_id: int = 1):
    """Récupérer tous les projets personnels d'un utilisateur"""
    try:
        model = await ProjectModel.create_instance(db_client=request.app.db_client)
        projects, total_pages, total_projects = await model.get_projects_by_user(user_id=user_id)
        
        projects_data = []
        for project in projects:
            projects_data.append({
                "project_id": project.project_id,
                "project_uuid": str(project.project_uuid),
                "nom_projet": project.nom_projet,
                "description_projet": project.description_projet,
                "created_at": project.created_at.isoformat() if project.created_at else None,
                "updated_at": project.updated_at.isoformat() if project.updated_at else None,
            })
        
        return JSONResponse(
            content={
                "signal": "projects_list_success",
                "projects": projects_data
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": "projects_list_error",
                "error": str(e)
            }
        )

@personal_projects_router.get("/{project_id}")
async def get_personal_project(request: Request, project_id: int):
    """Récupérer un projet personnel par son ID"""
    try:
        model = await ProjectModel.create_instance(db_client=request.app.db_client)
        project = await model.get_project_by_id(project_id=project_id)
        
        if not project:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "signal": "project_not_found",
                    "error": "Projet non trouvé"
                }
            )
        
        return JSONResponse(
            content={
                "signal": "project_found_success",
                "project": {
                    "project_id": project.project_id,
                    "project_uuid": str(project.project_uuid),
                    "nom_projet": project.nom_projet,
                    "description_projet": project.description_projet,
                    "created_at": project.created_at.isoformat() if project.created_at else None,
                    "updated_at": project.updated_at.isoformat() if project.updated_at else None,
                }
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": "project_fetch_error",
                "error": str(e)
            }
        )

@personal_projects_router.put("/{project_id}")
async def update_personal_project(request: Request, project_id: int, payload: dict):
    """Mettre à jour un projet personnel"""
    try:
        model = await ProjectModel.create_instance(db_client=request.app.db_client)
        
        update_data = {}
        if "nom_projet" in payload:
            update_data["nom_projet"] = payload["nom_projet"]
        if "description_projet" in payload:
            update_data["description_projet"] = payload["description_projet"]
        
        updated_project = await model.update_project_details(project_id=project_id, **update_data)
        
        if not updated_project:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "signal": "project_not_found",
                    "error": "Projet non trouvé"
                }
            )
        
        return JSONResponse(
            content={
                "signal": "project_updated_success",
                "project": {
                    "project_id": updated_project.project_id,
                    "project_uuid": str(updated_project.project_uuid),
                    "nom_projet": updated_project.nom_projet,
                    "description_projet": updated_project.description_projet,
                    "created_at": updated_project.created_at.isoformat() if updated_project.created_at else None,
                    "updated_at": updated_project.updated_at.isoformat() if updated_project.updated_at else None,
                }
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": "project_update_error",
                "error": str(e)
            }
        )

@personal_projects_router.delete("/{project_id}")
async def delete_personal_project(request: Request, project_id: int):
    """Supprimer un projet personnel"""
    try:
        model = await ProjectModel.create_instance(db_client=request.app.db_client)
        
        # Vérifier que le projet existe
        project = await model.get_project_by_id(project_id=project_id)
        if not project:
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={
                    "signal": "project_not_found",
                    "error": "Projet non trouvé"
                }
            )
        
        # Supprimer le projet (cascade supprimera les données liées)
        await model.delete_project(project_id=project_id)
        
        return JSONResponse(
            content={
                "signal": "project_deleted_success",
                "message": "Projet supprimé avec succès"
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "signal": "project_delete_error",
                "error": str(e)
            }
        )
