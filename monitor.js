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
        this.windowControlEnabled = false; // 窓制御のON/OFF状態
        
        // キーマッピング機能
        this.externalKeyboardMode = true; // デフォルトは有効
        this.keyMapping = {
            // 上段
            'KeyE': 'Q',
            'KeyR': 'W',
            'KeyT': 'E',
            'KeyY': 'R',
            'KeyU': 'T',
            'KeyI': 'Y',
            'KeyO': 'U',
            'KeyP': 'I',
            'Backquote': 'L',
            'BracketLeft': 'L',

            // 中段
            'KeyD': 'A',
            'KeyF': 'S',
            'KeyG': 'D',
            'KeyH': 'F',
            'KeyJ': 'G',
            'KeyK': 'H',
            'KeyL': 'J',
            'Semicolon': 'K',      // ;キーがK
            'BracketRight': 'P',   // ]キーがL（:の位置）
            'Quote': 'L',          // 'キーが:（実際のコロン位置）
            
            // 下段
            'KeyC': 'Z',
            'KeyV': 'X',
            'KeyB': 'C',
            'KeyN': 'V',
            'KeyM': 'B',
            'Comma': 'N',         // ,キーがN
            'Period': 'M',        // .キーがM
            'Slash': '?',         // /キーが?
            'IntlRo': 'M'         // ろキーがM
        };
        
        // 通信最適化用
        this.lastWindowState = null; // 前回の窓制御状態
        this.windowUpdateTimer = null; // 書き込み制限タイマー
        
        // 隠しボタンの要素
        this.homeButton = document.getElementById('monitorHomeButton');
        this.fullscreenButton = document.getElementById('monitorFullscreenButton');
        this.homeClickCount = 0;
        this.homeClickTimer = null;
        this.isFullscreen = false;
        
        this.init();
    }

    init() {
        console.log('Monitor initialized - Key mapping mode:', this.externalKeyboardMode ? 'ON' : 'OFF');
        this.setupKeyboardListeners();
        this.setupFirebaseListener();
        this.setupKeyboardStatusListener();
        this.setupWindowControlListener();
        this.setupHiddenButton();
        this.setupFullscreenListener();
        this.setupKeyMappingListener();
        this.showWaitingMessage();
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
            
            let inputKey;
            
            // キーマッピングモードの場合
            if (this.externalKeyboardMode) {
                console.log('External keyboard mode - Key pressed:', e.code, 'Key:', e.key, 'Location:', e.location);
                
                // デバッグ: キー情報を画面に一時表示
                this.showKeyDebugInfo(e.code, e.key, e.location);
                
                const mappedKey = this.keyMapping[e.code];
                if (mappedKey) {
                    e.preventDefault(); // ブラウザのデフォルト動作を防止
                    inputKey = mappedKey;
                    console.log('Mapped:', e.code, '→', mappedKey);
                } else {
                    console.log('Key not mapped:', e.code, '- Available mappings:', Object.keys(this.keyMapping));
                    // マッピングされていないキーは無視
                    return;
                }
            } else {
                // 通常モード（見たまま入力）
                console.log('Normal mode - Key pressed:', e.code, 'Key:', e.key);
                const key = e.key.toUpperCase();
                // アルファベットのみ処理
                if (key.length === 1 && key.match(/[A-Z]/)) {
                    inputKey = key;
                    console.log('Normal input:', key);
                } else {
                    console.log('Key not alphabetic:', e.key);
                    return;
                }
            }
            
            this.pressedKeys.add(inputKey);
            
            // 長押し検知の開始
            if (this.gameState === 'waiting_defense' && this.currentScenario && inputKey === this.currentScenario.key) {
                this.startLongPress();
            } else if (this.gameState === 'waiting_weak') {
                this.handleTextInput(inputKey);
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
            
            let inputKey;
            
            // キーマッピングモードの場合
            if (this.externalKeyboardMode) {
                const mappedKey = this.keyMapping[e.code];
                if (mappedKey) {
                    inputKey = mappedKey;
                } else {
                    return;
                }
            } else {
                // 通常モード（見たまま入力）
                const key = e.key.toUpperCase();
                if (key.length === 1 && key.match(/[A-Z]/)) {
                    inputKey = key;
                } else {
                    return;
                }
            }
            
            this.pressedKeys.delete(inputKey);
            
            // 長押し検知の停止
            if (this.currentScenario && inputKey === this.currentScenario.key && this.longPressTimer) {
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

    setupWindowControlListener() {
        console.log('Setting up window control listener...');
        
        if (!window.firestore && !window.database) {
            console.error('Firebase not initialized for window control monitoring');
            return;
        }

        try {
            if (window.useFirestore) {
                // Firestore使用
                console.log('Using Firestore for window control monitoring');
                const windowControlRef = window.firestoreDoc(window.firestore, 'gameData', 'windowControl');
                window.firestoreOnSnapshot(windowControlRef, (doc) => {
                    if (doc.exists()) {
                        const data = doc.data();
                        this.windowControlEnabled = data.enabled || false;
                        console.log('Window control status updated via Firestore:', this.windowControlEnabled);
                    } else {
                        console.log('No window control document found in Firestore');
                        this.windowControlEnabled = false;
                    }
                });
            } else {
                // Realtime Database使用
                console.log('Using Realtime Database for window control monitoring');
                const windowControlRef = window.dbRef(window.database, 'windowControl');
                window.dbOnValue(windowControlRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        this.windowControlEnabled = data.enabled || false;
                        console.log('Window control status updated via Database:', this.windowControlEnabled);
                    } else {
                        console.log('No window control data found in Database');
                        this.windowControlEnabled = false;
                    }
                });
            }
        } catch (error) {
            console.error('Error setting up window control listener:', error);
            this.windowControlEnabled = false;
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
        console.log('Enter pressed - window control enabled:', this.windowControlEnabled);
        if (this.windowControlEnabled) {
            this.updateWindowStateInFirebase(true);
        } else {
            console.log('Window control disabled - ignoring Enter press');
        }
    }

    handleEnterRelease() {
        console.log('Enter released - window control enabled:', this.windowControlEnabled);
        if (this.windowControlEnabled) {
            this.updateWindowStateInFirebase(false);
        } else {
            console.log('Window control disabled - ignoring Enter release');
        }
    }

    updateWindowStateInFirebase(isScrolling) {
        // 状態が変わっていない場合は通信しない
        if (this.lastWindowState === isScrolling) {
            return;
        }
        
        // 頻繁な更新を防ぐ（100ms以内の連続更新は無視）
        if (this.windowUpdateTimer) {
            clearTimeout(this.windowUpdateTimer);
        }
        
        this.windowUpdateTimer = setTimeout(() => {
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
                            this.lastWindowState = isScrolling; // 成功時のみ状態を更新
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
                            this.lastWindowState = isScrolling; // 成功時のみ状態を更新
                        })
                        .catch((error) => {
                            console.error('Error updating window control in Database:', error);
                        });
                }
            } catch (error) {
                console.error('Error in updateWindowStateInFirebase:', error);
            }
            
            this.windowUpdateTimer = null;
        }, 100); // 100ms後に実行
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
            const additionalMessage = 'ドリルにより、アロハみやげ館が破壊されました';
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

    showKeyDebugInfo(code, key, location) {
        // デバッグ情報を画面上に一時表示
        let debugDiv = document.getElementById('keyDebugInfo');
        if (!debugDiv) {
            debugDiv = document.createElement('div');
            debugDiv.id = 'keyDebugInfo';
            debugDiv.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.9);
                color: #00ff00;
                padding: 10px;
                border: 1px solid #00ff00;
                font-family: monospace;
                font-size: 12px;
                z-index: 9999;
                max-width: 300px;
            `;
            document.body.appendChild(debugDiv);
        }
        
        const mappedChar = this.keyMapping[code];
        const kMappings = Object.keys(this.keyMapping).filter(k => this.keyMapping[k] === 'K');
        
        debugDiv.innerHTML = `
            <div><strong>キー押下情報:</strong></div>
            <div>Code: ${code}</div>
            <div>Key: ${key}</div>
            <div>Location: ${location}</div>
            <div>Mapped to: ${mappedChar || '未マップ'}</div>
            <div style="font-size: 10px; margin-top: 5px; color: #888;">
                Kにマップされるキー: ${kMappings.join(', ')}
            </div>
            <div style="font-size: 10px; color: #888;">
                試してみてください: = - + キーなど
            </div>
        `;
        
        // 3秒後に自動で消去
        setTimeout(() => {
            if (debugDiv && debugDiv.parentNode) {
                debugDiv.parentNode.removeChild(debugDiv);
            }
        }, 3000);
    }

    setupKeyMappingListener() {
        // キーマッピング状態をFirebaseで監視
        if (window.useFirestore && window.firestore) {
            // Firestore使用
            window.firestore.collection('gameControl').doc('keyMapping')
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        this.externalKeyboardMode = data.enabled || false;
                        console.log('Key mapping mode updated from Firebase:', this.externalKeyboardMode ? 'ON' : 'OFF');
                    }
                }, (error) => {
                    console.error('Key mapping listener error:', error);
                });
        } else if (window.database) {
            // Realtime Database使用
            window.database.ref('gameControl/keyMapping').on('value', (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    this.externalKeyboardMode = data.enabled || false;
                    console.log('Key mapping mode updated from Firebase:', this.externalKeyboardMode ? 'ON' : 'OFF');
                }
            }, (error) => {
                console.error('Key mapping listener error:', error);
            });
        }
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