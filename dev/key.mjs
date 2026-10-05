// usage: node key.mjs text "<text>"  |  node key.mjs key Enter|Escape|Backspace
const list = await (await fetch('http://127.0.0.1:9229/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl.replace('9222', '9229'));
await new Promise(r => ws.onopen = r);
let id = 0;
const send = (method, params) => new Promise(r => {
  const i = ++id;
  ws.addEventListener('message', e => { if (JSON.parse(e.data).id === i) r(); });
  ws.send(JSON.stringify({ id: i, method, params }));
});
const [mode, val] = process.argv.slice(2);
if (mode === 'text') {
  await send('Input.insertText', { text: val });
} else {
  const codes = { Enter: 13, Escape: 27, Backspace: 8 };
  for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: val, code: val, windowsVirtualKeyCode: codes[val] });
}
ws.close();
