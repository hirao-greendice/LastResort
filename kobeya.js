// グローバル変数
let currentScenario = null;
let scenarios = {};
let isImageDisplayEnabled = false;
let isWindowChangeEnabled = false;
let isDoctorVideoEnabled = false;

// 通信最適化用
let lastWindowControlState = null;
let lastImageDisplayState = null;
let lastDoctorVideoState = null;

// 確認ダイアログ用変数
let pendingScenarioId = null;
let pendingResetAction = false;
let pendingWindowChangeAction = false;

// 二回タップ管理用変数
let doubleTapState = {
    scenario: null,    // 準備中のシナリオID
    reset: false,      // リセットボタンの準備状態
    window: false,     // 窓変化ボタンの準備状態
    timeouts: {}       // 各ボタンのタイムアウト管理
};

// デフォルトのシナリオデータ
const defaultScenarios = {
    1: {
        target: "アロハみやげ館",
        command: "LAND",
        key: "A",
        secondMessage: "<span class=\"facility-name\">【アロハみやげ館】</span>に向けてドリルを発射します。<span class=\"key-highlight\">A</span>の長押しで防衛してください",
        hideCommand: false,
        hideKey: false
    },
    2: {
        target: "クイーンズピザ",
        command: "FLAG",
        key: "Q",
        secondMessage: "<span class=\"facility-name\">【クイーンズピザ】</span>に向けてドリルを発射します。<span class=\"key-highlight\">Q</span>の長押しで防衛してください",
        hideCommand: false,
        hideKey: false
    },
    3: {
        target: "ストリートライブハウス",
        command: "EDIT",
        key: "S",
        secondMessage: "<span class=\"facility-name\">【ストリートライブハウス】</span>に向けてドリルを発射します。<span class=\"key-highlight\">S・#</span>の長押しで防衛してください",
        hideCommand: false,
        hideKey: true,
        completeMessage: "⚠ ドリルにより、アロハみやげ館が破壊されました"
    },
    4: {
        target: "ゾンビアトラクション",
        command: "UNIT",
        key: "Z",
        secondMessage: "<span class=\"facility-name\">【ゾンビアトラクション】</span>に向けてドリルを発射します。<span class=\"key-highlight\">Z</span>の長押しで防衛してください",
        hideCommand: false,
        hideKey: true,
        completeMessage: "⚠ エラー\nドリルが発射されませんでした\n対応表とマップを利用して、別のコマンドを特定してください"
    },
    5: {
        target: "ゾンビアトラクション",
        command: "VIEW",
        key: "Z",
        secondMessage: "<span class=\"facility-name\">【ストリートライブハウス】</span>から南にドリルを発射します。<span class=\"key-highlight\">Z・#</span>の長押しで防衛してください",
        hideCommand: false,
        hideKey: true,
        completeMessage: "⚠ ドリルによりエックス線研究所が破壊されました\n⚠ 建物倒壊によりゾンビアトラクションが一部破損しました"
    },
    6: {
        target: "ゾンビアトラクション",
        command: "LIVE",
        key: "U",
        secondMessage: "<span class=\"facility-name\">【キッチンセンター】</span>から北にドリルを発射します。<span class=\"key-highlight\">I O</span>の長押しで防衛してください",
        hideCommand: false,
        hideKey: true,
        completeMessage: "⚠ ドリルによりエックス線研究所が破壊されました\n⚠ 建物倒壊によりゾンビアトラクションが一部破損しました"
    }
};

// 初期化
function init() {
    console.log('Initializing kobeya panel...');
    scenarios = { ...defaultScenarios };
    setupButtons();
}

// ボタンの初期化
function setupButtons() {
    // 初期状態を設定
    updateImageToggleButton(isImageDisplayEnabled);
    updateWindowToggleButton(isWindowChangeEnabled);
    updateDoctorToggleButton(isDoctorVideoEnabled);
    
    // Firebaseに初期状態を保存
    updateImageDisplayInFirebase(isImageDisplayEnabled);
    updateWindowControlInFirebase(isWindowChangeEnabled);
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
        // Firestoreをデータ操作の既定にする
        console.log('Using Firestore');
        loadScenariosFromFirestore();
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
        }

        // Firebase接続成功時に初期化を実行
        init();
        // 接続監視を開始
        setupConnectionMonitoring();
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

    // 窓変化状態を監視し、ボタンUIをサーバ状態に追従
    try {
        const windowControlRef = window.firestoreDoc(window.firestore, 'gameData', 'windowControl');
        window.firestoreOnSnapshot(windowControlRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                const enabled = !!data.enabled;
                if (isWindowChangeEnabled !== enabled) {
                    isWindowChangeEnabled = enabled;
                    updateWindowToggleButton(isWindowChangeEnabled);
                    lastWindowControlState = isWindowChangeEnabled;
                    console.log('Window control state synced (Firestore):', isWindowChangeEnabled);
                }
            }
        }, (error) => {
            console.error('Error monitoring window control in Firestore:', error);
        });
        // 博士映像状態を監視し、ボタンUIをサーバ状態に追従
        try {
            const doctorControlRef = window.firestoreDoc(window.firestore, 'gameData', 'doctorControl');
            window.firestoreOnSnapshot(doctorControlRef, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const enabled = !!data.enabled;
                    if (isDoctorVideoEnabled !== enabled) {
                        isDoctorVideoEnabled = enabled;
                        updateDoctorToggleButton(isDoctorVideoEnabled);
                        lastDoctorVideoState = isDoctorVideoEnabled;
                        console.log('Doctor video state synced (Firestore):', isDoctorVideoEnabled);
                    }
                }
            }, (error) => {
                console.error('Error monitoring doctor control in Firestore:', error);
            });
        } catch (e) {
            console.error('setup doctor control monitoring (Firestore) failed:', e);
        }
    } catch (e) {
        console.error('setup window control monitoring (Firestore) failed:', e);
    }
}

// Realtime Databaseからシナリオを読み込み（RTDB専用）
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
        }

        // Firebase接続成功時に初期化を実行
        init();
        // 接続監視を開始
        setupConnectionMonitoring();
    }, (error) => {
        console.error('Error loading scenarios from Database:', error);
        showNotification('シナリオ読み込みエラー: ' + error.message, 'error');
        init();
    });

    // 現在のシナリオを監視（RTDB）
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

    // 窓変化状態を監視し、ボタンUIをサーバ状態に追従（RTDB）
    try {
        const windowControlRef = window.dbRef(window.database, 'windowControl');
        window.dbOnValue(windowControlRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const enabled = !!data.enabled;
                if (isWindowChangeEnabled !== enabled) {
                    isWindowChangeEnabled = enabled;
                    updateWindowToggleButton(isWindowChangeEnabled);
                    lastWindowControlState = isWindowChangeEnabled;
                    console.log('Window control state synced (Database):', isWindowChangeEnabled);
                }
            }
        }, (error) => {
            console.error('Error monitoring window control in Database:', error);
        });
        // 博士映像状態を監視し、ボタンUIをサーバ状態に追従（RTDB）
        try {
            const doctorControlRef = window.dbRef(window.database, 'doctorControl');
            window.dbOnValue(doctorControlRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    const enabled = !!data.enabled;
                    if (isDoctorVideoEnabled !== enabled) {
                        isDoctorVideoEnabled = enabled;
                        updateDoctorToggleButton(isDoctorVideoEnabled);
                        lastDoctorVideoState = isDoctorVideoEnabled;
                        console.log('Doctor video state synced (Database):', isDoctorVideoEnabled);
                    }
                }
            }, (error) => {
                console.error('Error monitoring doctor control in Database:', error);
            });
        } catch (e) {
            console.error('setup doctor control monitoring (Database) failed:', e);
        }
    } catch (e) {
        console.error('setup window control monitoring (Database) failed:', e);
    }
}

// 二回タップでシナリオ選択
function doubleTapSelectScenario(scenarioId) {
    console.log('Double tap scenario selection:', scenarioId);
    
    if (!scenarios[scenarioId]) {
        console.error('Invalid scenario ID:', scenarioId);
        showNotification('無効なシナリオです', 'error');
        return;
    }
    
    // 一回目のタップかどうか確認
    if (doubleTapState.scenario !== scenarioId) {
        // 一回目のタップ - 準備状態に設定
        console.log('First tap for scenario:', scenarioId);
        
        // 他のシナリオの準備状態をクリア
        clearScenarioReadyState();
        clearResetReadyState();
        
        // 準備状態を設定
        doubleTapState.scenario = scenarioId;
        
        // ボタンの表示を更新（準備状態を示す）
        updateScenarioButtonReadyState(scenarioId, true);
        
        // 通知を表示
        const scenario = scenarios[scenarioId];
        showNotification(`シナリオ ${scenarioId}「${scenario.target}」準備完了\nもう一度タップで実行`, 'info');
        
        // 5秒後に準備状態をクリア
        doubleTapState.timeouts[`scenario_${scenarioId}`] = setTimeout(() => {
            clearScenarioReadyState();
        }, 5000);
        
    } else {
        // 二回目のタップ - 実行
        console.log('Second tap for scenario:', scenarioId, '- executing');
        
        // 二回目タップ時の視覚: 薄い赤
        const buttons = document.querySelectorAll('.scenario-button');
        const button = buttons[scenarioId - 1];
        if (button) {
            button.style.backgroundColor = '#ffb3b3';
            button.style.boxShadow = '0 0 20px #ffb3b3';
        }

        // 準備状態をクリア
        clearScenarioReadyState();
        
        // シナリオを実行
        selectScenario(scenarioId);
    }
}

// シナリオボタンの準備状態をクリア
function clearScenarioReadyState() {
    if (doubleTapState.scenario !== null) {
        // タイムアウトをクリア
        const timeoutKey = `scenario_${doubleTapState.scenario}`;
        if (doubleTapState.timeouts[timeoutKey]) {
            clearTimeout(doubleTapState.timeouts[timeoutKey]);
            delete doubleTapState.timeouts[timeoutKey];
        }
        
        // ボタンの表示を通常状態に戻す
        updateScenarioButtonReadyState(doubleTapState.scenario, false);
        
        // 準備状態をクリア
        doubleTapState.scenario = null;
    }
}

// シナリオボタンの準備状態表示を更新
function updateScenarioButtonReadyState(scenarioId, isReady) {
    const buttons = document.querySelectorAll('.scenario-button');
    const button = buttons[scenarioId - 1]; // シナリオIDは1から始まる
    
    if (button) {
        if (isReady) {
            // 一回目タップ: 薄い黄色
            button.style.backgroundColor = '#fff3b0';
            button.style.color = '#000000';
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 0 20px #fff3b0';
        } else {
            button.style.backgroundColor = '';
            button.style.color = '';
            button.style.transform = '';
            button.style.boxShadow = '';
        }
    }
}

// 確認ダイアログを表示してシナリオ選択（旧関数 - 後方互換性のため残す）
function confirmSelectScenario(scenarioId) {
    console.log('Confirming scenario selection:', scenarioId);
    
    if (!scenarios[scenarioId]) {
        console.error('Invalid scenario ID:', scenarioId);
        showNotification('無効なシナリオです', 'error');
        return;
    }
    
    // 確認用のデータを保存
    pendingScenarioId = scenarioId;
    
    // ダイアログメッセージを設定
    const scenario = scenarios[scenarioId];
    const dialogMessage = document.getElementById('dialogMessage');
    dialogMessage.innerHTML = `シナリオ ${scenarioId}「${scenario.target}」<br/>コマンド: ${scenario.command}<br/><br/>このシナリオを実行しますか？`;
    
    // ダイアログを表示
    const confirmDialog = document.getElementById('confirmDialog');
    confirmDialog.style.display = 'flex';
}

// 確認ダイアログで「ハイ」を押した時
function confirmYes() {
    console.log('User confirmed action');
    
    // ダイアログを閉じる
    const confirmDialog = document.getElementById('confirmDialog');
    confirmDialog.style.display = 'none';
    
    // シナリオ実行の場合
    if (pendingScenarioId !== null) {
        selectScenario(pendingScenarioId);
        pendingScenarioId = null;
    }
    
    // リセット実行の場合
    if (pendingResetAction) {
        resetMonitor();
        pendingResetAction = false;
    }
    
    // 窓変化実行の場合
    if (pendingWindowChangeAction) {
        toggleWindowChange();
        pendingWindowChangeAction = false;
    }
    
    // 博士映像実行の場合（削除済み）
}

// 確認ダイアログで「いいえ」を押した時
function confirmNo() {
    console.log('User cancelled action');
    
    // ダイアログを閉じる
    const confirmDialog = document.getElementById('confirmDialog');
    confirmDialog.style.display = 'none';
    
    // 保留中のアクションをクリア
    pendingScenarioId = null;
    pendingResetAction = false;
    pendingWindowChangeAction = false;
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
        // シナリオ変更時は窓変化をOFFにする
        if (isWindowChangeEnabled) {
            isWindowChangeEnabled = false;
            updateWindowToggleButton(isWindowChangeEnabled);
            updateWindowControlInFirebase(isWindowChangeEnabled);
        }

        currentScenario = scenarioId;
        
        // シナリオ2以外の場合はノイズ設定をリセット
        // シナリオ3、4、5、6はモニター側で強制表示されるため、スタッフ画面での制御は無効
        if (scenarioId === 2 && isImageDisplayEnabled) {
            // シナリオ2のみノイズを自動的にOFFにする
            isImageDisplayEnabled = false;
            updateImageToggleButton(isImageDisplayEnabled);
            updateImageDisplayInFirebase(isImageDisplayEnabled);
        }
        
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

// エラー画像表示切り替え
function toggleImageDisplay() {
    isImageDisplayEnabled = !isImageDisplayEnabled;
    updateImageToggleButton(isImageDisplayEnabled);
    updateImageDisplayInFirebase(isImageDisplayEnabled);
}

// 画像表示ボタンの表示を更新
function updateImageToggleButton(enabled) {
    const imageToggleBtn = document.getElementById('imageToggleBtn');
    
    console.log('Updating image toggle button:', enabled);
    
    if (enabled) {
        imageToggleBtn.innerHTML = 'ノイズ<br>ON';
        imageToggleBtn.classList.add('active');
    } else {
        imageToggleBtn.innerHTML = 'ノイズ<br>OFF';
        imageToggleBtn.classList.remove('active');
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
                    showNotification(enabled ? 'ノイズをONにしました' : 'ノイズをOFFにしました', 'success');
                })
                .catch((error) => {
                    console.error('Error updating image display status in Firestore:', error);
                    showNotification('ノイズ状態の更新に失敗しました: ' + error.message, 'error');
                });
        } else {
            // Realtime Database使用
            const imageDisplayRef = window.dbRef(window.database, 'imageDisplay');
            window.dbSet(imageDisplayRef, imageDisplayData)
                .then(() => {
                    console.log('Image display status updated in Database');
                    lastImageDisplayState = enabled; // 成功時のみ状態を保存
                    showNotification(enabled ? 'ノイズをONにしました' : 'ノイズをOFFにしました', 'success');
                })
                .catch((error) => {
                    console.error('Error updating image display status in Database:', error);
                    showNotification('ノイズ状態の更新に失敗しました: ' + error.message, 'error');
                });
        }
    } catch (error) {
        console.error('Error in updateImageDisplayInFirebase:', error);
        showNotification('ノイズ状態の更新でエラーが発生しました', 'error');
    }
}

// 二回タップで窓変化切り替え
function doubleTapToggleWindowChange() {
    console.log('Double tap window change toggle');
    
    // 一回目のタップかどうか確認
    if (!doubleTapState.window) {
        // 一回目のタップ - 準備状態に設定
        console.log('First tap for window change');
        
        // 他の準備状態をクリア
        clearAllReadyStates();
        
        // 準備状態を設定
        doubleTapState.window = true;
        
        // ボタンの表示を更新（準備状態を示す）
        updateWindowButtonReadyState(true);
        
        // 現在の状態に応じてメッセージを設定
        const currentState = isWindowChangeEnabled ? 'OFF' : 'ON';
        const actionMessage = isWindowChangeEnabled ? '無効' : '有効';
        
        // 通知を表示
        showNotification(`窓変化${actionMessage}化準備完了\nもう一度タップで実行`, 'info');
        
        // 5秒後に準備状態をクリア
        doubleTapState.timeouts.window = setTimeout(() => {
            clearWindowReadyState();
        }, 5000);
        
    } else {
        // 二回目のタップ - 実行
        console.log('Second tap for window change - executing');
        
        // 二回目タップ時の視覚: 薄い赤
        const windowButton = document.getElementById('windowToggleBtn');
        if (windowButton) {
            windowButton.style.backgroundColor = '#ffb3b3';
            windowButton.style.boxShadow = '0 0 20px #ffb3b3';
        }

        // 準備状態をクリア
        clearWindowReadyState();
        
        // 窓変化を実行
        toggleWindowChange();
    }
}

// 窓変化ボタンの準備状態をクリア
function clearWindowReadyState() {
    if (doubleTapState.window) {
        // タイムアウトをクリア
        if (doubleTapState.timeouts.window) {
            clearTimeout(doubleTapState.timeouts.window);
            delete doubleTapState.timeouts.window;
        }
        
        // ボタンの表示を通常状態に戻す
        updateWindowButtonReadyState(false);
        
        // 準備状態をクリア
        doubleTapState.window = false;
    }
}

// 窓変化ボタンの準備状態表示を更新
function updateWindowButtonReadyState(isReady) {
    const windowButton = document.getElementById('windowToggleBtn');
    
    if (windowButton) {
        if (isReady) {
            // 一回目タップ: 薄い黄色
            windowButton.style.backgroundColor = '#fff3b0';
            windowButton.style.color = '#000000';
            windowButton.style.transform = 'scale(1.05)';
            windowButton.style.boxShadow = '0 0 20px #fff3b0';
        } else {
            windowButton.style.backgroundColor = '';
            windowButton.style.color = '';
            windowButton.style.transform = '';
            windowButton.style.boxShadow = '';
        }
    }
}

// 全ての準備状態をクリア
function clearAllReadyStates() {
    clearScenarioReadyState();
    clearResetReadyState();
    // 窓変化は一回タップ動作なので準備状態をクリアしない
}

// 窓変化確認ダイアログを表示（旧関数 - 後方互換性のため残す）
function confirmToggleWindowChange() {
    console.log('Confirming window change toggle');
    
    // 確認用のフラグを設定
    pendingWindowChangeAction = true;
    
    // 現在の状態に応じてメッセージを設定
    const currentState = isWindowChangeEnabled ? 'OFF' : 'ON';
    const actionMessage = isWindowChangeEnabled ? '無効' : '有効';
    
    // ダイアログメッセージを設定
    const dialogMessage = document.getElementById('dialogMessage');
    dialogMessage.innerHTML = `窓変化機能を${actionMessage}にします。<br/><br/>窓変化を${currentState}にしますか？`;
    
    // ダイアログを表示
    const confirmDialog = document.getElementById('confirmDialog');
    confirmDialog.style.display = 'flex';
}

// 窓変化切り替え
function toggleWindowChange() {
    isWindowChangeEnabled = !isWindowChangeEnabled;
    updateWindowToggleButton(isWindowChangeEnabled);
    updateWindowControlInFirebase(isWindowChangeEnabled);
}

// 博士映像確認ダイアログ関数（削除予定）
// 直接toggleDoctorVideo()を呼ぶため、この関数は不要になった

// 博士映像切り替え
function toggleDoctorVideo() {
    isDoctorVideoEnabled = !isDoctorVideoEnabled;
    updateDoctorToggleButton(isDoctorVideoEnabled);
    updateDoctorVideoInFirebase(isDoctorVideoEnabled);
}

// 窓変化ボタンの表示を更新
function updateWindowToggleButton(enabled) {
    const windowToggleBtn = document.getElementById('windowToggleBtn');
    
    console.log('Updating window toggle button:', enabled);
    
    if (enabled) {
        windowToggleBtn.innerHTML = '窓変化<br>ON';
        windowToggleBtn.classList.remove('off');
    } else {
        windowToggleBtn.innerHTML = '窓変化<br>OFF';
        windowToggleBtn.classList.add('off');
    }
}

// 博士映像ボタンの表示を更新
function updateDoctorToggleButton(enabled) {
    const doctorToggleBtn = document.getElementById('doctorToggleBtn');
    
    console.log('Updating doctor toggle button:', enabled);
    
    if (enabled) {
        doctorToggleBtn.innerHTML = '博士映像<br>ON';
        doctorToggleBtn.classList.remove('off');
    } else {
        doctorToggleBtn.innerHTML = '博士映像<br>OFF';
        doctorToggleBtn.classList.add('off');
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

// 博士映像状態をFirebaseに保存
function updateDoctorVideoInFirebase(enabled) {
    console.log('Updating doctor video in Firebase:', enabled);
    
    // 状態が変わっていない場合は通信しない
    if (lastDoctorVideoState === enabled) {
        console.log('Doctor video state unchanged, skipping update');
        return;
    }
    
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized');
        showNotification('Firebase未初期化', 'error');
        return;
    }

    const doctorVideoData = {
        enabled: enabled,
        timestamp: Date.now()
    };

    try {
        if (window.useFirestore) {
            // Firestore使用
            const doctorControlRef = window.firestoreDoc(window.firestore, 'gameData', 'doctorControl');
            window.firestoreSetDoc(doctorControlRef, doctorVideoData)
                .then(() => {
                    console.log('Doctor video status updated in Firestore');
                    lastDoctorVideoState = enabled; // 成功時のみ状態を保存
                    showNotification(enabled ? '博士映像をONにしました' : '博士映像をOFFにしました', 'success');
                })
                .catch((error) => {
                    console.error('Error updating doctor video status in Firestore:', error);
                    showNotification('博士映像状態の更新に失敗しました: ' + error.message, 'error');
                });
        } else {
            // Realtime Database使用
            const doctorControlRef = window.dbRef(window.database, 'doctorControl');
            window.dbSet(doctorControlRef, doctorVideoData)
                .then(() => {
                    console.log('Doctor video status updated in Database');
                    lastDoctorVideoState = enabled; // 成功時のみ状態を保存
                    showNotification(enabled ? '博士映像をONにしました' : '博士映像をOFFにしました', 'success');
                })
                .catch((error) => {
                    console.error('Error updating doctor video status in Database:', error);
                    showNotification('博士映像状態の更新に失敗しました: ' + error.message, 'error');
                });
        }
    } catch (error) {
        console.error('Error in updateDoctorVideoInFirebase:', error);
        showNotification('博士映像状態の更新でエラーが発生しました', 'error');
    }
}

// 二回タップでリセット
function doubleTapResetMonitor() {
    console.log('Double tap reset monitor');
    
    // 一回目のタップかどうか確認
    if (!doubleTapState.reset) {
        // 一回目のタップ - 準備状態に設定
        console.log('First tap for reset');
        
        // 他の準備状態をクリア（窓変化以外）
        clearScenarioReadyState();
        
        // 準備状態を設定
        doubleTapState.reset = true;
        
        // ボタンの表示を更新（準備状態を示す）
        updateResetButtonReadyState(true);
        
        // 通知を表示
        showNotification('画面リセット準備完了\nもう一度タップで実行', 'info');
        
        // 5秒後に準備状態をクリア
        doubleTapState.timeouts.reset = setTimeout(() => {
            clearResetReadyState();
        }, 5000);
        
    } else {
        // 二回目のタップ - 実行
        console.log('Second tap for reset - executing');
        
        // 二回目タップ時の視覚: 薄い赤
        const resetButton = document.querySelector('.reset-button');
        if (resetButton) {
            resetButton.style.backgroundColor = '#ffb3b3';
            resetButton.style.boxShadow = '0 0 20px #ffb3b3';
        }

        // 準備状態をクリア
        clearResetReadyState();
        
        // リセットを実行
        resetMonitor();
    }
}

// リセットボタンの準備状態をクリア
function clearResetReadyState() {
    if (doubleTapState.reset) {
        // タイムアウトをクリア
        if (doubleTapState.timeouts.reset) {
            clearTimeout(doubleTapState.timeouts.reset);
            delete doubleTapState.timeouts.reset;
        }
        
        // ボタンの表示を通常状態に戻す
        updateResetButtonReadyState(false);
        
        // 準備状態をクリア
        doubleTapState.reset = false;
    }
}

// リセットボタンの準備状態表示を更新
function updateResetButtonReadyState(isReady) {
    const resetButton = document.querySelector('.reset-button');
    
    if (resetButton) {
        if (isReady) {
            // 一回目タップ: 薄い黄色
            resetButton.style.backgroundColor = '#fff3b0';
            resetButton.style.color = '#000000';
            resetButton.style.transform = 'scale(1.05)';
            resetButton.style.boxShadow = '0 0 20px #fff3b0';
        } else {
            resetButton.style.backgroundColor = '';
            resetButton.style.color = '';
            resetButton.style.transform = '';
            resetButton.style.boxShadow = '';
        }
    }
}

// リセット確認ダイアログを表示（旧関数 - 後方互換性のため残す）
function confirmResetMonitor() {
    console.log('Confirming monitor reset');
    
    // 確認用のフラグを設定
    pendingResetAction = true;
    
    // ダイアログメッセージを設定
    const dialogMessage = document.getElementById('dialogMessage');
    dialogMessage.innerHTML = 'モニター画面をリセットします。<br/><br/>現在表示されているシナリオが<br/>消去されますがよろしいですか？';
    
    // ダイアログを表示
    const confirmDialog = document.getElementById('confirmDialog');
    confirmDialog.style.display = 'flex';
}

// リセット機能
function resetMonitor() {
    console.log('Resetting monitor...');
    
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized');
        showNotification('Firebase未初期化', 'error');
        return;
    }

    // リセット時は窓変化をOFFにする
    if (isWindowChangeEnabled) {
        isWindowChangeEnabled = false;
        updateWindowToggleButton(isWindowChangeEnabled);
        updateWindowControlInFirebase(isWindowChangeEnabled);
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

// 二回タップでノイズ画像表示リセット
function doubleTapResetMonitorWithNoise() {
    console.log('Double tap noise reset monitor');
    
    // 一回目のタップかどうか確認
    const stateKey = 'noiseReset';
    if (!doubleTapState[stateKey]) {
        // 一回目のタップ - 準備状態に設定
        console.log('First tap for noise reset');
        
        // 他の準備状態をクリア（窓変化以外）
        clearScenarioReadyState();
        clearResetReadyState();
        
        // 準備状態を設定
        doubleTapState[stateKey] = true;
        
        // ボタンの表示を更新（準備状態を示す）
        updateNoiseResetButtonReadyState(true);
        
        // 通知を表示
        showNotification('リセット画面ノイズ有 準備完了\nもう一度タップで実行', 'info');
        
        // 5秒後に準備状態をクリア
        doubleTapState.timeouts[stateKey] = setTimeout(() => {
            clearNoiseResetReadyState();
        }, 5000);
        
    } else {
        // 二回目のタップ - 実行
        console.log('Second tap for noise reset - executing');
        
        // 二回目タップ時の視覚: 薄い赤
        const noiseResetButton = document.querySelector('.noise-reset-button');
        if (noiseResetButton) {
            noiseResetButton.style.backgroundColor = '#ffb3b3';
            noiseResetButton.style.boxShadow = '0 0 20px #ffb3b3';
        }

        // 準備状態をクリア
        clearNoiseResetReadyState();
        
        // ノイズ画像表示リセットを実行
        resetMonitorWithNoise();
    }
}

// ノイズリセットボタンの準備状態をクリア
function clearNoiseResetReadyState() {
    const stateKey = 'noiseReset';
    if (doubleTapState[stateKey]) {
        // タイムアウトをクリア
        if (doubleTapState.timeouts[stateKey]) {
            clearTimeout(doubleTapState.timeouts[stateKey]);
            delete doubleTapState.timeouts[stateKey];
        }
        
        // ボタンの表示を通常状態に戻す
        updateNoiseResetButtonReadyState(false);
        
        // 準備状態をクリア
        doubleTapState[stateKey] = false;
    }
}

// ノイズリセットボタンの準備状態表示を更新
function updateNoiseResetButtonReadyState(isReady) {
    const noiseResetButton = document.querySelector('.noise-reset-button');
    
    if (noiseResetButton) {
        if (isReady) {
            // 一回目タップ: 薄い黄色
            noiseResetButton.style.backgroundColor = '#fff3b0';
            noiseResetButton.style.color = '#000000';
            noiseResetButton.style.transform = 'scale(1.05)';
            noiseResetButton.style.boxShadow = '0 0 20px #fff3b0';
        } else {
            noiseResetButton.style.backgroundColor = '';
            noiseResetButton.style.color = '';
            noiseResetButton.style.transform = '';
            noiseResetButton.style.boxShadow = '';
        }
    }
}

// ノイズ画像表示リセット機能
function resetMonitorWithNoise() {
    console.log('Resetting monitor with noise...');
    
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized');
        showNotification('Firebase未初期化', 'error');
        return;
    }
 
    // リセット(ノイズ有)時も窓変化をOFFにする
    if (isWindowChangeEnabled) {
        isWindowChangeEnabled = false;
        updateWindowToggleButton(isWindowChangeEnabled);
        updateWindowControlInFirebase(isWindowChangeEnabled);
    }

    const resetData = {
        action: 'reset_with_noise',
        timestamp: Date.now()
    };
 
    try {
        if (window.useFirestore) {
            // Firestore使用
            const currentScenarioRef = window.firestoreDoc(window.firestore, 'gameData', 'currentScenario');
            window.firestoreSetDoc(currentScenarioRef, resetData)
                .then(() => {
                    console.log('Monitor noise reset signal sent via Firestore');
                    showNotification('モニターをノイズ画像付きでリセットしました', 'success');
                    
                    // 現在選択されているシナリオの表示を更新
                    currentScenario = null;
                    updateActiveButton();
                })
                .catch((error) => {
                    console.error('Error resetting monitor with noise via Firestore:', error);
                    showNotification('ノイズリセット失敗: ' + error.message, 'error');
                });
        } else {
            // Realtime Database使用
            const currentScenarioRef = window.dbRef(window.database, 'currentScenario');
            window.dbSet(currentScenarioRef, resetData)
                .then(() => {
                    console.log('Monitor noise reset signal sent via Database');
                    showNotification('モニターをノイズ画像付きでリセットしました', 'success');
                    
                    // 現在選択されているシナリオの表示を更新
                    currentScenario = null;
                    updateActiveButton();
                })
                .catch((error) => {
                    console.error('Error resetting monitor with noise via Database:', error);
                    showNotification('ノイズリセット失敗: ' + error.message, 'error');
                });
        }
    } catch (error) {
        console.error('Error in resetMonitorWithNoise:', error);
        showNotification('ノイズリセット処理でエラーが発生しました', 'error');
    }
}

// 接続状況監視システム
function setupConnectionMonitoring() {
    console.log('Setting up connection monitoring...');
    
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized for connection monitoring');
        return;
    }

    // 自分の接続状況を報告
    reportPresence();
    // RTDB接続状態の監視（切断/再接続を即時UI反映 & 再接続時にpresenceを再登録）
    setupRealtimeConnectionListener();
    
    // 他の端末の接続状況を監視
    monitorOtherConnections();
    
    // 博士映像の状態監視を開始
    setupDoctorVideoMonitoring();
}

function reportPresence() {
    if (!window.database) { return; }
    const presenceData = { screen: 'kobeya', timestamp: Date.now(), status: 'online' };
    try {
        const presenceRef = window.dbRef(window.database, 'presence/kobeya');
        window.dbSet(presenceRef, presenceData)
            .then(() => {
                if (window.dbOnDisconnect) {
                    window.dbOnDisconnect(presenceRef).set({ screen: 'kobeya', timestamp: Date.now(), status: 'offline' });
                }
            })
            .catch(error => console.error('Error reporting presence to Database:', error));
    } catch (error) { console.error('Error in reportPresence:', error); }
}

// RTDB接続状態の監視とUI反映、再接続時のpresence再登録
function setupRealtimeConnectionListener() {
    if (!window.database || !window.dbRef || !window.dbOnValue) return;
    try {
        const connectedRef = window.dbRef(window.database, '.info/connected');
        window.dbOnValue(connectedRef, (snapshot) => {
            const connected = !!snapshot.val();
            updateSelfConnectionUI(connected);
            updateTopConnectionText(connected);
            if (connected) {
                // 再接続時にpresenceを再登録
                reportPresence();
            }
        }, (error) => {
            console.error('Error monitoring RTDB .info/connected:', error);
        });
    } catch (e) {
        console.error('setupRealtimeConnectionListener failed:', e);
    }
}

function updateSelfConnectionUI(connected) {
    try {
        const selfItem = document.querySelector('.connection-item.self-status .connection-status');
        if (selfItem) {
            if (connected) {
                selfItem.textContent = 'ONLINE';
                selfItem.className = 'connection-status status-online';
            } else {
                selfItem.textContent = 'OFFLINE';
                selfItem.className = 'connection-status status-offline';
            }
        }
        // 最終更新時刻の更新
        updateLastSeen();
    } catch (e) { console.error('updateSelfConnectionUI error:', e); }
}

function updateTopConnectionText(connected) {
    const el = document.getElementById('connectionStatus');
    if (!el) return;
    if (connected) {
        el.textContent = 'Firebase接続状態: Realtime Database接続済み ✓';
        el.style.color = '#00ff00';
    } else {
        el.textContent = 'Firebase接続状態: 切断 ✗';
        el.style.color = '#ff0000';
    }
}

function monitorOtherConnections() {
    const terminals = ['window', 'monitor', 'doctor'];
    if (!window.database) return;

    terminals.forEach(terminal => {
        try {
            const presenceRef = window.dbRef(window.database, `presence/${terminal}`);
            window.dbOnValue(presenceRef, (snapshot) => {
                updateConnectionStatus(terminal, snapshot.val());
            }, (error) => {
                console.error(`Error monitoring ${terminal} presence:`, error);
                updateConnectionStatus(terminal, null);
            });
        } catch (error) {
            console.error(`Error setting up monitoring for ${terminal}:`, error);
        }
    });
}

function updateConnectionStatus(terminal, data) {
    const connectionElement = document.getElementById(`${terminal}Connection`);
    if (!connectionElement) return;
    
    const statusElement = connectionElement.querySelector('.connection-status');
    const nameMap = {
        'window': '窓',
        'monitor': 'モニター', 
        'doctor': '博士映像'
    };
    
    // onDisconnect で明示される status を優先
    if (data && typeof data.status === 'string' && data.status.toLowerCase() === 'offline') {
        statusElement.textContent = 'OFFLINE';
        statusElement.className = 'connection-status status-offline';
    } else if (data && data.timestamp) {
        // タイムスタンプ鮮度で推定（閾値短縮）
        const timeDiff = Date.now() - data.timestamp;
        const ONLINE_THRESHOLD_MS = 10000;   // 10秒以内 → ONLINE
        const AWAY_THRESHOLD_MS = 60000;     // 60秒以内 → AWAY
        if (timeDiff <= ONLINE_THRESHOLD_MS) {
            statusElement.textContent = 'ONLINE';
            statusElement.className = 'connection-status status-online';
        } else if (timeDiff <= AWAY_THRESHOLD_MS) {
            statusElement.textContent = 'AWAY';
            statusElement.className = 'connection-status status-unknown';
        } else {
            statusElement.textContent = 'OFFLINE';
            statusElement.className = 'connection-status status-offline';
        }
    } else {
        statusElement.textContent = '---';
        statusElement.className = 'connection-status status-unknown';
    }
    
    // 最終更新時刻を更新
    updateLastSeen();
}

function updateLastSeen() {
    const lastUpdateElement = document.getElementById('lastUpdate');
    if (lastUpdateElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ja-JP', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        lastUpdateElement.textContent = `最終更新: ${timeString}`;
    }
}

// 博士映像の状態を監視し、動画終了時に自動でOFFにする
function setupDoctorVideoMonitoring() {
    console.log('Setting up doctor video monitoring...');
    
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized for doctor video monitoring');
        return;
    }

    try {
        // RTDB（接続確認）とは別に、動画終了検知は Firestore の状態で監視
        const doctorStatusRef = window.firestoreDoc(window.firestore, 'gameData', 'doctorVideoStatus');
        window.firestoreOnSnapshot(doctorStatusRef, (snapshot) => {
            if (snapshot.exists()) {
                handleDoctorVideoStatusChange(snapshot.data());
            }
        }, (error) => {
            console.error('Error monitoring doctor video status in Firestore:', error);
        });
    } catch (error) {
        console.error('Error setting up doctor video monitoring:', error);
    }
}

// 博士映像の状態変化を処理
function handleDoctorVideoStatusChange(data) {
    console.log('Doctor video status change detected:', data);
    
    if (data.isPlaying === false && data.hasEnded === true) {
        // 映像が終了した場合、ボタンを自動でOFFにする
        console.log('Doctor video has ended, turning off button automatically');
        
        // 現在ONの場合のみOFFにする（無限ループ防止）
        if (isDoctorVideoEnabled) {
            isDoctorVideoEnabled = false;
            updateDoctorToggleButton(isDoctorVideoEnabled);
            updateDoctorVideoInFirebase(isDoctorVideoEnabled);
            showNotification('博士映像が終了しました（自動OFF）', 'info');
        }
    }
}

// アクティブなボタンを更新
function updateActiveButton() {
    const buttons = document.querySelectorAll('.scenario-button');
    buttons.forEach((button, index) => {
        button.classList.remove('active');
        // シナリオIDは1から始まるため、index+1で比較
        if (currentScenario && (index + 1) === currentScenario) {
            button.classList.add('active');
        }
    });
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

// ページロード時に初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting kobeya panel initialization...');
    init();
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