class MysteryGame {
    constructor() {
        this.currentInput = '';
        this.gameState = 'initial'; // initial, waiting_weak, waiting_defense, complete
        this.messageElement = document.getElementById('messageText');
        this.inputElement = document.getElementById('inputText');
        this.instructionsElement = document.getElementById('instructions');
        this.inputArea = document.getElementById('inputArea');
        this.cursor = document.getElementById('cursor');
        
        this.pressedKeys = new Set();
        this.longPressTimer = null;
        this.longPressDelay = 1000; // 1秒で長押し判定
        
        this.init();
    }

    init() {
        this.setupKeyboardListeners();
        this.startGame();
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.gameState === 'complete') return;
            
            const key = e.key.toUpperCase();
            
            // アルファベットのみ処理
            if (key.length === 1 && key.match(/[A-Z]/)) {
                this.pressedKeys.add(key);
                
                // 長押し検知の開始
                if (this.gameState === 'waiting_defense' && key === 'A') {
                    this.startLongPress();
                } else if (this.gameState === 'waiting_weak') {
                    this.handleTextInput(key);
                }
            }
        });

        document.addEventListener('keyup', (e) => {
            if (this.gameState === 'complete') return;
            
            const key = e.key.toUpperCase();
            this.pressedKeys.delete(key);
            
            // 長押し検知の停止
            if (key === 'A' && this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
        });
    }

    startLongPress() {
        if (this.longPressTimer) return; // 既に開始済み
        
        this.longPressTimer = setTimeout(() => {
            this.handleLongPress();
        }, this.longPressDelay);
    }

    handleLongPress() {
        if (this.gameState === 'waiting_defense') {
            this.completeGame();
        }
    }

    handleTextInput(key) {
        if (this.gameState !== 'waiting_weak') return;
        
        this.currentInput += key;
        this.updateInputDisplay();
        
        // WEAKの入力チェック
        if (this.currentInput === 'WEAK') {
            this.showDefenseMessage();
        } else if (this.currentInput.length > 4 || !('WEAK'.startsWith(this.currentInput))) {
            // 間違った入力の場合、リセット
            this.currentInput = '';
            this.updateInputDisplay();
            this.showError();
        }
    }

    updateInputDisplay() {
        this.inputElement.textContent = this.currentInput;
        this.inputArea.classList.add('input-focus');
        
        setTimeout(() => {
            this.inputArea.classList.remove('input-focus');
        }, 200);
    }

    showError() {
        const originalText = this.messageElement.textContent;
        this.messageElement.textContent = 'エラー: 正しいコマンドを入力してください';
        this.messageElement.style.color = '#ff4444';
        
        setTimeout(() => {
            this.messageElement.textContent = originalText;
            this.messageElement.style.color = '#00ff00';
        }, 2000);
    }

    async startGame() {
        this.gameState = 'initial';
        this.updateInstructions('システム起動中...');
        
        await this.delay(1000);
        
        this.showInitialMessage();
    }

    async showInitialMessage() {
        this.gameState = 'waiting_weak';
        this.updateInstructions('WEAKと入力してください');
        
        const message = '【アンティークショップ（A）】を攻撃するためには、\nWEAKを入力して、Aを長押ししてください';
        await this.typeMessage(message);
    }

    async showDefenseMessage() {
        this.gameState = 'waiting_defense';
        this.currentInput = '';
        this.updateInputDisplay();
        this.updateInstructions('Aを長押しして防御してください');
        
        // 成功エフェクト
        this.messageElement.classList.add('success');
        await this.delay(1000);
        this.messageElement.classList.remove('success');
        
        const message = 'ドリルを発動しますので、長押しで防御してください\n\n>>> A';
        await this.typeMessage(message);
    }

    async completeGame() {
        this.gameState = 'complete';
        this.updateInstructions('任務完了！');
        
        // 完了エフェクト
        this.messageElement.classList.add('complete');
        
        const message = '防御成功！\nドリル攻撃を無効化しました\n\n>>> システム: 任務完了';
        await this.typeMessage(message);
        
        // 自動リセット（10秒後）
        setTimeout(() => {
            this.resetGame();
        }, 10000);
    }

    async typeMessage(message) {
        this.messageElement.textContent = '';
        this.messageElement.style.animation = 'none';
        
        for (let i = 0; i < message.length; i++) {
            this.messageElement.textContent += message[i];
            await this.delay(50);
        }
    }

    updateInstructions(text) {
        this.instructionsElement.innerHTML = `<span>${text}</span>`;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    resetGame() {
        this.currentInput = '';
        this.gameState = 'initial';
        this.messageElement.classList.remove('success', 'complete');
        this.inputElement.textContent = '';
        this.startGame();
    }
}

// ゲーム開始
document.addEventListener('DOMContentLoaded', () => {
    const game = new MysteryGame();
    
    // デバッグ用のリセット機能（Escキーでリセット）
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            game.resetGame();
        }
    });
});

// ページが閉じられる前の処理
window.addEventListener('beforeunload', () => {
    // クリーンアップ処理
    document.removeEventListener('keydown', () => {});
    document.removeEventListener('keyup', () => {});
}); 