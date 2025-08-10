// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyCMqH0u_bO2knTMMSDjzwKbQBECUdzlwnc",
  authDomain: "lastr-36807.firebaseapp.com",
  databaseURL: "https://lastr-36807-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lastr-36807",
  storageBucket: "lastr-36807.firebasestorage.app",
  messagingSenderId: "1068261467238",
  appId: "1:1068261467238:web:22c701f8879d6bb61c79a7",
  measurementId: "G-1S8C9GC4GY"
};

// Firebase初期化 (CDN版)
const app = firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// グローバル変数として設定
window.firebaseApp = app;
window.firebaseDatabase = database;

// 初期データ構造を設定
const initializeDatabase = async () => {
  try {
    // ゲーム設定のデフォルト値
    const defaultGameConfigs = {
      game1: {
        name: "アンティークショップ",
        initialMessage: "【アンティークショップ（A）】を攻撃するためには、WEAKを入力して、Aを長押ししてください",
        inputCommand: "WEAK",
        actionKey: "A",
        secondMessage: "ドリルを発動します。長押しで防御してください",
        completeMessage: "実行されました",
        isActive: false,
        completed: false
      },
      game2: {
        name: "ファクトリー",
        initialMessage: "【ファクトリー（B）】を攻撃するためには、HACKを入力して、Bを長押ししてください",
        inputCommand: "HACK",
        actionKey: "B",
        secondMessage: "セキュリティを解除します。長押しで実行してください",
        completeMessage: "実行されました",
        isActive: false,
        completed: false
      },
      game3: {
        name: "ラボラトリー",
        initialMessage: "【ラボラトリー（C）】を攻撃するためには、VIRUSを入力して、Cを長押ししてください",
        inputCommand: "VIRUS",
        actionKey: "C",
        secondMessage: "ウイルスを送信します。長押しで確認してください",
        completeMessage: "実行されました",
        isActive: false,
        completed: false
      },
      game4: {
        name: "バンク",
        initialMessage: "【バンク（D）】を攻撃するためには、STEALを入力して、Dを長押ししてください",
        inputCommand: "STEAL",
        actionKey: "D",
        secondMessage: "資金を転送します。長押しで承認してください",
        completeMessage: "実行されました",
        isActive: false,
        completed: false
      },
      game5: {
        name: "サーバー",
        initialMessage: "【サーバー（E）】を攻撃するためには、CRASHを入力して、Eを長押ししてください",
        inputCommand: "CRASH",
        actionKey: "E",
        secondMessage: "システムを停止します。長押しで実行してください",
        completeMessage: "実行されました",
        isActive: false,
        completed: false
      }
    };

    // 現在の設定をチェック
    const configRef = database.ref('gameConfigs');
    const snapshot = await configRef.once('value');
    
    if (!snapshot.exists()) {
      // 初期設定を書き込み
      await configRef.set(defaultGameConfigs);
      console.log('初期データベース設定を完了しました');
    }

    // システム状態の初期化
    const systemRef = database.ref('system');
    const systemSnapshot = await systemRef.once('value');
    
    if (!systemSnapshot.exists()) {
      await systemRef.set({
        currentGame: null,
        lastUpdated: Date.now()
      });
    }

    return true;
  } catch (error) {
    console.error('データベース初期化エラー:', error);
    return false;
  }
};

// 接続状態の監視
const monitorConnection = (callback) => {
  const connectedRef = database.ref('.info/connected');
  connectedRef.on('value', (snapshot) => {
    const connected = snapshot.val();
    callback(connected);
  });
};

// エクスポート
window.firebaseUtils = {
  initializeDatabase,
  monitorConnection
};

// 自動初期化
document.addEventListener('DOMContentLoaded', () => {
  initializeDatabase();
}); 