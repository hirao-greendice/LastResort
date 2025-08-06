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
let pendingDoctorVideoAction = false;

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
        secondMessage: "<span class=\"facility-name\">【ストリートライブハウス】</span>に向けてドリルを発射します。<span class=\"key-highlight\">S #</span>の長押しで防衛してください",
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
        secondMessage: "<span class=\"facility-name\">【ストリートライブハウス】</span>から南にドリルを発射します。<span class=\"key-highlight\">Z #</span>の長押しで防衛してください",
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
    updateDoctorVideoInFirebase(isDoctorVideoEnabled);
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

// 確認ダイアログを表示してシナリオ選択
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
    
    // 博士映像実行の場合
    if (pendingDoctorVideoAction) {
        toggleDoctorVideo();
        pendingDoctorVideoAction = false;
    }
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
    pendingDoctorVideoAction = false;
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

// 窓変化確認ダイアログを表示
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

// 博士映像確認ダイアログを表示
function confirmToggleDoctorVideo() {
    console.log('Confirming doctor video toggle');
    
    // 確認用のフラグを設定
    pendingDoctorVideoAction = true;
    
    // 現在の状態に応じてメッセージを設定
    const currentState = isDoctorVideoEnabled ? 'OFF' : 'ON';
    const actionMessage = isDoctorVideoEnabled ? '停止' : '再生';
    
    // ダイアログメッセージを設定
    const dialogMessage = document.getElementById('dialogMessage');
    dialogMessage.innerHTML = `博士映像を${actionMessage}します。<br/><br/>博士映像を${currentState}にしますか？`;
    
    // ダイアログを表示
    const confirmDialog = document.getElementById('confirmDialog');
    confirmDialog.style.display = 'flex';
}

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

// リセット確認ダイアログを表示
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

// 接続状況監視システム
function setupConnectionMonitoring() {
    console.log('Setting up connection monitoring...');
    
    if (!window.firestore && !window.database) {
        console.error('Firebase not initialized for connection monitoring');
        return;
    }

    // 自分の接続状況を報告
    reportPresence();
    
    // 定期的に接続状況を報告（30秒ごと）
    setInterval(() => {
        reportPresence();
    }, 30000);
    
    // 他の端末の接続状況を監視
    monitorOtherConnections();
}

function reportPresence() {
    if (!window.firestore && !window.database) {
        return;
    }

    const presenceData = {
        screen: 'kobeya',
        timestamp: Date.now(),
        status: 'online'
    };

    try {
        if (window.useFirestore) {
            const presenceRef = window.firestoreDoc(window.firestore, 'presence', 'kobeya');
            window.firestoreSetDoc(presenceRef, presenceData)
                .catch(error => console.error('Error reporting presence to Firestore:', error));
        } else {
            const presenceRef = window.dbRef(window.database, 'presence/kobeya');
            window.dbSet(presenceRef, presenceData)
                .catch(error => console.error('Error reporting presence to Database:', error));
        }
    } catch (error) {
        console.error('Error in reportPresence:', error);
    }
}

function monitorOtherConnections() {
    const terminals = ['window', 'monitor', 'doctor'];
    
    terminals.forEach(terminal => {
        try {
            if (window.useFirestore) {
                const presenceRef = window.firestoreDoc(window.firestore, 'presence', terminal);
                window.firestoreOnSnapshot(presenceRef, (snapshot) => {
                    updateConnectionStatus(terminal, snapshot.exists() ? snapshot.data() : null);
                }, (error) => {
                    console.error(`Error monitoring ${terminal} presence:`, error);
                    updateConnectionStatus(terminal, null);
                });
            } else {
                const presenceRef = window.dbRef(window.database, `presence/${terminal}`);
                window.dbOnValue(presenceRef, (snapshot) => {
                    updateConnectionStatus(terminal, snapshot.val());
                }, (error) => {
                    console.error(`Error monitoring ${terminal} presence:`, error);
                    updateConnectionStatus(terminal, null);
                });
            }
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
    
    if (data && data.timestamp) {
        const timeDiff = Date.now() - data.timestamp;
        
        if (timeDiff < 60000) { // 1分以内
            statusElement.textContent = 'ONLINE';
            statusElement.className = 'connection-status status-online';
        } else if (timeDiff < 300000) { // 5分以内
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