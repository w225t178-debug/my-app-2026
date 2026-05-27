// multiplayer.js
import { state, ui } from './state.js';
import { createAvatarModel, attachNameTag, showChatBubble } from './utils.js';

export function spawnOtherPlayer(playerInfo) {
    if (state.otherPlayers[playerInfo.id]) {
        console.log(`[SKIP] すでに存在: ${playerInfo.id}`);
        return;
    }
    console.log(`[SPAWN] アバター生成開始: ${playerInfo.name} (${playerInfo.id})`, playerInfo);

    const model = createAvatarModel();
    const otherModelGroup = model.group;

    const px = typeof playerInfo.x === 'number' ? playerInfo.x : 0;
    const py = typeof playerInfo.y === 'number' ? playerInfo.y : 0;
    const pz = typeof playerInfo.z === 'number' ? playerInfo.z : 0;
    const ry = typeof playerInfo.rotationY === 'number' ? playerInfo.rotationY : 0;

    otherModelGroup.position.set(px, py, pz);
    otherModelGroup.rotation.y = ry;

    const nameSprite = attachNameTag(otherModelGroup, playerInfo.name);
    state.scene.add(otherModelGroup);

    state.nameToIdMap[playerInfo.name] = playerInfo.id;

    state.otherPlayers[playerInfo.id] = {
        group: otherModelGroup,
        leftLegPivot: model.leftLegPivot,
        rightLegPivot: model.rightLegPivot,
        leftArmPivot: model.leftArmPivot,
        rightArmPivot: model.rightArmPivot,
        targetX: px,
        targetY: py,
        targetZ: pz,
        targetRotationY: ry,
        isWalking: playerInfo.isWalking || false,
        walkTime: 0,
        nameSprite: nameSprite
    };
}

export function setupMultiplayerListeners() {
    state.socket.on("current-players", (players) => {
        console.log("[current-players] 全プレイヤーデータ受信:", players);
        for (let id in players) {
            if (id !== state.socket.id) {
                spawnOtherPlayer(players[id]);
            }
        }
    });

    state.socket.on("new-player", (playerInfo) => {
        console.log("[new-player] 受信:", playerInfo);
        spawnOtherPlayer(playerInfo);
    });

    state.socket.on("player-moved", (playerInfo) => {
        const other = state.otherPlayers[playerInfo.id];
        if (other) {
            other.targetX = typeof playerInfo.x === 'number' ? playerInfo.x : other.targetX;
            other.targetY = typeof playerInfo.y === 'number' ? playerInfo.y : other.targetY;
            other.targetZ = typeof playerInfo.z === 'number' ? playerInfo.z : other.targetZ;
            other.targetRotationY = typeof playerInfo.rotationY === 'number' ? playerInfo.rotationY : other.targetRotationY;
            other.isWalking = playerInfo.isWalking || false;
        } else {
            console.log("[player-moved] 未登録のプレイヤーを生成:", playerInfo.id);
            spawnOtherPlayer(playerInfo);
        }
    });

    state.socket.on("receive-chat", (data) => {
        const msgEl = document.createElement("div");
        msgEl.textContent = `${data.name}: ${data.message}`;
        ui.chatLog.appendChild(msgEl);
        ui.chatLog.scrollTop = ui.chatLog.scrollHeight;

        if (data.name === state.myName) {
            showChatBubble(state.myAvatar, data.message);
        } else {
            const targetId = state.nameToIdMap[data.name];
            if (targetId && state.otherPlayers[targetId]) {
                showChatBubble(state.otherPlayers[targetId].group, data.message);
            }
        }
    });

    state.socket.on("player-disconnected", (id) => {
        const other = state.otherPlayers[id];
        if (other) {
            state.scene.remove(other.group);
            delete state.otherPlayers[id];
            console.log(`[disconnect] アバターを削除: ${id}`);
        }
    });
}