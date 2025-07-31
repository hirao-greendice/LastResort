class ProgressManager {
    constructor() {
        this.progressData = {};
        this.statusElement = document.getElementById('status');
        this.hiddenBackButton = document.getElementById('hiddenBackButton');
        this.clickCount = 0;
        
        this.init();
    }

    init() {
        console.log('Initializing progress manager...');
        this.setupEventListeners();
        this.loadProgressFromFirebase();
    }

    setupEventListeners() {
        // 進捗セルのクリックイベント
        const progressCells = document.querySelectorAll('.progress-cell');
        progressCells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                this.toggleProgress(e.target);
            });
        });

        // 隠しボタンのイベント
        this.hiddenBackButton.addEventListener('click', () => {
            this.clickCount++;
            console.log('Hidden button clicked:', this.clickCount);
            
            if (this.clickCount >= 5) {
                window.location.href = 'index.html';
            }
            
            // 3秒後にカウントをリセット
            setTimeout(() => {
                this.clickCount = 0;
            }, 3000);
        });
    }

    toggleProgress(cell) {
        const team = cell.getAttribute('data-team');
        const task = cell.getAttribute('data-task');
        const key = `${team}-${task}`;
        
        // 無効化されている場合は何もしない
        if (cell.classList.contains('disabled')) {
            return;
        }
        
        // 進捗データを更新
        if (this.progressData[key]) {
            delete this.progressData[key];
            cell.classList.remove('completed');
        } else {
            this.progressData[key] = true;
            cell.classList.add('completed');
        }
        
        // 依存関係を更新
        this.updateDependencies();
        
        // 自動保存
        this.saveProgressToFirebase();
        
        console.log('Progress toggled:', key, this.progressData[key]);
        this.updateStatus(`進捗更新: Team ${team} Task ${task}`);
    }



    saveProgressToFirebase() {
        if (!window.firestore && !window.database) {
            console.error('Firebase not initialized');
            this.updateStatus('Firebase未初期化', 'error');
            return;
        }

        const progressData = {
            data: this.progressData,
            timestamp: Date.now()
        };

        try {
            if (window.useFirestore) {
                // Firestore使用
                const progressRef = window.firestoreDoc(window.firestore, 'gameData', 'progress');
                window.firestoreSetDoc(progressRef, progressData)
                    .then(() => {
                        console.log('Progress saved to Firestore');
                        this.updateStatus('進捗をFirestoreに保存しました');
                    })
                    .catch((error) => {
                        console.error('Error saving progress to Firestore:', error);
                        this.updateStatus('保存失敗: ' + error.message, 'error');
                    });
            } else {
                // Realtime Database使用
                const progressRef = window.dbRef(window.database, 'progress');
                window.dbSet(progressRef, progressData)
                    .then(() => {
                        console.log('Progress saved to Database');
                        this.updateStatus('進捗をDatabaseに保存しました');
                    })
                    .catch((error) => {
                        console.error('Error saving progress to Database:', error);
                        this.updateStatus('保存失敗: ' + error.message, 'error');
                    });
            }
        } catch (error) {
            console.error('Error in saveProgressToFirebase:', error);
            this.updateStatus('保存処理でエラーが発生しました', 'error');
        }
    }

    loadProgressFromFirebase() {
        if (!window.firestore && !window.database) {
            console.error('Firebase not initialized');
            this.updateStatus('Firebase未初期化', 'error');
            return;
        }

        try {
            if (window.useFirestore) {
                // Firestore使用
                const progressRef = window.firestoreDoc(window.firestore, 'gameData', 'progress');
                window.firestoreOnSnapshot(progressRef, (doc) => {
                    if (doc.exists()) {
                        const data = doc.data();
                        this.progressData = data.data || {};
                        this.updateProgressDisplay();
                        console.log('Progress loaded from Firestore:', this.progressData);
                        this.updateStatus('進捗をFirestoreから読み込みました');
                    } else {
                        console.log('No progress data found in Firestore');
                        this.progressData = {};
                        this.updateProgressDisplay();
                        this.updateStatus('進捗データが見つかりません');
                    }
                });
            } else {
                // Realtime Database使用
                const progressRef = window.dbRef(window.database, 'progress');
                window.dbOnValue(progressRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        this.progressData = data.data || {};
                        this.updateProgressDisplay();
                        console.log('Progress loaded from Database:', this.progressData);
                        this.updateStatus('進捗をDatabaseから読み込みました');
                    } else {
                        console.log('No progress data found in Database');
                        this.progressData = {};
                        this.updateProgressDisplay();
                        this.updateStatus('進捗データが見つかりません');
                    }
                });
            }
        } catch (error) {
            console.error('Error in loadProgressFromFirebase:', error);
            this.updateStatus('読み込み処理でエラーが発生しました', 'error');
        }
    }

    updateProgressDisplay() {
        // すべてのセルをリセット
        const progressCells = document.querySelectorAll('.progress-cell');
        progressCells.forEach(cell => {
            cell.classList.remove('completed');
        });

        // 保存されたデータに基づいて表示を更新
        Object.keys(this.progressData).forEach(key => {
            if (this.progressData[key]) {
                const [team, task] = key.split('-');
                const cell = document.querySelector(`[data-team="${team}"][data-task="${task}"]`);
                if (cell) {
                    cell.classList.add('completed');
                }
            }
        });
        
        // 依存関係を更新
        this.updateDependencies();
    }
    
    updateDependencies() {
        const progressCells = document.querySelectorAll('.progress-cell');
        
        progressCells.forEach(cell => {
            const team = cell.getAttribute('data-team');
            const task = parseInt(cell.getAttribute('data-task'));
            
            // 前のタスクが完了しているかチェック
            const previousTaskKey = `${team}-${task - 1}`;
            const isPreviousCompleted = task === 1 || this.progressData[previousTaskKey];
            
            // 現在のタスクが完了しているかチェック
            const currentTaskKey = `${team}-${task}`;
            const isCurrentCompleted = this.progressData[currentTaskKey];
            
            // 次のタスクが完了しているかチェック
            const nextTaskKey = `${team}-${task + 1}`;
            const isNextCompleted = task === 8 || this.progressData[nextTaskKey];
            
            // 依存関係のルール:
            // 1. 前のタスクが完了していない場合は無効化
            // 2. 現在のタスクが完了していて、次のタスクが完了している場合は無効化
            if (!isPreviousCompleted) {
                cell.classList.add('disabled');
            } else if (isCurrentCompleted && isNextCompleted) {
                cell.classList.add('disabled');
            } else {
                cell.classList.remove('disabled');
            }
        });
    }

    updateStatus(message, type = 'info') {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            
            // メッセージタイプに応じて色を変更
            if (type === 'error') {
                this.statusElement.style.color = '#ff0000';
            } else if (type === 'success') {
                this.statusElement.style.color = '#00ff00';
            } else {
                this.statusElement.style.color = '#ffff00';
            }
            
            // 3秒後にメッセージをクリア
            setTimeout(() => {
                if (this.statusElement.textContent === message) {
                    this.statusElement.textContent = '準備完了';
                    this.statusElement.style.color = '#ffff00';
                }
            }, 3000);
        }
    }

    // 統計情報を取得
    getProgressStats() {
        const stats = {
            total: 56, // 7チーム × 8タスク
            completed: Object.keys(this.progressData).filter(key => this.progressData[key]).length,
            teams: {}
        };

        // チーム別の進捗を計算
        for (let team = 1; team <= 7; team++) {
            let teamCompleted = 0;
            for (let task = 1; task <= 8; task++) {
                const key = `${team}-${task}`;
                if (this.progressData[key]) {
                    teamCompleted++;
                }
            }
            stats.teams[team] = {
                completed: teamCompleted,
                total: 8,
                percentage: Math.round((teamCompleted / 8) * 100)
            };
        }

        return stats;
    }
}

// グローバル関数として初期化関数を提供
window.initProgress = function() {
    console.log('Initializing progress system...');
    window.progressManager = new ProgressManager();
};

// DOMContentLoadedイベントで初期化
document.addEventListener('DOMContentLoaded', function() {
    console.log('Progress page loaded');
    // Firebase接続が完了したら自動的に初期化される
}); 