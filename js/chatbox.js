/* Surprize AI chat box – opens from the "Get help from AI Assistant" button */
(function () {
  const css = `
  #aiChat{position:fixed;right:20px;bottom:20px;width:380px;max-width:calc(100vw - 24px);height:540px;max-height:calc(100vh - 40px);
    background:#fff;border:1px solid #f3c7df;border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.2);
    display:none;flex-direction:column;overflow:hidden;z-index:9999;font-family:inherit}
  #aiChat.open{display:flex}
  #aiChat header{background:#c0108a;color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center}
  #aiChat header b{font-size:16px}
  #aiChat header button{background:none;border:0;color:#fff;font-size:22px;cursor:pointer;line-height:1}
  #aiMsgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#fff7fb}
  .aiMsg{max-width:85%;padding:10px 13px;border-radius:14px;font-size:15px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}
  .aiMsg.bot{background:#fff;border:1px solid #f3c7df;align-self:flex-start;border-bottom-left-radius:4px}
  .aiMsg.me{background:#c0108a;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
  .aiMsg.typing{color:#999;font-style:italic}
  #aiForm{display:flex;gap:8px;padding:10px;border-top:1px solid #f3c7df;background:#fff}
  #aiInput{flex:1;border:1px solid #f3c7df;border-radius:20px;padding:10px 14px;font-size:15px;outline:none;font-family:inherit}
  #aiInput:focus{border-color:#c0108a}
  #aiSend{background:#c0108a;color:#fff;border:0;border-radius:20px;padding:0 18px;cursor:pointer;font-weight:600}
  #aiSend:disabled{opacity:.5;cursor:not-allowed}
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.id = 'aiChat';
  box.innerHTML = `
    <header><b>✨ Surprize AI Assistant</b><button type="button" id="aiClose" aria-label="Close">×</button></header>
    <div id="aiMsgs"></div>
    <form id="aiForm">
      <input id="aiInput" placeholder="Ask for gift or message ideas…" autocomplete="off" maxlength="500">
      <button id="aiSend" type="submit">Send</button>
    </form>`;
  document.body.appendChild(box);

  const msgs = box.querySelector('#aiMsgs');
  const form = box.querySelector('#aiForm');
  const input = box.querySelector('#aiInput');
  const send = box.querySelector('#aiSend');
  const history = []; // {role, content}

  function add(text, cls) {
    const d = document.createElement('div');
    d.className = 'aiMsg ' + cls;
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function openChat() {
    box.classList.add('open');
    if (!msgs.children.length) {
      add('Hi! 👋 I can help you pick gifts, plan a surprise, or write a card message. What is the occasion?', 'bot');
    }
    input.focus();
  }
  window.openChat = openChat;

  box.querySelector('#aiClose').onclick = () => box.classList.remove('open');

  form.onsubmit = async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    add(text, 'me');
    history.push({ role: 'user', content: text });
    send.disabled = true;
    const typing = add('Typing…', 'bot typing');
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-10) })
      });
      const data = await res.json().catch(() => ({}));
      typing.remove();
      if (!res.ok) throw new Error(data.message || 'Something went wrong.');
      add(data.reply, 'bot');
      history.push({ role: 'assistant', content: data.reply });
    } catch (err) {
      typing.remove();
      add('Sorry, ' + err.message, 'bot');
      history.pop();
    }
    send.disabled = false;
    input.focus();
  };

  // Open the chat from the AI button
  document.addEventListener('click', e => {
    const el = e.target.closest('#aiBtn, button, a');
    if (el && !box.contains(el) && (el.id === 'aiBtn' || /AI Assistant/i.test(el.textContent))) {
      e.preventDefault();
      openChat();
    }
  });
})();