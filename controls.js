// controls.js
import { state, ui } from './state.js?v=${version}';
import { showChatBubble } from './utils.js?v=${version}';

export function setupInputListeners() {
    // キーボード操作
    window.addEventListener("keydown", (e) => state.keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", (e) => state.keys[e.key.toLowerCase()] = false);

    // チャット送信
    ui.chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.isComposing) {
            const message = ui.chatInput.value.trim();
            if (message !== "") {
                if (state.socket && state.socket.connected) {
                    state.socket.emit("send-chat", { name: state.myName, message: message });
                } else {
                    const msgEl = document.createElement("div");
                    msgEl.textContent = `${state.myName}: ${message} (オフライン)`;
                    ui.chatLog.appendChild(msgEl);
                    ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
                    
                    // オフラインでも自分のアバターの上にチャットバブルを表示
                    showChatBubble(state.myAvatar, message);
                }
                ui.chatInput.value = "";
                ui.chatInput.blur();
            }
        }
    });

    // カメラドラッグ操作
    ui.canvasContainer.addEventListener("mousedown", (e) => {
        state.isDragging = true;
        state.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mousemove", (e) => {
        if (!state.isDragging) return;

        const deltaX = e.clientX - state.previousMousePosition.x;
        const deltaY = e.clientY - state.previousMousePosition.y;

        state.cameraYaw -= deltaX * 0.007;
        state.cameraPitch = Math.max(-0.1, Math.min(1.2, state.cameraPitch + deltaY * 0.007));

        state.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mouseup", () => {
        state.isDragging = false;
    });
}