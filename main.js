// main.js
import { state, ui } from './state.js?v=${version}';
import { createAvatarModel, createTree, attachNameTag, updateChatBubbles } from './utils.js?v=${version}';
import { setupMultiplayerListeners } from './multiplayer.js?v=${version}';
import { setupInputListeners } from './controls.js?v=${version}';
import * as THREE from 'three';

// ログインボタン処理
document.getElementById("start-btn").addEventListener("click", () => {
    const input = document.getElementById("username-input").value.trim();
    if (input === "") {
        alert("名前を入力してください！");
        return;
    }
    state.myName = input;

    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");

    initThreeJS();
    setupInputListeners();


    // config.jsonからサーバーの接続先URLを取得して接続
    fetch('./config.json?v=' + Date.now())
        .then(res => res.json())
        .then(config => {
            state.socket = io(config.SERVER_URL, {
                transports: ["websocket"]
            });

            state.socket.on("connect", () => {
                console.log("マルチプレイサーバーに接続しました！");
                state.socket.emit("join-game", { name: state.myName });
            });

            setupMultiplayerListeners();
        })
        .catch(err => {
            console.error("設定ファイルの読み込みに失敗しました:", err);
            alert("サーバー設定の読み込みに失敗しました。");
        });
});

function initThreeJS() {
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0xa0a0a0);

    state.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    state.camera.position.set(0, 5, 10);
    state.camera.lookAt(0, 0, 0);

    state.renderer = new THREE.WebGLRenderer({ antialias: true });
    state.renderer.setSize(window.innerWidth, window.innerHeight);
    ui.canvasContainer.appendChild(state.renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(10, 20, 10);
    state.scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    state.scene.add(ambientLight);

    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x558a2f });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    state.scene.add(ground);

    const grid = new THREE.GridHelper(100, 100, 0x444444, 0xffffff);
    grid.position.y = 0.01;
    grid.material.opacity = 0.15;
    grid.material.transparent = true;
    state.scene.add(grid);

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
    state.myAvatar = myModel.group;
    state.leftLegPivot = myModel.leftLegPivot;
    state.rightLegPivot = myModel.rightLegPivot;
    state.leftArmPivot = myModel.leftArmPivot;
    state.rightArmPivot = myModel.rightArmPivot;
    state.myAvatar.position.set(0, 0, 0);
    attachNameTag(state.myAvatar, state.myName);
    state.scene.add(state.myAvatar);

    animate();
}

function animate() {
    requestAnimationFrame(animate);

    const isChatActive = (document.activeElement === ui.chatInput);

    if (isChatActive) {
        for (let k in state.keys) {
            state.keys[k] = false;
        }
    }

    // 1. ローカルプレイヤーの移動
    if (state.myAvatar) {
        const speed = 0.1;
        let moveX = 0;
        let moveZ = 0;

        if (!isChatActive) {
            const fx = -Math.sin(state.cameraYaw);
            const fz = -Math.cos(state.cameraYaw);
            const rx = Math.cos(state.cameraYaw);
            const rz = -Math.sin(state.cameraYaw);

            if (state.keys["w"] || state.keys["arrowup"]) { moveX += fx; moveZ += fz; }
            if (state.keys["s"] || state.keys["arrowdown"]) { moveX -= fx; moveZ -= fz; }
            if (state.keys["a"] || state.keys["arrowleft"]) { moveX -= rx; moveZ -= rz; }
            if (state.keys["d"] || state.keys["arrowright"]) { moveX += rx; moveZ += rz; }
        }

        let hasMoved = (moveX !== 0 || moveZ !== 0);

        if (hasMoved) {
            const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
            state.myAvatar.position.x += (moveX / length) * speed;
            state.myAvatar.position.z += (moveZ / length) * speed;

            const targetAngle = Math.atan2(moveX, moveZ);
            state.myAvatar.rotation.y = targetAngle;

            state.walkTime += 0.18;
            const swing = Math.sin(state.walkTime) * 0.6;

            if (state.leftLegPivot && state.rightLegPivot) {
                state.leftLegPivot.rotation.x = swing;
                state.rightLegPivot.rotation.x = -swing;
            }
            if (state.leftArmPivot && state.rightArmPivot) {
                state.leftArmPivot.rotation.x = -swing;
                state.rightArmPivot.rotation.x = swing;
            }
        } else {
            if (state.leftLegPivot && state.rightLegPivot) {
                state.leftLegPivot.rotation.x += (0 - state.leftLegPivot.rotation.x) * 0.25;
                state.rightLegPivot.rotation.x += (0 - state.rightLegPivot.rotation.x) * 0.25;
            }
            if (state.leftArmPivot && state.rightArmPivot) {
                state.leftArmPivot.rotation.x += (0 - state.leftArmPivot.rotation.x) * 0.25;
                state.rightArmPivot.rotation.x += (0 - state.rightArmPivot.rotation.x) * 0.25;
            }
            state.walkTime = 0;
        }

        if (state.socket && state.socket.connected) {
            state.socket.emit("move-player", {
                x: state.myAvatar.position.x,
                y: state.myAvatar.position.y,
                z: state.myAvatar.position.z,
                rotationY: state.myAvatar.rotation.y,
                isWalking: hasMoved
            });
        }

        // カメラ追従
        state.camera.position.x = state.myAvatar.position.x + state.cameraDistance * Math.sin(state.cameraYaw) * Math.cos(state.cameraPitch);
        state.camera.position.y = state.myAvatar.position.y + 1.2 + state.cameraDistance * Math.sin(state.cameraPitch);
        state.camera.position.z = state.myAvatar.position.z + state.cameraDistance * Math.cos(state.cameraYaw) * Math.cos(state.cameraPitch);
        state.camera.lookAt(state.myAvatar.position.x, state.myAvatar.position.y + 1.2, state.myAvatar.position.z);
    }

    // 2. 他プレイヤーの補間 (Lerp) & アニメーション
    for (let id in state.otherPlayers) {
        const other = state.otherPlayers[id];

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

    updateChatBubbles();

    state.renderer.render(state.scene, state.camera);
}

// リサイズ対応
window.addEventListener("resize", () => {
    if (!state.camera || !state.renderer) return;
    state.camera.aspect = window.innerWidth / window.innerHeight;
    state.camera.updateProjectionMatrix();
    state.renderer.setSize(window.innerWidth, window.innerHeight);
});