import sys
import json
import http.client
from urllib.parse import urlparse

# Get data from Deno
try:
    input_data = sys.stdin.read()
    payload = json.loads(input_data)
except Exception as e:
    sys.stderr.write(f"JSON Parse Error: {str(e)}")
    sys.exit(1)

url = "http://192.168.100.35:11434/api/generate"
u = urlparse(url)

try:
    # Using built-in http.client so we don't need to install 'requests'
    conn = http.client.HTTPConnection(u.hostname, u.port, timeout=60)
    headers = {'Content-Type': 'application/json'}
    conn.request("POST", u.path, body=json.dumps(payload), headers=headers)
    
    response = conn.getresponse()
    data = response.read().decode()
    
    if response.status == 200:
        print(data)
    else:
        sys.stderr.write(f"Ollama returned status {response.status}: {data}")
        sys.exit(1)
        
except Exception as e:
    sys.stderr.write(f"Connection Error: {str(e)}")
    sys.exit(1)
finally:
    conn.close()