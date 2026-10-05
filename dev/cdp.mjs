// usage: node cdp.mjs '<js expression>'   (evaluates in the game page, awaits promises)
const list = await (await fetch('http://127.0.0.1:9229/json/list')).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl.replace('9222', '9229'));
await new Promise(r => ws.onopen = r);
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) {
  const r = m.result; console.log(r.exceptionDetails ? 'EXCEPTION: ' + JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails) : JSON.stringify(r.result.value, null, 1)); ws.close(); } };
ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: process.argv[2], awaitPromise: true, returnByValue: true } }));
