class DoctorControl {
    constructor() {
        this.isDoctorVideoEnabled = false;
        this.isVideoPlaying = false;
        this.doctorContent = document.getElementById('doctorContent');
        this.doctorVideoContainer = document.getElementById('doctorVideoContainer');
        this.doctorMessage = document.getElementById('doctorMessage');
        
        // 隠しボタンの要素
        this.homeButton = document.getElementById('homeButton');
        this.settingsButton = document.getElementById('settingsButton');
        this.fullscreenButton = document.getElementById('doctorFullscreenButton');
        this.controlPanel = document.getElementById('controlPanel');
        
        // クリック回数カウンタ
        this.homeClickCount = 0;
        this.homeClickTimer = null;
        this.isFullscreen = false;
        
        // 設定値のデフォルト
        this.settings = {
            videoOpacity: 100,
            videoScale: 100
        };
        
        // 接続状況管理
        this.connectionStatus = 'connecting';
        this.videoStatus = 'waiting';
        
        this.init();
    }

    init() {
        console.log('Initializing doctor control...');
        
        this.loadSettings();
        this.setupFirebaseListener();
        this.setupHiddenButtons();
        this.setupControlPanel();
        this.setupFullscreenListener();
        this.updateStatus();
        
        // 接続状況を定期更新
        this.reportPresence();
        setInterval(() => {
            this.reportPresence();
        }, 30000); // 30秒ごと
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

    setupFirebaseListener() {
        console.log('Setting up Firebase listener for doctor control...');
        
        if (!window.firestore && !window.database) {
            console.error('Firebase not initialized for doctor control');
            this.connectionStatus = 'error';
            this.updateStatus();
            return;
        }

        try {
            if (window.useFirestore) {
                console.log('Using Firestore for doctor control monitoring');
                this.setupFirestoreListener();
            } else {
                console.log('Using Realtime Database for doctor control monitoring');
                this.setupDatabaseListener();
            }
        } catch (error) {
            console.error('Firebase setup error for doctor control:', error);
            this.connectionStatus = 'error';
            this.updateStatus();
        }
    }

    setupFirestoreListener() {
        const doctorControlRef = window.firestoreDoc(window.firestore, 'gameData', 'doctorControl');
        window.firestoreOnSnapshot(doctorControlRef, (snapshot) => {
            console.log('Firestore doctor control data received:', snapshot.exists());
            
            if (snapshot.exists()) {
                const data = snapshot.data();
                this.isDoctorVideoEnabled = data.enabled || false;
                console.log('Doctor video enabled:', this.isDoctorVideoEnabled);
                this.updateDoctorVideoState();
                this.connectionStatus = 'connected';
            } else {
                console.log('No doctor control data in Firestore');
                this.isDoctorVideoEnabled = false;
                this.updateDoctorVideoState();
                this.connectionStatus = 'connected';
            }
            this.updateStatus();
        }, (error) => {
            console.error('Error monitoring doctor control in Firestore:', error);
            this.connectionStatus = 'error';
            this.updateStatus();
        });
    }

    setupDatabaseListener() {
        const doctorControlRef = window.dbRef(window.database, 'doctorControl');
        window.dbOnValue(doctorControlRef, (snapshot) => {
            console.log('Database doctor control data received:', snapshot.val());
            const data = snapshot.val();
            
            if (data) {
                this.isDoctorVideoEnabled = data.enabled || false;
                console.log('Doctor video enabled:', this.isDoctorVideoEnabled);
                this.updateDoctorVideoState();
                this.connectionStatus = 'connected';
            } else {
                console.log('No doctor control data in Database');
                this.isDoctorVideoEnabled = false;
                this.updateDoctorVideoState();
                this.connectionStatus = 'connected';
            }
            this.updateStatus();
        }, (error) => {
            console.error('Error monitoring doctor control in Database:', error);
            this.connectionStatus = 'error';
            this.updateStatus();
        });
    }

    updateDoctorVideoState() {
        if (this.isDoctorVideoEnabled) {
            console.log('Doctor video enabled - showing video');
            this.showDoctorVideo();
        } else {
            console.log('Doctor video disabled - hiding video');
            this.hideDoctorVideo();
        }
    }

    showDoctorVideo() {
        // 既存の動画要素があれば削除
        const existingVideo = this.doctorVideoContainer.querySelector('.doctor-video');
        if (existingVideo) {
            existingVideo.remove();
        }

        // メッセージを隠す
        this.doctorMessage.style.display = 'none';

        // 動画要素を作成
        const video = document.createElement('video');
        video.className = 'doctor-video';
        video.src = 'doctor.mp4';
        video.autoplay = true;
        video.loop = true;
        video.muted = false; // 音楽を再生
        video.controls = false;
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.objectFit = 'cover';
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';

        // 動画を最初から再生
        video.currentTime = 0;

        // 動画をコンテナに追加
        this.doctorVideoContainer.appendChild(video);

        // 動画の再生を開始
        video.play().then(() => {
            console.log('Doctor video started playing');
            this.isVideoPlaying = true;
            this.videoStatus = 'playing';
            this.updateStatus();
        }).catch(error => {
            console.error('Error playing doctor video:', error);
            // エラー時はメッセージを表示
            this.doctorMessage.style.display = 'block';
            this.doctorMessage.innerHTML = '映像ファイルの再生に失敗しました<br>ファイルを確認してください';
            this.doctorMessage.style.color = '#ff0000';
        });
    }

    hideDoctorVideo() {
        // 動画要素があれば停止して削除
        const video = this.doctorVideoContainer.querySelector('.doctor-video');
        if (video) {
            video.pause();
            video.remove();
        }

        // 画面を完全に暗くする（メッセージを隠す）
        this.doctorMessage.style.display = 'none';
        this.doctorMessage.innerHTML = '';

        this.isVideoPlaying = false;
        this.videoStatus = 'waiting';
        this.updateStatus();
    }

    setupHiddenButtons() {
        // 左上の隠しボタン（5回クリックでメイン画面に戻る）
        this.homeButton.addEventListener('click', () => {
            this.homeClickCount++;
            console.log('Home button clicked:', this.homeClickCount);
            
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
        
        // 右上の隠しボタン（設定画面を開く）
        this.settingsButton.addEventListener('click', () => {
            this.controlPanel.classList.add('open');
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
                    console.log('Doctor entered fullscreen');
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
                    console.log('Doctor exited fullscreen');
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

    setupControlPanel() {
        const controls = {
            videoOpacity: document.getElementById('videoOpacity'),
            videoScale: document.getElementById('videoScale')
        };
        
        const numberInputs = {
            videoOpacity: document.getElementById('videoOpacityInput'),
            videoScale: document.getElementById('videoScaleInput')
        };
        
        // 各コントロールのイベントリスナー（スライダー）
        Object.keys(controls).forEach(key => {
            controls[key].addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.updateSetting(key, value);
                
                // 対応する数値入力フィールドも更新
                if (numberInputs[key]) {
                    numberInputs[key].value = value;
                }
            });
        });
        
        // 各コントロールのイベントリスナー（数値入力）
        Object.keys(numberInputs).forEach(key => {
            numberInputs[key].addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                    this.updateSetting(key, value);
                    
                    // 対応するスライダーも更新
                    if (controls[key]) {
                        controls[key].value = value;
                    }
                }
            });
        });
        
        // リセットボタン
        document.getElementById('resetButton').addEventListener('click', () => {
            this.resetSettings();
        });
        
        // 閉じるボタン
        document.getElementById('closeButton').addEventListener('click', () => {
            this.controlPanel.classList.remove('open');
        });
    }

    loadSettings() {
        const savedSettings = localStorage.getItem('doctorSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        this.updateControlValues();
    }

    saveSettings() {
        localStorage.setItem('doctorSettings', JSON.stringify(this.settings));
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        
        // 値の表示を更新
        const valueElement = document.getElementById(key + 'Value');
        if (valueElement) {
            if (key === 'videoOpacity' || key === 'videoScale') {
                valueElement.textContent = value + '%';
            }
        }
        
        this.applySettings();
        this.saveSettings();
    }

    applySettings() {
        // 映像コンテナに設定を適用
        if (this.doctorVideoContainer) {
            this.doctorVideoContainer.style.opacity = this.settings.videoOpacity / 100;
            this.doctorVideoContainer.style.transform = `scale(${this.settings.videoScale / 100})`;
        }
    }

    updateControlValues() {
        // スライダー値を更新
        document.getElementById('videoOpacity').value = this.settings.videoOpacity;
        document.getElementById('videoScale').value = this.settings.videoScale;
        
        // 数値入力フィールドを更新
        document.getElementById('videoOpacityInput').value = this.settings.videoOpacity;
        document.getElementById('videoScaleInput').value = this.settings.videoScale;
        
        // 表示値を更新
        document.getElementById('videoOpacityValue').textContent = this.settings.videoOpacity + '%';
        document.getElementById('videoScaleValue').textContent = this.settings.videoScale + '%';
    }

    resetSettings() {
        this.settings = {
            videoOpacity: 100,
            videoScale: 100
        };
        
        this.updateControlValues();
        this.applySettings();
        this.saveSettings();
    }

    updateStatus() {
        // 接続状態の更新
        const connectionDisplay = document.getElementById('connectionStatusDisplay');
        if (connectionDisplay) {
            switch (this.connectionStatus) {
                case 'connected':
                    connectionDisplay.textContent = '接続済み';
                    connectionDisplay.style.color = '#00ff00';
                    break;
                case 'connecting':
                    connectionDisplay.textContent = '接続中...';
                    connectionDisplay.style.color = '#ffff00';
                    break;
                case 'error':
                    connectionDisplay.textContent = 'エラー';
                    connectionDisplay.style.color = '#ff0000';
                    break;
            }
        }
        
        // 映像状態の更新
        const videoDisplay = document.getElementById('videoStatusDisplay');
        if (videoDisplay) {
            switch (this.videoStatus) {
                case 'playing':
                    videoDisplay.textContent = '再生中';
                    videoDisplay.style.color = '#00ff00';
                    break;
                case 'waiting':
                    videoDisplay.textContent = '待機中';
                    videoDisplay.style.color = '#888888';
                    break;
            }
        }
    }

    reportPresence() {
        // 接続状況をFirebaseに報告
        if (!window.firestore && !window.database) {
            return;
        }

        const presenceData = {
            screen: 'doctor',
            timestamp: Date.now(),
            status: 'online'
        };

        try {
            if (window.useFirestore) {
                const presenceRef = window.firestoreDoc(window.firestore, 'presence', 'doctor');
                window.firestoreSetDoc(presenceRef, presenceData)
                    .catch(error => console.error('Error reporting presence to Firestore:', error));
            } else {
                const presenceRef = window.dbRef(window.database, 'presence/doctor');
                window.dbSet(presenceRef, presenceData)
                    .catch(error => console.error('Error reporting presence to Database:', error));
            }
        } catch (error) {
            console.error('Error in reportPresence:', error);
        }
    }
}

// 博士映像制御初期化
window.addEventListener('DOMContentLoaded', () => {
    new DoctorControl();
});

// エラーハンドリング
window.addEventListener('error', (e) => {
    console.error('Doctor JavaScript Error:', e);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Doctor Promise rejection:', e);
});