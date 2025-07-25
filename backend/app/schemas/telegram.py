from pydantic import BaseModel
from typing import Optional, List, Union

class TelegramUser(BaseModel):
    id: int
    is_bot: bool
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    language_code: Optional[str] = None

class TelegramChat(BaseModel):
    id: int
    type: str
    title: Optional[str] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class TelegramMessage(BaseModel):
    message_id: int
    from_user: Optional[TelegramUser] = None
    date: int
    chat: TelegramChat
    forward_from: Optional[TelegramUser] = None
    forward_from_chat: Optional[TelegramChat] = None
    forward_date: Optional[int] = None
    reply_to_message: Optional['TelegramMessage'] = None
    edit_date: Optional[int] = None
    text: Optional[str] = None
    entities: Optional[List[dict]] = None
    caption: Optional[str] = None
    caption_entities: Optional[List[dict]] = None
    photo: Optional[List[dict]] = None
    document: Optional[dict] = None
    video: Optional[dict] = None
    audio: Optional[dict] = None
    voice: Optional[dict] = None
    contact: Optional[dict] = None
    location: Optional[dict] = None
    venue: Optional[dict] = None
    new_chat_members: Optional[List[TelegramUser]] = None
    left_chat_member: Optional[TelegramUser] = None
    new_chat_title: Optional[str] = None
    new_chat_photo: Optional[List[dict]] = None
    delete_chat_photo: Optional[bool] = None
    group_chat_created: Optional[bool] = None
    supergroup_chat_created: Optional[bool] = None
    channel_chat_created: Optional[bool] = None
    migrate_to_chat_id: Optional[int] = None
    migrate_from_chat_id: Optional[int] = None
    pinned_message: Optional['TelegramMessage'] = None
    invoice: Optional[dict] = None
    successful_payment: Optional[dict] = None
    connected_website: Optional[str] = None
    passport_data: Optional[dict] = None
    proximity_alert_triggered: Optional[dict] = None
    video_chat_scheduled: Optional[dict] = None
    video_chat_started: Optional[dict] = None
    video_chat_ended: Optional[dict] = None
    video_chat_participants_invited: Optional[dict] = None
    web_app_data: Optional[dict] = None
    reply_markup: Optional[dict] = None

class TelegramInlineKeyboardButton(BaseModel):
    text: str
    url: Optional[str] = None
    callback_data: Optional[str] = None
    web_app: Optional[dict] = None
    login_url: Optional[dict] = None
    switch_inline_query: Optional[str] = None
    switch_inline_query_current_chat: Optional[str] = None
    callback_game: Optional[dict] = None
    pay: Optional[bool] = None

class TelegramInlineKeyboard(BaseModel):
    inline_keyboard: List[List[TelegramInlineKeyboardButton]]

class TelegramCallbackQuery(BaseModel):
    id: str
    from_user: TelegramUser
    message: Optional[TelegramMessage] = None
    inline_message_id: Optional[str] = None
    chat_instance: str
    data: Optional[str] = None
    game_short_name: Optional[str] = None

class TelegramUpdate(BaseModel):
    update_id: int
    message: Optional[TelegramMessage] = None
    edited_message: Optional[TelegramMessage] = None
    channel_post: Optional[TelegramMessage] = None
    edited_channel_post: Optional[TelegramMessage] = None
    inline_query: Optional[dict] = None
    chosen_inline_result: Optional[dict] = None
    callback_query: Optional[TelegramCallbackQuery] = None
    shipping_query: Optional[dict] = None
    pre_checkout_query: Optional[dict] = None
    poll: Optional[dict] = None
    poll_answer: Optional[dict] = None
    my_chat_member: Optional[dict] = None
    chat_member: Optional[dict] = None
    chat_join_request: Optional[dict] = None

class TelegramWebhookInfo(BaseModel):
    url: str
    has_custom_certificate: bool
    pending_update_count: int
    last_error_date: Optional[int] = None
    last_error_message: Optional[str] = None
    max_connections: int
    ip_address: Optional[str] = None

class TelegramBotCommand(BaseModel):
    command: str
    description: str

class TelegramBotInfo(BaseModel):
    id: int
    is_bot: bool
    first_name: str
    username: str
    can_join_groups: Optional[bool] = None
    can_read_all_group_messages: Optional[bool] = None
    supports_inline_queries: Optional[bool] = None

class TelegramSendMessageRequest(BaseModel):
    chat_id: Union[int, str]
    text: str
    parse_mode: Optional[str] = None
    entities: Optional[List[dict]] = None
    disable_web_page_preview: Optional[bool] = None
    disable_notification: Optional[bool] = None
    protect_content: Optional[bool] = None
    reply_to_message_id: Optional[int] = None
    allow_sending_without_reply: Optional[bool] = None
    reply_markup: Optional[Union[TelegramInlineKeyboard, dict]] = None

class TelegramSendPhotoRequest(BaseModel):
    chat_id: Union[int, str]
    photo: Union[str, bytes]
    caption: Optional[str] = None
    parse_mode: Optional[str] = None
    caption_entities: Optional[List[dict]] = None
    disable_notification: Optional[bool] = None
    protect_content: Optional[bool] = None
    reply_to_message_id: Optional[int] = None
    allow_sending_without_reply: Optional[bool] = None
    reply_markup: Optional[Union[TelegramInlineKeyboard, dict]] = None

class TelegramAnswerCallbackQueryRequest(BaseModel):
    callback_query_id: str
    text: Optional[str] = None
    show_alert: Optional[bool] = None
    url: Optional[str] = None
    cache_time: Optional[int] = None

class TelegramSetWebhookRequest(BaseModel):
    url: str
    certificate: Optional[Union[str, bytes]] = None
    ip_address: Optional[str] = None
    max_connections: Optional[int] = None
    allowed_updates: Optional[List[str]] = None
    drop_pending_updates: Optional[bool] = None
    secret_token: Optional[str] = None 