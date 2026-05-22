// 1. Socket.io（リアルタイム通信ライブラリ）を読み込み、ポート3000番でサーバーを起動
const io = require("socket.io")(3000, {
    cors: {
        // GitHub Pages（フロントエンド）から接続できるようにアクセスを許可する設定
        origin: "*",
        methods: ["GET", "POST"]
    }
});

console.log("マルチプレイサーバーがポート 3000 で起動しました！");

// 2. 現在ゲームに参加しているプレイヤー全員の情報を記憶する部屋（オブジェクト）
let players = {};

// 3. 誰かのブラウザ（GitHub Pages）がサーバーに接続してきたときの処理
io.on("connection", (socket) => {
    console.log(`新しいプレイヤーが接続しました（ID: ${socket.id}）`);

    // 【イベントA】プレイヤーが名前を入力して「世界に入った」とき
    socket.on("join-game", (data) => {
        // 接続してきた人のIDを鍵にして、名前と初期位置（x, y, z）を記憶する
        players[socket.id] = {
            id: socket.id,
            name: data.name,
            x: 0,
            y: 0,         // 地面レベル（アバターの足元）
            z: 0,
            rotationY: 0,
            isWalking: false
        };

        // ① ログインした本人に、今すでに部屋にいる「他の全員の情報」を教えてあげる
        socket.emit("current-players", players);

        // ② 本人以外の「他の全員」に「新しい人が入ってきたよ！」と通知する
        socket.broadcast.emit("new-player", players[socket.id]);
    });

    // 【イベントB】誰かがキーボードを押して「アバターを動かした」とき
    socket.on("move-player", (data) => {
        // 記憶しているその人の座標を最新の状態に更新する
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;          // Y座標も保存・転送
            players[socket.id].z = data.z;
            players[socket.id].rotationY = data.rotationY;  // 体の向きも保存
            players[socket.id].isWalking = data.isWalking;  // 歩行状態も保存

            // 動いた人以外の「他の全員」に全情報を転送する
            socket.broadcast.emit("player-moved", players[socket.id]);
        }
    });

    // 【イベントC】誰かがチャット欄に文字を入力して「送信」したとき
    socket.on("send-chat", (data) => {
        // チャットは自分も含めた「全員」に「〇〇さんがこう言ったよ」と一斉送信（ブロードキャスト）する
        io.emit("receive-chat", {
            name: data.name,
            message: data.message
        });
    });

    // 【イベントD】誰かがブラウザのタブを閉じたりして「回線切断」したとき
    socket.on("disconnect", () => {
        console.log(`プレイヤーが切断しました（ID: ${socket.id}）`);

        // 記憶していたプレイヤー情報を削除する
        delete players[socket.id];

        // 残っている全員に「あの人はいなくなったので画面から消してね」と伝える
        io.emit("player-disconnected", socket.id);
    });
});