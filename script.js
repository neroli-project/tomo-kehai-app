// ==========================================================================
// 🚨 Firebaseの機能をインターネットから読み込む設定（update追加版！）
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
// 💡 update を追加したよ！これで安全更新が使えるようになる！
import { getDatabase, ref, set, update, onValue, child, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ⚠️あなたの「秘密の鍵」
const firebaseConfig = {
    apiKey: "AIzaSyB39eq-VQP8fZNjVdm7BnO7gKEMBibqqDo",
    authDomain: "hana-kehai-app.firebaseapp.com",
    databaseURL: "https://hana-kehai-app-default-rtdb.firebaseio.com", 
    projectId: "hana-kehai-app",
    storageBucket: "hana-kehai-app.firebasestorage.app",
    messagingSenderId: "144341858428",
    appId: "1:144341858428:web:3adb2679fad549895171f9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ==========================================================================
// 🚨 URLからお部屋の名前と自分の名前を読み取る設定（名札の統一完全版！）
// ==========================================================================
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room') || 'default_room';
const myId = urlParams.get('myname') || 'default_user';

// 💡 部屋名か名前が実際にURLにない時だけログイン画面を出す
if (!urlParams.get('room') || !urlParams.get('myname')) {
    document.addEventListener('DOMContentLoaded', () => {
        const loginCon = document.getElementById('login-container');
        const appCon = document.getElementById('app-container');
        if (loginCon) loginCon.style.display = 'block';
        if (appCon) appCon.style.display = 'none';
    });
} else {
    document.addEventListener('DOMContentLoaded', () => {
        const loginCon = document.getElementById('login-container');
        const appCon = document.getElementById('app-container');
        if (loginCon) loginCon.style.display = 'none';
        if (appCon) appCon.style.display = 'block';
    });
}

// ==========================================================================
// 🔑 ログイン＆招待リンク生成の処理
// ==========================================================================
let generatedInviteUrl = "";
let nextJumpUrl = "";
let currentRoomName = ""; 

window.loginToRoom = function() {
    const roomInput = document.getElementById('input-room').value.trim();
    const nameInput = document.getElementById('input-name').value.trim();
    
    if (!roomInput || !nameInput) {
        alert('お部屋の名前と、あなたの名前を入力してね！');
        return;
    }
    
    currentRoomName = roomInput;
    const baseUrl = window.location.origin + window.location.pathname;
    generatedInviteUrl = `${baseUrl}?room=${encodeURIComponent(roomInput)}`;
    nextJumpUrl = `${baseUrl}?room=${encodeURIComponent(roomInput)}&myname=${encodeURIComponent(nameInput)}`;
    
    document.getElementById('login-form-fields').style.display = 'none';
    document.getElementById('invite-area').style.display = 'block';
}

window.copyInviteMessage = function() {
    const message = `ふたりの「今の気配」がわかるアプリを作ってみたよ！🌸\n\n下のURLを開いて、ふたりの部屋名（${currentRoomName}）とあなたの好きなお名前を入れるだけで合流できるよ！待ってるね🥰👇\n${generatedInviteUrl}`;
    
    navigator.clipboard.writeText(message).then(() => {
        alert('📋 LINE用の招待メッセージをコピーしたよ！そのまま貼り付けて送ってね。');
    }).catch(err => {
        alert('コピーに失敗しちゃった。文字を直接選択してコピーしてね！');
    });
}

window.goToRoomActual = function() {
    if (nextJumpUrl) {
        window.location.href = nextJumpUrl;
    }
}

// ==========================================================================
// 🔗 Firebaseデータベースへの接続設定（絶対にブレない一本化アドレス）
// ==========================================================================
let myRef, roomRef;
if (typeof database !== "undefined" && database) {
    myRef = ref(database, `rooms/${roomId}/users/${myId}`);
    roomRef = ref(database, `rooms/${roomId}/users`);
}

// 制限回数（リセット事故を防ぐため100回にしておくよ！）
let uploadLimit = 100;

// ==========================================================================
// 🛡️ 【全消去事故を100%防ぐ】絶対上書きさせない最強保存関数！
// ==========================================================================
window.saveDataToServer = function(messageText, effectEmoji) {
    if (!myRef) return;
    
    const statusElement = document.getElementById('my-current-status');
    if (statusElement) {
        statusElement.innerText = messageText;
    }
    
    // 💡 set ではなく update を使うことで、保存済みの写真（avatar）を絶対に消さずにメッセージだけを更新する！
    update(myRef, {
        message: messageText,
        effect: effectEmoji || "",
        checked: false
    }).then(() => {
        console.log("メッセージの安全更新に成功！");
    }).catch((error) => {
        console.error("送信エラー:", error);
    });
};

// ==========================================================================
// 🛠️ 共通で使う大事な関数
// ==========================================================================

// ✨ エフェクトを画面に出す魔法の関数
window.triggerEffect = function(emojis) {
    const effectLayer = document.getElementById('effect-layer');
    if (!effectLayer) return;
    
    const effectDiv = document.createElement('div');
    effectDiv.className = 'floating-effect';
    effectDiv.innerText = emojis;
    effectLayer.appendChild(effectDiv);
    setTimeout(() => { effectDiv.remove(); }, 2000);
};

// 🚪 ポップアップ開閉の魔法（勝手な上書きをストップ！）
window.openAvatarModal = function() { 
    if (typeof window.loadCustomAvatars === "function") {
        window.loadCustomAvatars();
    }
    const modal = document.getElementById('avatar-modal');
    if (modal) modal.style.display = 'flex'; 
};

window.closeAvatarModal = function() { 
    const modal = document.getElementById('avatar-modal');
    if (modal) modal.style.display = 'none'; 
};
// ==========================================================================
// 📡 部屋にいる「自分以外の人（相手）」＆「自分自身」のデータを自動で画面に映す
// ==========================================================================
if (roomRef) {
    onValue(roomRef, (snapshot) => {
        const allUsersData = snapshot.val();
        if (allUsersData) {
            // 👥 ① 相手のデータを画面に映す魔法
            const userNames = Object.keys(allUsersData);
            const partnerId = userNames.find(name => name !== myId);
            
            if (partnerId) {
                const partnerData = allUsersData[partnerId];
                const partnerTitle = document.querySelector('#partner-area h2');
                if (partnerTitle) partnerTitle.innerText = `${partnerId} のいま`;
                
                if (partnerData.avatar) {
                    document.getElementById('partner-avatar').src = partnerData.avatar;
                }
                if (partnerData.message) {
                    document.getElementById('partner-message').innerText = partnerData.message;
                }
                if (partnerData.effect && partnerData.checked === false) {
                    window.triggerEffect(partnerData.effect);
                    const urlParams = new URLSearchParams(window.location.search);
                    const currentRoomId = urlParams.get('room') || 'default_room';
                    update(ref(database, `rooms/${currentRoomId}/users/${partnerId}`), { checked: true });
                }
            }

            // 🙋‍♀️ ② 自分のデータを画面に映す魔法（更新時のリセットを完全ガード！）
            if (myId && allUsersData[myId]) {
                const myData = allUsersData[myId];
                if (myData.avatar) {
                    const myPreview = document.getElementById('my-avatar-preview');
                    if (myPreview) myPreview.src = myData.avatar;
                }
                if (myData.message) {
                    const myStatus = document.getElementById('my-current-status');
                    if (myStatus) myStatus.innerText = myData.message;
                }
            }
        }
    });
}

// ==========================================================================
// 3. 状態ボタンを押した時の処理
// ==========================================================================
window.changeStatus = function(statusText) {
    let effect = "";
    if (statusText.includes('まったり')) effect = '☕️🍀🏠';
    else if (statusText.includes('勉強')) effect = '🔥💪😤';     
    else if (statusText.includes('パソコン')) effect = '💻👀⚡️';
    else if (statusText.includes('おやつ')) effect = '🍰🍩🧋';
    else if (statusText.includes('寝るね')) effect = '🌙💤⭐️';
    else if (statusText.includes('また明日')) effect = '❤️❤️❤️';    
    else if (statusText.includes('夜更かし草')) effect = '💖✨💘';  

    window.triggerEffect(effect);
    window.saveDataToServer(statusText, effect);
};

// ==========================================================================
// 4. 自由入力のメッセージ送信
// ==========================================================================
window.sendStatus = function() {
    const messageInput = document.getElementById('my-message-text');
    if (messageInput.value.trim() === "") {
        alert("メッセージを入力してね！");
        return;
    }
    const statusText = messageInput.value;
    const statusElement = document.getElementById('my-current-status');
    if (statusElement) statusElement.innerText = statusText;
    
    window.triggerEffect('✨🎉✨');
    window.saveDataToServer(statusText, '✨🎉✨');
    messageInput.value = "";
};

// ✨ アバターを選んだときの処理（メッセージを壊さない安全更新版！）
window.selectPresetAvatar = function(presetId, customSrc) {
    const finalAvatarSrc = customSrc || `image/${presetId}.png`;
    
    const myPreview = document.getElementById('my-avatar-preview');
    if (myPreview) myPreview.src = finalAvatarSrc;
    
    if (typeof myRef !== "undefined" && myRef) {
        if (finalAvatarSrc.startsWith('data:image')) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = 100;
                canvas.height = 100;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 100, 100);
                const tinyAvatarSrc = canvas.toDataURL('image/jpeg', 0.5);
                
                if (myPreview) myPreview.src = tinyAvatarSrc;

                // 💡 update を使うことでメッセージを消さずにアバターだけを更新！
                update(myRef, { avatar: tinyAvatarSrc })
                    .then(() => console.log("超軽量アバターの保存成功！"))
                    .catch((error) => console.error("保存エラー:", error));
            };
            img.src = finalAvatarSrc;
        } else {
            // 💡 ここも update に変更！
            update(myRef, { avatar: finalAvatarSrc })
                .catch((error) => console.error("保存エラー:", error));
        }
    }
};

// ==========================================================================
// 🔍 写真をタップした時に大きく拡大する魔法
// ==========================================================================
window.zoomPhoto = function(element) {
    const modal = document.getElementById('photo-zoom-modal');
    const zoomedImg = document.getElementById('zoomed-photo');
    if (modal && zoomedImg) {
        zoomedImg.src = element.src;
        modal.style.display = 'flex';
    }
};

window.closeZoomModal = function() {
    const modal = document.getElementById('photo-zoom-modal');
    if (modal) modal.style.display = 'none';
};

// ==========================================================================
// 📸 インスタ風画面切り替え（タブ機能）の魔法
// ==========================================================================
window.switchTab = function(tabName) {
    const myArea = document.getElementById('my-area');
    const partnerArea = document.getElementById('partner-area');
    const tabMyBtn = document.getElementById('tab-my');
    const tabPartnerBtn = document.getElementById('tab-partner');

    if (tabName === 'my') {
        if (myArea) myArea.style.display = 'block';
        if (partnerArea) partnerArea.style.display = 'none';
        if (tabMyBtn) {
            tabMyBtn.style.color = '#4caf50';
            tabMyBtn.style.borderBottom = '3px solid #4caf50';
        }
        if (tabPartnerBtn) {
            tabPartnerBtn.style.color = '#888';
            tabPartnerBtn.style.borderBottom = '3px solid transparent';
        }
    } else {
        if (myArea) myArea.style.display = 'none';
        if (partnerArea) partnerArea.style.display = 'block';
        if (tabPartnerBtn) {
            tabPartnerBtn.style.color = '#4caf50';
            tabPartnerBtn.style.borderBottom = '3px solid #4caf50';
        }
        if (tabMyBtn) {
            tabMyBtn.style.color = '#888';
            tabMyBtn.style.borderBottom = '3px solid transparent';
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    if (typeof window.switchTab === 'function') {
        window.switchTab('partner');
    }
});

// 📸 自分の写真をアップロードして【直接Firebaseに安全保存】させる魔法！
window.uploadOwnPhoto = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        compressImage(file, 150, 150, function(compressedDataUrl) {
            if (window.isEditMode && window.currentEditingIndex !== -1) {
                const index = window.currentEditingIndex;
                const presetImg = document.getElementById(`preset-img-${index}`);
                if (presetImg) presetImg.src = compressedDataUrl;

                if (typeof database !== "undefined" && database) {
                    const customAvatarRef = ref(database, `rooms/${roomId}/users/${myId}/custom_avatars/custom_${index}`);
                    set(customAvatarRef, compressedDataUrl).then(() => {
                        alert(`${index}番目の枠を保存したよ！`);
                        window.toggleCustomMode();
                        window.currentEditingIndex = -1;
                    }).catch((error) => console.error("保存エラー:", error));
                }
            } else {
                const myPreview = document.getElementById('my-avatar-preview');
                if (myPreview) myPreview.src = compressedDataUrl;

                if (typeof myRef !== "undefined" && myRef) {
                    // 💡 メッセージを壊さずに、アバターだけを安全に更新！
                    update(myRef, { avatar: compressedDataUrl })
                        .then(() => {
                            console.log("アバター安全更新成功！");
                            window.closeAvatarModal();
                        })
                        .catch((error) => {
                            console.error("保存エラー:", error);
                            window.closeAvatarModal();
                        });
                } else {
                    window.closeAvatarModal();
                }
            }
        });
    }
};

// ==========================================================================
// 💡 【バグ修正完了版】アバター枠・文字カスタム・自分専用完全分離魔法！
// ==========================================================================

// --- ⚙️ アバター用の設定群 ---
window.isEditMode = false;
window.currentEditingIndex = -1;

window.toggleCustomMode = function() {
    window.isEditMode = !window.isEditMode;
    const grid = document.getElementById('preset-avatar-grid');
    const button = document.getElementById('toggle-custom-mode');
    if (window.isEditMode) {
        if(grid) grid.classList.add('edit-mode');
        if(button) {
            button.innerText = "アバターを選ぶモードに戻る";
            button.style.backgroundColor = "#ff9800";
            button.style.boxShadow = "0 3px 0 #e68a00";
        }
    } else {
        if(grid) grid.classList.remove('edit-mode');
        if(button) {
            button.innerText = "⚙️ 6つの枠の写真をカスタムする";
            button.style.backgroundColor = "#888";
            button.style.boxShadow = "0 3px 0 #666";
        }
    }
};

window.handleAvatarClick = function(index, presetId) {
    if (window.isEditMode) {
        window.currentEditingIndex = index;
        const fileInput = document.getElementById('avatar-file-input');
        if (fileInput) fileInput.click(); 
    } else {
        if (typeof checkUploadLimit === "function" && !checkUploadLimit()) {
            alert("本日の変更回数の上限（3回）に達したため、変更できません。");
            return;
        }
        
        // 1. 押した枠の画像を「今すぐ」取得！
        const img = document.getElementById(`preset-img-${index}`);
        const customSrc = img ? img.src : null;

        if (customSrc) {
            // 2. 画面のアイコンを即座に書き換え！
            const myPreview = document.getElementById('my-avatar-preview');
            if (myPreview) myPreview.src = customSrc;

            // 3. 裏でFirebaseへ送信！
            if (typeof saveDataToServer === "function") {
                saveDataToServer("新しい写真を設定したよ！📸", "");
            }
        }

        if (typeof reduceUploadCount === "function") reduceUploadCount();

        // 💡 4. 0.15秒だけ「選んだよ！」の余韻を作ってからシュッと閉じる魔法！
        setTimeout(() => {
            if (typeof window.closeAvatarModal === "function") window.closeAvatarModal();
        }, 150);
    }
};
function compressImage(file, maxWidth, maxHeight, callback) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            } else {
                if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
            }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(compressedDataUrl);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// 💡 修正ポイント：保存先URLに「/users/${myId}」を挟んで自分専用の枠にしたよ！
window.uploadOwnPhoto = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        compressImage(file, 150, 150, function(compressedDataUrl) {
            if (window.isEditMode && window.currentEditingIndex !== -1) {
                const index = window.currentEditingIndex;
                const urlParams = new URLSearchParams(window.location.search);
                const roomName = urlParams.get('room') || 'default_room';
                const userName = urlParams.get('myname') || 'default_user';
                
                if (typeof database !== "undefined" && database) {
                    // 自分専用のフォルダの中にカスタムアバターを保存する
                    const customAvatarRef = ref(database, `rooms/${roomName}/users/${userName}/custom_avatars/custom_${index}`);
                    set(customAvatarRef, compressedDataUrl).then(() => {
                        alert(`${index}番目の枠をあなた専用に完全保存しました！`);
                        window.toggleCustomMode();
                        window.currentEditingIndex = -1;
                    }).catch((error) => { console.error("保存エラー:", error); });
                }
            } else {
                if (typeof checkUploadLimit === "function" && !checkUploadLimit()) { alert("本日の変更回数の上限です"); return; }
                const myPreview = document.getElementById('my-avatar-preview');
                if (myPreview) myPreview.src = compressedDataUrl;
                if (typeof saveDataToServer === "function") { saveDataToServer("新しい写真を設定したよ！📸", ""); }
                if (typeof reduceUploadCount === "function") reduceUploadCount();
                window.closeAvatarModal();
            }
        });
    }
};

// 💡 【上書きバグ防止版】カスタム枠だけを安全に読み込む魔法！
window.loadCustomAvatars = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room') || 'default_room';
    const userName = urlParams.get('myname') || 'default_user';
    
    if (typeof database !== "undefined" && database) {
        const customAvatarsRef = ref(database, `rooms/${roomName}/users/${userName}/custom_avatars`);
        
        // onValue ではなく get（1回だけ読み込み）にしてループ上書き事故をガード！
        if (typeof get === "function") {
            get(customAvatarsRef).then((snapshot) => {
                const data = snapshot.val();
                if (data) {
                    for (let i = 1; i <= 6; i++) {
                        // 枠データが存在するときだけ、枠（preset-img）の画像を変更する！
                        if (data[`custom_${i}`]) {
                            const presetImg = document.getElementById(`preset-img-${i}`);
                            if (presetImg) presetImg.src = data[`custom_${i}`];
                        }
                    }
                }
            }).catch((error) => {
                console.error("枠画像読み込みエラー:", error);
            });
        }
    }
};

// --- ⚙️ 文字カスタム用の設定群（こちらも自分専用に分離！） ---
window.isTextEditMode = false;

window.toggleTextCustomMode = function() {
    window.isTextEditMode = !window.isTextEditMode;
    const button = document.getElementById('toggle-text-custom-mode');
    if (window.isTextEditMode) {
        if(button) {
            button.innerText = "文字を選ぶモードに戻る";
            button.style.backgroundColor = "#9c27b0";
            button.style.boxShadow = "0 3px 0 #7b1fa2";
        }
        alert("文字のカスタムモードになりました！変更したいボタンをポチッと押してね。");
    } else {
        if(button) {
            button.innerText = "⚙️ 7つの文字をカスタムする";
            button.style.backgroundColor = "#888";
            button.style.boxShadow = "0 3px 0 #666";
        }
    }
};

window.handleTextClick = function(index, defaultText) {
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room') || 'default_room';
    const userName = urlParams.get('myname') || 'default_user';

    if (window.isTextEditMode) {
        const currentBtn = document.getElementById(`status-btn-${index}`);
        const currentText = currentBtn ? currentBtn.innerText : defaultText;
        const newText = prompt(`【${index + 1}番目のボタン】新しい文字を入力してね：`, currentText);
        
        if (newText !== null && newText.trim() !== "") {
            if (typeof database !== "undefined" && database) {
                // 文字も自分専用のフォルダに保存！
                const textRef = ref(database, `rooms/${roomName}/users/${userName}/custom_texts/text_${index}`);
                set(textRef, newText).then(() => {
                    alert(`ボタンの文字を「${newText}」に完全保存しました！`);
                    window.toggleTextCustomMode();
                }).catch((error) => { console.error("文字保存エラー:", error); });
            }
        }
    } else {
        const currentBtn = document.getElementById(`status-btn-${index}`);
        const selectedText = currentBtn ? currentBtn.innerText : defaultText;
        if (typeof saveDataToServer === "function") {
            saveDataToServer(selectedText, "");
        }
    }
};

window.loadCustomTexts = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room') || 'default_room';
    const userName = urlParams.get('myname') || 'default_user';
    
    if (typeof database !== "undefined" && database) {
        const customTextsRef = ref(database, `rooms/${roomName}/users/${userName}/custom_texts`);
        onValue(customTextsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                for (let i = 0; i < 7; i++) {
                    if (data[`text_${i}`]) {
                        const btn = document.getElementById(`status-btn-${i}`);
                        if (btn) btn.innerText = data[`text_${i}`];
                    }
                }
            }
        });
    }
};


// 🛡️ 【絶対全消しさせない！】自分専用データ安全読み込み魔法（完全版）
window.loadMyPrivateDataOnce = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room') || 'default_room';
    const userName = urlParams.get('myname') || 'default_user';
    
    if (typeof database !== "undefined" && database) {
        const myPrivateRef = ref(database, `rooms/${roomName}/users/${userName}`);
        
        get(myPrivateRef).then((snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                if (data) {
                    // 1. 最新の写真があれば画面に反映！
                    if (data.avatar) {
                        const myPreview = document.getElementById('my-avatar-preview');
                        if (myPreview) myPreview.src = data.avatar;
                    }
                    // 2. 最新のメッセージがあれば画面に反映！
                    if (data.message) {
                        const myStatus = document.getElementById('my-current-status');
                        if (myStatus) myStatus.innerText = data.message;
                    }
                }
            }
        }).catch((error) => {
            console.error("読み込みエラー:", error);
        });
    }
};// 🎬 起動時に安全に読み込む（古い記憶による上書きを完全阻止！）
document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        if (typeof window.loadCustomAvatars === "function") window.loadCustomAvatars();
        // 💡 古い文字読み込み（loadCustomTexts）を削除して、Firebaseの最新データだけを読む！
        if (typeof window.loadMyPrivateDataOnce === "function") window.loadMyPrivateDataOnce();
    }, 500);
});