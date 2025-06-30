#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import telebot
import logging
import sqlite3
import threading
import time
from datetime import datetime, timedelta

# Токен бота
BOT_TOKEN = "8143311268:AAEGtn7jn2vIMPHvxrcfhB59avPAB63w8bQ"

# Создание экземпляра бота
bot = telebot.TeleBot(BOT_TOKEN)

# Логирование
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)

# Сообщения
MAINTENANCE_MESSAGE = """
🔧 Технические работы

Проходят технические работы.

🙏 Просьба не заносить бота в черный список, мы сообщим когда тех работы завершатся!

Следить за происходящим можно здесь: @spectr_info

Спасибо за понимание!
"""

RESUME_MESSAGE = """
✅ Бот снова в строю!

Чтобы продолжить, просто отправьте /start
"""

# --- 📦 База данных

DB_FILE = 'users.db'

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            registered_at TEXT
        )
    ''')
    conn.commit()
    conn.close()

def save_user(user_id, username):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT user_id FROM users WHERE user_id = ?', (user_id,))
    if not c.fetchone():
        c.execute('INSERT INTO users (user_id, username, registered_at) VALUES (?, ?, ?)',
                  (user_id, username, datetime.utcnow().isoformat()))
        conn.commit()
    conn.close()

def get_all_users():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute('SELECT user_id FROM users')
    users = [row[0] for row in c.fetchall()]
    conn.close()
    return users

# --- 🧵 Рассылка по времени

def schedule_broadcast():
    def job():
        # Время по МСК
        target_time = datetime(2025, 6, 18, 15, 0)
        while datetime.now() < target_time:
            time.sleep(30)  # чекаем каждые 30 сек
        users = get_all_users()
        for user_id in users:
            try:
                bot.send_message(user_id, RESUME_MESSAGE)
            except Exception as e:
                logging.warning(f"Не удалось отправить сообщение {user_id}: {e}")
    threading.Thread(target=job, daemon=True).start()

# --- 📬 Хендлеры

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    save_user(message.from_user.id, message.from_user.username)
    bot.reply_to(message, MAINTENANCE_MESSAGE)

@bot.message_handler(func=lambda message: True)
def handle_all_messages(message):
    save_user(message.from_user.id, message.from_user.username)
    bot.reply_to(message, MAINTENANCE_MESSAGE)

# --- 🚀 Главный запуск

def main():
    init_db()
    schedule_broadcast()

    print("🤖 Бот запущен и готов к работе...")
    print("⏰ Сообщение пользователям будет отправлено 18.06.2025 в 12:00 МСК")
    print("❌ Для остановки нажмите Ctrl+C")

    try:
        bot.polling(none_stop=True)
    except KeyboardInterrupt:
        print("\n🛑 Бот остановлен пользователем")
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        logging.error(f"Ошибка в работе бота: {e}")

if __name__ == '__main__':
    main()
