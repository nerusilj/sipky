"""Jednorázová oprava hodin WSL podle HTTPS serveru Ubuntu; nemění RTC ani Windows."""
import datetime
import email.utils
import secrets
import subprocess
import sys
import urllib.request

if sys.platform != 'linux':
    raise SystemExit('Spustit pouze v Ubuntu/WSL.')
url = 'https://security.ubuntu.com/ubuntu/?darts-clock=' + secrets.token_hex(12)
request = urllib.request.Request(url, method='HEAD', headers={'Cache-Control': 'no-cache'})
with urllib.request.urlopen(request, timeout=30) as response:
    value = response.headers.get('Date')
    if not value:
        raise SystemExit('Server nevrátil aktuální čas; hodiny nebyly změněny.')
    server_time = email.utils.parsedate_to_datetime(value)
if server_time.tzinfo is None:
    raise SystemExit('Čas serveru nemá časové pásmo; hodiny nebyly změněny.')
server_time = server_time.astimezone(datetime.timezone.utc)
print('UTC před opravou:', datetime.datetime.now(datetime.timezone.utc).isoformat(), flush=True)
print('UTC serveru Ubuntu:', server_time.isoformat(), flush=True)
subprocess.run(['sudo', 'date', '--utc', '--set', server_time.isoformat()], check=True)
