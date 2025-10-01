from .BaseController import BaseController
from .ProjectController import ProjectController
import os
from langchain_community.document_loaders import TextLoader
from langchain_community.document_loaders import PyMuPDFLoader
from models import ProcessingEnum
from typing import List
from dataclasses import dataclass
from Extractore.pptx2 import PPTSummarizer
from langchain_core.documents import Document

@dataclass
class Document:
    page_content: str
    metadata: dict

class ProcessController(BaseController):

    def __init__(self, project_id: str):
        super().__init__()

        self.project_id = project_id
        self.project_path = ProjectController().get_project_path(project_id=project_id)

    def get_file_extension(self, file_id: str):
        return os.path.splitext(file_id)[-1]

    def get_file_loader(self, file_id: str):

        file_ext = self.get_file_extension(file_id=file_id)
        file_path = os.path.join(
            self.project_path,
            file_id
        )

        if not os.path.exists(file_path):
            return None

        if file_ext == ProcessingEnum.TXT.value:
            return TextLoader(file_path, encoding="utf-8")

        if file_ext == ProcessingEnum.PDF.value:
            return PyMuPDFLoader(file_path)
        if file_ext == ProcessingEnum.PPTX.value:
            return PPTSummarizer(file_path)
        
        return None

    def get_file_content(self, file_id: str):

        loader = self.get_file_loader(file_id=file_id)
        if isinstance(loader, PPTSummarizer):
            documents = []
            for slide in loader.slides:
                print("Slide number:", slide.slide_number)
                try:
                    doc = Document(
                        page_content=slide.slide_text,
                        metadata={
                            "source": loader.file_path,
                            "slide_title": slide.slide_title,
                            "page": slide.slide_number,
                            "format": "powerpoint"
                        }
                    )
                    documents.append(doc)
                except Exception as e:
                    print(f"❌ Erreur sur slide {slide.slide_number} : {e}")
            return documents
        else:
            print("FICHIER NON PPTX BRO -------------------------------")
            if loader:
                return loader.load()
            return None

    def process_file_content(self, file_content: list, file_id: str,
                            chunk_size: int=100, overlap_size: int=20):
        
        print(file_content[0].metadata)
        chunks = []
        if file_content[0].metadata["format"] == "powerpoint":
            for doc in file_content:
                chunks.append(doc)
        else:
            file_content_texts = [
                rec.page_content
                for rec in file_content
            ]

            file_content_metadata = [
                rec.metadata
                for rec in file_content
            ]

            # chunks = text_splitter.create_documents(
            #     file_content_texts,
            #     metadatas=file_content_metadata
            # )

            chunks = self.process_simpler_splitter(
                texts=file_content_texts,
                metadatas=file_content_metadata,
                chunk_size=chunk_size,
            )

        return chunks

    def process_simpler_splitter(self, texts: List[str], metadatas: List[dict], chunk_size: int, splitter_tag: str="\n"):
        
        full_text = " ".join(texts)

        # split by splitter_tag
        lines = [ doc.strip() for doc in full_text.split(splitter_tag) if len(doc.strip()) > 1 ]

        chunks = []
        current_chunk = ""

        for line in lines:
            current_chunk += line + splitter_tag
            if len(current_chunk) >= chunk_size:
                chunks.append(Document(
                    page_content=current_chunk.strip(),
                    metadata={}
                ))

                current_chunk = ""

        if len(current_chunk) >= 0:
            chunks.append(Document(
                page_content=current_chunk.strip(),
                metadata={}
            ))

        return chunks


    

