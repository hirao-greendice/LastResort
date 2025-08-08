class WindowControl {
    constructor() {
        this.isWindowChangeEnabled = false;
        this.isScrolling = false;
        this.isScrolled = false; // スクロール状態を追跡
        this.windowContent = document.getElementById('windowContent');
        this.windowFrame = document.querySelector('.window-frame');
        this.windowVideo = document.getElementById('windowVideo');
        this.windowVideo300 = document.getElementById('windowVideo300');
        this.windowVideo400 = document.getElementById('windowVideo400');
        this.windowVideoP = document.getElementById('windowVideoP');
        
        // 動画制御用プロパティ（ENTERキー用）
        this.isPlayingForward = false;
        this.isPlayingBackward = false;
        this.currentTime = 0;
        this.playbackRate = 1;
        this.animationFrame = null;
        
        // P키용 동画制御プロパティ
        this.isPlayingForwardP = false;
        this.isPlayingBackwardP = false;
        this.currentTimeP = 0;
        this.animationFrameP = null;
        
        // 現在アクティブな動画を追跡
        this.activeVideo = 'enter'; // 'enter' または 'p'
        
        // キー状態の管理
        this.isEnterPressed = false;
        this.isPPressed = false;
        this.lastPressedKey = 'enter'; // 最後に押されたキーを記録
        
        // 隠しボタンの要素
        this.homeButton = document.getElementById('homeButton');
        this.settingsButton = document.getElementById('settingsButton');
        this.fullscreenButton = document.getElementById('windowFullscreenButton');
        this.controlPanel = document.getElementById('controlPanel');
        
        // クリック回数カウンタ
        this.homeClickCount = 0;
        this.homeClickTimer = null;
        this.isFullscreen = false;
        
        // 300.mp4 再生用フラグ/タイマー
        this.is300Playing = false;
        this.enterLongPressTimer = null;
        this.enterLongPressMs = 1000; // 長押し判定 1秒
        
        // 400.mp4 再生用フラグ/タイマー（RightBracket）
        this.is400Playing = false;
        this.rightBracketLongPressTimer = null;
        this.rightBracketLongPressMs = 1000; // 長押し判定 1秒
        
        // 設定値のデフォルト
        this.settings = {
            imageWidth: 100,
            imageHeight: 100,
            imageTop: 0,
            imageLeft: 0,
            imageZoom: 100,
            // 廃止項目の互換フィールド（内部で固定値に）
            imageRotation: 0,
            imageOpacity: 100,
            scrollDistance: -50,
            scrollDuration: 0.3,
            playbackSpeed: 1.0
        };

        // プリセット機能は廃止
        this.presets = null;
        
        this.init();
    }

    init() {
        console.log('Initializing window control...');
        
        // 既存の動的スタイルを削除
        const existingStyle = document.getElementById('dynamicScrollStyle');
        if (existingStyle) {
            existingStyle.remove();
        }
        
        this.loadSettings();
        this.loadWindowVideos();
        this.setupFirebaseListener();
        this.setupVideoControlListener(); // シナリオ6用の動画制御リスナーを追加
        this.setupHiddenButtons();
        this.setupControlPanel();
        this.setupFullscreenListener();
        this.applyInitialFullscreenClass();
        
        // プリセット初期化は廃止
    }

    setupFullscreenListener() {
        // 全画面状態の変更を監視
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            if (this.isFullscreen) {
                document.body.classList.add('fullscreen');
                document.body.classList.remove('not-fullscreen');
            } else {
                document.body.classList.remove('fullscreen');
                document.body.classList.add('not-fullscreen');
            }
        });
        
        // ベンダープレフィックス対応
        document.addEventListener('webkitfullscreenchange', () => {
            this.isFullscreen = !!document.webkitFullscreenElement;
            if (this.isFullscreen) {
                document.body.classList.add('fullscreen');
                document.body.classList.remove('not-fullscreen');
            } else {
                document.body.classList.remove('fullscreen');
                document.body.classList.add('not-fullscreen');
            }
        });
    }

    applyInitialFullscreenClass() {
        const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
        if (isFs) {
            document.body.classList.add('fullscreen');
            document.body.classList.remove('not-fullscreen');
        } else {
            document.body.classList.remove('fullscreen');
            document.body.classList.add('not-fullscreen');
        }
    }

    loadWindowVideos() {
        console.log('Loading window videos...');
        
        try {
            // 100.mp4 (ENTERキー用)
            console.log('Window video set to 100.mp4');
            
            this.windowVideo.addEventListener('loadedmetadata', () => {
                console.log('Window video (ENTER) metadata loaded successfully');
                console.log('Video duration:', this.windowVideo.duration);
                this.currentTime = 0;
                this.windowVideo.currentTime = 0;
                this.applySettings(); // 動画読み込み後に設定を適用
                this.updateVideoTransform(); // transformを初期化
            });
            
            this.windowVideo.addEventListener('loadeddata', () => {
                console.log('Window video (ENTER) data loaded successfully');
            });
            
            this.windowVideo.addEventListener('error', (error) => {
                console.error('Failed to load 100.mp4:', error);
                this.loadFallbackVideo();
            });
            
            this.windowVideo.addEventListener('ended', () => {
                console.log('Video (ENTER) ended');
                this.stopVideoPlayback();
            });
            
            // 200.mp4 (Pキー用)
            console.log('Window video P set to 200.mp4');
            
            this.windowVideoP.addEventListener('loadedmetadata', () => {
                console.log('Window video (P) metadata loaded successfully');
                console.log('Video P duration:', this.windowVideoP.duration);
                this.currentTimeP = 0;
                this.windowVideoP.currentTime = 0;
                this.applySettings(); // 動画読み込み後に設定を適用
            });
            
            this.windowVideoP.addEventListener('loadeddata', () => {
                console.log('Window video (P) data loaded successfully');
            });
            
            this.windowVideoP.addEventListener('error', (error) => {
                console.error('Failed to load 200.mp4:', error);
                // P키 동영상이 로드되지 않아도 시스템은 계속 동작
                console.log('P key video unavailable, continuing with ENTER video only');
            });
            
            this.windowVideoP.addEventListener('ended', () => {
                console.log('Video (P) ended');
                this.stopVideoPlaybackP();
            });
            
            // 動画の再生制御を設定
            this.setupVideoControls();

            // 300.mp4 (ENTER長押しで前面再生)
            if (this.windowVideo300) {
                console.log('Window video 300 set to 300.mp4');
                this.windowVideo300.addEventListener('loadedmetadata', () => {
                    console.log('Window video (300) metadata loaded successfully');
                    this.applySettings();
                    this.updateVideoTransform();
                });
                this.windowVideo300.addEventListener('ended', () => {
                    console.log('Video (300) ended');
                    this.is300Playing = false;
                    this.windowVideo300.style.display = 'none';
                    this.windowVideo300.style.zIndex = '';
                    // 100を元の表示状態に戻す（デフォルト表示）
                    if (this.windowVideo) {
                        this.windowVideo.style.display = 'block';
                        this.windowVideo.style.zIndex = '';
                    }
                });
                this.windowVideo300.addEventListener('error', (error) => {
                    console.error('Failed to load 300.mp4:', error);
                });
            }
            
            // 400.mp4 ([ 長押しで前面再生)
            if (this.windowVideo400) {
                console.log('Window video 400 set to 400.mp4');
                this.windowVideo400.addEventListener('loadedmetadata', () => {
                    console.log('Window video (400) metadata loaded successfully');
                    this.applySettings();
                    this.updateVideoTransform();
                });
                this.windowVideo400.addEventListener('ended', () => {
                    console.log('Video (400) ended');
                    this.is400Playing = false;
                    this.windowVideo400.style.display = 'none';
                    this.windowVideo400.style.zIndex = '';
                    // 100を元の表示状態に戻す（デフォルト表示）
                    if (this.windowVideo) {
                        this.windowVideo.style.display = 'block';
                        this.windowVideo.style.zIndex = '';
                    }
                });
                this.windowVideo400.addEventListener('error', (error) => {
                    console.error('Failed to load 400.mp4:', error);
                });
            }
            
        } catch (error) {
            console.error('Error loading videos:', error);
            this.loadFallbackVideo();
        }
    }

    loadFallbackVideo() {
        console.log('Loading fallback video content...');
        // フォールバック用のシンプルな表示
        this.windowVideo.style.backgroundColor = '#87CEEB';
        console.log('Fallback video loaded');
    }

    setupVideoControls() {
        console.log('Setting up video controls...');
        
        // 両動画の自動再生を無効にする
        this.windowVideo.autoplay = false;
        this.windowVideo.loop = false;
        this.windowVideoP.autoplay = false;
        this.windowVideoP.loop = false;
        if (this.windowVideo300) {
            this.windowVideo300.autoplay = false;
            this.windowVideo300.loop = false;
        }
        if (this.windowVideo400) {
            this.windowVideo400.autoplay = false;
            this.windowVideo400.loop = false;
        }
        
        // ENTERキー動画用の逆再生制御（最適化版）
        this.updateVideoTime = () => {
            if (this.isPlayingBackward && this.currentTime > 0) {
                // フレームレートを30FPSに制限してパフォーマンスを向上
                const deltaTime = (1/30) * this.settings.playbackSpeed;
                this.currentTime -= deltaTime;
                
                if (this.currentTime < 0) {
                    this.currentTime = 0;
                    this.windowVideo.currentTime = 0;
                    this.stopVideoPlayback();
                } else {
                    this.windowVideo.currentTime = this.currentTime;
                    // setTimeoutを使用してより安定した逆再生を実現
                    this.animationFrame = setTimeout(() => {
                        requestAnimationFrame(this.updateVideoTime);
                    }, 1000/30); // 30FPS
                }
            }
        };
        
        // Pキー動画用の逆再生制御（最適化版）
        this.updateVideoTimeP = () => {
            if (this.isPlayingBackwardP && this.currentTimeP > 0) {
                // フレームレートを30FPSに制限してパフォーマンスを向上
                const deltaTime = (1/30) * this.settings.playbackSpeed;
                this.currentTimeP -= deltaTime; // 재생속도에 응じて 역재생
                if (this.currentTimeP < 0) {
                    this.currentTimeP = 0;
                    this.windowVideoP.currentTime = 0;
                    this.stopVideoPlaybackP();
                } else {
                    this.windowVideoP.currentTime = this.currentTimeP;
                    // setTimeoutを使用してより安定した逆再生を実現
                    this.animationFrameP = setTimeout(() => {
                        requestAnimationFrame(this.updateVideoTimeP);
                    }, 1000/30); // 30FPS
                }
            }
        };
    }



    setupFirebaseListener() {
        console.log('Setting up Firebase listener for window control...');
        
        if (!window.firestore && !window.database) {
            console.error('Firebase not initialized for window control');
            return;
        }

        try {
            if (window.useFirestore) {
                console.log('Using Firestore for window control monitoring');
                this.setupFirestoreListener();
            } else {
                console.log('Using Realtime Database for window control monitoring');
                this.setupDatabaseListener();
            }
        } catch (error) {
            console.error('Firebase setup error for window control:', error);
        }
    }

    setupFirestoreListener() {
        const windowControlRef = window.firestoreDoc(window.firestore, 'gameData', 'windowControl');
        window.firestoreOnSnapshot(windowControlRef, (snapshot) => {
            console.log('Firestore window control data received:', snapshot.exists());
            
            if (snapshot.exists()) {
                const data = snapshot.data();
                this.isWindowChangeEnabled = data.enabled || false;
                this.isScrolling = data.isScrolling || false;
                this.isPPressed = data.isPPressed || false;
                this.isRightBracketPressed = data.isRightBracketPressed || false;
                console.log('Window change enabled:', this.isWindowChangeEnabled, 'isScrolling (ENTER):', this.isScrolling, 'isPPressed (P):', this.isPPressed, 'isRightBracketPressed (]):', this.isRightBracketPressed);
                this.updateWindowState();
            } else {
                console.log('No window control data in Firestore');
                this.isWindowChangeEnabled = false;
                this.isScrolling = false;
                this.isPPressed = false;
                this.isRightBracketPressed = false;
                this.updateWindowState();
            }
        }, (error) => {
            console.error('Error monitoring window control in Firestore:', error);
        });
    }

    setupDatabaseListener() {
        const windowControlRef = window.dbRef(window.database, 'windowControl');
        window.dbOnValue(windowControlRef, (snapshot) => {
            console.log('Database window control data received:', snapshot.val());
            const data = snapshot.val();
            
            if (data) {
                this.isWindowChangeEnabled = data.enabled || false;
                this.isScrolling = data.isScrolling || false;
                this.isPPressed = data.isPPressed || false;
                this.isRightBracketPressed = data.isRightBracketPressed || false;
                console.log('Window change enabled:', this.isWindowChangeEnabled, 'isScrolling (ENTER):', this.isScrolling, 'isPPressed (P):', this.isPPressed, 'isRightBracketPressed (]):', this.isRightBracketPressed);
                this.updateWindowState();
            } else {
                console.log('No window control data in Database');
                this.isWindowChangeEnabled = false;
                this.isScrolling = false;
                this.isPPressed = false;
                this.isRightBracketPressed = false;
                this.updateWindowState();
            }
        }, (error) => {
            console.error('Error monitoring window control in Database:', error);
        });
    }

    updateWindowState() {
        if (this.isWindowChangeEnabled) {
            // ENTERキーの処理
            if (this.isScrolling) {
                // ENTER長押しで300.mp4再生（1秒）
                this.lastPressedKey = 'enter';
                this.startEnterLongPressTimer();
            } else {
                // 離した時は未発火タイマーのみキャンセル（動画は最後まで再生）
                this.cancelEnterLongPressTimer();
            }
            
            // ]（RightBracket）の処理：長押しで400.mp4
            if (this.isRightBracketPressed) {
                this.lastPressedKey = 'rightBracket';
                this.startRightBracketLongPressTimer();
            } else {
                this.cancelRightBracketLongPressTimer();
            }

            // Pキーの処理（従来どおり）
            if (this.isPPressed) {
                console.log('P pressed - playing video P forward');
                this.lastPressedKey = 'p'; // 最後に押されたキーを更新
                this.playVideoForwardP();
                this.showVideo('p');
            } else {
                console.log('P released - playing video P backward');
                this.playVideoBackwardP();
            }
            
            // 両方のキーが離されている場合の表示は不要（300再生は独立）
        } else {
            console.log('Window control disabled - stopping all videos');
            this.stopVideoPlayback();
            this.stopVideoPlaybackP();
        }
        
        // 動画状態が変わったら transform を更新
        this.updateVideoTransform();
    }

    showVideo(videoType) {
        if (videoType === 'enter') {
            this.windowVideo.style.display = 'block';
            this.windowVideoP.style.display = 'none';
            if (this.windowVideo300 && !this.is300Playing) {
                this.windowVideo300.style.display = 'none';
            }
            this.activeVideo = 'enter';
        } else if (videoType === 'p') {
            this.windowVideo.style.display = 'none';
            this.windowVideoP.style.display = 'block';
            if (this.windowVideo300 && !this.is300Playing) {
                this.windowVideo300.style.display = 'none';
            }
            this.activeVideo = 'p';
        }
        console.log('Active video switched to:', this.activeVideo);
    }

    playVideoForward() {
        this.stopVideoPlayback(); // 既存の再生を停止
        this.isPlayingForward = true;
        this.isPlayingBackward = false;
        
        console.log('Starting forward playback from:', this.currentTime, 'at speed:', this.settings.playbackSpeed);
        this.windowVideo.currentTime = this.currentTime;
        this.windowVideo.playbackRate = this.settings.playbackSpeed;
        
        this.windowVideo.play().then(() => {
            console.log('Video playing forward');
            
            // 再生時間を追跡
            const trackTime = () => {
                if (this.isPlayingForward && !this.windowVideo.paused) {
                    this.currentTime = this.windowVideo.currentTime;
                    requestAnimationFrame(trackTime);
                }
            };
            trackTime();
        }).catch(error => {
            console.error('Error playing video forward:', error);
        });
    }

    playVideoBackward() {
        // 正再生中の場合は現在の再生位置を即座に取得して逆再生に切り替え
        if (this.isPlayingForward && !this.windowVideo.paused) {
            this.currentTime = this.windowVideo.currentTime;
        }
        
        // アニメーションフレームのみ停止（動画の停止処理は行わない）
        if (this.animationFrame) {
            if (typeof this.animationFrame === 'number') {
                clearTimeout(this.animationFrame);
            } else {
                cancelAnimationFrame(this.animationFrame);
            }
            this.animationFrame = null;
        }
        
        this.isPlayingForward = false;
        this.isPlayingBackward = true;
        
        console.log('Starting backward playback from:', this.currentTime);
        this.windowVideo.pause();
        
        // 即座に逆再生制御を開始
        this.updateVideoTime();
    }

    stopVideoPlayback() {
        console.log('Stopping video playback');
        this.isPlayingForward = false;
        this.isPlayingBackward = false;
        
        if (this.windowVideo) {
            this.windowVideo.pause();
        }
        
        if (this.animationFrame) {
            if (typeof this.animationFrame === 'number') {
                // setTimeoutの場合
                clearTimeout(this.animationFrame);
            } else {
                // requestAnimationFrameの場合
                cancelAnimationFrame(this.animationFrame);
            }
            this.animationFrame = null;
        }
    }

    playVideoForwardP() {
        this.stopVideoPlaybackP(); // 既존의 재생을 정지
        this.isPlayingForwardP = true;
        this.isPlayingBackwardP = false;
        
        console.log('Starting forward playback P from:', this.currentTimeP, 'at speed:', this.settings.playbackSpeed);
        this.windowVideoP.currentTime = this.currentTimeP;
        this.windowVideoP.playbackRate = this.settings.playbackSpeed;
        
        this.windowVideoP.play().then(() => {
            console.log('Video P playing forward');
            
            // 재생시간을 추적
            const trackTime = () => {
                if (this.isPlayingForwardP && !this.windowVideoP.paused) {
                    this.currentTimeP = this.windowVideoP.currentTime;
                    requestAnimationFrame(trackTime);
                }
            };
            trackTime();
        }).catch(error => {
            console.error('Error playing video P forward:', error);
        });
    }

    playVideoBackwardP() {
        // 正再生中の場合は現在の再生位置を即座に取得して逆再生に切り替え
        if (this.isPlayingForwardP && !this.windowVideoP.paused) {
            this.currentTimeP = this.windowVideoP.currentTime;
        }
        
        // アニメーションフレームのみ停止（動画の停止処理は行わない）
        if (this.animationFrameP) {
            if (typeof this.animationFrameP === 'number') {
                clearTimeout(this.animationFrameP);
            } else {
                cancelAnimationFrame(this.animationFrameP);
            }
            this.animationFrameP = null;
        }
        
        this.isPlayingForwardP = false;
        this.isPlayingBackwardP = true;
        
        console.log('Starting backward playback P from:', this.currentTimeP);
        this.windowVideoP.pause();
        
        // 即座に逆再生制御を開始
        this.updateVideoTimeP();
    }

    stopVideoPlaybackP() {
        console.log('Stopping video P playback');
        this.isPlayingForwardP = false;
        this.isPlayingBackwardP = false;
        
        if (this.windowVideoP) {
            this.windowVideoP.pause();
        }
        
        if (this.animationFrameP) {
            if (typeof this.animationFrameP === 'number') {
                // setTimeoutの場合
                clearTimeout(this.animationFrameP);
            } else {
                // requestAnimationFrameの場合
                cancelAnimationFrame(this.animationFrameP);
            }
            this.animationFrameP = null;
        }
    }

    // ===== 300.mp4 再生（ENTER長押しで発火） =====
    startEnterLongPressTimer() {
        if (this.enterLongPressTimer || this.is300Playing) return;
        this.enterLongPressTimer = setTimeout(() => {
            this.enterLongPressTimer = null;
            this.start300Video();
        }, this.enterLongPressMs);
    }

    cancelEnterLongPressTimer() {
        if (this.enterLongPressTimer) {
            clearTimeout(this.enterLongPressTimer);
            this.enterLongPressTimer = null;
        }
    }

    start300Video() {
        if (!this.windowVideo300) return;
        console.log('Starting 300.mp4 playback due to long press');

        // 100を確実に非表示にし、300を前面に表示
        if (this.windowVideo) {
            this.windowVideo.style.display = 'none';
            this.windowVideo.style.zIndex = '1';
        }
        this.windowVideo300.style.display = 'block';
        this.windowVideo300.style.zIndex = '2';

        // サイズ等はapplySettings/transformで同期済み
        try {
            this.windowVideo300.currentTime = 0;
        } catch (e) {}
        this.is300Playing = true;
        this.windowVideo300.play().catch(err => {
            console.error('Error playing 300.mp4:', err);
            this.is300Playing = false;
        });
    }

    // ===== 400.mp4 再生（] 長押しで発火） =====
    startRightBracketLongPressTimer() {
        if (this.rightBracketLongPressTimer || this.is400Playing) return;
        this.rightBracketLongPressTimer = setTimeout(() => {
            this.rightBracketLongPressTimer = null;
            this.start400Video();
        }, this.rightBracketLongPressMs);
    }

    cancelRightBracketLongPressTimer() {
        if (this.rightBracketLongPressTimer) {
            clearTimeout(this.rightBracketLongPressTimer);
            this.rightBracketLongPressTimer = null;
        }
    }

    start400Video() {
        if (!this.windowVideo400) return;
        console.log('Starting 400.mp4 playback due to left bracket long press');

        // 100を確実に非表示にし、400を前面に表示
        if (this.windowVideo) {
            this.windowVideo.style.display = 'none';
            this.windowVideo.style.zIndex = '1';
        }
        if (this.windowVideo300 && this.is300Playing) {
            this.windowVideo300.style.display = 'none';
            this.is300Playing = false;
        }
        this.windowVideo400.style.display = 'block';
        this.windowVideo400.style.zIndex = '3'; // 400は最前面

        // 位置・サイズ・transformを最新設定で同期
        this.applySettings();
        this.updateVideoTransform();

        try { this.windowVideo400.currentTime = 0; } catch (e) {}
        this.is400Playing = true;
        this.windowVideo400.play().catch(err => {
            console.error('Error playing 400.mp4:', err);
            this.is400Playing = false;
        });
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
                    console.log('Window entered fullscreen');
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
                    console.log('Window exited fullscreen');
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
            imageWidth: document.getElementById('imageWidth'),
            imageHeight: document.getElementById('imageHeight'),
            imageTop: document.getElementById('imageTop'),
            imageLeft: document.getElementById('imageLeft'),
            imageZoom: document.getElementById('imageZoom')
        };
        
        const numberInputs = {
            imageWidth: document.getElementById('imageWidthInput'),
            imageHeight: document.getElementById('imageHeightInput'),
            imageTop: document.getElementById('imageTopInput'),
            imageLeft: document.getElementById('imageLeftInput'),
            imageZoom: document.getElementById('imageZoomInput')
        };
        
        const values = {
            imageWidth: document.getElementById('imageWidthValue'),
            imageHeight: document.getElementById('imageHeightValue'),
            imageTop: document.getElementById('imageTopValue'),
            imageLeft: document.getElementById('imageLeftValue'),
            imageZoom: document.getElementById('imageZoomValue')
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
        
        // プリセット関連のイベントは廃止
        
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
        const savedSettings = localStorage.getItem('windowSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        
        // カスタムプリセットの読み込み
        // プリセットは使用しない
        
        this.updateControlValues();
    }

    saveSettings() {
        localStorage.setItem('windowSettings', JSON.stringify(this.settings));
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        
        // 値の表示を更新
        const valueElement = document.getElementById(key + 'Value');
        if (valueElement) {
            if (key === 'imageWidth' || key === 'imageHeight' || key === 'imageZoom') {
                valueElement.textContent = value + '%';
            } else if (key === 'imageTop' || key === 'imageLeft') {
                valueElement.textContent = value + 'px';
            }
        }
        
        this.applySettings();
        this.saveSettings();
    }

    // applyPresetは廃止

    // saveCustomPresetは廃止

    applySettings() {
        const applyRect = (el) => {
            if (!el) return;
            el.style.width = this.settings.imageWidth + '%';
            el.style.height = (this.settings.imageHeight * 2) + 'vh';
            el.style.top = this.settings.imageTop + 'px';
            el.style.left = this.settings.imageLeft + 'px';
            el.style.transitionDuration = this.settings.scrollDuration + 's';
            el.style.opacity = this.settings.imageOpacity / 100;
            el.style.transformOrigin = 'center center';
        };

        // 4本すべて同一設定を適用
        applyRect(this.windowVideo);
        applyRect(this.windowVideo300);
        applyRect(this.windowVideo400);
        applyRect(this.windowVideoP);
        
        // transformを統一的に更新
        this.updateVideoTransform();
    }

    updateVideoTransform() {
        const setTransform = (el) => {
            if (!el) return;
            const transform = `rotate(${this.settings.imageRotation}deg) scale(${this.settings.imageZoom / 100})`;
            const translateY = this.settings.scrollDistance;
            el.style.transform = `${transform} translateY(${translateY}%)`;
        };

        // 4本すべて同一transformを適用
        setTransform(this.windowVideo);
        setTransform(this.windowVideo300);
        setTransform(this.windowVideo400);
        setTransform(this.windowVideoP);
    }

    updateControlValues() {
        // スライダー値を更新
        document.getElementById('imageWidth').value = this.settings.imageWidth;
        document.getElementById('imageHeight').value = this.settings.imageHeight;
        document.getElementById('imageTop').value = this.settings.imageTop;
        document.getElementById('imageLeft').value = this.settings.imageLeft;
        document.getElementById('imageZoom').value = this.settings.imageZoom;
        
        // 数値入力フィールドを更新
        document.getElementById('imageWidthInput').value = this.settings.imageWidth;
        document.getElementById('imageHeightInput').value = this.settings.imageHeight;
        document.getElementById('imageTopInput').value = this.settings.imageTop;
        document.getElementById('imageLeftInput').value = this.settings.imageLeft;
        document.getElementById('imageZoomInput').value = this.settings.imageZoom;
        
        // 表示値を更新
        document.getElementById('imageWidthValue').textContent = this.settings.imageWidth + '%';
        document.getElementById('imageHeightValue').textContent = this.settings.imageHeight + '%';
        document.getElementById('imageTopValue').textContent = this.settings.imageTop + 'px';
        document.getElementById('imageLeftValue').textContent = this.settings.imageLeft + 'px';
        document.getElementById('imageZoomValue').textContent = this.settings.imageZoom + '%';
    }

    resetSettings() {
        this.settings = {
            imageWidth: 100,
            imageHeight: 100,
            imageTop: 0,
            imageLeft: 0,
            imageRotation: 0,
            imageOpacity: 100,
            imageZoom: 100,
            scrollDistance: -50,
            scrollDuration: 0.3,
            playbackSpeed: 1.0
        };
        
        this.updateControlValues();
        this.applySettings();
        this.saveSettings();
    }

    // シナリオ6用の動画制御リスナーを設定
    setupVideoControlListener() {
        console.log('Setting up video control listener for scenario 6...');
        
        if (!window.firestore && !window.database) {
            console.error('Firebase not initialized for video control');
            return;
        }

        try {
            if (window.useFirestore) {
                console.log('Using Firestore for video control monitoring');
                this.setupFirestoreVideoListener();
            } else {
                console.log('Using Realtime Database for video control monitoring');
                this.setupDatabaseVideoListener();
            }
        } catch (error) {
            console.error('Firebase setup error for video control:', error);
        }
    }

    setupFirestoreVideoListener() {
        const videoControlRef = window.firestoreDoc(window.firestore, 'gameData', 'windowVideoControl');
        window.firestoreOnSnapshot(videoControlRef, (snapshot) => {
            console.log('Firestore video control data received:', snapshot.exists());
            
            if (snapshot.exists()) {
                const data = snapshot.data();
                this.handleVideoControlSignal(data);
            }
        }, (error) => {
            console.error('Error monitoring video control in Firestore:', error);
        });
    }

    setupDatabaseVideoListener() {
        const videoControlRef = window.dbRef(window.database, 'windowVideoControl');
        window.dbOnValue(videoControlRef, (snapshot) => {
            console.log('Database video control data received:', snapshot.val());
            const data = snapshot.val();
            
            if (data) {
                this.handleVideoControlSignal(data);
            }
        }, (error) => {
            console.error('Error monitoring video control in Database:', error);
        });
    }

    handleVideoControlSignal(data) {
        console.log('Video control signal received:', data);
        
        if (data.videoReset === true) {
            // シナリオ切り替え時：動画を最初の位置にリセット
            console.log('Resetting video to beginning');
            this.resetVideoToBeginning();
        } else if (data.scenario6Playing === true) {
            // シナリオ6でUとENTER長押し時：100.mp4を再生開始
            console.log('Starting 100.mp4 playback for scenario 6');
            this.startScenario6Video();
        } else if (data.scenario6Reverse === true) {
            // 音声終了時：動画を逆再生して最初まで戻す
            console.log('Starting reverse playback for scenario 6');
            this.reverseScenario6Video();
        }
    }

    startScenario6Video() {
        console.log('Starting scenario 6 video playback');
        
        // 現在の動画を停止
        this.stopVideoPlayback();
        this.stopVideoPlaybackP();
        
        // 100.mp4を最初から再生
        this.currentTime = 0;
        this.windowVideo.currentTime = 0;
        this.showVideo('enter');
        this.playVideoForward();
    }

    reverseScenario6Video() {
        console.log('Starting scenario 6 video reverse playback');
        
        // 逆再生で最初まで戻す
        this.playVideoBackward();
    }

    resetVideoToBeginning() {
        console.log('Resetting all videos to beginning position');
        
        // 全ての動画再生を停止
        this.stopVideoPlayback();
        this.stopVideoPlaybackP();
        
        // 両方の動画を最初の位置にリセット
        this.currentTime = 0;
        this.currentTimeP = 0;
        
        if (this.windowVideo) {
            this.windowVideo.currentTime = 0;
            this.windowVideo.pause();
        }
        
        if (this.windowVideoP) {
            this.windowVideoP.currentTime = 0;
            this.windowVideoP.pause();
        }
        
        // ENTERキー動画を表示状態にする（デフォルト）
        this.showVideo('enter');
        this.activeVideo = 'enter';
        
        console.log('Videos reset to beginning successfully');
    }


}

// 窓制御初期化
window.addEventListener('DOMContentLoaded', () => {
    new WindowControl();
    // Presence reporting for window screen (use RTDB onDisconnect)
    (function setupPresence(){
        if(!window.firestore && !window.database) return;
        const data={screen:'window',timestamp:Date.now(),status:'online'};
        try{
            if(window.database){
                const ref=window.dbRef(window.database,'presence/window');
                window.dbSet(ref,data).catch(e=>console.error('presence db set',e));
                if(window.dbOnDisconnect){
                    window.dbOnDisconnect(ref).set({screen:'window',timestamp:Date.now(),status:'offline'}).catch(e=>console.error('presence onDisconnect',e));
                }
            }else if(window.useFirestore){
                const ref=window.firestoreDoc(window.firestore,'presence','window');
                window.firestoreSetDoc(ref,data).catch(e=>console.error('presence firestore',e));
            }
        }catch(err){console.error('presence error',err);}
    })();
});

// エラーハンドリング
window.addEventListener('error', (e) => {
    console.error('Window JavaScript Error:', e);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Window Promise rejection:', e);
});