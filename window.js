class WindowControl {
    constructor() {
        this.isWindowChangeEnabled = false;
        this.isScrolling = false;
        this.isScrolled = false; // スクロール状態を追跡
        this.windowContent = document.getElementById('windowContent');
        this.windowFrame = document.querySelector('.window-frame');
        this.windowImage = document.getElementById('windowImage');
        
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
            scrollDuration: 0.3
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
                scrollDuration: 0.3
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
                scrollDuration: 0.5
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
                scrollDuration: 0.8
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
                scrollDuration: 0.4
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
        this.loadWindowImage();
        this.setupFirebaseListener();
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

    loadWindowImage() {
        console.log('Loading window image...');
        
        // window.pngファイルを使用
        try {
            this.windowImage.src = 'window.png';
            console.log('Window image set to window.png');
            
            this.windowImage.onload = () => {
                console.log('Window image loaded successfully');
                this.applySettings(); // 画像読み込み後に設定を適用
                this.updateImageTransform(); // transformを初期化
            };
            
            this.windowImage.onerror = (error) => {
                console.error('Failed to load window.png:', error);
                this.loadFallbackImage();
            };
        } catch (error) {
            console.error('Error loading window.png:', error);
            this.loadFallbackImage();
        }
    }

    loadFallbackImage() {
        // フォールバック用の簡単なSVG
        const fallbackSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200">
                <rect width="100" height="100" fill="#87CEEB"/>
                <rect y="100" width="100" height="100" fill="#8B4513"/>
                <text x="50" y="50" fill="#000000" text-anchor="middle" font-family="Arial" font-size="6px">窓上部</text>
                <text x="50" y="150" fill="#FFFFFF" text-anchor="middle" font-family="Arial" font-size="6px">地下</text>
            </svg>`;
        
        const fallbackData = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fallbackSvg)}`;
        this.windowImage.src = fallbackData;
        console.log('Fallback image loaded');
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
                console.log('Window change enabled:', this.isWindowChangeEnabled, 'isScrolling:', this.isScrolling);
                this.updateWindowState();
            } else {
                console.log('No window control data in Firestore');
                this.isWindowChangeEnabled = false;
                this.isScrolling = false;
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
                console.log('Window change enabled:', this.isWindowChangeEnabled, 'isScrolling:', this.isScrolling);
                this.updateWindowState();
            } else {
                console.log('No window control data in Database');
                this.isWindowChangeEnabled = false;
                this.isScrolling = false;
                this.updateWindowState();
            }
        }, (error) => {
            console.error('Error monitoring window control in Database:', error);
        });
    }

    updateWindowState() {
        if (this.isWindowChangeEnabled && this.isScrolling) {
            console.log('Window scrolling to bottom');
            this.isScrolled = true;
            this.windowFrame.classList.add('active');
        } else {
            console.log('Window returning to top');
            this.isScrolled = false;
            this.windowFrame.classList.remove('active');
        }
        
        // スクロール状態が変わったら画像の transform を更新
        this.updateImageTransform();
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
            scrollDuration: document.getElementById('scrollDuration')
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
            scrollDuration: document.getElementById('scrollDurationInput')
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
            scrollDuration: document.getElementById('scrollDurationValue')
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
        const img = this.windowImage;
        if (img) {
            // 基本的な位置とサイズ
            img.style.width = this.settings.imageWidth + '%';
            img.style.height = (this.settings.imageHeight * 2) + 'vh';
            img.style.top = this.settings.imageTop + 'px';
            img.style.left = this.settings.imageLeft + 'px';
            img.style.transitionDuration = this.settings.scrollDuration + 's';
            img.style.opacity = this.settings.imageOpacity / 100;
            img.style.transformOrigin = 'center center';
        }
        
        // transformを統一的に更新
        this.updateImageTransform();
    }

    updateImageTransform() {
        const img = this.windowImage;
        if (img) {
            // 基本的な変形（回転、スケール）
            let transform = `rotate(${this.settings.imageRotation}deg) scale(${this.settings.imageZoom / 100})`;
            
            // スクロール状態に応じてtranslateYを追加
            if (this.isScrolled) {
                transform += ` translateY(${this.settings.scrollDistance}%)`;
            }
            
            img.style.transform = transform;
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
            scrollDuration: 0.3
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


}

// 窓制御初期化
window.addEventListener('DOMContentLoaded', () => {
    new WindowControl();
});

// エラーハンドリング
window.addEventListener('error', (e) => {
    console.error('Window JavaScript Error:', e);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Window Promise rejection:', e);
}); 