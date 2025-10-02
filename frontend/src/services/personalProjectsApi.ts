const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface PersonalProject {
  project_id: number;
  project_uuid: string;
  nom_projet: string;
  description_projet: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  nom_projet: string;
  description_projet: string;
  user_id?: number;
}

export interface UpdateProjectRequest {
  nom_projet?: string;
  description_projet?: string;
}

class PersonalProjectsApi {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async createProject(data: CreateProjectRequest): Promise<PersonalProject> {
    const response = await this.request<{ signal: string; project: PersonalProject }>(
      '/personal-projects/',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
    return response.project;
  }

  async getProjects(userId: number = 1): Promise<PersonalProject[]> {
    const response = await this.request<{ signal: string; projects: PersonalProject[] }>(
      `/personal-projects/?user_id=${userId}`
    );
    return response.projects;
  }

  async getProject(projectId: number): Promise<PersonalProject> {
    const response = await this.request<{ signal: string; project: PersonalProject }>(
      `/personal-projects/${projectId}`
    );
    return response.project;
  }

  async updateProject(projectId: number, data: UpdateProjectRequest): Promise<PersonalProject> {
    const response = await this.request<{ signal: string; project: PersonalProject }>(
      `/personal-projects/${projectId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
    return response.project;
  }

  async deleteProject(projectId: number): Promise<void> {
    await this.request<{ signal: string; message: string }>(
      `/personal-projects/${projectId}`,
      {
        method: 'DELETE',
      }
    );
  }
}

export const personalProjectsApi = new PersonalProjectsApi();
