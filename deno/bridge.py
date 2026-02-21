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
    conn = http.client.HTTPConnection(u.hostname, u.port, timeout=60)
    headers = {'Content-Type': 'application/json'}
    conn.request("POST", u.path, body=json.dumps(payload), headers=headers)
    
    response = conn.getresponse()
    
    if response.status != 200:
        data = response.read().decode()
        sys.stderr.write(f"Ollama returned status {response.status}: {data}")
        sys.exit(1)

    # Stream the response back to Deno
    while True:
        chunk = response.read(1024)
        if not chunk:
            break
        sys.stdout.buffer.write(chunk)
        sys.stdout.buffer.flush()
        
except Exception as e:
    sys.stderr.write(f"Connection Error: {str(e)}")
    sys.exit(1)
finally:
    try:
        conn.close()
    except:
        pass
