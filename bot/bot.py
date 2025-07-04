# Reflex Telegram Bot – clean rewrite
# Requires aiogram v3
from __future__ import annotations

import os
import asyncio
import uuid
from collections import defaultdict
from datetime import datetime, time
from typing import Dict, List
from dotenv import load_dotenv

import aiohttp
from aiogram import Bot, Dispatcher, F
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode, ContentType
from aiogram.filters import CommandStart, Command
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    ReplyKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardRemove,
    InputMediaPhoto,
    Message,
    WebAppInfo,
    PhotoSize,
)

load_dotenv()

# === CONFIG ===
BOT_TOKEN = os.getenv("BOT_TOKEN")
API_BASE = os.getenv("api_url") or "https://spectrmod.ru/api"
WEBAPP_URL = "https://kash-dev-reflex.vercel.app/"  # открывается через Web-App кнопку
SUPPORT_USERNAME = "spectrmod"  # @spectrmod
INTRO_PICTURE = "https://s.iimg.su/s/18/3dr82mIVRK6ojKvPQH2OBcYEM4pStJ0zrTo2USQ6.png"

# Admins who can run maintenance commands
ADMIN_IDS = {8072408248, 7001269338, 8186814795}

# Endpoints
PROFILE_BY_TG_URL = f"{API_BASE}/profile/by-telegram/{{telegram_id}}"
UPLOAD_URL = f"{API_BASE}/profile/add-media"
# Рекламные эндпоинты
AD_SERVE_URL = f"{API_BASE}/advertising/serve"
AD_IMPRESSION_URL = f"{API_BASE}/advertising/track/impression"
AD_CLICK_URL = f"{API_BASE}/advertising/track/click"

bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher()

# --- Runtime storage for multi-step image uploads ---
class UploadState:
    mode: str  # "upload"
    images: List[str]
    def __init__(self):
        self.mode = "upload"
        self.images = []

user_states: Dict[int, UploadState] = {}
media_groups: defaultdict[str, List[Message]] = defaultdict(list)

# Счетчик действий пользователей для показа рекламы в поиске
user_actions: defaultdict[int, int] = defaultdict(int)

# === Helpers ===
async def fetch_profile(tg_id: int) -> dict | None:
    """Возвращает профиль пользователя (минимальный), либо None."""
    url = PROFILE_BY_TG_URL.format(telegram_id=tg_id)
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                data = await resp.json()
                return data.get("profile") if data.get("exists") else None
    except Exception:
        return None

async def get_admin_token(tg_id: int) -> str | None:
    """Получает токен для админских запросов."""
    try:
        # Создаем сессию для админа
        token = await create_webapp_session(tg_id)
        return token
    except Exception as e:
        print(f"Ошибка получения админского токена: {e}")
        return None

async def create_webapp_session(tg_id: int) -> str:
    token = str(uuid.uuid4())
    # POST запрос на создание сессии убран
    return token

# === Реклама ===
async def get_advertisement(user_id: int) -> dict | None:
    """Получает рекламу для пользователя с API."""
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                AD_SERVE_URL, 
                params={"userId": user_id},
                timeout=aiohttp.ClientTimeout(total=5)
                          ) as resp:
                  data = await resp.json()
                  print(f"[DEBUG] Реклама для пользователя {user_id}: {data}")
                  return data.get("ad") if data.get("ad") else None
    except Exception as e:
        print(f"Ошибка получения рекламы: {e}")
        return None

async def get_advertisement_by_id(campaign_id: str) -> dict | None:
    """Получает конкретную рекламу по ID кампании."""
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                f"{API_BASE}/advertising/campaign/{campaign_id}/ad",
                timeout=aiohttp.ClientTimeout(total=5)
            ) as resp:
                data = await resp.json()
                return data.get("ad") if data.get("ad") else None
    except Exception as e:
        print(f"Ошибка получения рекламы по ID: {e}")
        return None

async def track_ad_impression(campaign_id: str, user_id: int):
    """Отправляет трекинг показа рекламы."""
    try:
        payload = {"campaignId": campaign_id, "userId": user_id}
        async with aiohttp.ClientSession() as sess:
            await sess.post(AD_IMPRESSION_URL, json=payload, timeout=aiohttp.ClientTimeout(total=3))
    except Exception as e:
        print(f"Ошибка трекинга показа: {e}")

async def track_ad_click(campaign_id: str, user_id: int):
    """Отправляет трекинг клика по рекламе."""
    try:
        payload = {"campaignId": campaign_id, "userId": user_id}
        async with aiohttp.ClientSession() as sess:
            await sess.post(AD_CLICK_URL, json=payload, timeout=aiohttp.ClientTimeout(total=3))
    except Exception as e:
        print(f"Ошибка трекинга клика: {e}")

async def send_advertisement(chat_id: int, user_id: int):
    """Отправляет рекламу пользователю в чат."""
    ad = await get_advertisement(user_id)
    if not ad:
        return False
    
    try:
        print(f"[DEBUG] Отправляю рекламу ID={ad['id']}, title={ad.get('title')}, buttonUrl={ad.get('buttonUrl')}")
        
        # Создаем кнопку с трекингом клика
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(
                text=ad.get("buttonText", "Перейти"),
                callback_data=f"ad_click:{ad['id']}"
            )]
        ])
        
        # Отправляем рекламу
        if ad.get("imageUrl"):
            await bot.send_photo(
                chat_id=chat_id,
                photo=ad["imageUrl"],
                caption=f"🎯 <b>{ad.get('title', '')}</b>\n\n{ad.get('description', '')}",
                reply_markup=keyboard
            )
        else:
            await bot.send_message(
                chat_id=chat_id,
                text=f"🎯 <b>{ad.get('title', '')}</b>\n\n{ad.get('description', '')}",
                reply_markup=keyboard
            )
        
        # Трекаем показ
        await track_ad_impression(ad["id"], user_id)
        return True
        
    except Exception as e:
        print(f"Ошибка отправки рекламы: {e}")
        return True

# === Handlers ===
@dp.message(CommandStart())
async def cmd_start(msg: Message):
    tg_id = msg.from_user.id
    # aiogram v3 removed Message.get_args(); parse command arguments manually
    # Message.text may look like "/start" or "/start <args>" –
    # so split once to obtain the deep-link argument if provided.
    parts = (msg.text or "").split(maxsplit=1)
    arg = parts[1].strip() if len(parts) > 1 else ""

    # Legacy quick entry to upload flow
    if arg in {"upload", "media"}:
        user_states[tg_id] = UploadState()
        await msg.answer("📸 Отправьте до 5 изображений для анкеты. После — нажмите ✅ Завершить.")
        return

    profile = await fetch_profile(tg_id)
    has_profile = bool(profile)
    session_token = await create_webapp_session(tg_id)

    # Формируем клавиатуру Reply (под полем ввода)
    keyboard_buttons = [
        [KeyboardButton(text="📸 Загрузить фото")],
        [KeyboardButton(text="📞 Поддержка")],
    ]
    reply_kb = ReplyKeyboardMarkup(keyboard=keyboard_buttons, resize_keyboard=True, selective=True)

    # Инлайн-клавиатура для того же действия (отображается под карточкой-превью)
    inline_kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🚀 Запустить", web_app=WebAppInfo(url=WEBAPP_URL))]
    ])

    if has_profile:
        caption = (
            "<b>Reflex — анонимный LGB🌈Q чат-тиндер</b>\n\n"
            "Нажмите «Запустить», чтобы открыть приложение.\n"
            "📸 Загрузить фото — управлять фотографиями (1-5)\n"
            "📞 Поддержка — вопросы → @spectrmod"
        )
    else:
        caption = (
            "<b>Reflex — анонимный LGB🌈Q чат-тиндер</b>\n\n"
            "Нажмите «Запустить», пройдите короткую регистрацию и начинайте знакомиться!"
        )

    # 1) Отправляем превью с inline-кнопкой
    await bot.send_photo(chat_id=msg.chat.id, photo=INTRO_PICTURE, caption=caption, reply_markup=inline_kb)

    # 2) Следом — сервисное сообщение, которое показывает Reply-клавиатуру-меню
    await msg.answer("Меню", reply_markup=reply_kb)
    
    # 3) Показываем рекламу с небольшой задержкой
    await asyncio.sleep(2)
    await send_advertisement(msg.chat.id, tg_id)

#####################
# --- Photo menu ---
#####################

# Step 1: show existing photos and menu

@dp.message(F.text == "📸 Загрузить фото")
async def menu_upload(msg: Message):
    tg_id = msg.from_user.id
    
    # Показываем рекламу при переходе в меню фото
    await maybe_show_search_ad(msg.chat.id, tg_id)
    
    profile = await fetch_profile(tg_id)

    if not profile or not profile.get("images"):
        await msg.answer("Сначала создайте анкету в приложении, затем вернитесь, чтобы загрузить фото.")
        return

    images: list[str] = profile.get("images", [])

    # Показываем нынешние фото (альбомом, если >1)
    try:
        if len(images) > 1:
            media = [InputMediaPhoto(media=url) for url in images[:10]]  # телеграм ограничивает 10 на альбом
            await bot.send_media_group(chat_id=msg.chat.id, media=media)  # type: ignore[arg-type]
        elif images:
            await bot.send_photo(chat_id=msg.chat.id, photo=images[0])
    except Exception:
        # Если случилось что-то при отправке изображений — пропускаем, не критично.
        pass

    remaining = max(0, 5 - len(images))

    # Показываем меню «загрузить ещё / назад»
    kb = ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📸 Загрузить ещё фото")],
            [KeyboardButton(text="🔙 Назад")],
        ],
        resize_keyboard=True,
        selective=True,
    )

    await msg.answer(
        f"У вас загружено {len(images)}/5 фото. Вы можете загрузить ещё {remaining}.",
        reply_markup=kb,
    )

# Step 2: user chooses to add more photos

@dp.message(F.text == "📸 Загрузить ещё фото")
async def start_upload_flow(msg: Message):
    tg_id = msg.from_user.id
    profile = await fetch_profile(tg_id)

    current_images = len(profile.get("images", [])) if profile else 0
    remaining = 5 - current_images

    if remaining <= 0:
        await msg.answer("У вас уже 5 фото — сначала удалите лишние в приложении.")
        return

    user_states[tg_id] = UploadState()
    await msg.answer(
        f"📸 Отправьте до {remaining} изображений. После — нажмите ✅ Завершить.",
        reply_markup=ReplyKeyboardRemove(),
    )

# Step 3: back button returns to main menu

@dp.message(F.text == "🔙 Назад")
async def back_to_main(msg: Message):
    # Recreate the main menu quickly
    tg_id = msg.from_user.id
    profile = await fetch_profile(tg_id)
    session_token = await create_webapp_session(tg_id)

    keyboard_buttons = [
        [KeyboardButton(text="📸 Загрузить фото")],
        [KeyboardButton(text="📞 Поддержка")],
    ]
    reply_kb = ReplyKeyboardMarkup(keyboard=keyboard_buttons, resize_keyboard=True, selective=True)

    await msg.answer("Меню", reply_markup=reply_kb)

# ===========================
#  Photo upload flow helpers
# ===========================

# Handle incoming photos during active upload session

@dp.message(lambda m: m.photo)
async def handle_photos(msg: Message):
    tg_id = msg.from_user.id
    
    # Показываем рекламу иногда во время загрузки фото
    await maybe_show_search_ad(msg.chat.id, tg_id)
    
    if tg_id not in user_states:
        await msg.answer("Сначала нажмите «📸 Загрузить фото».")
        return

    state = user_states.get(tg_id)
    if not state or state.mode != "upload":
        return  # not in upload mode

    # Collect media groups so we process the album once
    if msg.media_group_id:
        media_groups[msg.media_group_id].append(msg)
        # Wait a moment for the group to complete
        await asyncio.sleep(1.2)
        if media_groups[msg.media_group_id]:
            group = media_groups.pop(msg.media_group_id)
            for m in group:
                await _save_photo(m, state)
    else:
        await _save_photo(msg, state)

    count = len(state.images)
    await msg.answer(f"✅ Загружено {count}/5 фото")

    if count >= 5:
        await _finish_upload(msg, state)
    else:
        kb = ReplyKeyboardMarkup(
            keyboard=[[KeyboardButton(text="✅ Завершить")]],
            resize_keyboard=True,
        )
        await msg.answer("Когда будете готовы — нажмите «Завершить».", reply_markup=kb)


@dp.message(F.text == "✅ Завершить")
async def finish_manual(msg: Message):
    tg_id = msg.from_user.id
    state = user_states.get(tg_id)
    if not state or not state.images:
        await msg.answer("Сначала загрузите хотя бы одну фотографию.")
        return

    await _finish_upload(msg, state)


async def _save_photo(msg: Message, state: UploadState):
    if len(state.images) >= 5:
        await msg.answer("🚫 Достигнут лимит 5 фотографий.")
        return

    photo: PhotoSize = msg.photo[-1]
    file = await bot.get_file(photo.file_id)
    url = f"https://api.telegram.org/file/bot{BOT_TOKEN}/{file.file_path}"

    async with aiohttp.ClientSession() as sess:
        resp = await sess.post(UPLOAD_URL, json={
            "telegramId": str(msg.from_user.id),
            "imageUrl": url,
        })
        if resp.status == 200:
            state.images.append(url)
        else:
            await msg.answer("❌ Не удалось загрузить фото, попробуйте ещё раз.")


async def _finish_upload(msg: Message, state: UploadState):
    tg_id = msg.from_user.id
    user_states.pop(tg_id, None)

    # Вернём пользователя к меню
    await back_to_main(msg)
    await msg.answer("🎉 Фото сохранены. Можете вернуться в приложение!")

# --- /reset command ---

@dp.message(Command("reset"))
async def cmd_reset(msg: Message):
    """Отправляет кнопку-WebApp для полной очистки (страница /reset)."""
    kb = InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="♻️ Сбросить данные", web_app=WebAppInfo(url=f"{WEBAPP_URL}/reset"))]]
    )
    await msg.answer(
        "Нажмите кнопку ниже, чтобы перезапустить приложение и очистить локальные данные.",
        reply_markup=kb,
    )

# --- notifyfix command: inform users without profile ---

@dp.message(Command("notifyfix"))
async def cmd_notifyfix(msg: Message):
    """
    Админская команда для исправления уведомлений.
    """
    if msg.from_user.id not in ADMIN_IDS:
        await msg.answer("Недостаточно прав.")
        return

    # Здесь можно добавить логику для исправления уведомлений
    await msg.answer("Уведомления исправлены.")

@dp.message(Command("testads"))
async def cmd_test_ads(msg: Message):
    """
    Админская команда для тестирования рекламы.
    """
    if msg.from_user.id not in ADMIN_IDS:
        await msg.answer("Недостаточно прав.")
        return

    success = await send_advertisement(msg.chat.id, msg.from_user.id)
    if success:
        await msg.answer("✅ Тестовая реклама отправлена")
    else:
        await msg.answer("❌ Нет доступной рекламы")

@dp.message(Command("broadcastads"))
async def cmd_broadcast_ads(msg: Message):
    """
    Админская команда для принудительной рассылки рекламы.
    """
    if msg.from_user.id not in ADMIN_IDS:
        await msg.answer("Недостаточно прав.")
        return

    await msg.answer("🚀 Начинаю рассылку рекламы...")
    
    try:
        url = f"{API_BASE}/stats/all-users"
        async with aiohttp.ClientSession() as sess:
            async with sess.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                data = await resp.json()
                users = data.get("users", [])
        
        sent_count = 0
        for user in users:
            try:
                tg_id = int(user.get("telegramId"))
                if await send_advertisement(tg_id, tg_id):
                    sent_count += 1
                await asyncio.sleep(0.1)
            except Exception:
                continue
        
        await msg.answer(f"✅ Рассылка завершена. Отправлено: {sent_count} реклам")
        
    except Exception as e:
        await msg.answer(f"❌ Ошибка рассылки: {e}")

@dp.message(Command("checkcampaigns"))
async def cmd_check_campaigns(msg: Message):
    """
    Админская команда для проверки статуса кампаний.
    """
    if msg.from_user.id not in ADMIN_IDS:
        await msg.answer("Недостаточно прав.")
        return

    try:
        token = await get_admin_token(msg.from_user.id)
        if not token:
            await msg.answer("❌ Ошибка авторизации")
            return
            
        url = f"{API_BASE}/advertising/admin/campaigns"
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                url, 
                headers={"Authorization": f"Bearer {token}"},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                data = await resp.json()
                campaigns = data.get("campaigns", [])
        
        if not campaigns:
            await msg.answer("❌ Нет кампаний в системе")
            return
        
        status_counts = {}
        for campaign in campaigns:
            status = campaign.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        status_text = "\n".join([f"• {status}: {count}" for status, count in status_counts.items()])
        
        await msg.answer(f"📊 Статистика кампаний:\n{status_text}\n\nВсего: {len(campaigns)}")
        
    except Exception as e:
        await msg.answer(f"❌ Ошибка получения кампаний: {e}")

@dp.message(Command("approveall"))
async def cmd_approve_all(msg: Message):
    """
    Админская команда для одобрения всех pending кампаний.
    """
    if msg.from_user.id not in ADMIN_IDS:
        await msg.answer("Недостаточно прав.")
        return

    try:
        token = await get_admin_token(msg.from_user.id)
        if not token:
            await msg.answer("❌ Ошибка авторизации")
            return
            
        # Получаем все кампании
        url = f"{API_BASE}/advertising/admin/campaigns"
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                url, 
                headers={"Authorization": f"Bearer {token}"},
                timeout=aiohttp.ClientTimeout(total=10)
            ) as resp:
                data = await resp.json()
                campaigns = data.get("campaigns", [])
        
        pending_campaigns = [c for c in campaigns if c.get("status") == "pending"]
        
        if not pending_campaigns:
            await msg.answer("❌ Нет кампаний на модерации")
            return
        
        await msg.answer(f"🔄 Одобряю {len(pending_campaigns)} кампаний...")
        
        approved_count = 0
        for campaign in pending_campaigns:
            try:
                moderate_url = f"{API_BASE}/advertising/admin/campaigns/{campaign['id']}/moderate"
                async with aiohttp.ClientSession() as sess:
                    async with sess.post(
                        moderate_url, 
                        json={"action": "approve", "comment": "Автоодобрение"},
                        headers={"Authorization": f"Bearer {token}"},
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as resp:
                        if resp.status == 200:
                            approved_count += 1
            except Exception as e:
                print(f"Ошибка одобрения кампании {campaign['id']}: {e}")
                continue
        
        await msg.answer(f"✅ Одобрено кампаний: {approved_count}")
        
    except Exception as e:
        await msg.answer(f"❌ Ошибка одобрения: {e}")

# === Обработчик кликов по рекламе ===
@dp.callback_query(F.data.startswith("ad_click:"))
async def handle_ad_click(callback):
    """Обрабатывает клики по рекламе."""
    try:
        campaign_id = callback.data.split(":", 1)[1]
        user_id = callback.from_user.id
        
        print(f"[DEBUG] Клик по рекламе: campaign_id={campaign_id}, user_id={user_id}")
        
        # Трекаем клик
        await track_ad_click(campaign_id, user_id)
        
        # Получаем информацию о конкретной рекламе по ID
        ad = await get_advertisement_by_id(campaign_id)
        print(f"[DEBUG] Получена реклама по ID: {ad}")
        
        if ad and ad.get("buttonUrl"):
            await callback.answer("Переходим по ссылке...", show_alert=False)
            # Отправляем сообщение с ссылкой, так как в боте нельзя напрямую открыть браузер
            await bot.send_message(
                callback.message.chat.id,
                f"🔗 Ссылка: {ad['buttonUrl']}"
            )
        else:
            await callback.answer("Реклама больше не активна", show_alert=True)
            
    except Exception as e:
        print(f"Ошибка обработки клика по рекламе: {e}")
        await callback.answer("Произошла ошибка", show_alert=True)

# === Функция для показа рекламы в поиске ===
async def maybe_show_search_ad(chat_id: int, user_id: int):
    """Показывает рекламу в поиске каждые 5 действий."""
    user_actions[user_id] += 1
    
    # Показываем рекламу каждые 5 действий
    if user_actions[user_id] % 5 == 0:
        await send_advertisement(chat_id, user_id)

# === Ежедневная рассылка рекламы ===
async def daily_ad_broadcast():
    """Ежедневная рассылка рекламы в 15:00."""
    while True:
        now = datetime.now()
        target_time = now.replace(hour=15, minute=0, second=0, microsecond=0)
        
        # Если время уже прошло, планируем на завтра
        if now >= target_time:
            target_time = target_time.replace(day=target_time.day + 1)
        
        # Вычисляем время до рассылки
        wait_seconds = (target_time - now).total_seconds()
        print(f"Следующая рассылка рекламы: {target_time}")
        
        await asyncio.sleep(wait_seconds)
        
        # Получаем список всех пользователей
        try:
            url = f"{API_BASE}/stats/all-users"
            async with aiohttp.ClientSession() as sess:
                async with sess.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    data = await resp.json()
                    users = data.get("users", [])
            
            print(f"[DEBUG] Найдено пользователей для рассылки: {len(users)}")
            
            sent_count = 0
            for user in users:
                try:
                    tg_id = int(user.get("telegramId"))
                    if await send_advertisement(tg_id, tg_id):
                        sent_count += 1
                    # Небольшая задержка между отправками
                    await asyncio.sleep(0.1)
                except Exception as e:
                    print(f"Ошибка отправки рекламы пользователю {user.get('telegramId')}: {e}")
                    continue
            
            print(f"Ежедневная рассылка завершена. Отправлено: {sent_count} реклам")
            
        except Exception as e:
            print(f"Ошибка ежедневной рассылки: {e}")
        
        # Ждем 24 часа до следующей рассылки
        await asyncio.sleep(86400)

# === Main ===
async def main():
    print("🤖 Reflex Bot starting...")
    
    # Запускаем планировщик ежедневной рассылки рекламы
    asyncio.create_task(daily_ad_broadcast())
    
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
