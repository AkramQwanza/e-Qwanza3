export interface PersonalProject {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  documentCount: number;
  messageCount: number;
  lastActivity?: Date;
}

export interface ProjectDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  status: 'uploading' | 'processed' | 'error';
}

export interface ProjectMessage {
  id: string;
  content: string;
  type: 'user' | 'bot';
  timestamp: Date;
}

export interface ProjectSession {
  id: string;
  projectId: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}
