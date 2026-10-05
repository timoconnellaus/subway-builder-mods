// usage: node click.mjs x y   (CSS pixels)
const list = await (await fetch('http://127.0.0.1:9229/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl.replace('9222', '9229'));
await new Promise(r => ws.onopen = r);
const [x, y] = process.argv.slice(2, 4).map(Number); const btn = process.argv[4] || 'left'; let id = 0;
const send = (method, params) => new Promise(r => { const i = ++id; ws.addEventListener('message', e => { if (JSON.parse(e.data).id === i) r(); }); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x - 3, y });
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
await new Promise(r => setTimeout(r, 250));
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: btn, clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: btn, clickCount: 1 });
ws.close();
