from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from helpers.config import get_settings, Settings
from models.ConversationModel import ConversationModel
from models.db_schemes import Conversation


conversation_router = APIRouter(
    prefix="/api/v1/conversations",
    tags=["api_v1", "conversations"],
)


@conversation_router.post("/", status_code=status.HTTP_201_CREATED)
async def create_conversation_endpoint(request: Request, payload: dict, app_settings: Settings = Depends(get_settings)):
    model = await ConversationModel.create_instance(db_client=request.app.db_client)
    record = Conversation(
        conversation_title=payload.get("conversation_title"),
        conversation_description=payload.get("conversation_description"),
        conversation_project_id=payload.get("conversation_project_id"),
        conversation_user_id=payload.get("conversation_user_id"),
    )
    created = await model.create_conversation(record)
    return {"conversation_id": created.conversation_id}


@conversation_router.get("/{conversation_id}")
async def get_conversation_endpoint(request: Request, conversation_id: int):
    model = await ConversationModel.create_instance(db_client=request.app.db_client)
    record = await model.get_conversation(conversation_id)
    if record is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"signal": "conversation_not_found"})
    return {
        "conversation_id": record.conversation_id,
        "conversation_title": record.conversation_title,
        "conversation_description": record.conversation_description,
        "conversation_project_id": record.conversation_project_id,
        "conversation_user_id": record.conversation_user_id,
    }


@conversation_router.get("/")
async def list_conversations_endpoint(request: Request, page: int = 1, page_size: int = 20, project_id: int | None = None):
    model = await ConversationModel.create_instance(db_client=request.app.db_client)
    if project_id is not None:
        records = await model.list_conversations_by_project(project_id=project_id, page=page, page_size=page_size)
    else:
        records = await model.list_conversations(page=page, page_size=page_size)
    return [
        {
            "conversation_id": r.conversation_id,
            "conversation_title": r.conversation_title,
            "conversation_description": r.conversation_description,
            "conversation_project_id": r.conversation_project_id,
            "conversation_user_id": r.conversation_user_id,
        }
        for r in records
    ]


@conversation_router.put("/{conversation_id}")
async def update_conversation_endpoint(request: Request, conversation_id: int, payload: dict):
    model = await ConversationModel.create_instance(db_client=request.app.db_client)
    fields = {
        "conversation_title": payload.get("conversation_title"),
        "conversation_description": payload.get("conversation_description"),
    }
    updated = await model.update_conversation(conversation_id, **fields)
    if updated is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"signal": "conversation_not_found"})
    return {"signal": "conversation_update_success", "conversation_id": updated.conversation_id}


@conversation_router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation_endpoint(request: Request, conversation_id: int):
    model = await ConversationModel.create_instance(db_client=request.app.db_client)
    ok = await model.delete_conversation(conversation_id)
    if not ok:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"signal": "conversation_not_found"})
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)


