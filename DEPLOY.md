# Развёртывание 0ne//hub с Caddy

Ниже — пример для отдельного Ubuntu/Debian сервера с публичным IP. Приложение слушает только loopback `127.0.0.1:3000`; Caddy принимает HTTPS извне и проксирует запросы локально. Команды с `sudo` выполняются в SSH-сессии на сервере.

## 1. Подготовьте домен и сервер

У домена создайте DNS-запись `A`, указывающую на IPv4 сервера. Добавляйте `AAAA` только если IPv6 на сервере действительно настроен и доступен. Откройте входящие TCP-порты `80` и `443` в firewall сервера и панели хостинга; порт приложения `3000` наружу не открывайте. Caddy использует эти порты для HTTP/HTTPS и автоматического сертификата. [Документация Caddy: HTTPS](https://caddyserver.com/docs/quick-starts/https).

Установите Node.js версии 20 или новее и Caddy по инструкции для вашей версии ОС из [официальной документации Caddy](https://caddyserver.com/docs/install). Проверьте:

```sh
node --version
caddy version
```

## 2. Разместите приложение

Скопируйте содержимое проекта на сервер в `/opt/onehub` (например, через `git clone` или `rsync`). В каталоге проекта должны лежать `server.js`, `package.json` и папка `public/`.

Создайте системного пользователя и назначьте ему каталог приложения:

```sh
sudo useradd --system --home /opt/onehub --shell /usr/sbin/nologin onehub
sudo chown -R onehub:onehub /opt/onehub
```

Если пользователь уже создан, пропустите `useradd`. `npm install` можно выполнить в каталоге проекта; сторонних runtime-пакетов у приложения сейчас нет.

## 3. Задайте секреты

Сгенерируйте четыре значения локально на сервере. Не публикуйте вывод команд и не помещайте секреты в Git или Caddyfile.

```sh
node -e "const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const b=require('crypto').randomBytes(16);console.log([...b].map(x=>c[x%c.length]).join('').match(/.{4}/g).join('-'))"
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Первая команда печатает ключ администратора; следующие три — независимые секреты шифрования, поиска ключей и подписи сессий. Создайте защищённый environment-файл:

```sh
sudo install -o root -g root -m 600 /dev/null /etc/0ne-hub.env
sudoedit /etc/0ne-hub.env
```

Вставьте туда сгенерированные значения, заменив домен здесь и далее на свой:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
TRUST_PROXY=true
DATA_DIR=/var/lib/0ne-hub
ADMIN_KEY=ВСТАВЬТЕ_СГЕНЕРИРОВАННЫЙ_КЛЮЧ
KEY_ENCRYPTION_SECRET=ВСТАВЬТЕ_ПЕРВЫЙ_СЕКРЕТ
KEY_LOOKUP_SECRET=ВСТАВЬТЕ_ВТОРОЙ_СЕКРЕТ
SESSION_SECRET=ВСТАВЬТЕ_ТРЕТИЙ_СЕКРЕТ
```

Не оставляйте примерные значения из `.env.example`: приложение намеренно откажется запускаться с ними. `TRUST_PROXY=true` безопасен в этой схеме, потому что Node.js доступен только на loopback, а Caddy очищает/переустанавливает forwarded-заголовки по умолчанию. Не выставляйте порт Node наружу при включённом доверии к заголовку IP. [Документация Caddy: reverse_proxy и X-Forwarded-*](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

## 4. Настройте systemd

Скопируйте unit-файл из `deploy/0ne-hub.service` в systemd:

```sh
sudo cp /opt/onehub/deploy/0ne-hub.service /etc/systemd/system/0ne-hub.service
command -v node
```

Если `command -v node` вернул путь, отличный от `/usr/bin/node`, отредактируйте `ExecStart` в `/etc/systemd/system/0ne-hub.service` и укажите фактический путь. Systemd unit создаёт `/var/lib/0ne-hub` для данных приложения. Затем включите службу:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now 0ne-hub
sudo systemctl status 0ne-hub
```

Проверить журнал:

```sh
sudo journalctl -u 0ne-hub -n 100 --no-pager
```

Проверить локальный upstream:

```sh
curl -i http://127.0.0.1:3000/api/session
```

Ответ `200` подтверждает, что процесс приложения поднялся.

## 5. Настройте Caddy для домена

Скопируйте пример конфигурации и замените `example.com` на домен, DNS которого указывает на этот сервер:

```sh
sudo cp /opt/onehub/deploy/Caddyfile.example /etc/caddy/Caddyfile
sudoedit /etc/caddy/Caddyfile
```

Итоговая конфигурация должна выглядеть так:

```caddyfile
hub.example.org {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
```

Проверьте и примените конфигурацию:

```sh
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy
```

Caddy автоматически запросит и будет обновлять TLS-сертификат, а также перенаправит HTTP на HTTPS при доступных DNS и портах. [Документация Caddy: Automatic HTTPS](https://caddyserver.com/docs/automatic-https).

Откройте `https://ваш-домен`. Войдите по `ADMIN_KEY`, добавьте пользователей и статьи через интерфейс администратора.

## 6. Обновление приложения

Сделайте резервную копию данных, обновите файлы проекта, затем перезапустите сервис:

```sh
sudo tar -czf /root/0ne-hub-data-$(date +%F-%H%M).tar.gz /var/lib/0ne-hub
sudo systemctl restart 0ne-hub
sudo systemctl status 0ne-hub
```

При обновлении не перезаписывайте `/etc/0ne-hub.env`. Храните резервные копии отдельно от сервера и регулярно проверяйте восстановление. Потеря `KEY_ENCRYPTION_SECRET` сделает сохранённые ключи пользователей нечитаемыми; потеря `KEY_LOOKUP_SECRET` также потребует выдать пользователям новые ключи.

## Эксплуатационные ограничения

Хранилище сейчас представляет собой JSON-файл, а rate limit живёт в памяти процесса. Используйте один экземпляр приложения и настройте регулярное резервное копирование. Для высокой нагрузки или критичных данных сначала перенесите хранение на транзакционную БД и распределённое хранилище ограничений. Не запускайте несколько копий сервиса на общем JSON-файле.
