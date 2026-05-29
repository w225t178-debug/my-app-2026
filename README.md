# 🎮 3D Sandbox Multiplayer Game (my-app-2026)

Three.js と Socket.io を使用した、ブラウザで遊べるリアルタイム同期対応の **3D マルチプレイ・サンドボックスゲーム** です。
アバターを操作して 3D 空間を歩き回り、同じワールドに入ってきた他のプレイヤーとリアルタイムでチャットや移動の同期を楽しむことができます。

---

## ✨ 主な機能

* **3D アバターの操作**: WASD または 矢印キーでアバターを直感的に操作可能。カメラの向きに連動した移動や、歩行アニメーションに対応しています。
* **リアルタイム位置・ポーズ同期**: プレイヤーの現在位置、体の向き、歩行状態を Socket.io を通じて他のプレイヤーに瞬時に同期します。
* **リアルタイムチャット**: メッセージを送信すると、画面左下のチャットログに加えて、3D 空間上のアバターの頭上にも吹き出し（チャットバブル）が表示されます。
* **クラウド公開対応**: Cloudflare Tunnel を使って、ローカル環境で動いているサーバーを簡単にインターネットへ安全に公開することができます。

---

## 📂 ディレクトリ構成

```text
├── index.html          # ゲームのメイン画面（フロントエンド）
├── style.css           # UI・レイアウトのスタイルシート
├── main.js            # Three.jsの初期化、描画ループ、自アバター操作
├── multiplayer.js     # 他のプレイヤーの生成・動的同期処理
├── controls.js        # キーボード入力やチャット時の操作制御
├── state.js           # ゲーム全体の状態管理
├── utils.js           # 3Dモデル生成、ネームタグ、チャット吹き出しなどの便利関数
├── config.json        # サーバー接続先URLの設定ファイル
└── Server/
    └── server.js      # Socket.ioを使用したマルチプレイ用バックエンドサーバー
```

---

## ⚙️ 前期準備 (Prerequisites)

ゲームをマルチプレイで動作させるには、以下の環境が必要です。

1. **Node.js**: サーバーを起動するために必要です。[Node.js 公式サイト](https://nodejs.org/) からインストールしてください。
2. **Cloudflare Tunnel (`cloudflared`)**: ローカルサーバーを外部に公開する場合に必要です。
   * **Mac (Homebrew)**: `brew install cloudflared`
   * **Windows/Mac (手動インストール)**: [Cloudflare Downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

---

## 🚀 クイックスタートガイド

以下の手順に従って、マルチプレイサーバーを起動し、ゲームに接続します。

### Step 1: サーバー用パッケージのインストール
初回のみ、`Server` ディレクトリ内で必要なパッケージ（`socket.io`）をインストールします。

```bash
cd Server
npm install socket.io
```

### Step 2: マルチプレイサーバーの起動
ローカルで Socket.io サーバー（ポート `3000`）を起動します。

```bash
node Server/server.js
```
* ターミナルに `マルチプレイサーバーがポート 3000 で起動しました！` と表示されれば正常に起動しています。このターミナルは開いたままにしてください。

### Step 3: サーバーの外部公開 (Cloudflare Tunnel)
外部のプレイヤー（GitHub Pages など）から接続できるように、新しくターミナルを開き、ローカルサーバーをインターネットにトンネリングします。

```bash
cloudflared tunnel --url http://localhost:3000
```
* 起動後、ログの中に表示される **`https://xxx.trycloudflare.com`** の URL をコピーします。
  > 💡 **Tip:** このターミナルを閉じると、URLは破棄され接続できなくなります。遊んでいる間は起動したままにしてください。

### Step 4: `config.json` の更新とプッシュ
プロジェクトルートにある `config.json` を開き、`SERVER_URL` を先ほどコピーした URL に書き換えて保存します。

```json
{
    "SERVER_URL": "https://コピーしたURL.trycloudflare.com",
    "_memo": [ ... ]
}
```

GitHub Pages などでホストしている場合は、この変更をコミットして GitHub にプッシュしてください。

```bash
git add config.json
git commit -m "chore: update server url"
git push
```

### Step 5: ゲームで遊ぶ！
ブラウザでゲーム画面（`index.html`）を開き、名前を入力して **「ゲーム開始」** を押せば、3D 空間に入ることができます！
他のプレイヤーと同じ `config.json` の URL を使っていれば、同じワールドで一緒に遊ぶことができます。

---

## 🛠️ 技術スタック

* **Frontend**: HTML5, Vanilla CSS, JavaScript, [Three.js](https://threejs.org/)
* **Backend**: Node.js, [Socket.io](https://socket.io/)
* **Infrastructure**: Cloudflare Tunnel (for local development testing)
