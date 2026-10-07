# Деплой one//hub на Ubuntu/Debian с Caddy

Эта версия требует Node.js 20+ и production-сборки Vite. Caddy завершает HTTPS и проксирует запросы на Node, который слушает только `127.0.0.1:3000`.

## Установка и обновление

Настройте DNS `A` на адрес сервера; откройте входящие TCP 80/443. Установите Node.js 20+ и Caddy по официальным инструкциям. Разместите репозиторий в `/opt/onehub`, затем установите зависимости и соберите UI:

```sh
cd /opt/onehub
npm ci
npm run build
```

Если директория уже обслуживается, остановите службу перед обновлением. До миграции сохраните backup данных:

```sh
sudo systemctl stop 0ne-hub
sudo cp -a /var/lib/0ne-hub /var/lib/0ne-hub.backup.$(date +%Y%m%d-%H%M%S)
```

Запустите миграцию от имени сервиса на том же каталоге, который задан в `DATA_DIR`:

```sh
sudo -u onehub env DATA_DIR=/var/lib/0ne-hub npm --prefix /opt/onehub run migrate:kb
```

Команда сохраняет пользователей, ключи, устройства и сессии; для обновления статьи переносит/санитизирует старый HTML. Выполнить один раз при первом обновлении. Скрипт идемпотентный.

## Секреты и systemd

`/etc/0ne-hub.env` должен быть владельца root, режим `600`. В нём задайте `NODE_ENV=production`, `HOST=127.0.0.1`, `PORT=3000`, `DATA_DIR=/var/lib/0ne-hub`, `TRUST_PROXY=true`, уникальный `ADMIN_KEY` и три независимых секрета длиной не менее 32 символов (`KEY_ENCRYPTION_SECRET`, `KEY_LOOKUP_SECRET`, `SESSION_SECRET`). Не меняйте эти секреты после появления данных: они нужны для ключей и сессий.

```sh
sudo install -o root -g root -m 600 /dev/null /etc/0ne-hub.env
sudoedit /etc/0ne-hub.env
sudo cp /opt/onehub/deploy/0ne-hub.service /etc/systemd/system/0ne-hub.service
sudo systemctl daemon-reload
sudo systemctl enable --now 0ne-hub
sudo systemctl status 0ne-hub --no-pager -l
curl -i http://127.0.0.1:3000/api/session
```

Если `command -v node` не выводит `/usr/bin/node`, исправьте путь `ExecStart` в unit. Сборка `dist/` должна быть готова до старта сервиса. Unit уже задаёт `ReadWritePaths=/var/lib/0ne-hub`.

## Caddy

Установите Caddy, укажите свой домен в `/etc/caddy/Caddyfile`:

```caddyfile
kb.example.org {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
}
```

Примените:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Caddy получит TLS сертификат автоматически при доступных DNS и портах 80/443. Порт Node наружу не открывайте.

## Диагностика и повторный деплой

```sh
sudo journalctl -u 0ne-hub -n 100 --no-pager
sudo ss -ltnp | grep ':3000'
curl -i https://ваш-домен/api/session
```

Обновление: `git pull --ff-only`, `npm ci`, `npm run build`, затем `sudo systemctl restart 0ne-hub`. Не затирайте `/var/lib/0ne-hub` и не запускайте `git clean` по каталогу данных.
