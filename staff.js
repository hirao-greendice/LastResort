// グローバル変数
let currentScenario = null;
let scenarios = {};
let keyboardConnected = true; // キーボードの接続状況

// 通信最適化用
let lastWindowControlState = null;
let lastKeyboardState = null;
let lastImageDisplayState = null;

// キーマッピング関連
let keyMappingEnabled = true; // デフォルトでON
let keyMappingButton = null;

// デフォルトのシナリオデータ
const defaultScenarios = {
    1: {
        target: "アロハみやげ館",
        command: "LAND",
        key: "A",
        secondMessage: "【アロハみやげ館】に向けてドリルを発射します。<span class=\"key-highlight\">A</span>の長押しで防衛してください",
        hideCommand: false,
        hideKey: false
    },
    2: {
        target: "クイーンズピザ",
        command: "FLAG",
        key: "Q",
        secondMessage: "【クイーンズピザ】に向けてドリルを発射します。<span class=\"key-highlight\">Q</span>の長押しで防衛してください",
        hideCommand: false,
        hideKey: false
    },
    3: {
        target: "ストリートライブハウス",
        command: "EDIT",
        key: "S",
        secondMessage: "【ストリートライブハウス】に向けてドリルを発射します。<span class=\"key-highlight\">A S</span>の長押しで防衛してください",
        hideCommand: false,
        hideKey: true,
        completeMessage: "⚠ ドリルにより、アロハみやげ館が破壊されました"
    },
    4: {
        target: "ゾンビアトラクション",
        command: "UNIT",
        key: "Z",
        secondMessage: "【ゾンビアトラクション】に向けてドリルを発射します。<span class=\"key-highlight\">Z</span>の長押しで防衛してください",
        hideCommand: false,
        hideKey: true,
        completeMessage: "⚠ エラー\nドリルが発射されませんでした\n対応表とマップを利用して、別のコマンドを特定してください"
    },
    5: {
        target: "ゾンビアトラクション",
        command: "VIEW",
        key: "Z",
        secondMessage: "【ゾンビアトラクション】に向けてドリルを発射します。<span class=\"key-highlight\">Z X</span>の長押しで防衛してください",
        hideCommand: false,
        hideKey: true,
        completeMessage: "⚠ ドリルによりエックス線研究所が破壊されました\n⚠ 建物倒壊によりゾンビアトラクションが一部破損しました"
    }
};

// 初期化
function init() {
    console.log('Initializing staff panel...');
    scenarios = { ...defaultScenarios };
    updateAllPreviews();
    setupResetButton();
    setupWindowToggleButton();
    setupKeyboardToggleButton();
    setupImageToggleButton();
}



// リセットボタンの設定
function setupResetButton() {
    const resetBtn = document.getElementById('resetMonitorBtn');
    
    // 既存のイベントリスナーを削除して重複を防ぐ
    if (resetBtn.hasSetupListener) {
        console.log('Reset button already initialized');
        return;
    }
    
    resetBtn.addEventListener('click', resetMonitor);
    resetBtn.hasSetupListener = true;
    
    console.log('Reset button initialized');
}

// モニターをリセットする関数
function resetMonitor() {
    console.log('Resetting monitor...');
    
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized');
        showNotification('Firebase未初期化', 'error');
        return;
    }

    const resetData = {
        action: 'reset',
        timestamp: Date.now()
    };

    try {
        if (window.useFirestore) {
            // Firestore使用
            const currentScenarioRef = window.firestoreDoc(window.firestore, 'gameData', 'currentScenario');
            window.firestoreSetDoc(currentScenarioRef, resetData)
                .then(() => {
                    console.log('Monitor reset signal sent via Firestore');
                    showNotification('モニターをリセットしました', 'success');
                    
                    // 現在選択されているシナリオの表示を更新
                    currentScenario = null;
                    updateActiveButton();
                })
                .catch((error) => {
                    console.error('Error resetting monitor via Firestore:', error);
                    showNotification('リセット失敗: ' + error.message, 'error');
                });
        } else {
            // Realtime Database使用
            const currentScenarioRef = window.dbRef(window.database, 'currentScenario');
            window.dbSet(currentScenarioRef, resetData)
                .then(() => {
                    console.log('Monitor reset signal sent via Database');
                    showNotification('モニターをリセットしました', 'success');
                    
                    // 現在選択されているシナリオの表示を更新
                    currentScenario = null;
                    updateActiveButton();
                })
                .catch((error) => {
                    console.error('Error resetting monitor via Database:', error);
                    showNotification('リセット失敗: ' + error.message, 'error');
                });
        }
    } catch (error) {
        console.error('Error in resetMonitor:', error);
        showNotification('リセット処理でエラーが発生しました', 'error');
    }
}

// 窓変化ボタンの設定
function setupWindowToggleButton() {
    const windowToggleBtn = document.getElementById('windowToggleBtn');
    
    // 既存のイベントリスナーを削除して重複を防ぐ
    if (windowToggleBtn.hasSetupListener) {
        console.log('Window toggle button already initialized');
        return;
    }
    
    let isWindowChangeEnabled = false;
    
    const handleToggle = () => {
        isWindowChangeEnabled = !isWindowChangeEnabled;
        updateWindowToggleButton(isWindowChangeEnabled);
        updateWindowControlInFirebase(isWindowChangeEnabled);
    };
    
    windowToggleBtn.addEventListener('click', handleToggle);
    windowToggleBtn.hasSetupListener = true;
    
    console.log('Window toggle button initialized');
    
    // 初期状態を設定
    updateWindowToggleButton(isWindowChangeEnabled);
    updateWindowControlInFirebase(isWindowChangeEnabled);
}

// 窓変化ボタンの表示を更新
function updateWindowToggleButton(enabled) {
    const windowToggleBtn = document.getElementById('windowToggleBtn');
    
    console.log('Updating window toggle button:', enabled);
    
    if (enabled) {
        windowToggleBtn.textContent = '窓変化: ON';
        windowToggleBtn.style.backgroundColor = '#28a745';
        windowToggleBtn.innerHTML = '<i class="fas fa-window-restore"></i> 窓変化: ON';
    } else {
        windowToggleBtn.textContent = '窓変化: OFF';
        windowToggleBtn.style.backgroundColor = '#6c757d';
        windowToggleBtn.innerHTML = '<i class="fas fa-window-restore"></i> 窓変化: OFF';
    }
}

// 窓変化状態をFirebaseに保存
function updateWindowControlInFirebase(enabled) {
    console.log('Updating window control in Firebase:', enabled);
    
    // 状態が変わっていない場合は通信しない
    if (lastWindowControlState === enabled) {
        console.log('Window control state unchanged, skipping update');
        return;
    }
    
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized');
        showNotification('Firebase未初期化', 'error');
        return;
    }

    const windowControlData = {
        enabled: enabled,
        isScrolling: false, // 初期状態は常にfalse
        timestamp: Date.now()
    };

    try {
        if (window.useFirestore) {
            // Firestore使用
            const windowControlRef = window.firestoreDoc(window.firestore, 'gameData', 'windowControl');
            window.firestoreSetDoc(windowControlRef, windowControlData)
                .then(() => {
                    console.log('Window control updated in Firestore');
                    lastWindowControlState = enabled; // 成功時のみ状態を保存
                    showNotification(enabled ? '窓変化を有効にしました' : '窓変化を無効にしました', 'success');
                })
                .catch((error) => {
                    console.error('Error updating window control in Firestore:', error);
                    showNotification('窓変化設定の更新に失敗しました: ' + error.message, 'error');
                });
        } else {
            // Realtime Database使用
            const windowControlRef = window.dbRef(window.database, 'windowControl');
            window.dbSet(windowControlRef, windowControlData)
                .then(() => {
                    console.log('Window control updated in Database');
                    lastWindowControlState = enabled; // 成功時のみ状態を保存
                    showNotification(enabled ? '窓変化を有効にしました' : '窓変化を無効にしました', 'success');
                })
                .catch((error) => {
                    console.error('Error updating window control in Database:', error);
                    showNotification('窓変化設定の更新に失敗しました: ' + error.message, 'error');
                });
        }
    } catch (error) {
        console.error('Error in updateWindowControlInFirebase:', error);
        showNotification('窓変化設定の更新でエラーが発生しました', 'error');
    }
}

// キーボードトグルボタンの設定
function setupKeyboardToggleButton() {
    const keyboardToggleBtn = document.getElementById('keyboardToggleBtn');
    
    // 既存のイベントリスナーを削除して重複を防ぐ
    if (keyboardToggleBtn.hasSetupListener) {
        console.log('Keyboard toggle button already initialized');
        return;
    }
    
    keyboardToggleBtn.addEventListener('click', () => {
        keyboardConnected = !keyboardConnected;
        updateKeyboardToggleButton(keyboardConnected);
        updateKeyboardStatusInFirebase(keyboardConnected);
    });
    
    keyboardToggleBtn.hasSetupListener = true;
    console.log('Keyboard toggle button initialized');
}

// キーボードボタンの表示を更新
function updateKeyboardToggleButton(connected) {
    const keyboardToggleBtn = document.getElementById('keyboardToggleBtn');
    
    console.log('Updating keyboard toggle button:', connected);
    
    if (connected) {
        keyboardToggleBtn.textContent = 'キーボード: 接続';
        keyboardToggleBtn.style.backgroundColor = '#28a745';
        keyboardToggleBtn.innerHTML = '<i class="fas fa-keyboard"></i> キーボード: 接続';
    } else {
        keyboardToggleBtn.textContent = 'キーボード: 切断';
        keyboardToggleBtn.style.backgroundColor = '#dc3545';
        keyboardToggleBtn.innerHTML = '<i class="fas fa-keyboard"></i> キーボード: 切断';
    }
}

// キーボード状態をFirebaseに保存
function updateKeyboardStatusInFirebase(connected) {
    console.log('Updating keyboard status in Firebase:', connected);
    
    // 状態が変わっていない場合は通信しない
    if (lastKeyboardState === connected) {
        console.log('Keyboard state unchanged, skipping update');
        return;
    }
    
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized');
        showNotification('Firebase未初期化', 'error');
        return;
    }

    const keyboardStatusData = {
        connected: connected,
        timestamp: Date.now()
    };

    try {
        if (window.useFirestore) {
            // Firestore使用
            const keyboardStatusRef = window.firestoreDoc(window.firestore, 'gameData', 'keyboardStatus');
            window.firestoreSetDoc(keyboardStatusRef, keyboardStatusData)
                .then(() => {
                    console.log('Keyboard status updated in Firestore');
                    lastKeyboardState = connected; // 成功時のみ状態を保存
                    showNotification(connected ? 'キーボード接続状態に変更しました' : 'キーボード切断状態に変更しました', 'success');
                })
                .catch((error) => {
                    console.error('Error updating keyboard status in Firestore:', error);
                    showNotification('キーボード状態の更新に失敗しました: ' + error.message, 'error');
                });
        } else {
            // Realtime Database使用
            const keyboardStatusRef = window.dbRef(window.database, 'keyboardStatus');
            window.dbSet(keyboardStatusRef, keyboardStatusData)
                .then(() => {
                    console.log('Keyboard status updated in Database');
                    lastKeyboardState = connected; // 成功時のみ状態を保存
                    showNotification(connected ? 'キーボード接続状態に変更しました' : 'キーボード切断状態に変更しました', 'success');
                })
                .catch((error) => {
                    console.error('Error updating keyboard status in Database:', error);
                    showNotification('キーボード状態の更新に失敗しました: ' + error.message, 'error');
                });
        }
    } catch (error) {
        console.error('Error in updateKeyboardStatusInFirebase:', error);
        showNotification('キーボード状態の更新でエラーが発生しました', 'error');
    }
}

// 画像表示制御ボタンの設定
function setupImageToggleButton() {
    const imageToggleBtn = document.getElementById('imageToggleBtn');
    
    // 既存のイベントリスナーを削除して重複を防ぐ
    if (imageToggleBtn.hasSetupListener) {
        console.log('Image toggle button already initialized');
        return;
    }
    
    let isImageDisplayEnabled = false;
    
    const handleToggle = () => {
        isImageDisplayEnabled = !isImageDisplayEnabled;
        updateImageToggleButton(isImageDisplayEnabled);
        updateImageDisplayInFirebase(isImageDisplayEnabled);
    };
    
    imageToggleBtn.addEventListener('click', handleToggle);
    imageToggleBtn.hasSetupListener = true;
    
    console.log('Image toggle button initialized');
    
    // 初期状態を設定
    updateImageToggleButton(isImageDisplayEnabled);
    updateImageDisplayInFirebase(isImageDisplayEnabled);
}

// 画像表示ボタンの表示を更新
function updateImageToggleButton(enabled) {
    const imageToggleBtn = document.getElementById('imageToggleBtn');
    
    console.log('Updating image toggle button:', enabled);
    
    if (enabled) {
        imageToggleBtn.textContent = 'エラー画像: ON';
        imageToggleBtn.style.backgroundColor = '#28a745';
        imageToggleBtn.innerHTML = '<i class="fas fa-image"></i> エラー画像: ON';
    } else {
        imageToggleBtn.textContent = 'エラー画像: OFF';
        imageToggleBtn.style.backgroundColor = '#6c757d';
        imageToggleBtn.innerHTML = '<i class="fas fa-image"></i> エラー画像: OFF';
    }
}

// 画像表示状態をFirebaseに保存
function updateImageDisplayInFirebase(enabled) {
    console.log('Updating image display in Firebase:', enabled);
    
    // 状態が変わっていない場合は通信しない
    if (lastImageDisplayState === enabled) {
        console.log('Image display state unchanged, skipping update');
        return;
    }
    
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized');
        showNotification('Firebase未初期化', 'error');
        return;
    }

    const imageDisplayData = {
        enabled: enabled,
        timestamp: Date.now()
    };

    try {
        if (window.useFirestore) {
            // Firestore使用
            const imageDisplayRef = window.firestoreDoc(window.firestore, 'gameData', 'imageDisplay');
            window.firestoreSetDoc(imageDisplayRef, imageDisplayData)
                .then(() => {
                    console.log('Image display status updated in Firestore');
                    lastImageDisplayState = enabled; // 成功時のみ状態を保存
                    showNotification(enabled ? 'エラー画像表示をONにしました' : 'エラー画像表示をOFFにしました', 'success');
                })
                .catch((error) => {
                    console.error('Error updating image display status in Firestore:', error);
                    showNotification('画像表示状態の更新に失敗しました: ' + error.message, 'error');
                });
        } else {
            // Realtime Database使用
            const imageDisplayRef = window.dbRef(window.database, 'imageDisplay');
            window.dbSet(imageDisplayRef, imageDisplayData)
                .then(() => {
                    console.log('Image display status updated in Database');
                    lastImageDisplayState = enabled; // 成功時のみ状態を保存
                    showNotification(enabled ? 'エラー画像表示をONにしました' : 'エラー画像表示をOFFにしました', 'success');
                })
                .catch((error) => {
                    console.error('Error updating image display status in Database:', error);
                    showNotification('画像表示状態の更新に失敗しました: ' + error.message, 'error');
                });
        }
    } catch (error) {
        console.error('Error in updateImageDisplayInFirebase:', error);
        showNotification('画像表示状態の更新でエラーが発生しました', 'error');
    }
}

// シナリオをFirebaseから読み込み
function loadScenarios() {
    console.log('Loading scenarios...');
    
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized');
        showNotification('Firebase未初期化', 'error');
        init();
        return;
    }

    try {
        if (window.useFirestore) {
            // Firestore使用
            console.log('Using Firestore');
            loadScenariosFromFirestore();
        } else {
            // Realtime Database使用
            console.log('Using Realtime Database');
            loadScenariosFromDatabase();
        }
    } catch (error) {
        console.error('Firebase setup error:', error);
        showNotification('Firebase設定エラー: ' + error.message, 'error');
        init();
    }
}

// Firestoreからシナリオを読み込み
function loadScenariosFromFirestore() {
    const scenariosRef = window.firestoreDoc(window.firestore, 'gameData', 'scenarios');
    
    window.firestoreOnSnapshot(scenariosRef, (snapshot) => {
        console.log('Firestore scenarios data received:', snapshot.exists());
        
        if (snapshot.exists()) {
            const data = snapshot.data();
            scenarios = { ...defaultScenarios, ...data };
            console.log('Scenarios loaded successfully:', scenarios);
        } else {
            console.log('No scenarios data found, using defaults');
            scenarios = { ...defaultScenarios };
            // デフォルトデータをFirestoreに保存（初回のみ）
            console.log('Saving default scenarios to Firestore (first time only)...');
            window.firestoreSetDoc(scenariosRef, scenarios)
                .then(() => {
                    console.log('Default scenarios saved successfully');
                    showNotification('初期シナリオデータを作成しました', 'success');
                })
                .catch((error) => {
                    console.error('Error saving default scenarios:', error);
                });
        }
        updateAllPreviews();
        // Firebase接続成功時に初期化を実行
        init();
    }, (error) => {
        console.error('Error loading scenarios from Firestore:', error);
        showNotification('シナリオ読み込みエラー: ' + error.message, 'error');
        init();
    });

    // 現在のシナリオを監視
    const currentScenarioRef = window.firestoreDoc(window.firestore, 'gameData', 'currentScenario');
    window.firestoreOnSnapshot(currentScenarioRef, (snapshot) => {
        console.log('Firestore current scenario data received:', snapshot.exists());
        
        if (snapshot.exists()) {
            const data = snapshot.data();
            currentScenario = data.id || data;
            console.log('Current scenario updated:', currentScenario);
            updateActiveButton();
        }
    }, (error) => {
        console.error('Error monitoring current scenario in Firestore:', error);
        showNotification('現在のシナリオ監視エラー: ' + error.message, 'error');
    });
}

// Realtime Databaseからシナリオを読み込み
function loadScenariosFromDatabase() {
    const scenariosRef = window.dbRef(window.database, 'scenarios');
    window.dbOnValue(scenariosRef, (snapshot) => {
        console.log('Database scenarios data received:', snapshot.val());
        const data = snapshot.val();
        if (data) {
            scenarios = { ...defaultScenarios, ...data };
            console.log('Scenarios loaded successfully:', scenarios);
        } else {
            console.log('No scenarios data found, using defaults');
            scenarios = { ...defaultScenarios };
            // デフォルトデータをRealtime Databaseに保存（初回のみ）
            console.log('Saving default scenarios to Database (first time only)...');
            window.dbSet(window.dbRef(window.database, 'scenarios'), scenarios)
                .then(() => {
                    console.log('Default scenarios saved successfully');
                    showNotification('初期シナリオデータを作成しました', 'success');
                })
                .catch((error) => {
                    console.error('Error saving default scenarios:', error);
                });
        }
        updateAllPreviews();
        // Firebase接続成功時に初期化を実行
        init();
    }, (error) => {
        console.error('Error loading scenarios from Database:', error);
        showNotification('シナリオ読み込みエラー: ' + error.message, 'error');
        init();
    });

    // 現在のシナリオを監視
    const currentScenarioRef = window.dbRef(window.database, 'currentScenario');
    window.dbOnValue(currentScenarioRef, (snapshot) => {
        console.log('Database current scenario data received:', snapshot.val());
        const data = snapshot.val();
        if (data) {
            currentScenario = data.id || data;
            console.log('Current scenario updated:', currentScenario);
            updateActiveButton();
        }
    }, (error) => {
        console.error('Error monitoring current scenario in Database:', error);
        showNotification('現在のシナリオ監視エラー: ' + error.message, 'error');
    });
}

// シナリオを選択
function selectScenario(scenarioId) {
    console.log('Selecting scenario:', scenarioId);
    
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized');
        showNotification('Firebase未初期化', 'error');
        return;
    }

    try {
        currentScenario = scenarioId;
        const scenarioData = {
            id: scenarioId,
            timestamp: Date.now(),
            ...scenarios[scenarioId]
        };

        console.log('Saving scenario to Firebase:', scenarioData);

        if (window.useFirestore) {
            // Firestore使用
            const currentScenarioRef = window.firestoreDoc(window.firestore, 'gameData', 'currentScenario');
            window.firestoreSetDoc(currentScenarioRef, scenarioData)
                .then(() => {
                    console.log('Scenario saved successfully to Firestore');
                    updateActiveButton();
                    showNotification(`シナリオ ${scenarioId} がモニターに表示されました`, 'success');
                })
                .catch((error) => {
                    console.error('Error saving scenario to Firestore:', error);
                    showNotification('シナリオ保存エラー: ' + error.message, 'error');
                });
        } else {
            // Realtime Database使用
            window.dbSet(window.dbRef(window.database, 'currentScenario'), scenarioData)
                .then(() => {
                    console.log('Scenario saved successfully to Database');
                    updateActiveButton();
                    showNotification(`シナリオ ${scenarioId} がモニターに表示されました`, 'success');
                })
                .catch((error) => {
                    console.error('Error saving scenario to Database:', error);
                    showNotification('シナリオ保存エラー: ' + error.message, 'error');
                });
        }
        
    } catch (error) {
        console.error('Error selecting scenario:', error);
        showNotification('シナリオ選択エラー: ' + error.message, 'error');
    }
}

// プレビューを更新
function updateAllPreviews() {
    for (let i = 1; i <= 5; i++) {
        const scenario = scenarios[i];
        const previewElement = document.getElementById(`preview${i}`);
        if (scenario) {
            const displayCommand = scenario.hideCommand ? "****" : scenario.command;
            const displayKey = scenario.hideKey ? "#" : scenario.key;
            
            previewElement.innerHTML = `
                【${scenario.target}】に向けてドリルを発射するには、<br>
                ${displayCommand}を入力してください
            `;
        }
    }
}

// アクティブなボタンを更新
function updateActiveButton() {
    const buttons = document.querySelectorAll('.control-button');
    buttons.forEach(button => {
        button.classList.remove('active');
    });
    
    if (currentScenario) {
        const activeButton = document.querySelector(`[onclick="selectScenario(${currentScenario})"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
}

// 通知を表示
function showNotification(message, type = 'info') {
    // 既存の通知を削除
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 通知要素を作成
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // スタイルを適用
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        font-family: 'Courier Prime', monospace;
        font-weight: 700;
        font-size: 16px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    
    if (type === 'success') {
        notification.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
        notification.style.border = '1px solid #00ff00';
        notification.style.color = '#00ff00';
    } else if (type === 'error') {
        notification.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
        notification.style.border = '1px solid #ff0000';
        notification.style.color = '#ff0000';
    } else {
        notification.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
        notification.style.border = '1px solid #ffff00';
        notification.style.color = '#ffff00';
    }
    
    document.body.appendChild(notification);
    
    // 3秒後に自動削除
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// スライドインアニメーション
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// キーマッピング切り替え機能
function toggleKeyMapping() {
    keyMappingEnabled = !keyMappingEnabled;
    updateKeyMappingButton();
    saveKeyMappingToFirebase();
}

function updateKeyMappingButton() {
    if (keyMappingButton) {
        if (keyMappingEnabled) {
            keyMappingButton.textContent = '🔄 キーマップ: ON';
            keyMappingButton.classList.remove('disabled');
        } else {
            keyMappingButton.textContent = '❌ キーマップ: OFF';
            keyMappingButton.classList.add('disabled');
        }
    }
}

function saveKeyMappingToFirebase() {
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized');
        return;
    }

    const keyMappingData = {
        enabled: keyMappingEnabled,
        timestamp: new Date().toISOString()
    };

    if (window.useFirestore && window.firestore) {
        // Firestore使用
        window.firestore.collection('gameControl').doc('keyMapping')
            .set(keyMappingData)
            .then(() => {
                console.log('Key mapping setting saved:', keyMappingEnabled);
                showNotification(`キーマッピング: ${keyMappingEnabled ? 'ON' : 'OFF'}`, 'success');
            })
            .catch((error) => {
                console.error('Error saving key mapping:', error);
                showNotification('キーマッピング設定の保存に失敗しました', 'error');
            });
    } else if (window.database) {
        // Realtime Database使用
        window.database.ref('gameControl/keyMapping')
            .set(keyMappingData)
            .then(() => {
                console.log('Key mapping setting saved:', keyMappingEnabled);
                showNotification(`キーマッピング: ${keyMappingEnabled ? 'ON' : 'OFF'}`, 'success');
            })
            .catch((error) => {
                console.error('Error saving key mapping:', error);
                showNotification('キーマッピング設定の保存に失敗しました', 'error');
            });
    }
}

function setupKeyMappingButton() {
    keyMappingButton = document.getElementById('keyMappingToggle');
    if (keyMappingButton) {
        updateKeyMappingButton();
        
        // Firebase から現在の状態を読み込み
        if (window.useFirestore && window.firestore) {
            window.firestore.collection('gameControl').doc('keyMapping')
                .get()
                .then((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        keyMappingEnabled = data.enabled || false;
                        updateKeyMappingButton();
                    }
                })
                .catch((error) => {
                    console.error('Error loading key mapping state:', error);
                });
        } else if (window.database) {
            window.database.ref('gameControl/keyMapping')
                .once('value')
                .then((snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        keyMappingEnabled = data.enabled || false;
                        updateKeyMappingButton();
                    }
                })
                .catch((error) => {
                    console.error('Error loading key mapping state:', error);
                });
        }
    }
}

// ページロード時に初期化
document.addEventListener('DOMContentLoaded', () => {
    init();
});

// DOM読み込み完了時の初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting staff panel initialization...');
    // Firebase接続完了を待つ前に、基本的な初期化を実行
    setTimeout(() => {
        if (document.getElementById('windowToggleBtn')) {
            setupWindowToggleButton();
        }
        if (document.getElementById('resetMonitorBtn')) {
            setupResetButton();
        }
        if (document.getElementById('keyMappingToggle')) {
            setupKeyMappingButton();
        }
    }, 100);
});



// エラーハンドリング
window.addEventListener('error', (e) => {
    console.error('JavaScript Error:', e);
    showNotification('システムエラーが発生しました', 'error');
});

// Firebase接続エラーハンドリング
window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejection:', e);
    if (e.reason && e.reason.code) {
        showNotification('Firebase接続エラーが発生しました', 'error');
    }
}); 
