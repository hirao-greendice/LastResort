// メインページのJavaScript

let connectionStatus = false;

// ページ遷移機能
function goToStaff() {
    window.location.href = 'staff.html';
}

function goToMonitor() {
    window.location.href = 'monitor.html';
}

// 接続状態の更新
function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    connectionStatus = connected;
    
    if (connected) {
        statusElement.textContent = 'Firebase接続: 正常';
        statusElement.className = 'connected';
    } else {
        statusElement.textContent = 'Firebase接続: 切断';
        statusElement.className = 'disconnected';
    }
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Firebase接続監視
        if (window.firebaseUtils) {
            window.firebaseUtils.monitorConnection(updateConnectionStatus);
        }
        
        // 初期化完了後の処理
        setTimeout(() => {
            if (!connectionStatus) {
                updateConnectionStatus(false);
            }
        }, 3000);
        
    } catch (error) {
        console.error('初期化エラー:', error);
        updateConnectionStatus(false);
    }
});

// キーボードショートカット
document.addEventListener('keydown', (e) => {
    if (e.key === '1') {
        goToStaff();
    } else if (e.key === '2') {
        goToMonitor();
    }
});

// ウィンドウが閉じられる前の処理
window.addEventListener('beforeunload', () => {
    // Firebase接続のクリーンアップ
    if (window.firebaseDatabase) {
        window.firebaseDatabase.goOffline();
    }
}); 