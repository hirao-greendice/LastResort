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
        this.longPressDelay = 400; // 0.4秒で長押し判定
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
            'IntlRo': 'M',         // ろキーがM
            // 数字キー（上段）
            'Digit0': '0',
            'Digit1': '1',
            'Digit2': '2',
            'Digit3': '3',
            'Digit4': '4',
            'Digit5': '5',
            'Digit6': '6',
            'Digit7': '7',
            'Digit8': '8',
            'Digit9': '9',
            // テンキー
            'Numpad0': '0',
            'Numpad1': '1',
            'Numpad2': '2',
            'Numpad3': '3',
            'Numpad4': '4',
            'Numpad5': '5',
            'Numpad6': '6',
            'Numpad7': '7',
            'Numpad8': '8',
            'Numpad9': '9'
        };
        
        // 通信最適化用
        this.lastWindowState = null; // 前回の窓制御状態
        this.windowUpdateTimer = null; // 書き込み制限タイマー
        
        // 隠しボタンの要素
        this.homeButton = document.getElementById('monitorHomeButton');
        this.fullscreenButton = document.getElementById('monitorFullscreenButton');
        this.fontSizeButton = document.getElementById('monitorFontSizeButton');
        this.imageSizeButton = document.getElementById('monitorImageSizeButton');
        
        // 位置調整ボタン
        this.imageUpButton = document.getElementById('monitorImageUpButton');
        this.imageDownButton = document.getElementById('monitorImageDownButton');
        this.imageLeftButton = document.getElementById('monitorImageLeftButton');
        this.imageRightButton = document.getElementById('monitorImageRightButton');
        this.homeClickCount = 0;
        this.homeClickTimer = null;
        this.isFullscreen = false;
        
        // エラー画像要素
        this.errorImage = document.getElementById('errorImage');
        this.setupErrorImageHandlers();
        
        // 音声要素
        this.doriruAudio = document.getElementById('doriruAudio');
        this.doriruLoopAudio = document.getElementById('doriruLoopAudio');
        this.noppoAudio = document.getElementById('noppoAudio');
        this.noppoToieAudio = document.getElementById('noppoToieAudio');
        this.defenseSoundPlayed = false; // 防衛音声再生済みフラグ
        this.setupAudioHandlers();
        
        // 画像表示制御（シナリオ2用）
        this.imageDisplayEnabled = false;
        
        // フォントサイズ管理
        this.fontSizes = ['smaller', 'small', 'medium', 'large', 'larger'];
        this.currentFontSizeIndex = 2; // デフォルトはmedium
        this.loadFontSizeSettings();
        
        // 画像サイズ管理（％ベース、30%〜200%を10%刻み）
        this.imageScale = 100; // デフォルトは100%
        this.minScale = 30;
        this.maxScale = 200;
        this.scaleStep = 10;
        
        // 画像位置管理（ピクセル単位）
        this.imagePosition = { x: 0, y: 0 }; // 右上からの相対位置
        this.positionStep = 20; // 移動ステップ（ピクセル）
        
        // フィードバック表示用タイマー
        this.feedbackTimer = null;
        
        this.loadImageSettings();
        
        // オフライン操作用のローカルシナリオ定義
        this.localScenarios = {
            1: { id: 1, target: 'アロハみやげ館', command: 'LAND', key: 'A', secondMessage: '<span class="facility-name">【アロハみやげ館】</span>に向けてドリルを発射します。<span class="key-highlight">A</span>の長押しで防衛してください', hideCommand: false, hideKey: false },
            2: { id: 2, target: 'クイーンズピザ', command: 'FLAG', key: 'Q', secondMessage: '<span class="facility-name">【クイーンズピザ】</span>に向けてドリルを発射します。<span class="key-highlight">Q</span>の長押しで防衛してください', hideCommand: false, hideKey: false },
            3: { id: 3, target: 'ストリートライブハウス', command: 'EDIT', key: 'S', secondMessage: '<span class="facility-name">【ストリートライブハウス】</span>に向けてドリルを発射します。<span class="key-highlight">A S</span>の長押しで防衛してください', hideCommand: false, hideKey: true },
            4: { id: 4, target: 'ゾンビアトラクション', command: 'UNIT', key: 'Z', secondMessage: '<span class="facility-name">【ゾンビアトラクション】</span>に向けてドリルを発射します。<span class="key-highlight">Z</span>の長押しで防衛してください', hideCommand: false, hideKey: true },
            5: { id: 5, target: 'ゾンビアトラクション', command: 'VIEW', key: 'Z', secondMessage: '<span class="facility-name">【ゾンビアトラクション】</span>に向けてドリルを発射します。<span class="key-highlight">Z X</span>の長押しで防衛してください', hideCommand: false, hideKey: true }
        };
        
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
        // オフラインショートカットを最優先で登録
        this.setupOfflineShortcuts();
        this.setupKeyMappingListener();
        this.showWaitingMessage();
    }













    setupFullscreenListener() {
        // 全画面状態の変更を監視
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            if (this.isFullscreen) {
                document.body.classList.add('fullscreen');
                this.fullscreenButton.style.display = 'none'; // 全画面時にボタンを隠す
            } else {
                document.body.classList.remove('fullscreen');
                this.fullscreenButton.style.display = 'block'; // 通常時にボタンを表示
            }
        });
        
        // ベンダープレフィックス対応
        document.addEventListener('webkitfullscreenchange', () => {
            this.isFullscreen = !!document.webkitFullscreenElement;
            if (this.isFullscreen) {
                document.body.classList.add('fullscreen');
                this.fullscreenButton.style.display = 'none'; // 全画面時にボタンを隠す
            } else {
                document.body.classList.remove('fullscreen');
                this.fullscreenButton.style.display = 'block'; // 通常時にボタンを表示
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
            
            // Pキーの処理（コマンド入力中は通常のキー入力として処理）
            if (e.key === 'p' || e.key === 'P') {
                // コマンド入力中は通常のキー入力として処理
                if (this.gameState === 'waiting_weak') {
                    // 通常のキー入力処理に進む（returnしない）
                } else {
                    // 窓制御として処理
                    e.preventDefault();
                    this.handlePPress();
                    return;
                }
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
                // External keyboard mode
                
                // デバッグ: キー情報を画面に一時表示
                // this.showKeyDebugInfo(e.code, e.key, e.location);
                
                const mappedKey = this.keyMapping[e.code];
                if (mappedKey) {
                    e.preventDefault(); // ブラウザのデフォルト動作を防止
                    inputKey = mappedKey;
                    // Key mapped successfully
                } else {
                    // Key not in mapping
                    // マッピングされていないキーは無視
                    return;
                }
            } else {
                // 通常モード（見たまま入力）
                // Normal keyboard mode
                const key = e.key.toUpperCase();
                // アルファベットのみ処理
                if (key.length === 1 && key.match(/[A-Z]/)) {
                    inputKey = key;
                    // Character input processed
                } else {
                    // Non-alphabetic key ignored
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
            
            // Pキーの処理（コマンド入力中は通常のキー入力として処理）
            if (e.key === 'p' || e.key === 'P') {
                // コマンド入力中は通常のキー入力として処理
                if (this.gameState === 'waiting_weak') {
                    // 通常のキー入力処理に進む（returnしない）
                } else {
                    // 窓制御として処理
                    e.preventDefault();
                    this.handlePRelease();
                    return;
                }
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
                this.showErrorImageWithGlitch();
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
        
        // 位置調整ボタンのイベントリスナー
        this.imageUpButton.addEventListener('click', () => {
            this.moveImage('up');
        });
        
        this.imageDownButton.addEventListener('click', () => {
            this.moveImage('down');
        });
        
        this.imageLeftButton.addEventListener('click', () => {
            this.moveImage('left');
        });
        
        this.imageRightButton.addEventListener('click', () => {
            this.moveImage('right');
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
        this.defenseSoundPlayed = false; // 防衛音声フラグをリセット
        
        // タイマーをクリア
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        // 全ての音声を停止
        this.stopAllAudio();
        
        // エラー画像を非表示
        this.hideErrorImage();
        
        this.showWaitingMessage();
    }

    startLongPress() {
        // 既に実行中のタイマーがあればクリア
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        this.isLongPressing = true;
        this.updateInputDisplay(this.currentScenario.key, true); // 長押し中のキーを表示
        
        this.longPressTimer = setTimeout(() => {
            this.handleLongPress();
        }, this.longPressDelay);
    }

    handleLongPress() {
        if (this.gameState === 'waiting_defense' && !this.defenseSoundPlayed) {
            // 長押し完了時にのみログを表示
            this.addMessage(`<span class="prompt-text">></span> <span class="key-text">${this.currentScenario.key}</span>`, true, true);
            
            const scenarioId = parseInt(this.currentScenario.id);
            
            if ([1, 2, 3, 5].includes(scenarioId)) {
                // 長押し完了時に音声を再生
                this.defenseSoundPlayed = true; // 一回だけ再生のためのフラグ
                this.playLongPressSound();
                console.log('Long press completed, playing defense sound and waiting for it to end');
            } else {
                // シナリオ4: 防衛音声がないため、従来通りcompleteGame()を呼び出し
                console.log('Long press completed for scenario 4, calling completeGame');
                setTimeout(() => {
                    this.completeGame();
                }, 1000);
            }
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
            this.addMessage(`<span class="prompt-text">></span> <span class="command-text">${this.currentInput}</span>`, true, true);
            
            // シナリオ1,2,3,5でDORIRU.mp3を再生
            const scenarioId = parseInt(this.currentScenario.id);
            if ([1, 2, 3, 5].includes(scenarioId)) {
                this.playDoriruSound();
            }
            
            // 1秒待ってから次のステップへ
            this.gameState = 'processing'; // 処理中状態にして追加入力を防ぐ
            setTimeout(() => {
                this.showDefenseMessage();
            }, 1000);
        }
    }

    updateInputDisplay(text = this.currentInput, isLongPress = false) {
        // 入力表示の色分け
        let displayColor = '#00ff00'; // デフォルトは緑
        if (isLongPress) {
            // 1文字キー長押し表示中 → ピンク
            displayColor = '#ff2db1';
        } else if (this.gameState === 'waiting_weak' && text && text.length > 0) {
            // コマンド入力フェーズ（waiting_weak）中の入力文字 → 青
            displayColor = '#00ceff';
        }

        this.inputElement.textContent = text;
        this.inputElement.style.color = displayColor;
        
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
        
        const message = 'DEFENSE SYSTEM > Ready\n\nアルファベット4文字のコマンドを入力してください\n分からない場合には攻撃先を読み取らせてください';
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
            // シナリオ2は開始時に必ず画像を非表示にする
            this.imageDisplayEnabled = false;
            console.log(`Scenario ${scenarioId}: Force hiding error image at start`);
            this.hideErrorImage();
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
        
        const message = `<span class="facility-name">【${this.currentScenario.target}】</span><span class="action-text">に向けてドリルを発射するには、</span><span class="command-text">${displayCommand}</span><span class="action-text">を入力してください</span>`;
        console.log('Generated message HTML:', message);
        await this.typeMessageWithHTML(message);
    }

    async showDefenseMessage() {
        if (!this.currentScenario) return;
        
        this.gameState = 'waiting_defense';
        this.currentInput = '';
        this.updateInputDisplay();
        this.defenseSoundPlayed = false; // 防衛フェーズ開始時にフラグをリセット
        
        // build defense message and ensure facility-name class applied
        let message = this.currentScenario.secondMessage;
        if (message) {
            const targetText = `【${this.currentScenario.target}】`;
            if (!message.includes('facility-name') && message.includes(targetText)) {
                message = message.replace(targetText, `<span class="facility-name">${targetText}</span>`);
            }
        }
        console.log('showDefenseMessage - currentScenario:', this.currentScenario);
        console.log('showDefenseMessage - secondMessage:', this.currentScenario.secondMessage);
        console.log('showDefenseMessage - message to display:', message);
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
        const defaultMessage = '>>> システム: ドリルが発射されました';
        
        const scenarioId = parseInt(this.currentScenario.id);
        console.log('Parsed scenario ID:', scenarioId);
        
        if (scenarioId === 3) {
            // シナリオ3: まずデフォルトメッセージを表示
            console.log('Scenario 3: Showing default message first');
            await this.typeMessageUnified(defaultMessage, false);
            
            // 追加メッセージを即座に表示（タイプアニメーションなし）
            const additionalMessage = '<img src="danger.png" class="danger-icon" alt="Warning">ドリルにより、アロハみやげ館が破壊されました';
            console.log('Scenario 3: Showing additional message instantly');
            const errorElement = this.addMessage(additionalMessage, true);
            errorElement.className = 'message-line danger-message';
            
        } else if (scenarioId === 4) {
            // シナリオ4: ドリル発射失敗（エラーメッセージのみ、即座に表示）
            const errorMessage = '<img src="danger.png" class="danger-icon" alt="Warning">エラー\nドリルが発射されませんでした。\n対応表とマップを利用して、別のコマンドを特定してください';
            console.log('Scenario 4: Showing error message instantly');
            const errorElement = this.addMessage(errorMessage, true);
            errorElement.className = 'message-line danger-message';
            
        } else if (scenarioId === 5) {
            // シナリオ5: まずデフォルトメッセージを表示
            console.log('Scenario 5: Showing default message first');
            await this.typeMessageUnified(defaultMessage, false);
            
            // 追加メッセージを即座に表示（タイプアニメーションなし）
            const additionalMessage = '<img src="danger.png" class="danger-icon" alt="Warning">ドリルによってエックス研究所が破壊されました';
            console.log('Scenario 5: Showing additional message instantly');
            const errorElement = this.addMessage(additionalMessage, true);
            errorElement.className = 'message-line danger-message';
            
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
        console.log('typeMessageWithHTML input:', message);
        
        // HTMLタグを保持しながら一文字ずつ表示する改良版
        let currentHTML = '';
        let inTag = false;
        let tagBuffer = '';
        let textBuffer = '';
        
        for (let i = 0; i < message.length; i++) {
            const char = message[i];
            
            if (char === '<') {
                // タグ開始
                if (textBuffer.length > 0) {
                    // 蓄積されたテキストを一文字ずつ表示
                    for (let j = 0; j < textBuffer.length; j++) {
                        currentHTML += textBuffer[j];
                        messageElement.innerHTML = currentHTML;
                        await this.delay(50);
                    }
                    textBuffer = '';
                }
                inTag = true;
                tagBuffer = char;
            } else if (char === '>') {
                // タグ終了
                tagBuffer += char;
                currentHTML += tagBuffer;
                messageElement.innerHTML = currentHTML;
                inTag = false;
                tagBuffer = '';
            } else if (inTag) {
                // タグ内の文字
                tagBuffer += char;
            } else {
                // テキスト部分
                textBuffer += char;
            }
        }
        
        // 最後のテキストバッファを処理
        if (textBuffer.length > 0) {
            for (let j = 0; j < textBuffer.length; j++) {
                currentHTML += textBuffer[j];
                messageElement.innerHTML = currentHTML;
                await this.delay(50);
            }
        }
        
        console.log('Final messageElement innerHTML:', messageElement.innerHTML);
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
        
        // HTMLタグが含まれているかチェック
        if (message.includes('<img') || message.includes('<span')) {
            // HTMLメッセージの場合はtypeMessageWithHTMLを使用
            await this.typeMessageWithHTML(message);
        } else {
            // 通常のテキストメッセージ
            for (let i = 0; i < message.length; i++) {
                messageElement.textContent += message[i];
                await this.delay(50);
            }
        }
        
        console.log('Unified typing animation completed');
        
        return messageElement;
    }

    // エラー画像の初期化とイベントハンドラー設定
    setupErrorImageHandlers() {
        if (this.errorImage) {
            this.errorImage.addEventListener('load', () => {
                // Image loaded successfully
            });

            this.errorImage.addEventListener('error', (e) => {
                console.error('Error image failed to load:', this.errorImage.src);
            });
        }
    }
    
    // 音声の初期化とイベントハンドラー設定
    setupAudioHandlers() {
        
        if (this.doriruAudio) {
            // DORIRU.mp3が終了したらDORIRULOOP.mp3を開始
            this.doriruAudio.addEventListener('ended', () => {
                console.log('DORIRU ended, starting DORIRULOOP');
                if (this.doriruLoopAudio) {
                    this.doriruLoopAudio.currentTime = 0;
                    this.doriruLoopAudio.play().catch(e => console.error('DORIRU LOOP playback error:', e));
                }
            });
            
            this.doriruAudio.addEventListener('error', (e) => {
                console.error('DORIRU audio failed to load:', e);
            });
        }
        
        if (this.doriruLoopAudio) {
            // DORIRULOOP.mp3のシームレスループ制御
            this.doriruLoopAudio.addEventListener('timeupdate', () => {
                // 音声の終わり0.1秒前で先頭に戻る（シームレスループ）
                if (this.doriruLoopAudio.duration - this.doriruLoopAudio.currentTime <= 0.1 && 
                    this.doriruLoopAudio.currentTime > 0 &&
                    !this.doriruLoopAudio.paused) {
                    this.doriruLoopAudio.currentTime = 0;
                }
            });
            
            // バックアップとしてendedイベントでも即座に再開
            this.doriruLoopAudio.addEventListener('ended', () => {
                if (!this.doriruLoopAudio.paused) {
                    this.doriruLoopAudio.currentTime = 0;
                    this.doriruLoopAudio.play().catch(e => console.error('DORIRU LOOP restart error:', e));
                }
            });
            
            this.doriruLoopAudio.addEventListener('error', (e) => {
                console.error('DORIRU LOOP audio failed to load:', e);
            });
        }
        
        if (this.noppoAudio) {
            this.noppoAudio.addEventListener('error', (e) => {
                console.error('NOPPO audio failed to load:', e);
            });
            
            // NOPPO音声終了時の処理
            this.noppoAudio.addEventListener('ended', () => {
                this.handleDefenseSoundEnded();
            });
        }
        
        if (this.noppoToieAudio) {
            this.noppoToieAudio.addEventListener('error', (e) => {
                console.error('NOPPO TOIE audio failed to load:', e);
            });
            
            // NOPPOTOIE音声終了時の処理
            this.noppoToieAudio.addEventListener('ended', () => {
                this.handleDefenseSoundEnded();
            });
        }
    }
    
    // DORIRU音声を再生するメソッド
    playDoriruSound() {
        console.log('Playing DORIRU sound (once only)');
        // まず全ての音声を停止
        this.stopAllAudio();
        
        if (this.doriruAudio) {
            this.doriruAudio.currentTime = 0;
            this.doriruAudio.play().catch(e => console.error('DORIRU playback error:', e));
            // DORIRU終了後、自動でDORIRULOOPが開始される（endedイベントで処理）
        }
    }
    
    // 長押し時の音声を再生するメソッド
    playLongPressSound() {
        if (!this.currentScenario) return;
        
        const scenarioId = parseInt(this.currentScenario.id);
        console.log('Long press completed for scenario:', scenarioId);
        
        // 長押し完了から2秒後に防衛音声を再生
        setTimeout(() => {
            console.log('Playing defense sound after 2 seconds for scenario:', scenarioId);
            if ([1, 2].includes(scenarioId)) {
                // シナリオ1,2: NOPPO.mp3を再生
                if (this.noppoAudio) {
                    this.noppoAudio.currentTime = 0;
                    this.noppoAudio.play().catch(e => console.error('NOPPO playback error:', e));
                }
            } else if ([3, 5].includes(scenarioId)) {
                // シナリオ3,5: NOPPOTOIE.mp3を再生
                if (this.noppoToieAudio) {
                    this.noppoToieAudio.currentTime = 0;
                    this.noppoToieAudio.play().catch(e => console.error('NOPPO TOIE playback error:', e));
                }
            }
        }, 2000);
        
        // 長押し完了から3秒後にDORIRULOOPを停止
        setTimeout(() => {
            if (this.doriruLoopAudio) {
                this.doriruLoopAudio.pause();
                this.doriruLoopAudio.currentTime = 0;
                console.log('DORIRU LOOP stopped after 3 seconds delay');
            }
        }, 3000);
    }
    
    // 防衛音声終了時の処理
    handleDefenseSoundEnded() {
        if (!this.currentScenario || this.gameState !== 'waiting_defense') return;
        
        const scenarioId = parseInt(this.currentScenario.id);
        console.log('Defense sound ended for scenario:', scenarioId);
        
        // シナリオ1,2,3,5の場合のみシステムメッセージを表示
        if ([1, 2, 3, 5].includes(scenarioId)) {
            this.showSystemCompleteMessage();
        }
    }
    
    // システム完了メッセージを表示するメソッド
    async showSystemCompleteMessage() {
        if (!this.currentScenario) return;
        
        console.log('Showing system complete message');
        this.gameState = 'complete';
        this.isLongPressing = false;
        this.updateInputDisplay('');
        
        const systemMessage = '>>> システム: ドリルが発射されました';
        await this.typeMessageUnified(systemMessage, false);
        
        // 追加のシナリオ固有メッセージがある場合は表示
        const scenarioId = parseInt(this.currentScenario.id);
        if (scenarioId === 3) {
            // シナリオ3: 追加メッセージを即座に表示
            const additionalMessage = '<img src="danger.png" class="danger-icon" alt="Warning">ドリルにより、アロハみやげ館が破壊されました';
            const errorElement = this.addMessage(additionalMessage, true);
            errorElement.className = 'message-line danger-message';
        } else if (scenarioId === 5) {
            // シナリオ5: 追加メッセージを即座に表示
            const additionalMessage = '<img src="danger.png" class="danger-icon" alt="Warning">ドリルによってエックス研究所が破壊されました';
            const errorElement = this.addMessage(additionalMessage, true);
            errorElement.className = 'message-line danger-message';
        }
    }
    
    // 全ての音声を停止するメソッド
    stopAllAudio() {
        [this.doriruAudio, this.doriruLoopAudio, this.noppoAudio, this.noppoToieAudio].forEach(audio => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
        // フラグもリセット
        this.defenseSoundPlayed = false;
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
            // Font size loaded
        } catch (error) {
            console.error('Failed to load font size settings:', error);
            this.currentFontSizeIndex = 2; // デフォルトに戻す
            this.applyFontSize();
        }
    }

    saveFontSizeSettings() {
        try {
            localStorage.setItem('monitor-font-size-index', this.currentFontSizeIndex.toString());
            // Font size saved
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
        
        // Font size updated
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
    loadImageSettings() {
        try {
            // 画像サイズの読み込み
            const savedScale = localStorage.getItem('monitor-image-scale');
            if (savedScale !== null) {
                this.imageScale = parseInt(savedScale);
                if (this.imageScale < this.minScale || this.imageScale > this.maxScale) {
                    this.imageScale = 100; // デフォルトに戻す
                }
            }
            
            // 画像位置の読み込み
            const savedPosition = localStorage.getItem('monitor-image-position');
            if (savedPosition !== null) {
                this.imagePosition = JSON.parse(savedPosition);
            }
            
            this.applyImageSettings();
            // Image settings loaded successfully
        } catch (error) {
            console.error('Error loading image settings:', error);
            this.imageScale = 100;
            this.imagePosition = { x: 0, y: 0 };
            this.applyImageSettings();
        }
    }

    saveImageSettings() {
        try {
            localStorage.setItem('monitor-image-scale', this.imageScale.toString());
            localStorage.setItem('monitor-image-position', JSON.stringify(this.imagePosition));
            // Image settings saved successfully
        } catch (error) {
            console.error('Error saving image settings:', error);
        }
    }

    cycleImageSize() {
        // 10%刻みで30%から200%まで循環
        this.imageScale += this.scaleStep;
        if (this.imageScale > this.maxScale) {
            this.imageScale = this.minScale;
        }
        
        this.applyImageSettings();
        this.saveImageSettings();
        
        // フィードバック表示
        this.showImageSizeFeedback();
        
        // Image size updated
    }

    applyImageSettings() {
        if (!this.errorImage) return;
        
        // 画像のスケールを適用（100% = 100vh）
        const scaledHeight = this.imageScale + 'vh';
        this.errorImage.style.height = scaledHeight;
        this.errorImage.style.width = 'auto';
        
        // 画像の位置を適用（右上基準）
        this.errorImage.style.top = this.imagePosition.y + 'px';
        this.errorImage.style.right = (-this.imagePosition.x) + 'px'; // 右基準なので符号反転
        
        // object-fit を確実に設定
        this.errorImage.style.objectFit = 'contain';
        
        // 古いCSSクラスを削除
        document.body.classList.remove('image-size-tiny', 'image-size-small', 'image-size-medium', 'image-size-large', 'image-size-huge');
        
        // Image settings applied silently for performance
    }

    showImageSizeFeedback() {
        // フィードバック表示用の要素を取得または作成
        let feedbackDiv = document.getElementById('imageSizeFeedback');
        if (!feedbackDiv) {
            feedbackDiv = document.createElement('div');
            feedbackDiv.id = 'imageSizeFeedback';
            feedbackDiv.className = 'image-feedback';
            document.body.appendChild(feedbackDiv);
        }
        
        feedbackDiv.textContent = `画像: ${this.imageScale}% (${this.imagePosition.x}, ${this.imagePosition.y})`;
        feedbackDiv.style.opacity = '1';
        
        // 1.5秒後に非表示（短縮）
        clearTimeout(this.feedbackTimer);
        this.feedbackTimer = setTimeout(() => {
            feedbackDiv.style.opacity = '0';
        }, 1500);
    }

    // 画像位置移動メソッド
    moveImage(direction) {
        switch (direction) {
            case 'up':
                this.imagePosition.y -= this.positionStep;
                break;
            case 'down':
                this.imagePosition.y += this.positionStep;
                break;
            case 'left':
                this.imagePosition.x -= this.positionStep;
                break;
            case 'right':
                this.imagePosition.x += this.positionStep;
                break;
        }
        
        this.applyImageSettings();
        this.saveImageSettings();
        this.showImageSizeFeedback(); // 位置情報も含めて表示
        
        // Image position updated
    }

    // エラー画像表示制御メソッド
    showErrorImage() {
        if (this.errorImage) {
            // 基本的な表示設定
            this.errorImage.style.display = 'block';
            this.errorImage.style.visibility = 'visible';
            this.errorImage.style.position = 'fixed';
            this.errorImage.style.zIndex = '99999';
            this.errorImage.style.opacity = '1';
            
            // 保存されている画像設定を適用（サイズと位置）
            this.applyImageSettings();
            
            // フェードイン効果を適用
            setTimeout(() => {
                this.errorImage.classList.add('show');
            }, 50);
        }
    }

    // グリッチ効果付きエラー画像表示メソッド
    async showErrorImageWithGlitch() {
        if (this.errorImage) {
            console.log('Starting glitch effect before showing error image');
            
            // 1秒間のグリッチ効果を適用
            document.body.classList.add('glitch-effect');
            
            // 1秒待機
            await this.delay(1000);
            
            // グリッチ効果を削除
            document.body.classList.remove('glitch-effect');
            
            console.log('Glitch effect completed, showing error image');
            
            // 通常のエラー画像表示
            this.showErrorImage();
        }
    }

    hideErrorImage() {
        if (this.errorImage) {
            this.errorImage.classList.remove('show');
            // フェードアウト完了後に非表示
            setTimeout(() => {
                this.errorImage.style.display = 'none';
            }, 500);
            // Image hidden
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

    /* ---------------- オフラインショートカット関連 ---------------- */
    setupOfflineShortcuts() {
        document.addEventListener('keydown', (e) => {
            const keyCode = e.code;
            let num = null;
            if (/^Digit[0-9]$/.test(keyCode)) {
                num = keyCode.slice(5);
            } else if (/^Numpad[0-9]$/.test(keyCode)) {
                num = keyCode.slice(6);
            }
            if (num !== null) {
                if (num === '0') {
                    this.toggleErrorImage();
                } else if (['1','2','3','4','5'].includes(num)) {
                    this.loadLocalScenario(parseInt(num));
                }
            }
        });
    }

    loadLocalScenario(id) {
        const scenario = this.localScenarios[id];
        if (!scenario) {
            console.warn('Local scenario not found:', id);
            return;
        }
        console.log('Loading local scenario:', id);
        this.currentScenario = { ...scenario }; // clone
        this.startScenario();
    }

    toggleErrorImage() {
        if (!this.currentScenario || parseInt(this.currentScenario.id) !== 2) return;
        const isVisible = this.errorImage && this.errorImage.style.display !== 'none' && this.errorImage.style.opacity !== '0';
        if (isVisible) {
            this.hideErrorImage();
        } else {
            this.showErrorImage();
        }
    }

    setupKeyMappingListener() {
        // Firestore が無い環境ではスキップ
        if (!window.firestore || typeof window.firestore.collection !== 'function') {
            console.warn('Firestore not available → skip keyMapping listener');
            return;
        }
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
    // Presence reporting for monitor screen
    function reportMonitorPresence(){
        if(!window.firestore && !window.database) return;
        const data={screen:'monitor',timestamp:Date.now(),status:'online'};
        try{
            if(window.useFirestore){
                const ref=window.firestoreDoc(window.firestore,'presence','monitor');
                window.firestoreSetDoc(ref,data).catch(e=>console.error('presence firestore',e));
            }else if(window.database){
                const ref=window.dbRef(window.database,'presence/monitor');
                window.dbSet(ref,data).catch(e=>console.error('presence db',e));
            }
        }catch(err){console.error('presence error',err);}
    }
    reportMonitorPresence();
    setInterval(reportMonitorPresence,30000);
    
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
