# 謎解き公演 - システム統合プラットフォーム

このプロジェクトは謎解き公演で使用する統合システムです。STAFFがコントロールし、プレイヤーが見るモニター画面を連携させる仕組みを提供します。

## 🎯 主な機能

- **STAFF画面**: スタッフが5つのシナリオを管理・編集・選択
- **モニター画面**: プレイヤーが見るコマンドプロンプト風の画面
- **Firebase連携**: リアルタイムでSTAFF画面とモニター画面を同期
- **カスタマイズ可能**: 各シナリオの内容をリアルタイムで編集可能

## 📁 ファイル構成

```
lastr/
├── index.html         # メインページ（システム選択）
├── staff.html         # STAFF用コントロール画面
├── staff.js           # STAFF画面のロジック
├── monitor.html       # モニター画面（プレイヤー用）
├── monitor.js         # モニター画面のロジック
├── monitor.css        # モニター画面のスタイル
└── README.md          # このファイル
```

## 🚀 使用方法

### 1. 初期設定
1. `index.html`をブラウザで開く
2. 「STAFF」または「モニター画面」を選択

### 2. STAFF画面での操作
1. **シナリオ選択**: 5つのシナリオから1つを選択してモニターに表示
2. **シナリオ編集**: 各シナリオの内容をリアルタイムで編集
3. **プレビュー**: 編集内容をプレビューで確認

### 3. モニター画面での操作
1. **待機状態**: スタッフからの指示を待機
2. **コマンド入力**: 表示されたコマンドを入力
3. **長押し操作**: 指定されたキーを長押しで完了

## 🎮 ゲームの流れ

### 基本の流れ
1. **STAFF**: シナリオを選択
2. **モニター**: 攻撃指示が表示される
3. **プレイヤー**: 指定されたコマンドを入力
4. **モニター**: 防御指示が表示される
5. **プレイヤー**: 指定されたキーを長押し
6. **モニター**: 完了メッセージが表示される

### デフォルトシナリオ
1. **アンティークショップ**: WEAK → A長押し
2. **クイーンズピザ**: QUEEN → Q長押し (コード伏せ: ****)
3. **スタジオ**: STUDIO → S長押し (コードと長押し伏せ: ****、#)
4. **ゾンビアクション**: STEP → Z長押し (長押し伏せ: #)
5. **ゾンビアトラクション**: IDEA → Z長押し (コードと長押し伏せ: ****、#)

## 🔧 技術仕様

### フロントエンド
- **HTML5**: 構造とレイアウト
- **CSS3**: コマンドプロンプト風スタイリング
- **JavaScript**: ゲームロジック・UI制御

### バックエンド
- **Cloud Firestore**: メインのリアルタイムデータ同期
- **Firebase Realtime Database**: フォールバック用のデータ同期
- **Firebase Configuration**: 提供されたFirebase設定を使用
- **自動切り替え**: Firestoreが利用できない場合は自動的にRealtime Databaseに切り替え

### 主要な機能
- **リアルタイム同期**: STAFF画面とモニター画面の即座の連携
- **Firebase自動切り替え**: Firestore → Realtime Databaseの自動フォールバック
- **長押し検知**: 1秒間のキー長押し判定
- **タイピング効果**: 文字が順番に表示されるアニメーション
- **エラーハンドリング**: 入力ミスや接続エラーの適切な処理

## 💡 カスタマイズ

### Firebase設定
システムは以下の優先順位でFirebaseサービスを使用します：
1. **Cloud Firestore**（優先）
2. **Realtime Database**（フォールバック）

データ構造：
- **Firestore**: `/gameData/scenarios`と`/gameData/currentScenario`
- **Realtime Database**: `/scenarios`と`/currentScenario`

### Firebase接続の問題
Firebase接続に問題がある場合は、以下の手順で確認してください：

1. **Firebase接続テストページの利用**
   - `firebase-test.html`をブラウザで開く
   - 各テストボタンを順次クリック
   - FirestoreとRealtime Databaseの両方をテスト

2. **接続状態の確認**
   - STAFF画面上部：「Firestore接続済み ✓」または「Realtime Database接続済み ✓」
   - モニター画面上部：「STATUS: ACTIVE - Firestore Connected ✓」
   - どちらも「接続済み ✓」と表示されない場合は問題あり

3. **開発者コンソールの確認**
   - F12キーで開発者ツールを開く
   - Consoleタブでエラーメッセージを確認
   - 特に「PERMISSION_DENIED」エラーに注意

### よくある問題と解決方法

1. **Firebase接続エラー**
   - **原因**: インターネット接続の問題
   - **解決**: インターネット接続を確認し、ページを再読み込み

2. **PERMISSION_DENIED エラー**
   - **原因**: Firebase Database・Firestoreのセキュリティルールが制限的
   - **解決**: Firebaseコンソールで以下のルールを設定
   
   **Firestore Rules**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   
   **Realtime Database Rules**:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

3. **Firestoreが利用できない場合**
   - **原因**: Firestoreが有効化されていない
   - **解決**: 自動的にRealtime Databaseにフォールバック

4. **シナリオが同期されない**
   - **原因**: データベースURLの設定ミス
   - **解決**: 設定を確認（自動切り替えで解決される場合が多い）

### Firebase設定の確認

現在のFirebase設定（両方のサービスに対応）：
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCMqH0u_bO2knTMMSDjzwKbQBECUdzlwnc",
    authDomain: "lastr-36807.firebaseapp.com",
    databaseURL: "https://lastr-36807-default-rtdb.firebaseio.com",
    projectId: "lastr-36807",
    // ... その他の設定
};
```

**自動切り替えロジック**:
1. まずFirestoreに接続を試行
2. 成功した場合はFirestoreを使用
3. 失敗した場合はRealtime Databaseに切り替え
4. 両方失敗した場合はエラー表示

### サポート情報

- Firebase SDKバージョン: 10.7.1
- 対応サービス: Cloud Firestore（優先）、Realtime Database（フォールバック）
- 対応ブラウザ: Chrome, Firefox, Safari, Edge（最新版）
- 最終更新日: 2024年

## 🔐 セキュリティ

- Firebase設定は読み取り専用で設定
- XSS対策済み
- 入力値の適切なバリデーション

## 📞 サポート

システムに関する問題や質問がある場合は、開発者にお問い合わせください。

---

**注意**: このシステムは謎解き公演専用に設計されています。商用利用や他の用途での使用は想定されていません。 