// STAFF画面のJavaScript

let gameConfigs = {};
let systemStatus = {};
let connectionStatus = false;

// ページ遷移
function goBack() {
    window.location.href = 'index.html';
}

// 接続状態の更新
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    connectionStatus = connected;
    
    if (connected) {
        statusElement.textContent = 'Firebase接続: 正常';
        statusElement.className = 'connected';
    } else {
        statusElement.textContent = 'Firebase接続: 切断';
        statusElement.className = 'disconnected';
    }
}

// ゲーム選択
async function selectGame(gameId) {
    if (!connectionStatus) {
        alert('Firebase接続が必要です');
        return;
    }

    try {
        // 現在のゲームをクリア
        clearActiveStates();
        
        // 選択したゲームをアクティブに
        document.getElementById(gameId + 'Btn').classList.add('active');
        
        // Firebaseに現在のゲームを保存
        const systemRef = window.firebaseDatabase.ref('system');
        await systemRef.update({
            currentGame: gameId,
            lastUpdated: Date.now()
        });
        
        // ゲームの状態をリセット
        await resetGameState(gameId);
        
        console.log(`ゲーム${gameId}を選択しました`);
        
    } catch (error) {
        console.error('ゲーム選択エラー:', error);
        alert('ゲーム選択に失敗しました');
    }
}

// ゲーム状態のリセット
async function resetGameState(gameId) {
    try {
        const gameRef = window.firebaseDatabase.ref(`gameConfigs/${gameId}`);
        await gameRef.update({
            isActive: true,
            completed: false,
            currentStep: 'initial',
            lastUpdated: Date.now()
        });
    } catch (error) {
        console.error('ゲーム状態リセットエラー:', error);
    }
}

// 現在のゲームをリセット
async function resetCurrentGame() {
    if (!connectionStatus) {
        alert('Firebase接続が必要です');
        return;
    }

    try {
        const systemRef = window.firebaseDatabase.ref('system');
        const systemSnapshot = await systemRef.once('value');
        const system = systemSnapshot.val();
        
        if (system && system.currentGame) {
            await resetGameState(system.currentGame);
            console.log('現在のゲームをリセットしました');
        } else {
            alert('現在アクティブなゲームがありません');
        }
    } catch (error) {
        console.error('ゲームリセットエラー:', error);
        alert('ゲームリセットに失敗しました');
    }
}

// モニターをクリア
async function clearMonitor() {
    if (!connectionStatus) {
        alert('Firebase接続が必要です');
        return;
    }

    try {
        const systemRef = window.firebaseDatabase.ref('system');
        await systemRef.update({
            currentGame: null,
            lastUpdated: Date.now()
        });
        
        clearActiveStates();
        console.log('モニターをクリアしました');
        
    } catch (error) {
        console.error('モニタークリアエラー:', error);
        alert('モニタークリアに失敗しました');
    }
}

// アクティブ状態をクリア
function clearActiveStates() {
    document.querySelectorAll('.game-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

// ゲーム設定の監視
function setupGameConfigListener() {
    const configRef = window.firebaseDatabase.ref('gameConfigs');
    configRef.on('value', (snapshot) => {
        const configs = snapshot.val();
        if (configs) {
            gameConfigs = configs;
            updateGameButtons();
            updateProgressCounts();
        }
    });
}

// システム状態の監視
function setupSystemListener() {
    const systemRef = window.firebaseDatabase.ref('system');
    systemRef.on('value', (snapshot) => {
        const system = snapshot.val();
        if (system) {
            systemStatus = system;
            updateMonitorInfo();
            updateActiveGame();
        }
    });
}

// ゲームボタンの更新
function updateGameButtons() {
    Object.keys(gameConfigs).forEach(gameId => {
        const config = gameConfigs[gameId];
        const statusElement = document.getElementById(gameId + 'Status');
        const btnElement = document.getElementById(gameId + 'Btn');
        
        if (config.completed) {
            statusElement.textContent = '完了';
            btnElement.classList.add('completed');
        } else if (config.isActive) {
            statusElement.textContent = '進行中';
            btnElement.classList.remove('completed');
        } else {
            statusElement.textContent = '待機中';
            btnElement.classList.remove('completed');
        }
    });
}

// アクティブゲームの更新
function updateActiveGame() {
    clearActiveStates();
    
    if (systemStatus.currentGame) {
        const activeBtn = document.getElementById(systemStatus.currentGame + 'Btn');
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
}

// モニター情報の更新
function updateMonitorInfo() {
    const currentGameName = document.getElementById('currentGameName');
    const gameProgress = document.getElementById('gameProgress');
    const lastUpdate = document.getElementById('lastUpdate');
    
    if (systemStatus.currentGame && gameConfigs[systemStatus.currentGame]) {
        const config = gameConfigs[systemStatus.currentGame];
        currentGameName.textContent = config.name;
        
        if (config.completed) {
            gameProgress.textContent = '完了';
        } else if (config.isActive) {
            gameProgress.textContent = '進行中';
        } else {
            gameProgress.textContent = '待機中';
        }
    } else {
        currentGameName.textContent = 'なし';
        gameProgress.textContent = '待機中';
    }
    
    if (systemStatus.lastUpdated) {
        const updateTime = new Date(systemStatus.lastUpdated);
        lastUpdate.textContent = updateTime.toLocaleTimeString();
    }
}

// 進捗カウントの更新
function updateProgressCounts() {
    const completedCount = document.getElementById('completedCount');
    const activeCount = document.getElementById('activeCount');
    const waitingCount = document.getElementById('waitingCount');
    
    let completed = 0;
    let active = 0;
    let waiting = 0;
    
    Object.values(gameConfigs).forEach(config => {
        if (config.completed) {
            completed++;
        } else if (config.isActive) {
            active++;
        } else {
            waiting++;
        }
    });
    
    completedCount.textContent = `${completed}/5`;
    activeCount.textContent = active.toString();
    waitingCount.textContent = waiting.toString();
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Firebase接続監視
        if (window.firebaseUtils) {
            window.firebaseUtils.monitorConnection(updateConnectionStatus);
        }
        
        // データベース初期化を待つ
        await window.firebaseUtils.initializeDatabase();
        
        // リスナーの設定
        setupGameConfigListener();
        setupSystemListener();
        
        console.log('STAFF画面が初期化されました');
        
    } catch (error) {
        console.error('初期化エラー:', error);
        updateConnectionStatus(false);
    }
});

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    if (e.key >= '1' && e.key <= '5') {
        const gameId = `game${e.key}`;
        selectGame(gameId);
    } else if (e.key === 'r' || e.key === 'R') {
        resetCurrentGame();
    } else if (e.key === 'c' || e.key === 'C') {
        clearMonitor();
    } else if (e.key === 'Escape') {
        goBack();
    }
});

// ウィンドウが閉じられる前の処理
window.addEventListener('beforeunload', () => {
    // Firebase接続のクリーンアップ
    if (window.firebaseDatabase) {
        window.firebaseDatabase.goOffline();
    }
}); 