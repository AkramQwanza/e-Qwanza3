from .BaseDataModel import BaseDataModel
from .db_schemes import Project
from .enums.DataBaseEnum import DataBaseEnum
from sqlalchemy.future import select
from sqlalchemy import func

class ProjectModel(BaseDataModel):

    def __init__(self, db_client: object):
        super().__init__(db_client=db_client)
        self.db_client = db_client

    @classmethod
    async def create_instance(cls, db_client: object):
        instance = cls(db_client)
        return instance

    async def create_project(self, project: Project):
        async with self.db_client() as session:
            async with session.begin():
                session.add(project)
            await session.commit()
            await session.refresh(project)
        
        return project

    async def get_project_or_create_one(self, project_id: str):
        async with self.db_client() as session:
            async with session.begin():
                query = select(Project).where(Project.project_id == project_id)
                result = await session.execute(query)
                project = result.scalar_one_or_none()
                if project is None:
                    project_rec = Project(
                        project_id = project_id
                    )

                    project = await self.create_project(project=project_rec)
                    return project
                else:
                    return project

    async def get_all_projects(self, page: int=1, page_size: int=10):
        async with self.db_client() as session:
            async with session.begin():
                total_documents = await session.execute(select(
                    func.count( Project.project_id )
                ))

                total_documents = total_documents.scalar_one()

                total_pages = total_documents // page_size
                if total_documents % page_size > 0:
                    total_pages += 1

                query = select(Project).offset((page - 1) * page_size ).limit(page_size)
                projects = await session.execute(query).scalars().all()

                return projects, total_pages

    async def create_project_with_details(self, nom_projet: str, description_projet: str = None, user_id: int = None):
        """Créer un nouveau projet avec nom et description"""
        async with self.db_client() as session:
            project = Project(
                nom_projet=nom_projet,
                description_projet=description_projet,
                user_id=user_id
            )
            session.add(project)
            await session.commit()
            await session.refresh(project)
            return project

    async def update_project_details(self, project_id: int, nom_projet: str = None, description_projet: str = None):
        """Mettre à jour le nom et/ou la description d'un projet"""
        async with self.db_client() as session:
            query = select(Project).where(Project.project_id == project_id)
            result = await session.execute(query)
            project = result.scalar_one_or_none()
            
            if project:
                if nom_projet is not None:
                    project.nom_projet = nom_projet
                if description_projet is not None:
                    project.description_projet = description_projet
                
                await session.commit()
                await session.refresh(project)
                return project
            return None

    async def get_project_by_id(self, project_id: int):
        """Récupérer un projet par son ID"""
        async with self.db_client() as session:
            query = select(Project).where(Project.project_id == project_id)
            result = await session.execute(query)
            return result.scalar_one_or_none()

    async def get_projects_by_user(self, user_id: int, page: int = 1, page_size: int = 10):
        """Récupérer tous les projets d'un utilisateur avec pagination"""
        async with self.db_client() as session:
            # Compter le total
            total_query = select(func.count(Project.project_id)).where(Project.user_id == user_id)
            total_result = await session.execute(total_query)
            total_projects = total_result.scalar_one()

            total_pages = total_projects // page_size
            if total_projects % page_size > 0:
                total_pages += 1

            # Récupérer les projets
            query = select(Project).where(Project.user_id == user_id).offset((page - 1) * page_size).limit(page_size)
            result = await session.execute(query)
            projects = result.scalars().all()

            return projects, total_pages, total_projects

    async def delete_project(self, project_id: int):
        """Supprimer un projet par son ID"""
        async with self.db_client() as session:
            query = select(Project).where(Project.project_id == project_id)
            result = await session.execute(query)
            project = result.scalar_one_or_none()
            
            if project:
                await session.delete(project)
                await session.commit()
                return True
            return False
