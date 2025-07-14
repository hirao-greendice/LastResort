// モニター画面のJavaScript - Firebase連携版

class MysteryMonitor {
    constructor() {
        this.currentInput = '';
        this.gameState = 'waiting'; // waiting, playing, completed
        this.currentGameConfig = null;
        this.currentGameId = null;
        this.connectionStatus = false;
        
        this.messageElement = document.getElementById('messageText');
        this.inputElement = document.getElementById('inputText');
        this.instructionsElement = document.getElementById('instructions');
        this.inputArea = document.getElementById('inputArea');
        this.cursor = document.getElementById('cursor');
        this.connectionElement = document.getElementById('connectionStatus');
        
        this.pressedKeys = new Set();
        this.longPressTimer = null;
        this.longPressDelay = 1000; // 1秒で長押し判定
        
        this.init();
    }

    init() {
        this.setupKeyboardListeners();
        this.setupFirebaseListeners();
        this.showWaitingMessage();
    }

    // Firebase接続状態の監視
    setupFirebaseListeners() {
        if (window.firebaseUtils) {
            window.firebaseUtils.monitorConnection((connected) => {
                this.updateConnectionStatus(connected);
            });
        }

        // システム状態の監視
        if (window.firebaseDatabase) {
            const systemRef = window.firebaseDatabase.ref('system');
            systemRef.on('value', (snapshot) => {
                const system = snapshot.val();
                if (system) {
                    this.handleSystemUpdate(system);
                }
            });

            // ゲーム設定の監視
            const configRef = window.firebaseDatabase.ref('gameConfigs');
            configRef.on('value', (snapshot) => {
                const configs = snapshot.val();
                if (configs) {
                    this.handleConfigUpdate(configs);
                }
            });
        }
    }

    // 接続状態の更新
    updateConnectionStatus(connected) {
        this.connectionStatus = connected;
        
        if (connected) {
            this.connectionElement.textContent = 'STATUS: ONLINE';
            this.connectionElement.className = 'connected';
        } else {
            this.connectionElement.textContent = 'STATUS: OFFLINE';
            this.connectionElement.className = 'disconnected';
        }
    }

    // システム状態の更新
    handleSystemUpdate(system) {
        if (system.currentGame && system.currentGame !== this.currentGameId) {
            this.currentGameId = system.currentGame;
            this.startGame();
        } else if (!system.currentGame && this.currentGameId) {
            this.currentGameId = null;
            this.currentGameConfig = null;
            this.showWaitingMessage();
        }
    }

    // ゲーム設定の更新
    handleConfigUpdate(configs) {
        if (this.currentGameId && configs[this.currentGameId]) {
            this.currentGameConfig = configs[this.currentGameId];
            
            // ゲーム状態に応じた処理
            if (this.currentGameConfig.completed) {
                this.completeGame();
            } else if (this.currentGameConfig.isActive) {
                this.updateGameDisplay();
            }
        }
    }

    // キーボードイベントの設定
    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'completed' || this.gameState === 'waiting') return;
            
            const key = e.key.toUpperCase();
            
            // アルファベットのみ処理
            if (key.length === 1 && key.match(/[A-Z]/)) {
                this.pressedKeys.add(key);
                
                // 長押し検知の開始
                if (this.gameState === 'waiting_defense' && this.currentGameConfig && key === this.currentGameConfig.actionKey) {
                    this.startLongPress();
                } else if (this.gameState === 'waiting_input') {
                    this.handleTextInput(key);
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (this.gameState === 'completed' || this.gameState === 'waiting') return;
            
            const key = e.key.toUpperCase();
            this.pressedKeys.delete(key);
            
            // 長押し検知の停止
            if (this.currentGameConfig && key === this.currentGameConfig.actionKey && this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        });
    }

    // 長押し検知の開始
    startLongPress() {
        if (this.longPressTimer) return; // 既に開始済み
        
        this.longPressTimer = setTimeout(() => {
            this.handleLongPress();
        }, this.longPressDelay);
    }

    // 長押し処理
    handleLongPress() {
        if (this.gameState === 'waiting_defense' && this.currentGameConfig) {
            this.updateGameProgress('completed');
        }
    }

    // テキスト入力処理
    handleTextInput(key) {
        if (this.gameState !== 'waiting_input' || !this.currentGameConfig) return;
        
        this.currentInput += key;
        this.updateInputDisplay();
        
        // 入力コマンドのチェック
        if (this.currentInput === this.currentGameConfig.inputCommand) {
            this.showSecondMessage();
        } else if (this.currentInput.length > this.currentGameConfig.inputCommand.length || 
                  !this.currentGameConfig.inputCommand.startsWith(this.currentInput)) {
            // 間違った入力の場合、リセット
            this.currentInput = '';
            this.updateInputDisplay();
            this.showError();
        }
    }

    // 入力表示の更新
    updateInputDisplay() {
        this.inputElement.textContent = this.currentInput;
        this.inputArea.classList.add('input-focus');
        
        setTimeout(() => {
            this.inputArea.classList.remove('input-focus');
        }, 200);
    }

    // エラー表示
    showError() {
        const originalText = this.messageElement.textContent;
        const originalClass = this.messageElement.className;
        
        this.messageElement.textContent = 'エラー: 正しいコマンドを入力してください';
        this.messageElement.className = 'error';
        
        setTimeout(() => {
            this.messageElement.textContent = originalText;
            this.messageElement.className = originalClass;
        }, 2000);
    }

    // 待機メッセージの表示
    showWaitingMessage() {
        this.gameState = 'waiting';
        this.currentInput = '';
        this.updateInputDisplay();
        this.updateInstructions('システム待機中...');
        
        this.messageElement.textContent = 'システム待機中...\n\nSTAFF画面からゲームを選択してください';
        this.messageElement.className = 'waiting';
    }

    // ゲーム開始
    async startGame() {
        if (!this.currentGameConfig) {
            // 設定を取得
            try {
                const configRef = window.firebaseDatabase.ref(`gameConfigs/${this.currentGameId}`);
                const snapshot = await configRef.once('value');
                this.currentGameConfig = snapshot.val();
            } catch (error) {
                console.error('ゲーム設定取得エラー:', error);
                return;
            }
        }
        
        this.gameState = 'waiting_input';
        this.currentInput = '';
        this.updateInputDisplay();
        this.updateInstructions(`${this.currentGameConfig.inputCommand}と入力してください`);
        
        await this.typeMessage(this.currentGameConfig.initialMessage);
    }

    // 2番目のメッセージを表示
    async showSecondMessage() {
        this.gameState = 'waiting_defense';
        this.currentInput = '';
        this.updateInputDisplay();
        this.updateInstructions(`${this.currentGameConfig.actionKey}を長押しして実行してください`);
        
        // 成功エフェクト
        this.messageElement.classList.add('success');
        await this.delay(1000);
        this.messageElement.classList.remove('success');
        
        const message = `${this.currentGameConfig.secondMessage}\n\n>>> ${this.currentGameConfig.actionKey}`;
        await this.typeMessage(message);
    }

    // ゲーム完了
    async completeGame() {
        this.gameState = 'completed';
        this.updateInstructions('任務完了！');
        
        // 完了エフェクト
        this.messageElement.classList.add('complete');
        
        const message = `${this.currentGameConfig.completeMessage}\n\n>>> システム: 任務完了`;
        await this.typeMessage(message);
        
        // 5秒後に待機状態に戻る
        setTimeout(() => {
            this.showWaitingMessage();
        }, 5000);
    }

    // ゲーム進捗の更新
    async updateGameProgress(status) {
        if (!this.currentGameId || !this.connectionStatus) return;
        
        try {
            const gameRef = window.firebaseDatabase.ref(`gameConfigs/${this.currentGameId}`);
            const updates = {
                lastUpdated: Date.now()
            };
            
            if (status === 'completed') {
                updates.completed = true;
                updates.isActive = false;
            }
            
            await gameRef.update(updates);
            
        } catch (error) {
            console.error('ゲーム進捗更新エラー:', error);
        }
    }

    // ゲーム表示の更新
    updateGameDisplay() {
        if (!this.currentGameConfig) return;
        
        if (this.currentGameConfig.completed) {
            this.completeGame();
        } else if (this.currentGameConfig.isActive) {
            this.startGame();
        }
    }

    // タイピングアニメーション
    async typeMessage(message) {
        this.messageElement.textContent = '';
        this.messageElement.className = '';
        
        for (let i = 0; i < message.length; i++) {
            this.messageElement.textContent += message[i];
            await this.delay(50);
        }
    }

    // 指示の更新
    updateInstructions(text) {
        this.instructionsElement.innerHTML = `<span>${text}</span>`;
    }

    // 遅延関数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ページ遷移
function goBack() {
    window.location.href = 'index.html';
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Firebase初期化を待つ
        if (window.firebaseUtils) {
            await window.firebaseUtils.initializeDatabase();
        }
        
        // モニター開始
        const monitor = new MysteryMonitor();
        
        // デバッグ用のリセット機能（Escキーでメインへ戻る）
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                goBack();
            }
        });
        
    } catch (error) {
        console.error('モニター初期化エラー:', error);
    }
});

// ページが閉じられる前の処理
window.addEventListener('beforeunload', () => {
    // Firebase接続のクリーンアップ
    if (window.firebaseDatabase) {
        window.firebaseDatabase.goOffline();
    }
}); 