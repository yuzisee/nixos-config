
# System setup
https://www.librechat.ai/docs/remote/docker_linux
AWS Lightsail

```sh
sudo apt update
sudo apt install apt-transport-https ca-certificates curl software-properties-common gnupg lsb-release
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update

sudo apt install docker-ce
whoami
sudo usermod -aG docker ubuntu # sudo usermod -aG docker $USER
# sudo reboot

# ==========================
sudo systemctl status docker
sudo apt install docker-compose-plugin
docker compose version

sudo apt install git nodejs npm
```

# Librechat

- `git clone https://github.com/LibreChat-AI/LibreChat.git`
- `cd LibreChat/`
- `vi librechat.yaml`
- `cp .env.example .env`

Run `openssl rand -hex 16` for CREDS_IV
Run `openssl rand -hex 32` three times, for CREDS_KEY, JWT_SECRET, JWT_REFRESH_SECRET
Run `openssl rand -hex 16` one last time for ADMIN_PANEL_SESSION_SECRET

Add ANTHROPIC_API_KEY + OPENAI_API_KEY
e.g.https://www.librechat.ai/docs/configuration/pre_configured_ai/openai 

Also, https://aistudio.google.com/api-keys for GOOGLE_KEY (which is different from the old way that created a Google Cloud Project in the background w/ Generative Language API in order to separately manage project quotas & billing tiers)

# DNS

3.146.152.117
huang.bot

```sh
client/nginx.conf # replace 'server_name' under 'admin-panel' as 'admin.huang.bot', I guess also 'server_name' under 'server' even though it's already `default_server`
vi .env # DOMAIN_CLIENT, DOMAIN_SERVER, ADMIN_PANEL_URL
```

Add the HTTPS port under "Networking" in AWS Lightsail
- `sudo apt install certbot`
- `cd ~/LibreChat && npm run stop:deployed`
- `sudo certbot certonly --standalone --cert-name huang.bot -d huang.bot -d admin.huang.bot --pre-hook "/usr/bin/docker compose -f /home/ubuntu/LibreChat/deploy-compose.yml down" --post-hook "/usr/bin/docker compose -f /home/ubuntu/LibreChat/deploy-compose.yml up -d"`
- `sudo systemctl enable --now certbot.timer`
- `systemctl list-timers --all 'certbot*'`
- `vi client/nginx.conf` # comment out the non-SSL lines and uncomment the SSL lines 
- `vi deploy-compose.yml` # Add `- /etc/letsencrypt:/etc/letsencrypt:ro` after services → client → volumes

"""
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;

    ssl_certificate /etc/letsencrypt/live/huang.bot/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/huang.bot/privkey.pem;
    ⋮
    server_name huang.bot;
}
"""



# Bring-up

`sudo docker compose -f ./deploy-compose.yml up -d`


### Debugging

```sh
sudo docker compose -f ./deploy-compose.yml ps -a # shows `api` is restarting (continuously)
sudo docker compose -f ./deploy-compose.yml logs --tail=150 api
```

"""
LibreChat-API  | Error: [credentials] CREDS_KEY must be exactly 64 hexadecimal characters (32 bytes). Refusing startup to prevent weak encryption or late crypto failures. Restore the original credential if it protects existing data; plan a controlled migration before rotating it.
LibreChat-API  |     at bootstrapCredentials (/app/packages/api/dist/credentials.cjs:169:10)
LibreChat-API  |     at Object.<anonymous> (/app/api/config/credentials.js:5:18)
LibreChat-API  |     at Module._compile (node:internal/modules/cjs/loader:1929:14)
LibreChat-API  |     at Object..js (node:internal/modules/cjs/loader:2060:10)
LibreChat-API  |     at Module.load (node:internal/modules/cjs/loader:1651:32)
LibreChat-API  |     at Module._load (node:internal/modules/cjs/loader:1443:12)
LibreChat-API  |     at wrapModuleLoad (node:internal/modules/cjs/loader:261:19)
LibreChat-API  |     at Module.require (node:internal/modules/cjs/loader:1674:12)
LibreChat-API  |     at require (node:internal/modules/helpers:157:16)
LibreChat-API  |     at Object.<anonymous> (/app/api/server/index.js:1:1)
LibreChat-API  | 
LibreChat-API  | Node.js v24.22.1
LibreChat-API  | /app/packages/api/dist/credentials.cjs:169
LibreChat-API  |                        throw new Error(`[credentials] ${name} must be exactly ${bytes * 2} hexadecimal characters (${bytes} bytes). Refusing startup to prevent weak encryption or late crypto failures. Restore the original credential if it protects existing data; plan a controlled migration before rotating it.`);
LibreChat-API  |                        ^
"""


and then

```sh
sudo docker compose -f ./deploy-compose.yml ps -a # shows `client` is restarting (continuously)
sudo docker compose -f ./deploy-compose.yml logs --tail=150 client
```

 nginx: [emerg] cannot load certificate "/etc/letsencrypt/live/mydomain.com/fullchain.pem": BIO_new_file() failed (SSL: error:80000002:system library::No such file or directory:calling fopen(/etc/letsencrypt/live/mydomain.com/fullchain.pem, r) error:10000080:BIO routines::no such file)
LibreChat-NGINX  | /docker-entrypoint.sh: /docker-entrypoint.d/ is not empty, will attempt to perform configuration
LibreChat-NGINX  | /docker-entrypoint.sh: Looking for shell scripts in /docker-entrypoint.d/
LibreChat-NGINX  | /docker-entrypoint.sh: Launching /docker-entrypoint.d/10-listen-on-ipv6-by-default.sh
LibreChat-NGINX  | 10-listen-on-ipv6-by-default.sh: info: Getting the checksum of /etc/nginx/conf.d/default.conf
LibreChat-NGINX  | 10-listen-on-ipv6-by-default.sh: info: /etc/nginx/conf.d/default.conf differs from the packaged version
LibreChat-NGINX  | /docker-entrypoint.sh: Sourcing /docker-entrypoint.d/15-local-resolvers.envsh
LibreChat-NGINX  | /docker-entrypoint.sh: Launching /docker-entrypoint.d/20-envsubst-on-templates.sh
LibreChat-NGINX  | /docker-entrypoint.sh: Launching /docker-entrypoint.d/30-tune-worker-processes.sh
LibreChat-NGINX  | /docker-entrypoint.sh: Configuration complete; ready for start up
LibreChat-NGINX  | 2026/10/30 06:12:34 [warn] 1#1: the "listen ... http2" directive is deprecated, use the "http2" directive instead in /etc/nginx/conf.d/default.conf:73
LibreChat-NGINX  | nginx: [warn] the "listen ... http2" directive is deprecated, use the "http2" directive instead in /etc/nginx/conf.d/default.conf:73
LibreChat-NGINX  | 2026/10/30 06:12:34 [warn] 1#1: the "listen ... http2" directive is deprecated, use the "http2" directive instead in /etc/nginx/conf.d/default.conf:74
LibreChat-NGINX  | nginx: [warn] the "listen ... http2" directive is deprecated, use the "http2" directive instead in /etc/nginx/conf.d/default.conf:74
LibreChat-NGINX  | 2026/10/30 06:12:34 [warn] 1#1: the "listen ... http2" directive is deprecated, use the "http2" directive instead in /etc/nginx/conf.d/default.conf:136
LibreChat-NGINX  | nginx: [warn] the "listen ... http2" directive is deprecated, use the "http2" directive instead in /etc/nginx/conf.d/default.conf:136
LibreChat-NGINX  | 2026/10/30 06:12:34 [warn] 1#1: the "listen ... http2" directive is deprecated, use the "http2" directive instead in /etc/nginx/conf.d/default.conf:137
LibreChat-NGINX  | nginx: [warn] the "listen ... http2" directive is deprecated, use the "http2" directive instead in /etc/nginx/conf.d/default.conf:137
LibreChat-NGINX  | 2026/10/30 06:12:34 [emerg] 1#1: cannot load certificate "/etc/letsencrypt/live/mydomain.com/fullchain.pem": BIO_new_file() failed (SSL: error:80000002:system library::No such file or directory:calling fopen(/etc/letsencrypt/live/mydomain.com/fullchain.pem, r) error:10000080:BIO routines::no such file)
L


### Go!

http://huang.bot/register

- `vi .env`
ALLOW_REGISTRATION=false

