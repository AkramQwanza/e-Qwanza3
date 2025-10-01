from .pptx import PPTExtractor
# from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import OllamaLLM
from langchain.schema import HumanMessage, SystemMessage

from transformers import AutoTokenizer

from .common_functions import *

# Initialiser les embeddings
# embedding_model = HuggingFaceEmbeddings(
#     model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
#     model_kwargs={"device": "cpu"},
#     encode_kwargs={"normalize_embeddings": True}
# )

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

# def get_embedding(text):
#     return embedding_model.embed_query(text)

def count_tokens(text):
    return len(tokenizer.tokenize(text))

class PPTSummarizer(PPTExtractor):
    def __init__(self, file_path, extraction_method: str = "slide", ocr_engine: str = "tesseract") -> None:
        super().__init__(file_path, extraction_method, ocr_engine)
        super().extract()

    def summarize(self, summarize_method="slide", slide_number=0, summarize_model="mistral-small:22b-instruct-2409-q5_K_M", system_prompt="Tu reçois les informations d'une diapositive PowerPoint, telles que le texte, les tableaux, les graphiques ou le texte extrait d’images (OCR). Génère un résumé concis et précis de la diapositive, en citant les sources utilisées (tableaux/graphiques) si applicable."):
        llm = OllamaLLM(model=summarize_model)

        if summarize_method == "slide":
            summarize_response = []
            for slide in self.slides:
                slide_text = slide.slide_text
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=slide_text)
                ]
                response = llm.invoke(messages)
                summarize_response.append({
                    "Slide Number": slide.slide_number,
                    "Title": slide.slide_title,
                    "Summary": response
                })
            return summarize_response
        else:
            raise Exception("Summarize method not supported.")

    def summarize_stream(self, summarize_method: str = "slide", slide_number: int = 0, summarize_model: str = "mistral-small:22b-instruct-2409-q5_K_M", system_prompt: str = "Tu reçois les informations d'une diapositive PowerPoint, telles que le texte, les tableaux, les graphiques ou le texte extrait d’images (OCR). Tu dois générer un résumé de la diapositive. Assure-toi de citer tes sources si ta réponse provient d’un tableau ou d’un graphique, et sois précis."):
        llm = OllamaLLM(model=summarize_model)
        if summarize_method == "slide":
            for slide in self.slides:
                slide_text = slide.slide_text
                messages = [
                    SystemMessage(content=system_prompt),
                    HumanMessage(content=slide_text)
                ]
                response = llm.invoke(messages)
                yield {
                    "Slide Number": slide.slide_number,
                    "Title": slide.slide_title,
                    "Summary": response
                }
        elif summarize_method == "charts":
            for slide in self.slides:
                for entity in slide.entities:
                    if entity.chart_type in ["table", "chart"]:
                        messages = [
                            SystemMessage(content=system_prompt),
                            HumanMessage(content=entity.text)
                        ]
                        response = llm.invoke(messages)
                        yield {
                            "Slide Number": slide.slide_number,
                            "Entity Type": entity.chart_type,
                            "Summary": response
                        }
        else:
            raise Exception("Summarize method not supported.")
