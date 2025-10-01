import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  status: 'uploading' | 'processed' | 'error';
}

interface DocumentUploadProps {
  documents: UploadedDocument[];
  onDocumentUpload: (files: FileList) => void;
  onDocumentDelete: (documentId: string) => void;
}

export const DocumentUpload = ({ documents, onDocumentUpload, onDocumentDelete }: DocumentUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onDocumentUpload(files);
    }
  }, [onDocumentUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onDocumentUpload(files);
    }
  }, [onDocumentUpload]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col bg-sidebar-background border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold text-sidebar-foreground mb-1">
          Documents RAG
        </h2>
        <p className="text-sm text-muted-foreground">
          Uploadez vos documents pour créer votre base de connaissances personnalisée
        </p>
      </div>

      {/* Upload Area */}
      <div className="p-4">
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-border hover:border-primary/50 hover:bg-primary/5"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-sm font-medium text-foreground mb-2">
            Glissez-déposez vos fichiers ici
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            ou cliquez pour sélectionner
          </p>
          <p className="text-xs text-muted-foreground">
            PDF, DOCX, TXT acceptés
          </p>
          <input
            id="file-input"
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.doc"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-hidden">
        <div className="px-4 py-2">
          <h3 className="text-sm font-medium text-sidebar-foreground">
            Documents uploadés ({documents.length})
          </h3>
        </div>
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {documents.map((doc) => (
              <Card key={doc.id} className="p-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate">
                      {doc.name}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(doc.size)} • {doc.uploadedAt.toLocaleDateString()}
                    </p>
                    <div className={cn(
                      "text-xs mt-1",
                      doc.status === 'processed' && "text-green-600",
                      doc.status === 'uploading' && "text-blue-600",
                      doc.status === 'error' && "text-red-600"
                    )}>
                      {doc.status === 'processed' && '✓ Traité'}
                      {doc.status === 'uploading' && '⏳ Traitement...'}
                      {doc.status === 'error' && '⚠ Erreur'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDocumentDelete(doc.id)}
                    className="text-muted-foreground hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
            {documents.length === 0 && (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-sm text-muted-foreground">
                  Aucun document uploadé
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};