class WindowControl {
    constructor() {
        this.isWindowChangeEnabled = false;
        this.isScrolling = false;
        this.isScrolled = false; // スクロール状態を追跡
        this.windowContent = document.getElementById('windowContent');
        this.windowFrame = document.querySelector('.window-frame');
        this.windowVideo = document.getElementById('windowVideo');
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
        
        // 設定値のデフォルト
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

        // プリセット定義
        this.presets = {
            default: {
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
            },
            zoom: {
                imageWidth: 150,
                imageHeight: 150,
                imageTop: -100,
                imageLeft: -100,
                imageRotation: 0,
                imageOpacity: 100,
                imageZoom: 150,
                scrollDistance: -70,
                scrollDuration: 0.5,
                playbackSpeed: 1.0
            },
            fullScreen: {
                imageWidth: 300,
                imageHeight: 300,
                imageTop: -200,
                imageLeft: -200,
                imageRotation: 0,
                imageOpacity: 100,
                imageZoom: 200,
                scrollDistance: -100,
                scrollDuration: 0.8,
                playbackSpeed: 1.0
            },
            custom: {
                imageWidth: 120,
                imageHeight: 120,
                imageTop: -50,
                imageLeft: -50,
                imageRotation: 15,
                imageOpacity: 85,
                imageZoom: 120,
                scrollDistance: -60,
                scrollDuration: 0.4,
                playbackSpeed: 1.0
            }
        };
        
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
        
        // デフォルトプリセットを有効にする
        setTimeout(() => {
            document.getElementById('presetDefault').classList.add('active');
        }, 100);
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
                console.log('Window change enabled:', this.isWindowChangeEnabled, 'isScrolling (ENTER):', this.isScrolling, 'isPPressed (P):', this.isPPressed);
                this.updateWindowState();
            } else {
                console.log('No window control data in Firestore');
                this.isWindowChangeEnabled = false;
                this.isScrolling = false;
                this.isPPressed = false;
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
                console.log('Window change enabled:', this.isWindowChangeEnabled, 'isScrolling (ENTER):', this.isScrolling, 'isPPressed (P):', this.isPPressed);
                this.updateWindowState();
            } else {
                console.log('No window control data in Database');
                this.isWindowChangeEnabled = false;
                this.isScrolling = false;
                this.isPPressed = false;
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
                console.log('Enter pressed - playing video forward');
                this.lastPressedKey = 'enter'; // 最後に押されたキーを更新
                this.playVideoForward();
                this.showVideo('enter');
            } else {
                console.log('Enter released - playing video backward');
                this.playVideoBackward();
            }
            
            // Pキーの処理
            if (this.isPPressed) {
                console.log('P pressed - playing video P forward');
                this.lastPressedKey = 'p'; // 最後に押されたキーを更新
                this.playVideoForwardP();
                this.showVideo('p');
            } else {
                console.log('P released - playing video P backward');
                this.playVideoBackwardP();
            }
            
            // 両方のキーが離されている場合の処理
            if (!this.isScrolling && !this.isPPressed) {
                // 最後に押されたキーの動画を表示
                console.log('Both keys released - showing last pressed key video:', this.lastPressedKey);
                this.showVideo(this.lastPressedKey);
            }
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
            this.activeVideo = 'enter';
        } else if (videoType === 'p') {
            this.windowVideo.style.display = 'none';
            this.windowVideoP.style.display = 'block';
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
            imageRotation: document.getElementById('imageRotation'),
            imageOpacity: document.getElementById('imageOpacity'),
            imageZoom: document.getElementById('imageZoom'),
            scrollDistance: document.getElementById('scrollDistance'),
            scrollDuration: document.getElementById('scrollDuration'),
            playbackSpeed: document.getElementById('playbackSpeed')
        };
        
        const numberInputs = {
            imageWidth: document.getElementById('imageWidthInput'),
            imageHeight: document.getElementById('imageHeightInput'),
            imageTop: document.getElementById('imageTopInput'),
            imageLeft: document.getElementById('imageLeftInput'),
            imageRotation: document.getElementById('imageRotationInput'),
            imageOpacity: document.getElementById('imageOpacityInput'),
            imageZoom: document.getElementById('imageZoomInput'),
            scrollDistance: document.getElementById('scrollDistanceInput'),
            scrollDuration: document.getElementById('scrollDurationInput'),
            playbackSpeed: document.getElementById('playbackSpeedInput')
        };
        
        const values = {
            imageWidth: document.getElementById('imageWidthValue'),
            imageHeight: document.getElementById('imageHeightValue'),
            imageTop: document.getElementById('imageTopValue'),
            imageLeft: document.getElementById('imageLeftValue'),
            imageRotation: document.getElementById('imageRotationValue'),
            imageOpacity: document.getElementById('imageOpacityValue'),
            imageZoom: document.getElementById('imageZoomValue'),
            scrollDistance: document.getElementById('scrollDistanceValue'),
            scrollDuration: document.getElementById('scrollDurationValue'),
            playbackSpeed: document.getElementById('playbackSpeedValue')
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
        
        // プリセットボタン
        document.getElementById('presetDefault').addEventListener('click', () => {
            this.applyPreset('default');
        });
        
        document.getElementById('presetZoom').addEventListener('click', () => {
            this.applyPreset('zoom');
        });
        
        document.getElementById('presetFullScreen').addEventListener('click', () => {
            this.applyPreset('fullScreen');
        });
        
        document.getElementById('presetCustom').addEventListener('click', () => {
            this.applyPreset('custom');
        });
        
        // プリセット保存ボタン
        document.getElementById('savePresetButton').addEventListener('click', () => {
            this.saveCustomPreset();
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
        const savedSettings = localStorage.getItem('windowSettings');
        if (savedSettings) {
            this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
        }
        
        // カスタムプリセットの読み込み
        const customPreset = localStorage.getItem('windowCustomPreset');
        if (customPreset) {
            this.presets.custom = { ...this.presets.custom, ...JSON.parse(customPreset) };
        }
        
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
            if (key === 'imageWidth' || key === 'imageHeight' || key === 'imageOpacity' || key === 'imageZoom' || key === 'scrollDistance') {
                valueElement.textContent = value + '%';
            } else if (key === 'imageTop' || key === 'imageLeft') {
                valueElement.textContent = value + 'px';
            } else if (key === 'imageRotation') {
                valueElement.textContent = value + '°';
            } else if (key === 'scrollDuration') {
                valueElement.textContent = value + 's';
            } else if (key === 'playbackSpeed') {
                valueElement.textContent = value + 'x';
            }
        }
        
        this.applySettings();
        this.saveSettings();
    }

    applyPreset(presetName) {
        if (this.presets[presetName]) {
            this.settings = { ...this.presets[presetName] };
            this.updateControlValues();
            this.applySettings();
            this.saveSettings();
            
            // プリセットボタンの表示を更新
            document.querySelectorAll('.preset-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById(`preset${presetName.charAt(0).toUpperCase() + presetName.slice(1)}`).classList.add('active');
        }
    }

    saveCustomPreset() {
        this.presets.custom = { ...this.settings };
        localStorage.setItem('windowCustomPreset', JSON.stringify(this.presets.custom));
        
        // 成功メッセージを表示
        const saveButton = document.getElementById('savePresetButton');
        const originalText = saveButton.textContent;
        saveButton.textContent = '保存済み';
        setTimeout(() => {
            saveButton.textContent = originalText;
        }, 1500);
    }

    applySettings() {
        // ENTERキー동영상 설정 적용
        const video = this.windowVideo;
        if (video) {
            video.style.width = this.settings.imageWidth + '%';
            video.style.height = (this.settings.imageHeight * 2) + 'vh';
            video.style.top = this.settings.imageTop + 'px';
            video.style.left = this.settings.imageLeft + 'px';
            video.style.transitionDuration = this.settings.scrollDuration + 's';
            video.style.opacity = this.settings.imageOpacity / 100;
            video.style.transformOrigin = 'center center';
        }
        
        // Pキー동영상 설정 적용
        const videoP = this.windowVideoP;
        if (videoP) {
            videoP.style.width = this.settings.imageWidth + '%';
            videoP.style.height = (this.settings.imageHeight * 2) + 'vh';
            videoP.style.top = this.settings.imageTop + 'px';
            videoP.style.left = this.settings.imageLeft + 'px';
            videoP.style.transitionDuration = this.settings.scrollDuration + 's';
            videoP.style.opacity = this.settings.imageOpacity / 100;
            videoP.style.transformOrigin = 'center center';
        }
        
        // transformを統一的に更新
        this.updateVideoTransform();
    }

    updateVideoTransform() {
        // ENTERキー동영상 transform 적용
        const video = this.windowVideo;
        if (video) {
            let transform = `rotate(${this.settings.imageRotation}deg) scale(${this.settings.imageZoom / 100})`;
            video.style.transform = transform;
        }
        
        // Pキー동영상 transform 적용
        const videoP = this.windowVideoP;
        if (videoP) {
            let transform = `rotate(${this.settings.imageRotation}deg) scale(${this.settings.imageZoom / 100})`;
            videoP.style.transform = transform;
        }
    }

    updateControlValues() {
        // スライダー値を更新
        document.getElementById('imageWidth').value = this.settings.imageWidth;
        document.getElementById('imageHeight').value = this.settings.imageHeight;
        document.getElementById('imageTop').value = this.settings.imageTop;
        document.getElementById('imageLeft').value = this.settings.imageLeft;
        document.getElementById('imageRotation').value = this.settings.imageRotation;
        document.getElementById('imageOpacity').value = this.settings.imageOpacity;
        document.getElementById('imageZoom').value = this.settings.imageZoom;
        document.getElementById('scrollDistance').value = this.settings.scrollDistance;
        document.getElementById('scrollDuration').value = this.settings.scrollDuration;
        document.getElementById('playbackSpeed').value = this.settings.playbackSpeed;
        
        // 数値入力フィールドを更新
        document.getElementById('imageWidthInput').value = this.settings.imageWidth;
        document.getElementById('imageHeightInput').value = this.settings.imageHeight;
        document.getElementById('imageTopInput').value = this.settings.imageTop;
        document.getElementById('imageLeftInput').value = this.settings.imageLeft;
        document.getElementById('imageRotationInput').value = this.settings.imageRotation;
        document.getElementById('imageOpacityInput').value = this.settings.imageOpacity;
        document.getElementById('imageZoomInput').value = this.settings.imageZoom;
        document.getElementById('scrollDistanceInput').value = this.settings.scrollDistance;
        document.getElementById('scrollDurationInput').value = this.settings.scrollDuration;
        document.getElementById('playbackSpeedInput').value = this.settings.playbackSpeed;
        
        // 表示値を更新
        document.getElementById('imageWidthValue').textContent = this.settings.imageWidth + '%';
        document.getElementById('imageHeightValue').textContent = this.settings.imageHeight + '%';
        document.getElementById('imageTopValue').textContent = this.settings.imageTop + 'px';
        document.getElementById('imageLeftValue').textContent = this.settings.imageLeft + 'px';
        document.getElementById('imageRotationValue').textContent = this.settings.imageRotation + '°';
        document.getElementById('imageOpacityValue').textContent = this.settings.imageOpacity + '%';
        document.getElementById('imageZoomValue').textContent = this.settings.imageZoom + '%';
        document.getElementById('scrollDistanceValue').textContent = this.settings.scrollDistance + '%';
        document.getElementById('scrollDurationValue').textContent = this.settings.scrollDuration + 's';
        document.getElementById('playbackSpeedValue').textContent = this.settings.playbackSpeed + 'x';
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
        
        // プリセットボタンの状態をリセット
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById('presetDefault').classList.add('active');
        
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
    // Presence reporting for window screen
    function reportWindowPresence(){
        if(!window.firestore && !window.database) return;
        const data={screen:'window',timestamp:Date.now(),status:'online'};
        try{
            if(window.useFirestore){
                const ref=window.firestoreDoc(window.firestore,'presence','window');
                window.firestoreSetDoc(ref,data).catch(e=>console.error('presence firestore',e));
            }else if(window.database){
                const ref=window.dbRef(window.database,'presence/window');
                window.dbSet(ref,data).catch(e=>console.error('presence db',e));
            }
        }catch(err){console.error('presence error',err);}
    }
    reportWindowPresence();
    setInterval(reportWindowPresence,30000);
});

// エラーハンドリング
window.addEventListener('error', (e) => {
    console.error('Window JavaScript Error:', e);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Window Promise rejection:', e);
});