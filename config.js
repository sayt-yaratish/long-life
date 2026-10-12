/*
  ============================================
  НАСТРОЙКИ — ЗАПОЛНИТЕ СВОИМИ ДАННЫМИ
  ============================================
  Это единственный файл, который нужно отредактировать,
  чтобы форма реально отправляла заявки.
*/

window.SITE_CONFIG = {

  // --- TELEGRAM ---
  // Токен бота, который вы получили от @BotFather (пример: "123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")
  TELEGRAM_BOT_TOKEN: "ВСТАВЬТЕ_СЮДА_ТОКЕН_БОТА",

  // Chat ID группы, куда бот должен слать заявки (пример: "-1001234567890")
  // Как узнать: добавьте бота в группу, напишите в группе любое сообщение,
  // затем откройте в браузере:
  // https://api.telegram.org/bot<ВАШ_ТОКЕН>/getUpdates
  // и найдите там "chat":{"id": ... }
  TELEGRAM_CHAT_ID: "ВСТАВЬТЕ_СЮДА_CHAT_ID",

  // Ссылка на ваш Telegram-канал (для кнопки "подписаться" после успешной заявки)
  TELEGRAM_CHANNEL_URL: "https://t.me/ВАШ_КАНАЛ",

  // --- EMAIL (через EmailJS, бесплатно на emailjs.com) ---
  // Куда слать письма (уже указано по вашему запросу)
  DESTINATION_EMAIL: "azizaoripova007@gmail.com",

  // Данные из личного кабинета emailjs.com (Email Services / Email Templates / Account > API Keys)
  EMAILJS_PUBLIC_KEY: "ВСТАВЬТЕ_СЮДА_PUBLIC_KEY",
  EMAILJS_SERVICE_ID: "ВСТАВЬТЕ_СЮДА_SERVICE_ID",
  EMAILJS_TEMPLATE_ID: "ВСТАВЬТЕ_СЮДА_TEMPLATE_ID",

  // --- АНТИСПАМ ---
  // Через сколько минут можно отправить повторную заявку с этого же устройства
  COOLDOWN_MINUTES: 10
};
