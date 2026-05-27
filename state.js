// state.js
export const state = {
    myName: "",
    scene: null,
    camera: null,
    renderer: null,
    myAvatar: null,
    keys: {},

    // マルチプレイ用
    socket: null,
    otherPlayers: {}, // IDをキーとする
    nameToIdMap: {},   // 名前からIDを引くマップ

    // カメラ操作用
    cameraYaw: 0,
    cameraPitch: 0.3,
    cameraDistance: 10,
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },

    // アニメーション用
    walkTime: 0,
    leftLegPivot: null,
    rightLegPivot: null,
    leftArmPivot: null,
    rightArmPivot: null
};

// UI要素
export const ui = {
    chatInput: document.getElementById("chat-input"),
    chatLog: document.getElementById("chat-log"),
    canvasContainer: document.getElementById("canvas-container")
};