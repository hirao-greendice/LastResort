class MysteryMonitor {
    constructor() {
        this.currentInput = '';
        this.gameState = 'waiting'; // waiting, waiting_weak, waiting_defense, processing, complete
        this.messageContainer = document.getElementById('messageContainer');
        this.inputElement = document.getElementById('inputText');
        this.inputArea = document.getElementById('inputArea');
        this.cursor = document.getElementById('cursor');
        
        this.pressedKeys = new Set();
        this.longPressTimer = null;
        this.longPressDelay = 1000; // 1秒で長押し判定
        this.isLongPressing = false; // 長押し中かどうか
        
        this.currentScenario = null;
        this.maxMessages = 8; // 最大メッセージ数を増やす
        this.keyboardConnected = true; // キーボード接続状況
        
        // 外部キーボード設定
        this.externalKeyboardMode = false;
        this.keyMapUpper = {
            // 上段
            'E': 'Q', 'R': 'W', 'T': 'E', 'Y': 'R', 'U': 'T',
            'I': 'Y', 'O': 'U', 'P': 'I', '`': 'O', '[': 'P',
            // 中段
            'D': 'A', 'F': 'S', 'G': 'D', 'H': 'F', 'J': 'G',
            'K': 'H', 'L': 'J', '=': 'K', ';': 'L', ']': ':',
            // 下段
            'C': 'Z', 'V': 'X', 'B': 'C', 'N': 'V', 'M': 'B',
            ',': 'N', '.': 'M', '/': '?'
        };
        
        // 隠しボタンの要素
        this.homeButton = document.getElementById('monitorHomeButton');
        this.fullscreenButton = document.getElementById('monitorFullscreenButton');
        this.homeClickCount = 0;
        this.homeClickTimer = null;
        this.isFullscreen = false;
        
        this.init();
    }

    init() {
        this.setupKeyboardListeners();
        this.setupFirebaseListener();
        this.setupKeyboardStatusListener();
        this.setupHiddenButton();
        this.setupFullscreenListener();
        this.setupExternalKeyboardToggle();
        this.loadExternalKeyboardMode();
        this.showWaitingMessage();
    }

    // 外部キーボードモードの切り替え機能
    setupExternalKeyboardToggle() {
        // Ctrl+Alt+K で外部キーボードモードを切り替え
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.altKey && e.key === 'k') {
                e.preventDefault();
                this.toggleExternalKeyboardMode();
            }
        });
    }

    // 外部キーボードモードの切り替え
    toggleExternalKeyboardMode() {
        this.externalKeyboardMode = !this.externalKeyboardMode;
        console.log('External keyboard mode:', this.externalKeyboardMode ? 'ON' : 'OFF');
        
        // 状態を保存
        localStorage.setItem('externalKeyboardMode', this.externalKeyboardMode);
        
        // 視覚的なフィードバック
        this.showKeyboardModeMessage();
        
        // ヘッダーの表示を更新
        this.updateHeaderDisplay();
    }

    // キーボードモードのメッセージを表示
    showKeyboardModeMessage() {
        const mode = this.externalKeyboardMode ? 'ON' : 'OFF';
        const message = `外部キーボードモード: ${mode}`;
        
        // 一時的にメッセージを表示
        const messageElement = this.addMessage(message);
        messageElement.style.color = this.externalKeyboardMode ? '#ffff00' : '#888888';
        
        // 3秒後にメッセージを削除
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 3000);
    }

    // ヘッダーの表示を更新
    updateHeaderDisplay() {
        const statusElement = document.querySelector('.terminal-status');
        if (statusElement) {
            const baseText = 'STATUS: STANDBY';
            const keyboardStatus = this.externalKeyboardMode ? ' [EXT-KB]' : '';
            statusElement.textContent = baseText + keyboardStatus;
            statusElement.style.color = this.externalKeyboardMode ? '#ffff00' : '#00ff00';
        }
    }

    // キーを変換する関数
    translateKey(key) {
        if (!this.externalKeyboardMode) {
            return key;
        }
        
        const upperKey = key.toUpperCase();
        return this.keyMapUpper[upperKey] || key;
    }

    // 保存された外部キーボードモードを読み込む
    loadExternalKeyboardMode() {
        const saved = localStorage.getItem('externalKeyboardMode');
        if (saved !== null) {
            this.externalKeyboardMode = saved === 'true';
            this.updateHeaderDisplay();
        }
    }

    setupFullscreenListener() {
        // 全画面状態の変更を監視
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            if (this.isFullscreen) {
                document.body.classList.add('fullscreen');
            } else {
                document.body.classList.remove('fullscreen');
            }
        });
        
        // ベンダープレフィックス対応
        document.addEventListener('webkitfullscreenchange', () => {
            this.isFullscreen = !!document.webkitFullscreenElement;
            if (this.isFullscreen) {
                document.body.classList.add('fullscreen');
            } else {
                document.body.classList.remove('fullscreen');
            }
        });
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            // ENTERキーの処理（常に動作）
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleEnterPress();
                return;
            }
            
            // キーボードが切断されている場合は入力を無効化
            if (!this.keyboardConnected) {
                console.log('Keyboard input blocked - disconnected');
                return;
            }
            
            if (this.gameState === 'complete' || this.gameState === 'waiting' || this.gameState === 'processing') return;
            
            const originalKey = e.key.toUpperCase();
            
            // アルファベットのみ処理
            if (originalKey.length === 1 && originalKey.match(/[A-Z]/)) {
                // 外部キーボードマッピングを適用
                const translatedKey = this.translateKey(originalKey);
                this.pressedKeys.add(translatedKey);
                
                // デバッグ用ログ
                if (this.externalKeyboardMode && originalKey !== translatedKey) {
                    console.log(`Key mapping: ${originalKey} -> ${translatedKey}`);
                }
                
                // 長押し検知の開始
                if (this.gameState === 'waiting_defense' && this.currentScenario && translatedKey === this.currentScenario.key) {
                    this.startLongPress();
                } else if (this.gameState === 'waiting_weak') {
                    this.handleTextInput(translatedKey);
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            // ENTERキーの処理（常に動作）
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleEnterRelease();
                return;
            }
            
            // キーボードが切断されている場合は入力を無効化
            if (!this.keyboardConnected) {
                console.log('Keyboard input blocked - disconnected');
                return;
            }
            
            if (this.gameState === 'complete' || this.gameState === 'waiting' || this.gameState === 'processing') return;
            
            const originalKey = e.key.toUpperCase();
            const translatedKey = this.translateKey(originalKey);
            this.pressedKeys.delete(translatedKey);
            
            // 長押し検知の停止
            if (this.currentScenario && translatedKey === this.currentScenario.key && this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
                this.isLongPressing = false;
                // 長押し終了時にINPUTをクリア
                this.updateInputDisplay('', false);
            }
        });
    }

    setupFirebaseListener() {
        console.log('Setting up Firebase listener...');
        
        if (!window.firestore && !window.database) {
            console.error('Firebase not initialized');
            this.showErrorMessage('Firebase未初期化');
            return;
        }

        try {
            if (window.useFirestore) {
                // Firestore使用
                console.log('Using Firestore for monitoring');
                this.setupFirestoreListener();
            } else {
                // Realtime Database使用
                console.log('Using Realtime Database for monitoring');
                this.setupDatabaseListener();
            }
        } catch (error) {
            console.error('Firebase setup error:', error);
            this.showErrorMessage('Firebase設定エラー: ' + error.message);
        }
    }

    setupKeyboardStatusListener() {
        console.log('Setting up keyboard status listener...');
        
        if (!window.firestore && !window.database) {
            console.error('Firebase not initialized for keyboard status');
            return;
        }

        try {
            if (window.useFirestore) {
                // Firestore使用
                console.log('Using Firestore for keyboard status monitoring');
                const keyboardStatusRef = window.firestoreDoc(window.firestore, 'gameData', 'keyboardStatus');
                window.firestoreOnSnapshot(keyboardStatusRef, (doc) => {
                    if (doc.exists()) {
                        const data = doc.data();
                        console.log('Keyboard status updated via Firestore:', data);
                        this.updateKeyboardStatus(data.connected);
                    } else {
                        console.log('No keyboard status document found in Firestore');
                        this.updateKeyboardStatus(true); // デフォルトは接続状態
                    }
                });
            } else {
                // Realtime Database使用
                console.log('Using Realtime Database for keyboard status monitoring');
                const keyboardStatusRef = window.dbRef(window.database, 'keyboardStatus');
                window.dbOnValue(keyboardStatusRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        console.log('Keyboard status updated via Database:', data);
                        this.updateKeyboardStatus(data.connected);
                    } else {
                        console.log('No keyboard status data found in Database');
                        this.updateKeyboardStatus(true); // デフォルトは接続状態
                    }
                });
            }
        } catch (error) {
            console.error('Error setting up keyboard status listener:', error);
            this.updateKeyboardStatus(true); // エラー時はデフォルトで接続状態
        }
    }

    updateKeyboardStatus(connected) {
        this.keyboardConnected = connected;
        console.log('Keyboard connection status updated:', connected);
        
        if (!connected) {
            // キーボードが切断されている場合、入力をクリア
            this.currentInput = '';
            this.updateInputDisplay('');
            this.pressedKeys.clear();
            
            // 長押し処理を停止
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
                this.isLongPressing = false;
            }
        }
    }

    setupHiddenButton() {
        // 左上の隠しボタン（5回クリックでメイン画面に戻る）
        this.homeButton.addEventListener('click', () => {
            this.homeClickCount++;
            console.log('Monitor home button clicked:', this.homeClickCount);
            
            if (this.homeClickTimer) {
                clearTimeout(this.homeClickTimer);
            }
            
            if (this.homeClickCount >= 5) {
                // 5回クリックでメイン画面に戻る
                window.location.href = 'index.html';
            } else {
                // 3秒後にカウントをリセット
                this.homeClickTimer = setTimeout(() => {
                    this.homeClickCount = 0;
                }, 3000);
            }
        });
        
        // 右下の全画面ボタン
        this.fullscreenButton.addEventListener('click', () => {
            this.toggleFullscreen();
        });
    }

    toggleFullscreen() {
        if (!this.isFullscreen) {
            // 全画面にする
            const element = document.documentElement;
            if (element.requestFullscreen) {
                element.requestFullscreen().then(() => {
                    this.isFullscreen = true;
                    document.body.classList.add('fullscreen');
                    console.log('Monitor entered fullscreen');
                }).catch(err => {
                    console.error('Error entering fullscreen:', err);
                });
            } else if (element.webkitRequestFullscreen) {
                element.webkitRequestFullscreen();
                this.isFullscreen = true;
                document.body.classList.add('fullscreen');
            } else if (element.msRequestFullscreen) {
                element.msRequestFullscreen();
                this.isFullscreen = true;
                document.body.classList.add('fullscreen');
            }
        } else {
            // 全画面を解除
            if (document.exitFullscreen) {
                document.exitFullscreen().then(() => {
                    this.isFullscreen = false;
                    document.body.classList.remove('fullscreen');
                    console.log('Monitor exited fullscreen');
                }).catch(err => {
                    console.error('Error exiting fullscreen:', err);
                });
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
                this.isFullscreen = false;
                document.body.classList.remove('fullscreen');
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
                this.isFullscreen = false;
                document.body.classList.remove('fullscreen');
            }
        }
    }

    setupFirestoreListener() {
        // 現在のシナリオを監視
        const currentScenarioRef = window.firestoreDoc(window.firestore, 'gameData', 'currentScenario');
        window.firestoreOnSnapshot(currentScenarioRef, (snapshot) => {
            console.log('Firestore current scenario data received:', snapshot.exists());
            
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (data.action === 'reset') {
                    // リセット処理
                    this.resetMonitor();
                } else {
                    this.currentScenario = data;
                    console.log('Starting scenario:', this.currentScenario);
                    this.startScenario();
                }
            } else {
                console.log('No current scenario data, showing waiting message');
                this.showWaitingMessage();
            }
        }, (error) => {
            console.error('Error monitoring current scenario in Firestore:', error);
            this.showErrorMessage('現在のシナリオ監視エラー: ' + error.message);
        });
    }

    setupDatabaseListener() {
        // 現在のシナリオを監視
        const currentScenarioRef = window.dbRef(window.database, 'currentScenario');
        window.dbOnValue(currentScenarioRef, (snapshot) => {
            console.log('Database current scenario data received:', snapshot.val());
            const data = snapshot.val();
            if (data) {
                if (data.action === 'reset') {
                    // リセット処理
                    this.resetMonitor();
                } else {
                    this.currentScenario = data;
                    console.log('Starting scenario:', this.currentScenario);
                    this.startScenario();
                }
            } else {
                console.log('No current scenario data, showing waiting message');
                this.showWaitingMessage();
            }
        }, (error) => {
            console.error('Error monitoring current scenario in Database:', error);
            this.showErrorMessage('現在のシナリオ監視エラー: ' + error.message);
        });
    }

    resetMonitor() {
        console.log('Resetting monitor...');
        this.clearAllMessages();
        this.gameState = 'waiting';
        this.currentInput = '';
        this.updateInputDisplay('');
        this.isLongPressing = false;
        this.currentScenario = null;
        
        // タイマーをクリア
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        this.showWaitingMessage();
    }

    startLongPress() {
        if (this.longPressTimer || this.isLongPressing) return; // 既に開始済み
        
        this.isLongPressing = true;
        this.updateInputDisplay(this.currentScenario.key, true); // 長押し中のキーを表示
        
        this.longPressTimer = setTimeout(() => {
            this.handleLongPress();
        }, this.longPressDelay);
    }

    handleLongPress() {
        if (this.gameState === 'waiting_defense') {
            // 長押し完了時にのみログを表示
            this.addMessage(`> ${this.currentScenario.key}`, false, true);
            
            // 1秒待ってから次のテキストを表示
            setTimeout(() => {
                this.completeGame();
            }, 1000);
        }
    }

    handleEnterPress() {
        console.log('Enter pressed - updating window state');
        this.updateWindowStateInFirebase(true);
    }

    handleEnterRelease() {
        console.log('Enter released - updating window state');
        this.updateWindowStateInFirebase(false);
    }

    updateWindowStateInFirebase(isScrolling) {
        if (!window.firestore && !window.database) {
            console.error('Firebase not initialized');
            return;
        }

        const windowControlData = {
            enabled: true, // 窓変化は有効として設定
            isScrolling: isScrolling,
            timestamp: Date.now()
        };

        try {
            if (window.useFirestore) {
                // Firestore使用
                const windowControlRef = window.firestoreDoc(window.firestore, 'gameData', 'windowControl');
                window.firestoreSetDoc(windowControlRef, windowControlData)
                    .then(() => {
                        console.log('Window control updated in Firestore:', isScrolling);
                    })
                    .catch((error) => {
                        console.error('Error updating window control in Firestore:', error);
                    });
            } else {
                // Realtime Database使用
                const windowControlRef = window.dbRef(window.database, 'windowControl');
                window.dbSet(windowControlRef, windowControlData)
                    .then(() => {
                        console.log('Window control updated in Database:', isScrolling);
                    })
                    .catch((error) => {
                        console.error('Error updating window control in Database:', error);
                    });
            }
        } catch (error) {
            console.error('Error in updateWindowStateInFirebase:', error);
        }
    }

    handleTextInput(key) {
        if (this.gameState !== 'waiting_weak' || !this.currentScenario) return;
        
        // 正解のコマンドの次の文字かチェック
        const expectedKey = this.currentScenario.command[this.currentInput.length];
        
        // 正解以外のキーは無視
        if (key !== expectedKey) {
            return;
        }
        
        this.currentInput += key;
        this.updateInputDisplay();
        
        // コマンドの入力チェック
        if (this.currentInput === this.currentScenario.command) {
            // 正解の場合、プレイヤーの入力をメッセージエリアに表示
            this.addMessage(`> ${this.currentInput}`, false, true);
            
            // 1秒待ってから次のステップへ
            this.gameState = 'processing'; // 処理中状態にして追加入力を防ぐ
            setTimeout(() => {
                this.showDefenseMessage();
            }, 1000);
        }
    }

    updateInputDisplay(text = this.currentInput, isLongPress = false) {
        if (isLongPress) {
            // 長押し中は特別な表示
            this.inputElement.textContent = text;
            this.inputElement.style.color = '#ffff00'; // 黄色で表示
        } else {
            // 通常の入力表示
            this.inputElement.textContent = text;
            this.inputElement.style.color = '#00ff00'; // 緑色で表示
        }
        
        this.inputArea.classList.add('input-focus');
        
        setTimeout(() => {
            this.inputArea.classList.remove('input-focus');
        }, 200);
    }

    async showWaitingMessage() {
        this.gameState = 'waiting';
        this.currentInput = '';
        this.updateInputDisplay();
        
        const message = 'システム待機中...\n\nスタッフ画面からシナリオを選択してください';
        await this.typeMessage(message);
    }

    async showErrorMessage(errorMsg) {
        this.gameState = 'error';
        
        const message = `システムエラーが発生しました\n\n${errorMsg}`;
        
        // 統一されたタイピングアニメーション関数を使用
        await this.typeMessageUnified(message, true);
    }

    clearAllMessages() {
        this.messageContainer.innerHTML = '';
    }

    async startScenario() {
        if (!this.currentScenario) return;
        
        // 新しいシナリオが開始されたら全メッセージをクリア
        this.clearAllMessages();
        
        this.gameState = 'waiting_weak';
        this.currentInput = '';
        this.updateInputDisplay();
        
        const displayCommand = this.currentScenario.hideCommand ? "****" : this.currentScenario.command;
        const displayKey = this.currentScenario.hideKey ? "#" : this.currentScenario.key;
        
        const message = `【${this.currentScenario.target}】を攻撃するためには、\n<span class="highlight">${displayCommand}</span>を入力して、<span class="highlight">${displayKey}</span>を長押ししてください`;
        await this.typeMessageWithHTML(message);
    }

    async showDefenseMessage() {
        if (!this.currentScenario) return;
        
        this.gameState = 'waiting_defense';
        this.currentInput = '';
        this.updateInputDisplay();
        
        const message = `${this.currentScenario.secondMessage}`;
        await this.typeMessageWithHTML(message);
    }

    async completeGame() {
        if (!this.currentScenario) return;
        
        console.log('Starting completeGame - typing animation');
        console.log('Current scenario:', this.currentScenario);
        console.log('Current scenario ID:', this.currentScenario.id);
        console.log('Current scenario ID type:', typeof this.currentScenario.id);
        
        this.gameState = 'complete';
        this.isLongPressing = false;
        this.updateInputDisplay('');
        
        // デフォルトの完了メッセージ
        const defaultMessage = '実行されました！\n防御に成功しました\n\n>>> システム: 任務完了';
        
        const scenarioId = parseInt(this.currentScenario.id);
        console.log('Parsed scenario ID:', scenarioId);
        
        if (scenarioId === 3) {
            // シナリオ3: まずデフォルトメッセージを表示
            console.log('Scenario 3: Showing default message first');
            await this.typeMessageUnified(defaultMessage, false);
            
            // 追加メッセージを即座に表示（タイプアニメーションなし）
            const additionalMessage = 'ドリルにより、アンティークショップが破壊されました';
            console.log('Scenario 3: Showing additional message instantly');
            const errorElement = this.addMessage(additionalMessage);
            errorElement.className = 'message-line error-message';
            
        } else if (scenarioId === 4) {
            // シナリオ4: ドリル発射失敗（エラーメッセージのみ、即座に表示）
            const errorMessage = 'エラー\nドリルが発射されませんでした\n変換表と地図を利用して、別のコードを特定してください';
            console.log('Scenario 4: Showing error message instantly');
            const errorElement = this.addMessage(errorMessage);
            errorElement.className = 'message-line error-message';
            
        } else if (scenarioId === 5) {
            // シナリオ5: まずデフォルトメッセージを表示
            console.log('Scenario 5: Showing default message first');
            await this.typeMessageUnified(defaultMessage, false);
            
            // 追加メッセージを即座に表示（タイプアニメーションなし）
            const additionalMessage = 'ドリルによりエックス線研究所が破壊されました\n建物倒壊によりゾンビアトラクションが一部破損しました';
            console.log('Scenario 5: Showing additional message instantly');
            const errorElement = this.addMessage(additionalMessage);
            errorElement.className = 'message-line error-message';
            
        } else if (this.currentScenario.completeMessage) {
            // 特別な完了メッセージがある場合
            const message = this.currentScenario.completeMessage;
            const isWarningMessage = message.includes('⚠');
            console.log('Custom complete message:', message);
            await this.typeMessageUnified(message, isWarningMessage);
            
        } else {
            // デフォルトの完了メッセージ
            console.log('Default complete message');
            await this.typeMessageUnified(defaultMessage, false);
        }
    }

    addMessage(message, isHTML = false, isPlayerInput = false) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message-line';
        
        if (isPlayerInput) {
            messageElement.classList.add('player-input');
        }
        
        if (isHTML) {
            messageElement.innerHTML = message;
        } else {
            messageElement.textContent = message;
        }
        
        this.messageContainer.appendChild(messageElement);
        
        // 最大メッセージ数を超えた場合、古いメッセージを削除
        const messages = this.messageContainer.querySelectorAll('.message-line');
        if (messages.length > this.maxMessages) {
            messages[0].remove();
        }
        
        return messageElement;
    }

    async typeMessage(message) {
        const messageElement = this.addMessage('');
        
        for (let i = 0; i < message.length; i++) {
            messageElement.textContent += message[i];
            await this.delay(50);
        }
    }

    async typeMessageWithHTML(message) {
        const messageElement = this.addMessage('');
        
        // HTMLタグを考慮してメッセージを分割
        const parts = message.split(/(<span class="highlight">.*?<\/span>)/);
        
        for (let part of parts) {
            if (part.includes('<span class="highlight">')) {
                // ハイライト部分
                messageElement.innerHTML += part;
            } else {
                // 通常のテキスト部分
                for (let i = 0; i < part.length; i++) {
                    messageElement.innerHTML += part[i];
                    await this.delay(50);
                }
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 統一されたタイピングアニメーション関数
    async typeMessageUnified(message, isError = false) {
        const messageElement = this.addMessage('');
        
        if (isError) {
            messageElement.className = 'message-line error-message';
        }
        
        console.log('Starting unified typing animation for:', message);
        
        // 一文字ずつタイピングアニメーションで表示
        for (let i = 0; i < message.length; i++) {
            messageElement.textContent += message[i];
            await this.delay(50);
        }
        
        console.log('Unified typing animation completed');
        
        return messageElement;
    }
}

// モニター初期化関数
window.initGame = () => {
    const monitor = new MysteryMonitor();
    
    // デバッグ用のリセット機能（Escキーで待機状態に戻る）
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            monitor.showWaitingMessage();
        }
    });
};

// ページが閉じられる前の処理
window.addEventListener('beforeunload', () => {
    // クリーンアップ処理
    document.removeEventListener('keydown', () => {});
    document.removeEventListener('keyup', () => {});
});

// エラーハンドリング
window.addEventListener('error', (e) => {
    console.error('JavaScript Error:', e);
    // エラーメッセージを追加
    const errorMessage = document.createElement('div');
    errorMessage.className = 'message-line system-error';
    errorMessage.textContent = 'システムエラーが発生しました\n詳細: ' + e.message;
    
    const messageContainer = document.getElementById('messageContainer');
    if (messageContainer) {
        messageContainer.appendChild(errorMessage);
    }
});

// Firebase接続エラーハンドリング
window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejection:', e);
    if (e.reason && e.reason.code) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'message-line firebase-error';
        errorMessage.textContent = 'Firebase接続エラーが発生しました\nエラーコード: ' + e.reason.code;
        
        const messageContainer = document.getElementById('messageContainer');
        if (messageContainer) {
            messageContainer.appendChild(errorMessage);
        }
    }
}); 