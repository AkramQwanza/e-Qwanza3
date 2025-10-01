from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from helpers.config import get_settings, Settings
from models.MessageModel import MessageModel
from models.db_schemes import Message


message_router = APIRouter(
    prefix="/api/v1/messages",
    tags=["api_v1", "messages"],
)


@message_router.post("/", status_code=status.HTTP_201_CREATED)
async def create_message_endpoint(request: Request, payload: dict, app_settings: Settings = Depends(get_settings)):
    model = await MessageModel.create_instance(db_client=request.app.db_client)
    record = Message(
        message_content=payload.get("message_content"),
        message_sender=payload.get("message_sender"),
        message_conversation_id=payload.get("message_conversation_id"),
        message_user_id=payload.get("message_user_id"),
    )
    created = await model.create_message(record)
    return {"message_id": created.message_id}


@message_router.get("/{message_id}")
async def get_message_endpoint(request: Request, message_id: int):
    model = await MessageModel.create_instance(db_client=request.app.db_client)
    record = await model.get_message(message_id)
    if record is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"signal": "message_not_found"})
    return {
        "message_id": record.message_id,
        "message_content": record.message_content,
        "message_sender": record.message_sender,
        "message_conversation_id": record.message_conversation_id,
        "message_user_id": record.message_user_id,
    }


@message_router.get("/")
async def list_messages_endpoint(request: Request, page: int = 1, page_size: int = 50, conversation_id: int | None = None):
    model = await MessageModel.create_instance(db_client=request.app.db_client)
    if conversation_id is not None:
        records = await model.list_messages_by_conversation(conversation_id=conversation_id, page=page, page_size=page_size)
    else:
        records = await model.list_messages(page=page, page_size=page_size)
    return [
        {
            "message_id": r.message_id,
            "message_content": r.message_content,
            "message_sender": r.message_sender,
            "message_conversation_id": r.message_conversation_id,
            "message_user_id": r.message_user_id,
        }
        for r in records
    ]


@message_router.put("/{message_id}")
async def update_message_endpoint(request: Request, message_id: int, payload: dict):
    model = await MessageModel.create_instance(db_client=request.app.db_client)
    fields = {
        "message_content": payload.get("message_content"),
        "message_sender": payload.get("message_sender"),
    }
    updated = await model.update_message(message_id, **fields)
    if updated is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"signal": "message_not_found"})
    return {"signal": "message_update_success", "message_id": updated.message_id}


@message_router.delete("/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message_endpoint(request: Request, message_id: int):
    model = await MessageModel.create_instance(db_client=request.app.db_client)
    ok = await model.delete_message(message_id)
    if not ok:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"signal": "message_not_found"})
    return JSONResponse(status_code=status.HTTP_204_NO_CONTENT, content=None)


