(() => {
  "use strict";

  const STORAGE_KEY = "kartuli.practice.v1";
  const BATCH_FILES = [
    "exercises/georgian_exercises_1000.json",
    "exercises/georgian_exercises_additional_a1.json"
  ];
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const THEME_LABELS = {
    basic_constructions: "Базовые конструкции",
    possession_cases: "Принадлежность и падежи",
    questions_communication: "Вопросы и общение",
    place_location: "Место и пространство",
    time_tenses: "Время и формы глагола",
    everyday_situations: "Повседневные ситуации",
    feelings_perception: "Глаголы чувств и восприятия",
    action_verbs: "Глаголы действия",
    be_verb: "Глагол «быть»",
    movement_verbs: "Глаголы движения"
  };
  const THEME_ICONS = {
    basic_constructions: "🧩",
    possession_cases: "🔑",
    questions_communication: "❓",
    place_location: "🏠",
    time_tenses: "🕒",
    everyday_situations: "☕",
    feelings_perception: "👁️",
    action_verbs: "💪",
    be_verb: "💀",
    movement_verbs: "🏃"
  };
  const app = document.querySelector("#app");
  const METRICA_ID = 112838302;
  let lastTrackedScreen = "";

  function metric(method, ...args) {
    if (typeof window.ym === "function") window.ym(METRICA_ID, method, ...args);
  }

  function metricGoal(name, params = {}) {
    metric("reachGoal", name, params);
  }

  function trackScreen(screen) {
    if (lastTrackedScreen === screen) return;
    lastTrackedScreen = screen;
    metric("hit", location.pathname + "#" + screen, { title: screen, params: { screen } });
  }
  const version = document.documentElement.dataset.version || "dev";
  let exercises = [];
  let exerciseById = new Map();
  let store = loadStore();
  let state = {
    screen: "home",
    selectedThemes: [],
    count: 5,
    difficulty: 1,
    active: store.trainings.active,
    summary: null,
    error: "",
    progressMessages: {}
  };

  function emptyStore() {
    return {
      version: 1,
      exercises: {},
      themes: {},
      trainings: { completed: 0, lastCompletedAt: null, active: null },
      settings: { theme: "light" }
    };
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyStore();
      const parsed = JSON.parse(raw);
      const fresh = emptyStore();
      const savedExercises = parsed.exercises && typeof parsed.exercises === "object" ? parsed.exercises : {};
      Object.values(savedExercises).forEach(record => {
        if (record && record.correct === 0 && record.incorrect > 0) record.completed = false;
      });
      return {
        ...fresh,
        ...parsed,
        exercises: savedExercises,
        themes: parsed.themes && typeof parsed.themes === "object" ? parsed.themes : {},
        trainings: { ...fresh.trainings, ...(parsed.trainings || {}) },
        settings: { ...fresh.settings, ...(parsed.settings || {}) }
      };
    } catch {
      return emptyStore();
    }
  }

  function saveStore() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      state.error = "Не удалось сохранить прогресс в браузере";
    }
  }

  function applyTheme() {
    document.body.classList.toggle("dark", store.settings.theme === "dark");
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[char]));
  }

  function normalizeAnswer(value) {
    return String(value ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ");
  }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
      const random = Math.random() * 16 | 0;
      const value = char === "x" ? random : (random & 0x3 | 0x8);
      return value.toString(16);
    });
  }

  async function loadExercises() {
    const loaded = await Promise.all(BATCH_FILES.map(async file => {
      const response = await fetch(`${file}?v=${encodeURIComponent(version)}`, { cache: "no-cache" });
      if (!response.ok) throw new Error(`${file}: ${response.status}`);
      return response.json();
    }));
    const seen = new Set();
    const valid = [];
    loaded.flat().forEach(item => {
      const answers = Array.isArray(item?.answers) ? item.answers.filter(value => typeof value === "string" && value.trim()).map(value => value.trim()) : [];
      const themes = Array.isArray(item?.themes) ? item.themes.filter(value => typeof value === "string" && value.trim()).map(value => value.trim()) : [];
      const taskPhrase = typeof item?.task_phrase === "string" && item.task_phrase.trim() ? item.task_phrase.trim() : "";
      if (!UUID_RE.test(item?.id || "") || typeof item?.task !== "string" || !item.task.trim() || !answers.length || !themes.length || seen.has(item.id)) return;
      seen.add(item.id);
      valid.push({ id: item.id, task: item.task.trim(), taskPhrase, answers, themes, difficulty: Number.isFinite(item?.difficulty) ? item.difficulty : null });
    });
    if (!valid.length) throw new Error("Нет валидных упражнений");
    return valid;
  }

  function allThemes() {
    return [...new Set(exercises.flatMap(item => item.themes))].sort((a, b) => a.localeCompare(b));
  }

  function themeLabel(theme) {
    return THEME_LABELS[theme] || theme;
  }

  function completedCount() {
    return exercises.filter(item => store.exercises[item.id]?.completed).length;
  }

  function progressPercent() {
    return exercises.length ? Math.round(completedCount() / exercises.length * 100) : 0;
  }

  function activeExercise() {
    return state.active ? exerciseById.get(state.active.exerciseIds[state.active.position]) : null;
  }

  function progressMessageBand(done, percent) {
    if (done === 0) return "zero";
    if (percent <= 10) return "early";
    if (percent <= 20) return "steady-start";
    if (percent <= 50) return "middle";
    if (percent <= 70) return "advanced";
    return "finish";
  }

  function progressMessage(done, percent) {
    const messages = {
      zero: ["Самое время начать!", "Первое задание ждёт!", "Сделай первый шаг!"],
      early: ["Всё только начинается", "Начало положено", "Первые задания позади", "Хорошее начало"],
      "steady-start": ["Первый шаг сделан. Двигайся дальше", "Уже есть прогресс. Продолжай", "Постепенно набираешь темп", "Начало есть. Впереди ещё много практики"],
      middle: ["Уже заметная часть пути позади", "Хороший темп. Продолжай", "Ты уверенно продвигаешься", "Всё больше материала уже знакомо", "Почти половина пути позади"],
      advanced: ["Большая часть пути пройдена. Продолжай!", "Больше половины уже позади!", "Основная часть уже знакома"],
      finish: ["Осталось совсем немного", "Финиш уже близко", "Почти весь набор пройден", "Ещё немного — и весь набор позади", "Ты уже знаешь почти весь этот материал"]
    };
    const band = progressMessageBand(done, percent);
    if (!state.progressMessages[band]) {
      const options = messages[band];
      state.progressMessages[band] = options[Math.floor(Math.random() * options.length)];
    }
    return state.progressMessages[band];
  }

  function header(title = "", back = false, showTheme = true) {
    const brand = back
      ? `<button class="back-button" data-action="home" aria-label="Назад">‹</button>`
      : `<div class="logo">${escapeHtml(title || "ქართული")}</div>`;
    const heading = back && title ? `<div class="header-title">${escapeHtml(title)}</div>` : `<div class="header-title"></div>`;
    return `<header>${brand}${heading}${showTheme ? `<button class="icon-button" data-action="theme" aria-label="Сменить тему">${store.settings.theme === "dark" ? "☾" : "☀"}</button>` : ""}</header>`;
  }

  function home() {
    const total = exercises.length;
    const done = completedCount();
    const percent = progressPercent();
    const paused = state.active && state.active.position < state.active.exerciseIds.length;
    const activeDone = paused ? state.active.position : 0;
    return `${header("ქართული практика")}
      <section class="fade-in">
        <p class="lead">Немного грузинского — без оценок и дедлайнов</p>
        <div class="progress-overview">
          <div class="stat"><b>${done}</b><small>заданий пройдено</small></div>
          <div class="stat"><b>${percent}%</b><small>от всего набора</small></div>
          <div class="stat"><b>${store.trainings.completed}</b><small>тренировок</small></div>
        </div>
        ${percent >= 90 ? `<div class="card cta"><strong>Почти весь набор заданий пройден</strong><p>Для расширения набора заданий — сообщение в tg</p></div>` : ""}
        ${paused ? `<button class="card card-button paused-card" data-action="resume">
          <div class="paused-title">Незавершённая тренировка</div>
          <div class="muted">${activeDone} из ${state.active.exerciseIds.length} заданий пройдено</div>
          <div class="progress-line"><div class="progress-track"><i style="width:${activeDone / state.active.exerciseIds.length * 100}%"></i></div><span class="progress-number">Продолжить</span></div>
        </button>` : ""}
        <button class="primary" data-action="setup">${paused ? "Новая тренировка" : "Тренировка"}</button>
        <h2>Твой прогресс</h2>
        ${progressWidget()}
        ${state.error ? `<div class="error">${escapeHtml(state.error)}</div>` : ""}
      </section>`;
  }

  function progressWidget() {
    const themes = allThemes();
    if (!themes.length) return `<div class="empty">Темы пока не загружены</div>`;
    const percent = progressPercent();
    const circumference = 220;
    const offset = circumference - (circumference * percent / 100);
    const islandCards = themes.map((theme, index) => {
      const total = exercises.filter(item => item.themes.includes(theme)).length;
      const done = exercises.filter(item => item.themes.includes(theme) && store.exercises[item.id]?.completed).length;
      const value = total ? Math.round(done / total * 100) : 0;
      return `<div class="progress-island island-${index % 4}"><div class="progress-island-icon" aria-hidden="true">${THEME_ICONS[theme] || "✦"}</div><strong>${escapeHtml(themeLabel(theme))}</strong><small>${done} / ${total} заданий · ${value}%</small><div class="progress-island-track"><b style="width:${value}%"></b></div></div>`;
    }).join("");
    return `<div class="progress-widget"><div class="progress-overview"><div class="progress-ring"><svg viewBox="0 0 86 86" aria-hidden="true"><circle class="ring-track" cx="43" cy="43" r="35"></circle><circle class="ring-fill" cx="43" cy="43" r="35" style="stroke-dashoffset:${offset}"></circle></svg><b>${percent}%</b></div><div class="progress-copy"><strong>${escapeHtml(progressMessage(completedCount(), percent))}</strong><span>${completedCount()} из ${exercises.length} заданий</span></div></div><div class="progress-islands" aria-label="Прогресс по темам">${islandCards}</div></div>`;
  }

  function setup() {
    const themes = allThemes();
    return `${header("Новая тренировка", true)}
      <section class="slide-in">
        <div class="section-label">Темы</div>
        <div class="section-help">Выбери одну или несколько тем</div>
        <div class="topic-cloud">${themes.map(theme => `<button class="topic-chip ${state.selectedThemes.includes(theme) ? "selected" : ""}" data-action="theme-chip" data-theme="${escapeHtml(theme)}"><span class="check">✓</span>${escapeHtml(themeLabel(theme))}</button>`).join("")}</div>
        <div class="section-label">Сложность</div>
        <div class="section-help">Выбери, насколько сложными будут задания</div>
        <div class="difficulty-panel">
          <div class="difficulty-heading"><span>Легче</span><strong>${difficultyLabel(state.difficulty)}</strong><span>Сложнее</span></div>
          <input class="difficulty-slider" type="range" min="1" max="4" step="1" value="${state.difficulty}" style="--difficulty-progress: ${(state.difficulty - 1) / 3 * 100}%" data-action="difficulty" aria-label="Сложность" aria-valuemin="1" aria-valuemax="4" aria-valuenow="${state.difficulty}" aria-valuetext="${escapeHtml(difficultyLabel(state.difficulty))}">
        </div>
        <div class="section-label">Количество заданий</div>
        <div class="quantity-panel">
          <div class="stepper"><button class="step-button" data-action="count" data-delta="-1" aria-label="Уменьшить">−</button><div class="step-value">${state.count}</div><button class="step-button" data-action="count" data-delta="1" aria-label="Увеличить">+</button></div>
          <div class="presets">${[5, 8, 10, 15].map(count => `<button class="preset ${state.count === count ? "selected" : ""}" data-action="preset" data-count="${count}">${count}</button>`).join("")}</div>
        </div>
        <button class="primary" data-action="start" ${state.selectedThemes.length ? "" : "disabled"}>Начать тренировку</button>
      </section>`;
  }

  function difficultyLabel(level) {
    return ["Только лёгкие", "В основном лёгкие", "Поровну лёгких и средних", "Средние и сложные"][level - 1] || "Только лёгкие";
  }

  function exerciseScreen() {
    const item = activeExercise();
    if (!item) return `<div class="empty">Тренировка не найдена</div>`;
    const revealed = Boolean(state.active.revealed[item.id]);
    const entered = state.active.answers[item.id] || "";
    const position = state.active.position + 1;
    const total = state.active.exerciseIds.length;
    const answerIsCorrect = revealed && item.answers.some(answer => normalizeAnswer(answer) === normalizeAnswer(entered));
    return `${header("Тренировка", true, false)}
      <section class="slide-in exercise-screen">
        <div class="training-top"><span>${position} / ${total}</span><div class="progress-track"><i style="width:${position / total * 100}%"></i></div></div>
        ${item.taskPhrase ? `<div class="task-instruction">${escapeHtml(item.task)}</div><h1 class="question">${escapeHtml(item.taskPhrase)}</h1>` : `<h1 class="question">${escapeHtml(item.task)}</h1>`}
        <textarea id="answer" aria-label="Вариант ответа" placeholder="Введи свой вариант…">${escapeHtml(entered)}</textarea>
        ${revealed ? `<div class="answer-panel ${answerIsCorrect ? "answer-correct" : "answer-incorrect"}"><div class="answer-label">Возможный ответ${item.answers.length > 1 ? "ы" : ""}</div>${item.answers.map(answer => `<div class="answer">${escapeHtml(answer)}</div>`).join("")}</div>` : ""}
        <div class="exercise-actions">
          ${revealed ? `<button class="primary" data-action="result" data-result="correct">Отметить пройденным</button><button class="result-button needs" data-action="result" data-result="needsPractice">На повторение</button>` : `<button class="primary" data-action="reveal">Ответ</button>`}
        </div>
      </section>`;
  }

  function resultScreen() {
    const summary = state.summary || { total: 0, completed: 0, needsPractice: 0 };
    return `${header()}
      <section class="completion fade-in"><div class="big-check">✓</div><h1>Тренировка завершена</h1><p class="muted">Практика продолжается небольшими шагами</p>
        <div class="progress-overview"><div class="stat"><b>${summary.total}</b><small>заданий</small></div><div class="stat"><b>${summary.completed}</b><small>получилось</small></div><div class="stat"><b>${summary.needsPractice}</b><small>повторить</small></div></div>
        <button class="primary" data-action="home">На главный экран</button>
      </section>`;
  }

  function render() {
    applyTheme();
    if (state.screen === "home") app.innerHTML = home();
    if (state.screen === "setup") app.innerHTML = setup();
    if (state.screen === "exercise") app.innerHTML = exerciseScreen();
    if (state.screen === "result") app.innerHTML = resultScreen();
    trackScreen(state.screen);
  }

  function persistActive() {
    store.trainings.active = state.active;
    saveStore();
  }

  function focusAnswerField() {
    requestAnimationFrame(() => {
      const answerField = app.querySelector("#answer");
      if (answerField) {
        answerField.focus();
        answerField.setSelectionRange(answerField.value.length, answerField.value.length);
      }
    });
  }

  function exercisePickWeight(item) {
    const passed = Number(store.exercises[item.id]?.correct || 0);
    if (passed > 10) return 0;
    if (passed > 8) return 1 / 3;
    if (passed > 5) return 1 / 2;
    return 1;
  }

  function weightedSampleFromPool(items, count) {
    const available = items.map(item => ({ item, weight: exercisePickWeight(item) })).filter(entry => entry.weight > 0);
    const selected = [];
    while (available.length && selected.length < count) {
      const totalWeight = available.reduce((sum, entry) => sum + entry.weight, 0);
      let point = Math.random() * totalWeight;
      const selectedIndex = available.findIndex(entry => {
        point -= entry.weight;
        return point < 0;
      });
      const index = selectedIndex === -1 ? available.length - 1 : selectedIndex;
      selected.push(available[index].item);
      available.splice(index, 1);
    }
    return selected;
  }

  function weightedSample(items, count) {
    const ratios = {
      1: { 1: 1 },
      2: { 1: 0.75, 2: 0.25 },
      3: { 1: 0.5, 2: 0.5 },
      4: { 2: 0.5, 3: 0.5 }
    }[state.difficulty] || { 1: 1 };
    const selected = [];
    let allocated = 0;
    Object.entries(ratios).forEach(([difficulty, ratio], index, entries) => {
      const requested = index === entries.length - 1 ? count - allocated : Math.round(count * ratio);
      const picks = weightedSampleFromPool(items.filter(item => item.difficulty === Number(difficulty) && !selected.includes(item)), requested);
      selected.push(...picks);
      allocated += picks.length;
    });
    if (selected.length < count) {
      const allowed = new Set(Object.keys(ratios).map(Number));
      selected.push(...weightedSampleFromPool(items.filter(item => allowed.has(item.difficulty) && !selected.includes(item)), count - selected.length));
    }
    return selected;
  }

  function startTraining() {
    const pool = exercises.filter(item => state.selectedThemes.some(theme => item.themes.includes(theme)));
    const shuffled = weightedSample(pool, Math.min(state.count, pool.length));
    if (!shuffled.length) {
      state.error = "Для выбранных тем пока нет заданий";
      state.screen = "home";
      render();
      return;
    }
    if (state.active && state.active.position < state.active.exerciseIds.length && !window.confirm("Замена незавершённой тренировки?")) return;
    metricGoal("training_start", { themes: state.selectedThemes.join(","), difficulty: state.difficulty, requested_count: state.count, actual_count: shuffled.length });
    state.active = { id: uuid(), exerciseIds: shuffled.map(item => item.id), position: 0, answers: {}, revealed: {}, results: {}, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state.error = "";
    persistActive();
    state.screen = "exercise";
    render();
    focusAnswerField();
    window.scrollTo(0, 0);
  }

  function recordResult(result) {
    const item = activeExercise();
    if (!item || !state.active) return;
    metricGoal("exercise_result", { result, difficulty: item.difficulty, position: state.active.position + 1 });
    state.active.results[item.id] = result;
    state.active.updatedAt = new Date().toISOString();
    const record = store.exercises[item.id] || { attempts: 0, correct: 0, incorrect: 0, completed: false, lastAttemptAt: null };
    record.attempts += 1;
    record.completed = result === "correct";
    record.lastAttemptAt = state.active.updatedAt;
    if (result === "correct") record.correct += 1;
    if (result === "needsPractice") record.incorrect += 1;
    store.exercises[item.id] = record;
    item.themes.forEach(theme => {
      const themeRecord = store.themes[theme] || { attempts: 0, lastAttemptAt: null };
      themeRecord.attempts += 1;
      themeRecord.lastAttemptAt = state.active.updatedAt;
      store.themes[theme] = themeRecord;
    });
    if (state.active.position < state.active.exerciseIds.length - 1) {
      state.active.position += 1;
      persistActive();
      render();
      focusAnswerField();
      window.scrollTo(0, 0);
      return;
    }
    const results = Object.values(state.active.results);
    metricGoal("training_complete", { total: state.active.exerciseIds.length, completed: Object.values(state.active.results).filter(value => value === "correct").length, needs_practice: Object.values(state.active.results).filter(value => value === "needsPractice").length });
    state.summary = { total: state.active.exerciseIds.length, completed: results.filter(value => value === "correct").length, needsPractice: results.filter(value => value === "needsPractice").length };
    store.trainings.completed += 1;
    store.trainings.lastCompletedAt = new Date().toISOString();
    store.trainings.active = null;
    state.active = null;
    saveStore();
    state.screen = "result";
    render();
    window.scrollTo(0, 0);
  }

  function handleAction(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "theme") {
      store.settings.theme = store.settings.theme === "dark" ? "light" : "dark";
      metricGoal("theme_toggle", { theme: store.settings.theme });
      saveStore(); render(); return;
    }
    if (action === "home") {
      if (state.screen === "setup") metricGoal("training_setup_abandon", { reason: "back", selected_themes: state.selectedThemes.length });
      if (state.screen === "exercise" && state.active) metricGoal("training_exit", { position: state.active.position + 1, total: state.active.exerciseIds.length });
      state.screen = "home"; render(); return;
    }
    if (action === "setup") { state.error = ""; state.selectedThemes = []; state.screen = "setup"; metricGoal("training_setup_open"); render(); return; }
    if (action === "resume") { metricGoal("training_resume"); state.screen = "exercise"; render(); focusAnswerField(); return; }
    if (action === "theme-chip") {
      const theme = target.dataset.theme;
      state.selectedThemes = state.selectedThemes.includes(theme) ? state.selectedThemes.filter(value => value !== theme) : [...state.selectedThemes, theme];
      metricGoal("theme_select", { theme, selected: state.selectedThemes.includes(theme), selected_count: state.selectedThemes.length });
      render(); return;
    }
    if (action === "count") { state.count = Math.max(1, Math.min(20, state.count + Number(target.dataset.delta))); metricGoal("training_size_change", { count: state.count }); render(); return; }
    if (action === "preset") { state.count = Number(target.dataset.count); metricGoal("training_size_change", { count: state.count }); render(); return; }
    if (action === "difficulty") { state.difficulty = Math.max(1, Math.min(4, Number(target.value))); return; }
    if (action === "start") { startTraining(); return; }
    if (action === "reveal") { const item = activeExercise(); if (item) { metricGoal("answer_reveal", { difficulty: item.difficulty, position: state.active.position + 1 }); state.active.revealed[item.id] = true; state.active.updatedAt = new Date().toISOString(); persistActive(); render(); } return; }
    if (action === "result") { recordResult(target.dataset.result); }
  }

  app.addEventListener("click", handleAction);
  app.addEventListener("input", event => {
    if (event.target.matches(".difficulty-slider")) {
      state.difficulty = Math.max(1, Math.min(4, Number(event.target.value)));
      const label = app.querySelector(".difficulty-heading strong");
      if (label) label.textContent = difficultyLabel(state.difficulty);
      event.target.setAttribute("aria-valuenow", String(state.difficulty));
      event.target.setAttribute("aria-valuetext", difficultyLabel(state.difficulty));
      event.target.style.setProperty("--difficulty-progress", ((state.difficulty - 1) / 3 * 100) + "%");
      return;
    }
    if (event.target.id !== "answer" || !state.active) return;
    const item = activeExercise();
    if (!item) return;
    state.active.answers[item.id] = event.target.value;
    state.active.updatedAt = new Date().toISOString();
    persistActive();
  });
  app.addEventListener("keydown", event => {
    if ((event.key !== "Enter" && event.code !== "Enter") || event.isComposing || !state.active || event.target.id !== "answer") return;
    const item = activeExercise();
    if (!item || state.active.revealed[item.id]) return;
    const revealButton = app.querySelector('[data-action="reveal"]');
    if (!revealButton) return;
    event.preventDefault();
    revealButton.click();
  });
  app.addEventListener("change", event => {
    if (!event.target.matches(".difficulty-slider")) return;
    metricGoal("difficulty_change", { level: state.difficulty });
  });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && state.active) persistActive(); });
  window.addEventListener("pagehide", () => {
    if (state.screen === "setup") metricGoal("training_setup_abandon", { reason: "pagehide", selected_themes: state.selectedThemes.length });
  });

  applyTheme();
  app.innerHTML = `<div class="loading-screen" role="status" aria-label="Загружаем задания">
    <div class="georgian-loader" aria-hidden="true"><span>ქ</span><span>ა</span><span>რ</span><span>თ</span><span>უ</span><span>ლ</span><span>ი</span></div>
    <div class="loading-title">Загружаем задания</div>
    <div class="loading-subtitle">Подготавливается практика</div>
    <div class="loading-track" aria-hidden="true"><i></i></div>
  </div>`;
  loadExercises().then(loaded => {
    exercises = loaded;
    exerciseById = new Map(exercises.map(item => [item.id, item]));
    if (state.active && !state.active.exerciseIds.every(id => exerciseById.has(id))) {
      state.active = null;
      store.trainings.active = null;
      saveStore();
    }
    render();
  }).catch(error => {
    const localFileHint = location.protocol === "file:"
      ? "Откройте проект через локальный HTTP-сервер, а не двойным кликом по HTML"
      : "Доступ к файлам exercises/*.json не подтверждён";
    state.error = localFileHint;
    app.innerHTML = `${header()}<div class="error"><strong>Загрузка не выполнена</strong><p class="muted">${escapeHtml(localFileHint)}</p>${location.protocol === "file:" ? `<p class="muted">В папке kartuli выполните: <code>python3 -m http.server 8000</code>, затем откройте <code>http://localhost:8000/simple_kartuli.html</code></p>` : ""}<p class="small">${escapeHtml(error.message)}</p><button class="primary" onclick="location.reload()">Повторная загрузка</button></div>`;
  });
})();
