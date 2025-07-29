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
            'KeyA': 'A',          // Aキー自体も追加
            'KeyS': 'S',          // Sキー自体も追加（シナリオ3で必要）
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
            'KeyZ': 'Z',          // Zキー自体も追加（シナリオ4,5で必要）
            'KeyX': 'X',          // Xキー自体も追加
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
        this.fontSizeButton = document.getElementById('monitorFontSizeButton');
        this.imageSizeButton = document.getElementById('monitorImageSizeButton');
        this.homeClickCount = 0;
        this.homeClickTimer = null;
        this.isFullscreen = false;
        
        // エラー画像要素
        this.errorImage = document.getElementById('errorImage');
        this.setupErrorImageHandlers();
        
        // 画像表示制御（シナリオ2用）
        this.imageDisplayEnabled = false;
        
        // フォントサイズ管理
        this.fontSizes = ['smaller', 'small', 'medium', 'large', 'larger'];
        this.currentFontSizeIndex = 2; // デフォルトはmedium
        this.loadFontSizeSettings();
        
        // 画像サイズ管理
        this.imageSizes = ['tiny', 'small', 'medium', 'large', 'huge'];
        this.currentImageSizeIndex = 3; // デフォルトはlarge (100vh)
        this.loadImageSizeSettings();
        
        this.init();
    }

    init() {
        console.log('Monitor initialized - Key mapping mode:', this.externalKeyboardMode ? 'ON' : 'OFF');
        this.setupKeyboardListeners();
        this.setupFirebaseListener();
        this.setupKeyboardStatusListener();
        this.setupWindowControlListener();
        this.setupImageDisplayListener();
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
            
            // Pキーの処理（常に動作）
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                this.handlePPress();
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
            
            // Pキーの処理（常に動作）
            if (e.key === 'p' || e.key === 'P') {
                e.preventDefault();
                this.handlePRelease();
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

    setupImageDisplayListener() {
        console.log('Setting up image display listener...');
        
        if (!window.firestore && !window.database) {
            console.error('Firebase not initialized for image display monitoring');
            return;
        }

        try {
            if (window.useFirestore) {
                // Firestore使用
                console.log('Using Firestore for image display monitoring');
                const imageDisplayRef = window.firestoreDoc(window.firestore, 'gameData', 'imageDisplay');
                window.firestoreOnSnapshot(imageDisplayRef, (doc) => {
                    if (doc.exists()) {
                        const data = doc.data();
                        this.imageDisplayEnabled = data.enabled || false;
                        console.log('Image display status updated via Firestore:', this.imageDisplayEnabled);
                        this.updateImageDisplayForCurrentScenario();
                    } else {
                        console.log('No image display document found in Firestore');
                        this.imageDisplayEnabled = false;
                        this.updateImageDisplayForCurrentScenario();
                    }
                });
            } else {
                // Realtime Database使用
                console.log('Using Realtime Database for image display monitoring');
                const imageDisplayRef = window.dbRef(window.database, 'imageDisplay');
                window.dbOnValue(imageDisplayRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        this.imageDisplayEnabled = data.enabled || false;
                        console.log('Image display status updated via Database:', this.imageDisplayEnabled);
                        this.updateImageDisplayForCurrentScenario();
                    } else {
                        console.log('No image display data found in Database');
                        this.imageDisplayEnabled = false;
                        this.updateImageDisplayForCurrentScenario();
                    }
                });
            }
        } catch (error) {
            console.error('Error setting up image display listener:', error);
            this.imageDisplayEnabled = false;
        }
    }

    updateImageDisplayForCurrentScenario() {
        if (!this.currentScenario) {
            return;
        }
        
        const scenarioId = parseInt(this.currentScenario.id);
        console.log('Updating image display for current scenario:', scenarioId, 'Display enabled:', this.imageDisplayEnabled);
        
        if (scenarioId === 2) {
            // シナリオ2の場合、スタッフ画面の設定に従って画像を表示/非表示
            if (this.imageDisplayEnabled) {
                console.log('Scenario 2: Showing image due to staff setting');
                this.showErrorImage();
            } else {
                console.log('Scenario 2: Hiding image due to staff setting');
                this.hideErrorImage();
            }
        }
        // シナリオ3、4、5は既存の動作（常に表示）を維持
        // シナリオ1は既存の動作（表示しない）を維持
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
        
        // 右上のフォントサイズボタン
        this.fontSizeButton.addEventListener('click', () => {
            this.cycleFontSize();
        });
        
        // 左下の画像サイズボタン
        this.imageSizeButton.addEventListener('click', () => {
            this.cycleImageSize();
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
        
        // エラー画像を非表示
        this.hideErrorImage();
        
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
            this.updateWindowStateInFirebase(true, false);
        } else {
            console.log('Window control disabled - ignoring Enter press');
        }
    }

    handleEnterRelease() {
        console.log('Enter released - window control enabled:', this.windowControlEnabled);
        if (this.windowControlEnabled) {
            this.updateWindowStateInFirebase(false, false);
        } else {
            console.log('Window control disabled - ignoring Enter release');
        }
    }

    handlePPress() {
        console.log('P pressed - window control enabled:', this.windowControlEnabled);
        if (this.windowControlEnabled) {
            this.updateWindowStateInFirebase(false, true);
        } else {
            console.log('Window control disabled - ignoring P press');
        }
    }

    handlePRelease() {
        console.log('P released - window control enabled:', this.windowControlEnabled);
        if (this.windowControlEnabled) {
            this.updateWindowStateInFirebase(false, false);
        } else {
            console.log('Window control disabled - ignoring P release');
        }
    }

    updateWindowStateInFirebase(isScrolling, isPPressed) {
        // 상태가 변하지 않은 경우는 통신하지 않음
        const currentState = `${isScrolling}-${isPPressed}`;
        if (this.lastWindowState === currentState) {
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
                isPPressed: isPPressed,
                timestamp: Date.now()
            };

            try {
                if (window.useFirestore) {
                    // Firestore使用
                    const windowControlRef = window.firestoreDoc(window.firestore, 'gameData', 'windowControl');
                    window.firestoreSetDoc(windowControlRef, windowControlData)
                        .then(() => {
                            console.log('Window control updated in Firestore - ENTER:', isScrolling, 'P:', isPPressed);
                            this.lastWindowState = currentState; // 성공 시에만 상태를 업데이트
                        })
                        .catch((error) => {
                            console.error('Error updating window control in Firestore:', error);
                        });
                } else {
                    // Realtime Database使用
                    const windowControlRef = window.dbRef(window.database, 'windowControl');
                    window.dbSet(windowControlRef, windowControlData)
                        .then(() => {
                            console.log('Window control updated in Database - ENTER:', isScrolling, 'P:', isPPressed);
                            this.lastWindowState = currentState; // 성공 시에만 상태를 업데이트
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
        
        // エラー画像を非表示（待機状態時）
        this.hideErrorImage();
        
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
        
        // 画像表示制御
        const scenarioId = parseInt(this.currentScenario.id);
        if (scenarioId === 2) {
            // シナリオ2の場合、スタッフ画面の設定に従って画像を表示/非表示
            if (this.imageDisplayEnabled) {
                console.log(`Scenario ${scenarioId}: Showing error image (staff enabled)`);
                this.showErrorImage();
            } else {
                console.log(`Scenario ${scenarioId}: Hiding error image (staff disabled)`);
                this.hideErrorImage();
            }
        } else if (scenarioId === 3 || scenarioId === 4 || scenarioId === 5) {
            // シナリオ3、4、5の場合は常に画像を表示
            console.log(`Scenario ${scenarioId}: Showing error image (always)`);
            this.showErrorImage();
        } else {
            // シナリオ1の場合は画像を表示しない
            console.log(`Scenario ${scenarioId}: Hiding error image (never)`);
            this.hideErrorImage();
        }
        
        this.gameState = 'waiting_weak';
        this.currentInput = '';
        this.updateInputDisplay();
        
        const displayCommand = this.currentScenario.hideCommand ? "****" : this.currentScenario.command;
        const displayKey = this.currentScenario.hideKey ? "#" : this.currentScenario.key;
        
        const message = `【${this.currentScenario.target}】に向けてドリルを発射するには、<span class="highlight">${displayCommand}</span>を入力してください`;
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
            const errorMessage = 'エラー\nドリルが発射されませんでした\n対応表とマップを利用して、別のコマンドを特定してください';
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
        
        // HTMLタグを考慮してメッセージを分割（highlight と key-highlight の両方に対応）
        const parts = message.split(/(<span class="(?:highlight|key-highlight)">.*?<\/span>)/);
        
        for (let part of parts) {
            if (part.includes('<span class="highlight">') || part.includes('<span class="key-highlight">')) {
                // ハイライト部分（即座に表示）
                messageElement.innerHTML += part;
            } else {
                // 通常のテキスト部分（タイピングアニメーション）
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

    // エラー画像の初期化とイベントハンドラー設定
    setupErrorImageHandlers() {
        if (this.errorImage) {
            console.log('Setting up error image handlers');
            console.log('Initial error image state:', {
                src: this.errorImage.src,
                complete: this.errorImage.complete,
                naturalWidth: this.errorImage.naturalWidth,
                naturalHeight: this.errorImage.naturalHeight
            });

            this.errorImage.addEventListener('load', () => {
                console.log('Error image loaded successfully:', {
                    naturalWidth: this.errorImage.naturalWidth,
                    naturalHeight: this.errorImage.naturalHeight,
                    src: this.errorImage.src
                });
            });

            this.errorImage.addEventListener('error', (e) => {
                console.error('Error image failed to load:', e);
                console.error('Error image src:', this.errorImage.src);
                console.error('Full error event:', e);
            });

            // 既に読み込み済みの場合
            if (this.errorImage.complete) {
                if (this.errorImage.naturalWidth > 0) {
                    console.log('Error image already loaded');
                } else {
                    console.error('Error image loaded but with error (naturalWidth is 0)');
                }
            }
        } else {
            console.error('Error image element not found during setup!');
        }
    }

    // フォントサイズ関連のメソッド
    loadFontSizeSettings() {
        try {
            const savedIndex = localStorage.getItem('monitor-font-size-index');
            if (savedIndex !== null) {
                this.currentFontSizeIndex = parseInt(savedIndex);
                if (this.currentFontSizeIndex < 0 || this.currentFontSizeIndex >= this.fontSizes.length) {
                    this.currentFontSizeIndex = 2; // デフォルトに戻す
                }
            }
            this.applyFontSize();
            console.log('Font size loaded:', this.fontSizes[this.currentFontSizeIndex]);
        } catch (error) {
            console.error('Failed to load font size settings:', error);
            this.currentFontSizeIndex = 2; // デフォルトに戻す
            this.applyFontSize();
        }
    }

    saveFontSizeSettings() {
        try {
            localStorage.setItem('monitor-font-size-index', this.currentFontSizeIndex.toString());
            console.log('Font size saved:', this.fontSizes[this.currentFontSizeIndex]);
        } catch (error) {
            console.error('Failed to save font size settings:', error);
        }
    }

    cycleFontSize() {
        this.currentFontSizeIndex = (this.currentFontSizeIndex + 1) % this.fontSizes.length;
        this.applyFontSize();
        this.saveFontSizeSettings();
        
        // フィードバックメッセージを短時間表示
        this.showFontSizeFeedback();
        
        console.log('Font size changed to:', this.fontSizes[this.currentFontSizeIndex]);
    }

    applyFontSize() {
        // 既存のフォントサイズクラスを削除
        document.body.classList.remove('font-size-smaller', 'font-size-small', 'font-size-medium', 'font-size-large', 'font-size-larger');
        
        // 新しいフォントサイズクラスを追加（mediumは何も追加しない）
        const currentSize = this.fontSizes[this.currentFontSizeIndex];
        if (currentSize !== 'medium') {
            document.body.classList.add(`font-size-${currentSize}`);
        }
    }

    showFontSizeFeedback() {
        // フィードバック表示用の一時的な要素を作成
        let feedbackDiv = document.getElementById('fontSizeFeedback');
        if (!feedbackDiv) {
            feedbackDiv = document.createElement('div');
            feedbackDiv.id = 'fontSizeFeedback';
            feedbackDiv.style.cssText = `
                position: fixed;
                top: 70px;
                right: 10px;
                background: rgba(255, 255, 0, 0.9);
                color: #000;
                padding: 8px 12px;
                border: 1px solid #ffff00;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
                font-weight: bold;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(feedbackDiv);
        }
        
        const sizeNames = {
            'smaller': '極小',
            'small': '小',
            'medium': '標準',
            'large': '大',
            'larger': '極大'
        };
        
        feedbackDiv.textContent = `フォント: ${sizeNames[this.fontSizes[this.currentFontSizeIndex]]}`;
        feedbackDiv.style.opacity = '1';
        
        // 2秒後に非表示
        setTimeout(() => {
            feedbackDiv.style.opacity = '0';
            setTimeout(() => {
                if (feedbackDiv && feedbackDiv.parentNode) {
                    feedbackDiv.parentNode.removeChild(feedbackDiv);
                }
            }, 300);
                 }, 2000);
    }

    // 画像サイズ関連のメソッド
    loadImageSizeSettings() {
        try {
            const savedIndex = localStorage.getItem('monitor-image-size-index');
            if (savedIndex !== null) {
                this.currentImageSizeIndex = parseInt(savedIndex);
                if (this.currentImageSizeIndex < 0 || this.currentImageSizeIndex >= this.imageSizes.length) {
                    this.currentImageSizeIndex = 3; // デフォルトに戻す (large)
                }
            }
            this.applyImageSize();
            console.log('Image size loaded:', this.imageSizes[this.currentImageSizeIndex]);
        } catch (error) {
            console.error('Failed to load image size settings:', error);
            this.currentImageSizeIndex = 3; // デフォルトに戻す
            this.applyImageSize();
        }
    }

    saveImageSizeSettings() {
        try {
            localStorage.setItem('monitor-image-size-index', this.currentImageSizeIndex.toString());
            console.log('Image size saved:', this.imageSizes[this.currentImageSizeIndex]);
        } catch (error) {
            console.error('Failed to save image size settings:', error);
        }
    }

    cycleImageSize() {
        this.currentImageSizeIndex = (this.currentImageSizeIndex + 1) % this.imageSizes.length;
        this.applyImageSize();
        this.saveImageSizeSettings();
        
        // フィードバックメッセージを短時間表示
        this.showImageSizeFeedback();
        
        console.log('Image size changed to:', this.imageSizes[this.currentImageSizeIndex]);
    }

    applyImageSize() {
        // 既存の画像サイズクラスを削除
        document.body.classList.remove('image-size-tiny', 'image-size-small', 'image-size-medium', 'image-size-large', 'image-size-huge');
        
        // 新しい画像サイズクラスを追加（largeは何も追加しない）
        const currentSize = this.imageSizes[this.currentImageSizeIndex];
        if (currentSize !== 'large') {
            document.body.classList.add(`image-size-${currentSize}`);
        }
    }

    showImageSizeFeedback() {
        // フィードバック表示用の一時的な要素を作成
        let feedbackDiv = document.getElementById('imageSizeFeedback');
        if (!feedbackDiv) {
            feedbackDiv = document.createElement('div');
            feedbackDiv.id = 'imageSizeFeedback';
            feedbackDiv.style.cssText = `
                position: fixed;
                bottom: 70px;
                left: 10px;
                background: rgba(0, 255, 255, 0.9);
                color: #000;
                padding: 8px 12px;
                border: 1px solid #00ffff;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
                font-weight: bold;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;
            document.body.appendChild(feedbackDiv);
        }
        
        const sizeNames = {
            'tiny': '極小',
            'small': '小',
            'medium': '中',
            'large': '大',
            'huge': '極大'
        };
        
        feedbackDiv.textContent = `画像: ${sizeNames[this.imageSizes[this.currentImageSizeIndex]]}`;
        feedbackDiv.style.opacity = '1';
        
        // 2秒後に非表示
        setTimeout(() => {
            feedbackDiv.style.opacity = '0';
            setTimeout(() => {
                if (feedbackDiv && feedbackDiv.parentNode) {
                    feedbackDiv.parentNode.removeChild(feedbackDiv);
                }
            }, 300);
        }, 2000);
    }

    // エラー画像表示制御メソッド
    showErrorImage() {
        if (this.errorImage) {
            console.log('=== ERROR IMAGE DISPLAY ATTEMPT ===');
            console.log('Error image element:', this.errorImage);
            console.log('Error image src:', this.errorImage.src);
            console.log('Error image complete:', this.errorImage.complete);
            console.log('Error image naturalWidth:', this.errorImage.naturalWidth);
            console.log('Error image naturalHeight:', this.errorImage.naturalHeight);
            
            // 強制的に表示設定
            this.errorImage.style.display = 'block';
            this.errorImage.style.visibility = 'visible';
            this.errorImage.style.position = 'fixed';
            this.errorImage.style.top = '0';
            this.errorImage.style.right = '0';
            this.errorImage.style.zIndex = '99999';
            
            // デバッグ: 一時的に不透明にして確認
            this.errorImage.style.opacity = '1';
            console.log('Error image forced to opacity 1 for debugging');
            
            // 少し遅延させてからフェードイン効果を適用
            setTimeout(() => {
                this.errorImage.classList.add('show');
                console.log('Error image fade-in applied, classList:', this.errorImage.classList.toString());
                console.log('Error image computed style:', {
                    display: window.getComputedStyle(this.errorImage).display,
                    visibility: window.getComputedStyle(this.errorImage).visibility,
                    opacity: window.getComputedStyle(this.errorImage).opacity,
                    zIndex: window.getComputedStyle(this.errorImage).zIndex,
                    position: window.getComputedStyle(this.errorImage).position,
                    top: window.getComputedStyle(this.errorImage).top,
                    right: window.getComputedStyle(this.errorImage).right
                });
            }, 100);
            
            console.log('Error image display command executed');
            console.log('=== END ERROR IMAGE DISPLAY ===');
        } else {
            console.error('Error image element not found!');
        }
    }

    hideErrorImage() {
        if (this.errorImage) {
            this.errorImage.classList.remove('show');
            // フェードアウト完了後に非表示
            setTimeout(() => {
                this.errorImage.style.display = 'none';
            }, 500);
            console.log('Error image hidden');
        }
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