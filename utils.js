// utils.js
import { state } from './state.js?v=${version}';
import * as THREE from 'three';

export function createTextSprite(message, parameters = {}) {
    const fontface = 'sans-serif';
    const fontsize = 54;

    const tempCanvas = document.createElement('canvas');
    const tempContext = tempCanvas.getContext('2d');
    tempContext.font = `900 ${fontsize}px ${fontface}`;

    const safeMessage = message.trim() === "" ? " " : message;
    const textWidth = tempContext.measureText(safeMessage).width;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const padding = 20;
    canvas.width = textWidth + padding * 2;
    canvas.height = fontsize + padding * 2;

    context.font = `900 ${fontsize}px ${fontface}`;
    context.textBaseline = "middle";
    context.textAlign = "center";

    context.strokeStyle = "rgba(0, 0, 0, 0.7)";
    context.lineWidth = 6;
    context.strokeText(safeMessage, canvas.width / 2, canvas.height / 2);

    context.fillStyle = "rgba(255, 255, 255, 1.0)";
    context.fillText(safeMessage, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: true
    });
    const sprite = new THREE.Sprite(material);

    const aspect = canvas.width / canvas.height;
    const spriteHeight = 0.35;
    const spriteWidth = spriteHeight * aspect;

    sprite.scale.set(spriteWidth, spriteHeight, 1);
    return sprite;
}

export function attachNameTag(avatarGroup, name) {
    const nameSprite = createTextSprite(name, { fontsize: 48, backgroundColor: { r: 0, g: 0, b: 0, a: 0.6 }, textColor: { r: 255, g: 255, b: 255, a: 1 } });
    nameSprite.position.set(0, 2.5, 0);
    avatarGroup.add(nameSprite);
    return nameSprite;
}

function wrapText(context, text, maxWidth) {
    let tokens = [];
    let i = 0;
    while (i < text.length) {
        const char = text[i];
        if (char.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/)) {
            tokens.push(char);
            i++;
        } else {
            let word = '';
            while (i < text.length && !text[i].match(/[\s\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/)) {
                word += text[i];
                i++;
            }
            if (word) tokens.push(word);
            if (i < text.length && text[i] === ' ') {
                tokens.push(' ');
                i++;
            }
        }
    }

    let lines = [];
    let currentLine = '';
    for (let token of tokens) {
        const testLine = currentLine + token;
        const testWidth = context.measureText(testLine).width;
        if (testWidth > maxWidth && currentLine !== '') {
            lines.push(currentLine.trim());
            currentLine = token === ' ' ? '' : token;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine !== '') {
        lines.push(currentLine.trim());
    }
    return lines;
}

export function createChatBubbleSprite(message) {
    const fontface = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    const fontsize = 32;
    const lineHeight = fontsize * 1.35;

    const tempCanvas = document.createElement('canvas');
    const tempContext = tempCanvas.getContext('2d');
    tempContext.font = `600 ${fontsize}px ${fontface}`;

    const maxTextWidth = 360;
    const lines = wrapText(tempContext, message, maxTextWidth);

    let maxLineWidth = 0;
    for (let line of lines) {
        const w = tempContext.measureText(line).width;
        if (w > maxLineWidth) maxLineWidth = w;
    }

    const paddingX = 24;
    const paddingY = 16;
    const tailWidth = 16;
    const tailHeight = 12;
    const shadowPadding = 12;

    const bubbleWidth = Math.max(maxLineWidth + paddingX * 2, 60);
    const bubbleHeight = lines.length * lineHeight + paddingY * 2;

    const canvasWidth = bubbleWidth + shadowPadding * 2;
    const canvasHeight = bubbleHeight + tailHeight + shadowPadding * 2;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const context = canvas.getContext('2d');

    // Shadow configuration
    context.shadowColor = 'rgba(0, 0, 0, 0.14)';
    context.shadowBlur = 12;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 6;

    // Speech bubble path
    const x = shadowPadding;
    const y = shadowPadding;
    const w = bubbleWidth;
    const h = bubbleHeight;
    const r = 16;

    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);

    // Tail in the center
    const tailX = x + w / 2;
    const tailY = y + h;
    context.lineTo(tailX + tailWidth / 2, tailY);
    context.lineTo(tailX, tailY + tailHeight);
    context.lineTo(tailX - tailWidth / 2, tailY);

    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();

    context.fillStyle = '#ffffff';
    context.fill();

    context.shadowColor = 'transparent';

    context.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    context.lineWidth = 2;
    context.stroke();

    // Render text
    context.fillStyle = '#1e293b';
    context.font = `600 ${fontsize}px ${fontface}`;
    context.textBaseline = 'top';
    context.textAlign = 'center';

    for (let idx = 0; idx < lines.length; idx++) {
        const lineY = y + paddingY + idx * lineHeight;
        context.fillText(lines[idx], x + w / 2, lineY);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: true
    });
    const sprite = new THREE.Sprite(material);

    const aspect = canvasWidth / canvasHeight;
    const spriteHeight = 0.4 + (lines.length - 1) * 0.12 + 0.08;
    const spriteWidth = spriteHeight * aspect;

    sprite.scale.set(spriteWidth, spriteHeight, 1);
    sprite.userData = {
        width: spriteWidth,
        height: spriteHeight
    };

    return sprite;
}

export function showChatBubble(avatarGroup, message) {
    if (!avatarGroup) return;

    if (avatarGroup.userData.chatBubble) {
        avatarGroup.remove(avatarGroup.userData.chatBubble.sprite);
        delete avatarGroup.userData.chatBubble;
    }

    const sprite = createChatBubbleSprite(message);
    const spriteWidth = sprite.userData.width;
    const spriteHeight = sprite.userData.height;

    sprite.position.set(0, 2.8 + spriteHeight / 2, 0);
    sprite.scale.set(0.01, 0.01, 1);
    sprite.material.opacity = 0;

    avatarGroup.add(sprite);

    avatarGroup.userData.chatBubble = {
        sprite: sprite,
        createdAt: Date.now(),
        duration: 5000,
        targetScaleX: spriteWidth,
        targetScaleY: spriteHeight
    };
}

export function updateChatBubbles() {
    const now = Date.now();
    const avatars = [];

    if (state.myAvatar) {
        avatars.push(state.myAvatar);
    }

    for (let id in state.otherPlayers) {
        const other = state.otherPlayers[id];
        if (other && other.group) {
            avatars.push(other.group);
        }
    }

    for (let avatar of avatars) {
        if (avatar.userData && avatar.userData.chatBubble) {
            const bubble = avatar.userData.chatBubble;
            const elapsed = now - bubble.createdAt;

            if (elapsed >= bubble.duration) {
                avatar.remove(bubble.sprite);
                delete avatar.userData.chatBubble;
            } else if (elapsed > bubble.duration - 500) {
                const progress = (bubble.duration - elapsed) / 500;
                const scaleX = bubble.targetScaleX * progress;
                const scaleY = bubble.targetScaleY * progress;
                bubble.sprite.scale.set(scaleX, scaleY, 1);
                bubble.sprite.material.opacity = progress;
            } else if (elapsed < 300) {
                const progress = elapsed / 300;
                const c1 = 1.70158;
                const c3 = c1 + 1;
                const easeOutBack = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);

                const scaleX = bubble.targetScaleX * easeOutBack;
                const scaleY = bubble.targetScaleY * easeOutBack;
                bubble.sprite.scale.set(scaleX, scaleY, 1);
                bubble.sprite.material.opacity = Math.min(progress, 1);
            } else {
                bubble.sprite.scale.set(bubble.targetScaleX, bubble.targetScaleY, 1);
                bubble.sprite.material.opacity = 1;
            }
        }
    }
}

export function createTree(x, z) {
    const treeGroup = new THREE.Group();

    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x795548 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1;
    treeGroup.add(trunk);

    const leavesGeometry = new THREE.ConeGeometry(1.2, 2.5, 8);
    const leavesMaterial = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 2.5;
    treeGroup.add(leaves);

    treeGroup.scale.set(2, 2, 2);
    treeGroup.position.set(x, 0, z);
    state.scene.add(treeGroup);
}

export function createAvatarModel() {
    const avatarGroup = new THREE.Group();

    const silverMat = new THREE.MeshLambertMaterial({ color: 0xcfd8dc });
    const charcoalMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
    const slateMat = new THREE.MeshLambertMaterial({ color: 0x546e7a });
    const cyanMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

    const legGeo = new THREE.BoxGeometry(0.35, 0.8, 0.35);

    const pLeftLegPivot = new THREE.Group();
    pLeftLegPivot.position.set(-0.2, 0.8, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, slateMat);
    leftLegMesh.position.set(0, -0.4, 0);
    pLeftLegPivot.add(leftLegMesh);
    avatarGroup.add(pLeftLegPivot);

    const pRightLegPivot = new THREE.Group();
    pRightLegPivot.position.set(0.2, 0.8, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, slateMat);
    rightLegMesh.position.set(0, -0.4, 0);
    pRightLegPivot.add(rightLegMesh);
    avatarGroup.add(pRightLegPivot);

    const torsoGeo = new THREE.BoxGeometry(0.8, 0.8, 0.4);
    const torso = new THREE.Mesh(torsoGeo, charcoalMat);
    torso.position.set(0, 1.2, 0);
    avatarGroup.add(torso);

    const armGeo = new THREE.BoxGeometry(0.35, 0.8, 0.35);

    const pLeftArmPivot = new THREE.Group();
    pLeftArmPivot.position.set(-0.575, 1.6, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, silverMat);
    leftArmMesh.position.set(0, -0.4, 0);
    pLeftArmPivot.add(leftArmMesh);
    avatarGroup.add(pLeftArmPivot);

    const pRightArmPivot = new THREE.Group();
    pRightArmPivot.position.set(0.575, 1.6, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, silverMat);
    rightArmMesh.position.set(0, -0.4, 0);
    pRightArmPivot.add(rightArmMesh);
    avatarGroup.add(pRightArmPivot);

    // パラメータの設定（少し短めに調整）
    const headRadius = 0.2;
    const headCylinderHeight = 0.2; // 元の 0.35 から 0.2 に短くしました

    // ① CapsuleGeometry を作成
    // 引数: (半径, 中央の円柱の長さ, 球体の分割数, 円柱の分割数)
    const capsuleGeo = new THREE.CapsuleGeometry(headRadius, headCylinderHeight, 8, 16);

    // ② メッシュを作成
    const headCapsule = new THREE.Mesh(capsuleGeo, silverMat);

    // ③ 位置を設定してアバターのグループに直接追加
    //（元の headGroup.position.set(0, 1.85, 0) と同じ位置に配置します）
    headCapsule.position.set(0, 1.85, 0);

    avatarGroup.add(headCapsule);

    // 後続の目や口のパーツを追加するために headGroup として定義
    const headGroup = headCapsule;

    const eyeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.02);
    const leftEye = new THREE.Mesh(eyeGeo, cyanMat);
    leftEye.position.set(-0.09, 0.1, 0.201);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, cyanMat);
    rightEye.position.set(0.09, 0.1, 0.201);
    headGroup.add(rightEye);

    const mouthBottomGeo = new THREE.BoxGeometry(0.14, 0.03, 0.02);
    const mouthBottom = new THREE.Mesh(mouthBottomGeo, cyanMat);
    mouthBottom.position.set(0, -0.08, 0.201);
    headGroup.add(mouthBottom);

    const mouthLeftGeo = new THREE.BoxGeometry(0.03, 0.06, 0.02);
    const mouthLeft = new THREE.Mesh(mouthLeftGeo, cyanMat);
    mouthLeft.position.set(-0.07, -0.05, 0.201);
    headGroup.add(mouthLeft);

    const mouthRight = new THREE.Mesh(mouthLeftGeo, cyanMat);
    mouthRight.position.set(0.07, -0.05, 0.201);
    headGroup.add(mouthRight);

    return {
        group: avatarGroup,
        leftLegPivot: pLeftLegPivot,
        rightLegPivot: pRightLegPivot,
        leftArmPivot: pLeftArmPivot,
        rightArmPivot: pRightArmPivot
    };
}