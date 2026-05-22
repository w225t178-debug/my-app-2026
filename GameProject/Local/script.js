// ==========================================
// 1. グローバル変数の定義（重複を解消）
// ==========================================
let myName = "";
let scene, camera, renderer, myAvatar;
const keys = {};

// マルチプレイ用
let socket;
const otherPlayers = {}; // 他プレイヤーは ID をキーにする
const nameToIdMap = {};   // チャット用：名前からIDを引くマップ

// カメラ回転・位置制御用の変数
let cameraYaw = 0;
let cameraPitch = 0.3; // 若干見下ろす初期角度 (ラジアン)
const cameraDistance = 10;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

// アニメーション用の変数と関節ピボット（ローカルプレイヤー用）
let walkTime = 0;
let leftLegPivot, rightLegPivot, leftArmPivot, rightArmPivot;

// UI要素の取得
const chatInput = document.getElementById("chat-input");
const chatLog = document.getElementById("chat-log");
const canvasContainer = document.getElementById("canvas-container");

// ==========================================
// 2. ユーティリティ関数（スプライト・アバター生成）
// ==========================================

// Sprite用のテキスト描画ヘルパー
function createTextSprite(message, parameters = {}) {
    // Roblox風の少し丸みのある太字Sans-serifフォント
    const fontface = 'sans-serif';
    const fontsize = 54; // 文字をくっきりさせるために少し大きめに設定

    // 1. 文字の横幅を正確に測る
    const tempCanvas = document.createElement('canvas');
    const tempContext = tempCanvas.getContext('2d');
    tempContext.font = `900 ${fontsize}px ${fontface}`; // 太さ900（極太）

    const safeMessage = message.trim() === "" ? " " : message;
    const textWidth = tempContext.measureText(safeMessage).width;

    // 2. 本番用のCanvasを作成
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // 文字の周りに少しだけ余白を持たせる
    const padding = 20;
    canvas.width = textWidth + padding * 2;
    canvas.height = fontsize + padding * 2;

    // 💡 背景（座布団）は描画せず、完全に透明のままにします

    // 3. テキストの描画設定
    context.font = `900 ${fontsize}px ${fontface}`;
    context.textBaseline = "middle";
    context.textAlign = "center";

    // 【Roblox再現のキモ】黒いフチ取り（アウトライン）を入れる
    // これがないと、背景が白い床や空になったときに文字が見えなくなります
    context.strokeStyle = "rgba(0, 0, 0, 0.7)"; // 薄い黒
    context.lineWidth = 6; // フチの太さ
    context.strokeText(safeMessage, canvas.width / 2, canvas.height / 2);

    // メインの白い文字を上から重ねて描画
    context.fillStyle = "rgba(255, 255, 255, 1.0)"; // 純白
    context.fillText(safeMessage, canvas.width / 2, canvas.height / 2);

    // 4. Three.jsのテクスチャに変換
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: true
    });
    const sprite = new THREE.Sprite(material);

    // 5. 3D空間内でのサイズ調整（縦横比を崩さない）
    const aspect = canvas.width / canvas.height;
    const spriteHeight = 0.35; // キャラクターに対する文字の大きさ
    const spriteWidth = spriteHeight * aspect;

    sprite.scale.set(spriteWidth, spriteHeight, 1);
    return sprite;
}

// アバターの名前タグを生成し、グループに追加するユーティリティ
function attachNameTag(avatarGroup, name) {
    const nameSprite = createTextSprite(name, { fontsize: 48, backgroundColor: { r: 0, g: 0, b: 0, a: 0.6 }, textColor: { r: 255, g: 255, b: 255, a: 1 } });
    nameSprite.position.set(0, 2.5, 0);
    avatarGroup.add(nameSprite);
    return nameSprite;
}

// チャット吹き出し（短時間表示）
function showChatBubble(otherPlayerObj, message) {
    if (otherPlayerObj.chatSprite) {
        otherPlayerObj.group.remove(otherPlayerObj.chatSprite);
        delete otherPlayerObj.chatSprite;
    }
    const bubble = createTextSprite(message, { fontsize: 48, backgroundColor: { r: 255, g: 255, b: 255, a: 0.8 }, textColor: { r: 0, g: 0, b: 0, a: 1 } });
    bubble.position.set(0, 2.8, 0);
    otherPlayerObj.group.add(bubble);
    otherPlayerObj.chatSprite = bubble;

    setTimeout(() => {
        if (otherPlayerObj.chatSprite) {
            otherPlayerObj.group.remove(otherPlayerObj.chatSprite);
            delete otherPlayerObj.chatSprite;
        }
    }, 3000);
}

// 円柱と円錐を組み合わせて木を作る関数
function createTree(x, z) {
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
    scene.add(treeGroup);
}

// アバターの3Dモデルを生成する共通関数
function createAvatarModel() {
    const avatarGroup = new THREE.Group();

    const silverMat = new THREE.MeshLambertMaterial({ color: 0xcfd8dc });
    const charcoalMat = new THREE.MeshLambertMaterial({ color: 0x37474f });
    const slateMat = new THREE.MeshLambertMaterial({ color: 0x546e7a });
    const cyanMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });

    const legGeo = new THREE.BoxGeometry(0.35, 0.8, 0.35);

    // 左脚ピボット
    const pLeftLegPivot = new THREE.Group();
    pLeftLegPivot.position.set(-0.2, 0.8, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, slateMat);
    leftLegMesh.position.set(0, -0.4, 0);
    pLeftLegPivot.add(leftLegMesh);
    avatarGroup.add(pLeftLegPivot);

    // 右脚ピボット
    const pRightLegPivot = new THREE.Group();
    pRightLegPivot.position.set(0.2, 0.8, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, slateMat);
    rightLegMesh.position.set(0, -0.4, 0);
    pRightLegPivot.add(rightLegMesh);
    avatarGroup.add(pRightLegPivot);

    // 胴体
    const torsoGeo = new THREE.BoxGeometry(0.8, 0.8, 0.4);
    const torso = new THREE.Mesh(torsoGeo, charcoalMat);
    torso.position.set(0, 1.2, 0);
    avatarGroup.add(torso);

    const armGeo = new THREE.BoxGeometry(0.35, 0.8, 0.35);

    // 左腕ピボット
    const pLeftArmPivot = new THREE.Group();
    pLeftArmPivot.position.set(-0.575, 1.6, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, silverMat);
    leftArmMesh.position.set(0, -0.4, 0);
    pLeftArmPivot.add(leftArmMesh);
    avatarGroup.add(pLeftArmPivot);

    // 右腕ピボット
    const pRightArmPivot = new THREE.Group();
    pRightArmPivot.position.set(0.575, 1.6, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, silverMat);
    rightArmMesh.position.set(0, -0.4, 0);
    pRightArmPivot.add(rightArmMesh);
    avatarGroup.add(pRightArmPivot);

    // 頭部
    const headGroup = new THREE.Group();
    const headRadius = 0.2;
    const headCylinderHeight = 0.35;

    const cylGeo = new THREE.CylinderGeometry(headRadius, headRadius, headCylinderHeight, 16);
    const headCyl = new THREE.Mesh(cylGeo, silverMat);
    headCyl.position.y = 0;
    headGroup.add(headCyl);

    const sphereGeo = new THREE.SphereGeometry(headRadius, 16, 16);
    const topSphere = new THREE.Mesh(sphereGeo, silverMat);
    topSphere.position.y = headCylinderHeight / 2;
    headGroup.add(topSphere);

    const bottomSphere = new THREE.Mesh(sphereGeo, silverMat);
    bottomSphere.position.y = -headCylinderHeight / 2;
    headGroup.add(bottomSphere);

    headGroup.position.set(0, 1.85, 0);
    avatarGroup.add(headGroup);

    // 顔パーツ
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

// ==========================================
// 3. 他プレイヤーの生成関数（ちぎれていた部分の修正）
// ==========================================
function spawnOtherPlayer(playerInfo) {
    if (otherPlayers[playerInfo.id]) {
        console.log(`[SKIP] すでに存在: ${playerInfo.id}`);
        return;
    }
    console.log(`[SPAWN] アバター生成開始: ${playerInfo.name} (${playerInfo.id})`, playerInfo);

    const model = createAvatarModel();
    const otherModelGroup = model.group;

    // データの安全な読み込み
    const px = typeof playerInfo.x === 'number' ? playerInfo.x : 0;
    const py = typeof playerInfo.y === 'number' ? playerInfo.y : 0;
    const pz = typeof playerInfo.z === 'number' ? playerInfo.z : 0;
    const ry = typeof playerInfo.rotationY === 'number' ? playerInfo.rotationY : 0;

    otherModelGroup.position.set(px, py, pz);
    otherModelGroup.rotation.y = ry;

    // 名前タグの付与
    const nameSprite = attachNameTag(otherModelGroup, playerInfo.name);

    // シーンに追加
    scene.add(otherModelGroup);

    // 名前とIDのマッピングを保持
    nameToIdMap[playerInfo.name] = playerInfo.id;

    // 他プレイヤー管理オブジェクトに登録
    otherPlayers[playerInfo.id] = {
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

// ==========================================
// 4. 初期化 & イベントリスナー設定
// ==========================================

// ログインボタン処理
document.getElementById("start-btn").addEventListener("click", () => {
    const input = document.getElementById("username-input").value.trim();
    if (input === "") {
        alert("名前を入力してください！");
        return;
    }
    myName = input;

    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");

    initThreeJS();

    // マルチプレイサーバーへの接続
    socket = io("http://localhost:3000");

    socket.on("connect", () => {
        console.log("マルチプレイサーバーに接続しました！");
        socket.emit("join-game", { name: myName });
    });

    setupMultiplayerListeners();
});

// Three.js空間構築
function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    canvasContainer.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(10, 20, 10);
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x558a2f });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const grid = new THREE.GridHelper(100, 100, 0x444444, 0xffffff);
    grid.position.y = 0.01;
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    scene.add(grid);

    // 木のランダム配置
    const numberOfTrees = 40;
    for (let i = 0; i < numberOfTrees; i++) {
        let x = (Math.random() - 0.5) * 90;
        let z = (Math.random() - 0.5) * 90;
        const distanceToCenter = Math.sqrt(x * x + z * z);
        if (distanceToCenter < 10) {
            i--;
            continue;
        }
        createTree(x, z);
    }

    // 自アバター生成
    const myModel = createAvatarModel();
    myAvatar = myModel.group;
    leftLegPivot = myModel.leftLegPivot;
    rightLegPivot = myModel.rightLegPivot;
    leftArmPivot = myModel.leftArmPivot;
    rightArmPivot = myModel.rightArmPivot;
    myAvatar.position.set(0, 0, 0);
    attachNameTag(myAvatar, myName);
    scene.add(myAvatar);

    window.addEventListener("keydown", (e) => keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

    animate();
}

// マルチプレイ用ソケットイベント設定
function setupMultiplayerListeners() {
    // ① 最初に入った時、すでにいる全プレイヤーの情報を取得
    socket.on("current-players", (players) => {
        console.log("[current-players] 全プレイヤーデータ受信:", players);
        for (let id in players) {
            if (id !== socket.id) {
                spawnOtherPlayer(players[id]);
            }
        }
    });

    // ② 新しい他のプレイヤーが入ってきたとき
    socket.on("new-player", (playerInfo) => {
        console.log("[new-player] 受信:", playerInfo);
        spawnOtherPlayer(playerInfo);
    });

    // ③ 他のプレイヤーが動いたとき
    socket.on("player-moved", (playerInfo) => {
        const other = otherPlayers[playerInfo.id];
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

    // ④ 全員からのチャットメッセージを受信したとき
    socket.on("receive-chat", (data) => {
        // チャットログ表示
        const msgEl = document.createElement("div");
        msgEl.textContent = `${data.name}: ${data.message}`;
        chatLog.appendChild(msgEl);
        chatLog.scrollTop = chatLog.scrollHeight;

        // 頭上に吹き出しを表示
        const targetId = nameToIdMap[data.name];
        if (targetId && otherPlayers[targetId]) {
            showChatBubble(otherPlayers[targetId], data.message);
        }
    });

    // ⑤ 他のプレイヤーが切断したとき
    socket.on("player-disconnected", (id) => {
        const other = otherPlayers[id];
        if (other) {
            scene.remove(other.group);
            delete otherPlayers[id];
            console.log(`[disconnect] アバターを削除: ${id}`);
        }
    });
}

// ==========================================
// 5. チャット送信 & カメラ操作イベント
// ==========================================

chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const message = chatInput.value.trim();
        if (message !== "") {
            if (socket && socket.connected) {
                socket.emit("send-chat", { name: myName, message: message });
            } else {
                const msgEl = document.createElement("div");
                msgEl.textContent = `${myName}: ${message} (オフライン)`;
                chatLog.appendChild(msgEl);
                chatLog.scrollTop = chatLog.scrollHeight;
            }
            chatInput.value = "";
            chatInput.blur();
        }
    }
});

canvasContainer.addEventListener("mousedown", (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    cameraYaw -= deltaX * 0.007;
    cameraPitch = Math.max(-0.1, Math.min(1.2, cameraPitch + deltaY * 0.007));

    previousMousePosition = { x: e.clientX, y: e.clientY };
});

window.addEventListener("mouseup", () => {
    isDragging = false;
});

// ==========================================
// 6. ループ処理（アニメーション & レンダリング）
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    const isChatActive = (document.activeElement === chatInput);

    if (isChatActive) {
        for (let k in keys) {
            keys[k] = false;
        }
    }

    // 1. ローカルプレイヤーの移動
    if (myAvatar) {
        const speed = 0.1;
        let moveX = 0;
        let moveZ = 0;

        if (!isChatActive) {
            const fx = -Math.sin(cameraYaw);
            const fz = -Math.cos(cameraYaw);
            const rx = Math.cos(cameraYaw);
            const rz = -Math.sin(cameraYaw);

            if (keys["w"] || keys["arrowup"]) { moveX += fx; moveZ += fz; }
            if (keys["s"] || keys["arrowdown"]) { moveX -= fx; moveZ -= fz; }
            if (keys["a"] || keys["arrowleft"]) { moveX -= rx; moveZ -= rz; }
            if (keys["d"] || keys["arrowright"]) { moveX += rx; moveZ += rz; }
        }

        let hasMoved = (moveX !== 0 || moveZ !== 0);

        if (hasMoved) {
            const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
            myAvatar.position.x += (moveX / length) * speed;
            myAvatar.position.z += (moveZ / length) * speed;

            const targetAngle = Math.atan2(moveX, moveZ);
            myAvatar.rotation.y = targetAngle;

            walkTime += 0.18;
            const swing = Math.sin(walkTime) * 0.6;

            if (leftLegPivot && rightLegPivot) {
                leftLegPivot.rotation.x = swing;
                rightLegPivot.rotation.x = -swing;
            }
            if (leftArmPivot && rightArmPivot) {
                leftArmPivot.rotation.x = -swing;
                rightArmPivot.rotation.x = swing;
            }
        } else {
            if (leftLegPivot && rightLegPivot) {
                leftLegPivot.rotation.x += (0 - leftLegPivot.rotation.x) * 0.25;
                rightLegPivot.rotation.x += (0 - rightLegPivot.rotation.x) * 0.25;
            }
            if (leftArmPivot && rightArmPivot) {
                leftArmPivot.rotation.x += (0 - leftArmPivot.rotation.x) * 0.25;
                rightArmPivot.rotation.x += (0 - rightArmPivot.rotation.x) * 0.25;
            }
            walkTime = 0;
        }

        if (socket && socket.connected) {
            socket.emit("move-player", {
                x: myAvatar.position.x,
                y: myAvatar.position.y,
                z: myAvatar.position.z,
                rotationY: myAvatar.rotation.y,
                isWalking: hasMoved
            });
        }

        // カメラ追従
        camera.position.x = myAvatar.position.x + cameraDistance * Math.sin(cameraYaw) * Math.cos(cameraPitch);
        camera.position.y = myAvatar.position.y + 1.2 + cameraDistance * Math.sin(cameraPitch);
        camera.position.z = myAvatar.position.z + cameraDistance * Math.cos(cameraYaw) * Math.cos(cameraPitch);
        camera.lookAt(myAvatar.position.x, myAvatar.position.y + 1.2, myAvatar.position.z);
    }

    // 2. 他プレイヤーの補間 (Lerp) & アニメーション
    for (let id in otherPlayers) {
        const other = otherPlayers[id];

        other.group.position.x += (other.targetX - other.group.position.x) * 0.2;
        other.group.position.y += (other.targetY - other.group.position.y) * 0.2;
        other.group.position.z += (other.targetZ - other.group.position.z) * 0.2;
        other.group.rotation.y += (other.targetRotationY - other.group.rotation.y) * 0.2;

        if (other.isWalking) {
            other.walkTime += 0.18;
            const swing = Math.sin(other.walkTime) * 0.6;
            if (other.leftLegPivot && other.rightLegPivot) {
                other.leftLegPivot.rotation.x = swing;
                other.rightLegPivot.rotation.x = -swing;
            }
            if (other.leftArmPivot && other.rightArmPivot) {
                other.leftArmPivot.rotation.x = -swing;
                other.rightArmPivot.rotation.x = swing;
            }
        } else {
            if (other.leftLegPivot && other.rightLegPivot) {
                other.leftLegPivot.rotation.x += (0 - other.leftLegPivot.rotation.x) * 0.25;
                other.rightLegPivot.rotation.x += (0 - other.rightLegPivot.rotation.x) * 0.25;
            }
            if (other.leftArmPivot && other.rightArmPivot) {
                other.leftArmPivot.rotation.x += (0 - other.leftArmPivot.rotation.x) * 0.25;
                other.rightArmPivot.rotation.x += (0 - other.rightArmPivot.rotation.x) * 0.25;
            }
            other.walkTime = 0;
        }
    }

    renderer.render(scene, camera);
}

// リサイズ対応
window.addEventListener("resize", () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});