# SunMind Frontend

Фронтенд приложение для управления интеллектуальными светильниками SunMind.

## 🚀 Быстрый старт

### Установка зависимостей

```bash
npm install
```

### Настройка переменных окружения

Создайте файл `.env.local` в корне проекта (этот файл игнорируется git):

```env
# Базовый URL API бэкенда
NEXT_PUBLIC_API_URL=http://localhost:8000

# WebSocket URL (обычно тот же хост, но с ws:// или wss://)
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

**Важно:** Если переменные окружения не заданы, используются значения по умолчанию (`http://localhost:8000` и `ws://localhost:8000`).

### Запуск приложения

```bash
npm run dev
```

Приложение будет доступно по адресу [http://localhost:3000](http://localhost:3000)

## 📁 Структура проекта

```
├── app/                    # Next.js App Router
│   ├── auth/              # Страницы аутентификации
│   ├── dashboard/         # Страницы дашборда
│   └── layout.tsx         # Корневой layout
├── components/            # React компоненты
│   ├── controls/          # Компоненты управления
│   ├── modals/            # Модальные окна
│   └── websocket-provider.tsx  # Провайдер WebSocket
├── lib/                   # Утилиты и библиотеки
│   ├── api/               # API клиент
│   │   ├── client.ts      # HTTP клиент
│   │   ├── websocket.ts   # WebSocket клиент
│   │   ├── config.ts      # Конфигурация API
│   │   └── types.ts       # Типы для API
│   └── utils.ts           # Общие утилиты
├── store/                 # Zustand stores
│   ├── auth-store.ts      # Store аутентификации
│   ├── device-store.ts    # Store устройств
│   └── light-store.ts     # Store настроек света
└── types/                 # TypeScript типы
```

## 🔐 Аутентификация

Приложение использует JWT токены для аутентификации. После успешного входа или регистрации токен сохраняется в localStorage и автоматически добавляется ко всем запросам к API.

### Регистрация

1. Перейдите на `/auth/register`
2. Заполните форму (имя, email, пароль минимум 8 символов)
3. После регистрации автоматически выполняется вход

### Вход

1. Перейдите на `/auth/login`
2. Введите email и пароль
3. После успешного входа происходит перенаправление на дашборд

## 🔌 WebSocket интеграция

Приложение автоматически подключается к WebSocket серверу после успешной аутентификации. WebSocket используется для:

- Получения телеметрии от устройств в реальном времени
- Управления устройствами (отправка команд)
- Отслеживания подключения/отключения устройств
- Получения подтверждений выполнения команд

## 📡 API интеграция

### Основные эндпоинты

- `POST /auth/register` - Регистрация пользователя
- `POST /auth/login` - Вход пользователя
- `GET /auth/me` - Получение информации о текущем пользователе
- `GET /health` - Проверка работоспособности сервера

### WebSocket эндпоинты

- `WS /ws/user?token=<jwt_token>` - WebSocket соединение для пользователей

## 🛠️ Разработка

### Технологии

- **Next.js 16** - React фреймворк
- **TypeScript** - Типизация
- **Zustand** - Управление состоянием
- **Tailwind CSS** - Стилизация
- **React Hot Toast** - Уведомления

### Структура stores

#### Auth Store (`store/auth-store.ts`)

Управляет аутентификацией пользователя:
- `login(email, password)` - Вход
- `register(name, email, password)` - Регистрация
- `logout()` - Выход
- `fetchCurrentUser()` - Получение информации о пользователе

#### Device Store (`store/device-store.ts`)

Управляет устройствами и их телеметрией:
- `setDevices(devices)` - Установка списка устройств
- `updateTelemetry(deviceId, telemetry)` - Обновление телеметрии
- `initializeWebSocket()` - Инициализация WebSocket обработчиков

#### Light Store (`store/light-store.ts`)

Управляет настройками светильника:
- `togglePower()` - Включение/выключение
- `setBrightness(brightness)` - Установка яркости
- `setMode(mode)` - Установка режима работы
- `syncWithDevice(deviceId)` - Синхронизация с устройством

## 📝 Примечания

1. **Токены**: JWT токены сохраняются в localStorage через Zustand persist middleware
2. **WebSocket**: Автоматически переподключается при потере соединения (до 5 попыток)
3. **Ошибки**: Все ошибки API отображаются через toast уведомления
4. **Переменные окружения**: Используйте `.env.local` для локальной разработки

## 🔗 Связанные проекты

- [SunMind Backend API](../backend) - Backend API сервер
# sunmind_frontend
