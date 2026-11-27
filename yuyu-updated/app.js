const STORAGE_KEY = "todays-window-v1";

const moods = [
  { emoji: "🌧️", label: "많이 힘들어요", level: 0 },
  { emoji: "☁️", label: "무기력해요", level: 0 },
  { emoji: "🌫️", label: "그럭저럭", level: 1 },
  { emoji: "⛅", label: "조금 괜찮아요", level: 2 },
  { emoji: "☀️", label: "의욕이 있어요", level: 3 },
];

const missions = [
  [
    { icon: "💧", name: "물 한 모금 마시기", description: "일어나지 않아도 좋아요. 손 닿는 곳의 물을 한 모금만 마셔요." },
    { icon: "🧘", name: "손가락 한 번 펴기", description: "손가락을 천천히 펴고 힘을 풀어보세요. 그것만으로 충분해요." },
    { icon: "🌿", name: "기지개 살짝 켜기", description: "누운 채로 팔을 편안한 만큼만 뻗어보세요." },
  ],
  [
    { icon: "🪟", name: "창문 쪽 바라보기", description: "창문을 열지 않아도 좋아요. 바깥 빛을 잠깐 바라봐요." },
    { icon: "🥛", name: "물 한 잔 준비하기", description: "마실 수 있다면 좋고, 곁에 두기만 해도 괜찮아요." },
    { icon: "🌬️", name: "숨 세 번 고르기", description: "편한 자세에서 내쉬는 숨을 세 번만 느껴보세요." },
  ],
  [
    { icon: "🪟", name: "창문 1분 열어보기", description: "가능하다면 창문을 열고 들어오는 공기를 느껴보세요." },
    { icon: "🌤️", name: "하늘 사진 한 장", description: "밖으로 나가지 않아도 돼요. 창문 너머 하늘을 찍어봐요." },
    { icon: "🧺", name: "물건 하나 제자리에", description: "눈에 보이는 물건 하나만 편한 곳으로 옮겨봐요." },
  ],
  [
    { icon: "🚶", name: "문 밖 공기 만나기", description: "복도나 집 앞에 잠깐 서보세요. 바로 돌아와도 괜찮아요." },
    { icon: "🏪", name: "가까운 곳 다녀오기", description: "편의점이나 집 앞까지 가볍게 다녀와요. 언제든 돌아와도 좋아요." },
    { icon: "💬", name: "안부 한마디 보내기", description: "편한 사람에게 짧은 인사 하나만 전해봐요." },
  ],
];

const encouragements = [
  "오늘 하루도 여기까지 온 것만으로 충분해요.",
  "느린 걸음도 분명 앞으로 가는 걸음이에요.",
  "쉬어 가도 괜찮아요. 당신의 속도가 있어요.",
  "아주 작은 시작도 소중한 시작이에요.",
];

const $ = (selector) => document.querySelector(selector);
const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = dateKey();
let records = loadRecords();
let selectedSticker = null;
let selectedAfter = null;
let hasPhoto = false;
let photoUrl = null;

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    $(".checkin-card .quiet-note").textContent = "브라우저 저장을 사용할 수 없어, 새로고침하면 기록이 사라질 수 있어요.";
  }
}

function currentRecord() {
  return records[today] || null;
}

function missionFor(record) {
  const list = missions[record.level];
  return list[record.variant % list.length];
}

function setMood(index) {
  const previous = currentRecord();
  if (previous && previous.status !== "active") {
    if (previous.status === "done") previous.before ??= previous.mood;
    previous.mood = index;
    saveRecords();
    render();
    return;
  }
  records[today] = {
    mood: index,
    level: moods[index].level,
    variant: 0,
    status: "active",
    after: null,
    proof: null,
  };
  saveRecords();
  resetProof();
  render();
  $("#mission-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

function easierMission() {
  const record = currentRecord();
  if (!record || record.status !== "active") return;
  if (record.level > 0) record.level -= 1;
  else record.variant += 1;
  saveRecords();
  resetProof();
  render();
}

function differentMission() {
  const record = currentRecord();
  if (!record || record.status !== "active") return;
  record.variant = (record.variant + 1) % missions[record.level].length;
  saveRecords();
  resetProof();
  render();
}

function takeRest() {
  const record = currentRecord();
  if (!record) {
    $("#checkin").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (record.status === "done") return;
  record.status = "rest";
  record.after = null;
  record.proof = null;
  saveRecords();
  resetProof();
  render();
  $("#mission-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetProof() {
  selectedSticker = null;
  selectedAfter = null;
  clearPhoto();
  $("#proof-panel").classList.add("is-hidden");
  document.querySelectorAll("#sticker-options button").forEach((button) => button.setAttribute("aria-pressed", "false"));
}

function updateCompleteButton() {
  $("#complete-mission").disabled = currentRecord()?.status !== "active";
}

function completeMission(onlyComplete = false) {
  const record = currentRecord();
  if (!record || record.status !== "active") return;
  record.status = "done";
  record.before = record.mood;
  record.after = onlyComplete ? null : selectedAfter;
  record.proof = onlyComplete ? null : hasPhoto ? "photo" : selectedSticker;
  saveRecords();
  resetProof();
  render();
}

function clearPhoto() {
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = null;
  hasPhoto = false;
  $("#proof-photo").value = "";
  $("#photo-preview").removeAttribute("src");
  $("#photo-preview-wrap").classList.add("is-hidden");
  $("#photo-status").textContent = "";
}

function moodSummary(record) {
  const before = moods[record.before ?? record.mood];
  const after = moods[record.after];
  return after ? `${before.emoji} → ${after.emoji}` : `${before.emoji} · 이후 기분 미기록`;
}

function lowMoodStreak() {
  let count = 0;
  const day = new Date();
  for (let i = 0; i < 30; i += 1) {
    const record = records[dateKey(day)];
    if (!record || record.mood > 1) break;
    count += 1;
    day.setDate(day.getDate() - 1);
  }
  return count;
}

function renderMoodButtons() {
  $("#mood-options").innerHTML = moods.map((mood, index) => `<button class="mood-option" type="button" data-mood="${index}" aria-pressed="${currentRecord()?.mood === index}"><span class="emoji" aria-hidden="true">${mood.emoji}</span><span class="label">${mood.label}</span></button>`).join("");
  $("#after-options").innerHTML = moods.map((mood, index) => `<button type="button" data-after="${index}" aria-label="${mood.label}" aria-pressed="${selectedAfter === index}">${mood.emoji}</button>`).join("");
}

function renderMission() {
  const record = currentRecord();
  $("#mission-section").classList.toggle("is-hidden", !record);
  if (!record) return;
  const mission = missionFor(record);
  $("#mission-icon").textContent = mission.icon;
  $("#mission-level").textContent = `Lv.${record.level} · ${["아주 가볍게", "가볍게", "한 걸음", "조금 더"][record.level]}`;
  $("#mission-name").textContent = mission.name;
  $("#mission-description").textContent = mission.description;
  $("#mission-actions").classList.toggle("is-hidden", record.status !== "active");
  $("#mission-note").classList.toggle("is-hidden", record.status !== "active");
  if (record.status !== "active") $("#proof-panel").classList.add("is-hidden");
  const complete = $("#complete-panel");
  complete.classList.toggle("is-hidden", record.status === "active");
  if (record.status === "rest") complete.innerHTML = "<strong>오늘은 쉬어 가요 ☾</strong><p>쉬는 날도 소중한 하루예요. 내일 다시 와도 괜찮아요.</p>";
  if (record.status === "done") {
    complete.innerHTML = `<strong>오늘의 작은 걸음을 남겼어요 🌱</strong><p>마음의 날씨 ${moodSummary(record)} · 해낸 일: ${mission.name}</p>`;
  }
}

function renderHistory() {
  const latest = Object.entries(records).filter(([key, value]) => /^\d{4}-\d{2}-\d{2}$/.test(key) && value && Number.isInteger(value.mood) && moods[value.mood]).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
  $("#history").innerHTML = latest.length ? latest.map(([key, value]) => {
    const result = value.status === "done" ? "작은 미션 완료" : value.status === "rest" ? "쉬어 간 날" : "마음 체크인";
    const detail = value.status === "done" ? `${moodSummary(value)} · ${missionFor(value).name}` : moods[value.mood].label;
    return `<div class="history-item"><div class="history-detail"><strong>${key === today ? "오늘" : key.slice(5).replace("-", "월 ") + "일"}</strong><span>${detail}</span></div><span class="history-result">${result}</span></div>`;
  }).join("") : '<p class="history-empty">첫 마음 날씨를 고르면 여기에 기록이 남아요.</p>';
}

function render() {
  renderMoodButtons();
  renderMission();
  renderHistory();
  updateCompleteButton();
  const finished = currentRecord()?.status === "done";
  $("#rest-side-button").disabled = finished;
  $("#rest-side-button").textContent = finished ? "오늘의 미션을 마쳤어요" : "오늘 쉬어 갈래요";
  $("#mood-edit-note").classList.toggle("is-hidden", !currentRecord() || currentRecord().status === "active");
  const streak = lowMoodStreak();
  $("#rest-description").textContent = streak >= 3
    ? "며칠째 마음이 무거웠군요. 오늘은 쉬어 가도 괜찮아요. 필요하면 아래의 전문 상담과 연결해 보세요."
    : "미션이 버거우면 오늘은 쉬어도 괜찮아요. 기록이 끊겨도 불이익은 없어요.";
}

function init() {
  const now = new Date();
  $("#today-label").textContent = `${now.getMonth() + 1}월 ${now.getDate()}일, 오늘의 창문`;
  $("#encouragement").textContent = `“${encouragements[now.getDate() % encouragements.length]}”`;
  $("#mood-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mood]");
    if (button) setMood(Number(button.dataset.mood));
  });
  $("#easier-mission").addEventListener("click", easierMission);
  $("#different-mission").addEventListener("click", differentMission);
  $("#complete-only").addEventListener("click", () => completeMission(true));
  $("#take-rest").addEventListener("click", takeRest);
  $("#rest-side-button").addEventListener("click", takeRest);
  $("#start-proof").addEventListener("click", () => {
    $("#proof-panel").classList.remove("is-hidden");
    $("#proof-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
  $("#sticker-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-sticker]");
    if (!button) return;
    selectedSticker = button.dataset.sticker;
    document.querySelectorAll("#sticker-options button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    updateCompleteButton();
  });
  $("#proof-photo").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    clearPhoto();
    if (file && !file.type.startsWith("image/")) {
      $("#photo-status").textContent = "이미지 파일을 선택해 주세요.";
      return;
    }
    if (file) {
      hasPhoto = true;
      photoUrl = URL.createObjectURL(file);
      $("#photo-preview").src = photoUrl;
      $("#photo-preview-wrap").classList.remove("is-hidden");
      $("#photo-status").textContent = `${file.name} 선택됨 · 사진은 업로드되거나 저장되지 않아요.`;
    }
    updateCompleteButton();
  });
  $("#remove-photo").addEventListener("click", clearPhoto);
  $("#after-options").addEventListener("click", (event) => {
    const button = event.target.closest("[data-after]");
    if (!button) return;
    selectedAfter = Number(button.dataset.after);
    document.querySelectorAll("#after-options button").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    updateCompleteButton();
  });
  $("#complete-mission").addEventListener("click", () => completeMission());
  document.querySelectorAll("[data-reaction]").forEach((button) => button.addEventListener("click", () => {
    $("#reaction-status").textContent = `${button.dataset.reaction} 마음을 골랐어요. 데모 화면이라 실제 전송은 되지 않아요.`;
  }));
  render();
}

init();
