const list = await (await fetch('http://127.0.0.1:9229/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl.replace('9222', '9229'));
await new Promise(r => ws.onopen = r);
ws.onmessage = async e => { const m = JSON.parse(e.data); if (m.id === 1) {
  (await import('fs')).writeFileSync(process.argv[2], Buffer.from(m.result.data, 'base64')); ws.close(); } };
ws.send(JSON.stringify({ id: 1, method: 'Page.captureScreenshot', params: { format: 'jpeg', quality: 70 } }));
