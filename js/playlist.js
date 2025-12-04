import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCP9GGL6osq62sW8SYnYginSbzHOdVB2Bo",
  authDomain: "maum-dam-eum.firebaseapp.com",
  projectId: "maum-dam-eum",
  storageBucket: "maum-dam-eum.appspot.com",
  messagingSenderId: "138811653663",
  appId: "1:138811653663:web:123fda253cacc36c6c9f2a",
  measurementId: "G-6QVZBCV4T3"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const tapeListDiv = document.getElementById("tapeList");

function loadTapesLive() {
  tapeListDiv.innerHTML = "⏳ 데이터를 불러오는 중...";

  const q = query(collection(db, "tapes"), orderBy("timestamp", "desc"));

  onSnapshot(q, (snapshot) => {
    tapeListDiv.innerHTML = ""; // 기존 내용 초기화

    if (snapshot.empty) {
      tapeListDiv.innerHTML = "녹음된 플레이리스트가 아직 없어요.";
      return;
    }

    snapshot.forEach((doc) => {
      const data = doc.data();
      const item = document.createElement("div");
      item.className = "tape";

      const timeStr = data.timestamp?.toDate?.().toLocaleString?.() ||
                      new Date(data.timestamp.seconds * 1000).toLocaleString();

      item.innerHTML = `
        <strong>${data.displayName || "제목 없음"}</strong><br>
        <small>${timeStr}</small><br>
        <audio controls src="${data.url}"></audio>
      `;

      tapeListDiv.appendChild(item);
    });
  });
}

//loadTapesLive();
// 파일 맨 아래 loadTapesLive() 호출을 다음처럼 변경
const tapeListDiv = document.getElementById("tapeList");
if (tapeListDiv) {
  loadTapesLive();
}