const MAX_CUP_VOLUME = 500;
const MAX_WATER = 6;
const doseVolume = { ESPRESSO: 40, REGULAR: 80, LUNGO: 110 };
const doseDuration = { ESPRESSO: 3, REGULAR: 4, LUNGO: 5 };
const doseNames = Object.keys(doseVolume);
const CUSTOMERS_PER_SHIFT = 5;
const customerPool = [
  { name: "Mia", avatar: "👩🏽", color: "#f1c969" },
  { name: "Leo", avatar: "👨🏻", color: "#7fc7bd" },
  { name: "Ava", avatar: "👩🏻", color: "#ee9d91" },
  { name: "Kai", avatar: "👨🏾", color: "#8fc68a" },
  { name: "Zoe", avatar: "👩🏿", color: "#cba2e0" },
  { name: "Noah", avatar: "👨🏽", color: "#8ab8df" },
  { name: "Luna", avatar: "👩🏼", color: "#f0adca" },
  { name: "Eli", avatar: "👨🏿", color: "#e6a45f" },
  { name: "Nia", avatar: "👩🏾", color: "#d7c66b" },
  { name: "Sam", avatar: "👨🏻", color: "#83c4a5" },
  { name: "Maya", avatar: "👩🏽", color: "#e99b70" },
  { name: "Ben", avatar: "👨🏼", color: "#9db8e2" },
];

class GameAudio {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.brewNodes = [];
  }

  ensure() {
    if (!this.enabled) return null;
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      this.context = new AudioContextClass();
    }
    if (this.context.state === "suspended") this.context.resume();
    return this.context;
  }

  note(frequency, duration = 0.12, delay = 0, type = "sine", volume = 0.055) {
    const context = this.ensure();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }

  noise(duration = 0.2, delay = 0, volume = 0.025, cutoff = 900) {
    const context = this.ensure();
    if (!context) return;
    const frameCount = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) data[index] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    source.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(start);
  }

  click() {
    this.note(520, 0.055, 0, "triangle", 0.025);
  }

  capsule() {
    this.note(360, 0.08, 0, "triangle", 0.045);
    this.note(720, 0.11, 0.07, "sine", 0.045);
  }

  refill() {
    this.noise(0.48, 0, 0.022, 1250);
    [330, 410, 520].forEach((frequency, index) => this.note(frequency, 0.1, 0.08 + index * 0.1, "sine", 0.028));
  }

  startBrew() {
    const context = this.ensure();
    if (!context) return;
    this.stopBrew();
    const hum = context.createOscillator();
    const humGain = context.createGain();
    const water = context.createBufferSource();
    const waterFilter = context.createBiquadFilter();
    const waterGain = context.createGain();
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    hum.type = "triangle";
    hum.frequency.value = 92;
    humGain.gain.value = 0.018;
    water.buffer = buffer;
    water.loop = true;
    waterFilter.type = "bandpass";
    waterFilter.frequency.value = 820;
    waterFilter.Q.value = 0.7;
    waterGain.gain.value = 0.014;
    hum.connect(humGain).connect(context.destination);
    water.connect(waterFilter).connect(waterGain).connect(context.destination);
    hum.start();
    water.start();
    this.brewNodes = [hum, water];
  }

  stopBrew() {
    this.brewNodes.forEach((node) => {
      try { node.stop(); } catch (error) { /* already stopped */ }
    });
    this.brewNodes = [];
  }

  pourComplete(size) {
    const notes = size === "ESPRESSO" ? [659] : size === "REGULAR" ? [659, 784] : [659, 784, 988];
    notes.forEach((frequency, index) => this.note(frequency, 0.14, index * 0.1, "sine", 0.048));
  }

  correct(streak) {
    [523, 659, 784].forEach((frequency, index) => this.note(frequency, 0.18, index * 0.1, "sine", 0.055));
    if (streak >= 3) {
      this.note(1047, 0.24, 0.37, "triangle", 0.065);
      this.note(1319, 0.18, 0.48, "sine", 0.04);
    }
  }

  wrong() {
    this.note(330, 0.18, 0, "triangle", 0.042);
    this.note(247, 0.22, 0.14, "triangle", 0.038);
  }

  shiftComplete() {
    [523, 659, 784, 1047, 1319].forEach((frequency, index) => this.note(frequency, 0.22, index * 0.11, "sine", 0.055));
  }

  reset() {
    this.note(440, 0.09, 0, "triangle", 0.03);
    this.note(550, 0.11, 0.08, "triangle", 0.032);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stopBrew();
  }
}

const sound = new GameAudio();
const firstOrder = createShiftOrder(1);
const firstCustomer = pickCustomer();

const state = {
  mode: "off",
  water: 0,
  hasPod: false,
  lidOpen: false,
  brewTimer: null,
  progress: 0,
  cupSize: null,
  cupVolume: 0,
  pourHistory: [],
  customerNumber: 1,
  customer: firstCustomer,
  shiftNumber: 1,
  shiftPosition: 1,
  streak: 0,
  shiftStars: 0,
  targetVolume: firstOrder.total,
  targetPours: firstOrder.pours,
  orderStatus: "active",
  stars: 3,
  unlockedItems: new Set(["machine-classic", "button-classic", "cup-classic"]),
  selectedSkins: { machine: "classic", button: "classic", cup: "classic" },
  rewardTimer: null,
  difficultyTimer: null,
};

const ui = {
  machine: document.querySelector("#machine"),
  displayState: document.querySelector("#displayState"),
  displayMessage: document.querySelector("#displayMessage"),
  pourEquation: document.querySelector("#pourEquation"),
  stateReadout: document.querySelector("#stateReadout"),
  waterMeter: document.querySelector("#waterMeter"),
  podVisualText: document.querySelector("#podVisualText"),
  podHint: document.querySelector("#podHint"),
  podButton: document.querySelector("#podButton"),
  logicMessage: document.querySelector("#logicMessage"),
  powerButton: document.querySelector("#powerButton"),
  lidButton: document.querySelector("#lidButton"),
  lidLabel: document.querySelector("#lidLabel"),
  espressoButton: document.querySelector("#espressoButton"),
  regularButton: document.querySelector("#regularButton"),
  lungoButton: document.querySelector("#lungoButton"),
  refillButton: document.querySelector("#refillButton"),
  cup: document.querySelector("#replaceCupButton"),
  cupLabel: document.querySelector("#cupLabel"),
  customerCard: document.querySelector("#customerCard"),
  customerName: document.querySelector("#customerName"),
  customerAvatar: document.querySelector("#customerAvatar"),
  shiftLabel: document.querySelector("#shiftLabel"),
  difficultyBadge: document.querySelector("#difficultyBadge"),
  customerRequest: document.querySelector("#customerRequest"),
  customerHint: document.querySelector("#customerHint"),
  resetOrderButton: document.querySelector("#resetOrderButton"),
  capacityDialog: document.querySelector("#capacityDialog"),
  capacityMessage: document.querySelector("#capacityMessage"),
  closeDialogButton: document.querySelector("#closeDialogButton"),
  stateNodes: document.querySelectorAll("[data-node]"),
  guideSteps: document.querySelectorAll("[data-guide]"),
  nextAction: document.querySelector("#nextAction"),
  starsCount: document.querySelector("#starsCount"),
  streakChip: document.querySelector("#streakChip"),
  streakCount: document.querySelector("#streakCount"),
  soundToggle: document.querySelector("#soundToggle"),
  soundIcon: document.querySelector("#soundIcon"),
  rewardToast: document.querySelector("#rewardToast"),
  skinOptions: document.querySelectorAll("[data-skin]"),
  shiftDialog: document.querySelector("#shiftDialog"),
  completedShift: document.querySelector("#completedShift"),
  shiftStars: document.querySelector("#shiftStars"),
  nextShiftButton: document.querySelector("#nextShiftButton"),
};

const labels = { off: "OFF", ready: "READY", "no-water": "NO WATER", brewing: "BREWING", paused: "PAUSED", done: "DONE" };

function pickCustomer(previousName = "") {
  const choices = customerPool.filter((customer) => customer.name !== previousName);
  return choices[Math.floor(Math.random() * choices.length)];
}

function welcomeNextCustomer() {
  state.customer = pickCustomer(state.customer.name);
  ui.customerCard.classList.remove("arriving");
  window.requestAnimationFrame(() => ui.customerCard.classList.add("arriving"));
}

function createOrder(pours) {
  let total = 0;
  for (let index = 0; index < pours; index += 1) {
    total += doseVolume[doseNames[Math.floor(Math.random() * doseNames.length)]];
  }
  return { total, pours };
}

function poursForShiftPosition(position) {
  if (position <= 2) return 2;
  if (position <= 4) return 3;
  return 4;
}

function createShiftOrder(position) {
  return createOrder(poursForShiftPosition(position));
}

function difficultyInfo() {
  if (state.targetPours === 2) return { name: "EASY", stars: 1, level: "easy" };
  if (state.targetPours === 3) return { name: "MEDIUM", stars: 2, level: "medium" };
  return { name: "CHALLENGE", stars: 2, level: "challenge" };
}

function showDifficultyBadge() {
  const difficulty = difficultyInfo();
  window.clearTimeout(state.difficultyTimer);
  ui.difficultyBadge.textContent = `${difficulty.name} · +${difficulty.stars} ★`;
  ui.difficultyBadge.dataset.level = difficulty.level;
  ui.difficultyBadge.classList.remove("show");
  window.requestAnimationFrame(() => ui.difficultyBadge.classList.add("show"));
  state.difficultyTimer = window.setTimeout(() => ui.difficultyBadge.classList.remove("show"), 3000);
}

function setMode(nextMode, message, logic) {
  state.mode = nextMode;
  ui.machine.dataset.state = nextMode;
  ui.displayState.textContent = labels[nextMode];
  ui.displayMessage.textContent = message;
  ui.logicMessage.textContent = logic;
  ui.stateReadout.textContent = labels[nextMode];
  ui.stateNodes.forEach((node) => node.classList.toggle("active", node.dataset.node === nextMode));
  render();
}

function render() {
  ui.waterMeter.style.height = `${(state.water / MAX_WATER) * 100}%`;
  ui.machine.classList.toggle("lid-open", state.lidOpen);
  ui.podButton.classList.toggle("loaded", state.hasPod);
  ui.podVisualText.textContent = state.hasPod ? "●" : "+";
  ui.lidButton.setAttribute("aria-pressed", state.lidOpen);
  ui.powerButton.setAttribute("aria-pressed", state.mode !== "off");
  ui.lidLabel.textContent = state.lidOpen ? "⇩" : "⇧";
  ui.lidButton.setAttribute("aria-label", state.lidOpen ? "Lower lever" : "Lift lever");
  ui.podHint.textContent = state.lidOpen ? (state.hasPod ? "Capsule loaded." : "Tap capsule to load.") : "Lift lever to load.";
  ui.cupLabel.textContent = `${Math.round(currentCupVolume())} ml`;
  ui.cup.style.setProperty("--fill-level", `${(currentCupVolume() / MAX_CUP_VOLUME) * 82}%`);
  if (state.pourHistory.length > 0) {
    const completedTotal = state.pourHistory.reduce((total, amount) => total + amount, 0);
    ui.pourEquation.textContent = `${state.pourHistory.join(" + ")} = ${completedTotal} ml`;
    ui.pourEquation.hidden = false;
  } else {
    ui.pourEquation.textContent = "";
    ui.pourEquation.hidden = true;
  }

  [ui.espressoButton, ui.regularButton, ui.lungoButton].forEach((button) => {
    const size = button.id.replace("Button", "").toUpperCase();
    button.classList.toggle("selected", state.cupSize === size);
    button.setAttribute("aria-pressed", state.cupSize === size);
    button.disabled = state.mode === "brewing" || state.mode === "paused" || state.orderStatus !== "active";
  });

  renderCustomer();
  renderRewards();
  updateGuide();
}

function renderRewards() {
  ui.starsCount.textContent = state.stars;
  ui.streakCount.textContent = state.streak >= 3 ? `${state.streak} · +1 ★` : `${state.streak} / 3`;
  ui.streakChip.classList.toggle("hot", state.streak >= 3);
  ui.soundToggle.setAttribute("aria-pressed", sound.enabled);
  ui.soundToggle.setAttribute("aria-label", sound.enabled ? "Turn sound off" : "Turn sound on");
  ui.soundIcon.textContent = sound.enabled ? "🔊" : "🔇";
  ui.machine.dataset.skin = state.selectedSkins.machine;
  ui.machine.dataset.buttonSkin = state.selectedSkins.button;
  ui.machine.dataset.cupSkin = state.selectedSkins.cup;
  ui.skinOptions.forEach((option) => {
    const category = option.dataset.category;
    const skin = option.dataset.skin;
    const itemKey = `${category}-${skin}`;
    option.classList.toggle("selected", skin === state.selectedSkins[category]);
    option.classList.toggle("locked", !state.unlockedItems.has(itemKey));
    option.setAttribute("aria-pressed", skin === state.selectedSkins[category]);
  });
}

function orderStars() {
  return state.targetPours >= 3 ? 2 : 1;
}

function changeStars(amount, message) {
  state.stars = Math.max(0, state.stars + amount);
  state.shiftStars += amount;
  showReward(message);
}

function showReward(message) {
  window.clearTimeout(state.rewardTimer);
  ui.rewardToast.textContent = message;
  ui.rewardToast.classList.add("show");
  state.rewardTimer = window.setTimeout(() => ui.rewardToast.classList.remove("show"), 2200);
}

function currentCupVolume() {
  if (state.mode === "brewing" || state.mode === "paused") {
    return state.cupVolume + (state.progress / doseDuration[state.cupSize]) * doseVolume[state.cupSize];
  }
  return state.cupVolume;
}

function renderCustomer() {
  ui.customerName.textContent = state.customer.name;
  ui.customerAvatar.textContent = state.customer.avatar;
  ui.customerCard.style.setProperty("--customer-accent", state.customer.color);
  ui.shiftLabel.textContent = `SHIFT ${state.shiftNumber} · ${state.shiftPosition} / ${CUSTOMERS_PER_SHIFT}`;
  ui.customerCard.dataset.feedback = state.orderStatus === "wrong" ? "wrong" : state.orderStatus === "serving" ? "correct" : "active";
  if (state.orderStatus === "wrong") {
    ui.customerRequest.textContent = `“Oops—this is ${state.cupVolume} ml.”`;
    ui.customerHint.textContent = `NEED ${state.targetVolume} ML · TAP CUP`;
  } else if (state.orderStatus === "serving") {
    ui.customerRequest.textContent = "“Perfect!”";
    ui.customerHint.textContent = "NEXT CUSTOMER";
  } else if (state.orderStatus === "shift-complete") {
    ui.customerRequest.textContent = "“Shift done!”";
    ui.customerHint.textContent = "STARS SAVED";
  } else {
    ui.customerRequest.textContent = `“${state.targetVolume} ml, please!”`;
    ui.customerHint.textContent = "";
  }
}

function updateGuide() {
  let activeGuide = "power";
  let nextAction = "PRESS POWER";

  if (state.orderStatus === "shift-complete") {
    activeGuide = "cup";
    nextAction = "SHIFT COMPLETE";
  } else if (state.orderStatus === "wrong") {
    activeGuide = "cup";
    nextAction = "CLICK CUP TO REMAKE";
  } else if (state.orderStatus === "serving") {
    activeGuide = "cup";
    nextAction = "SERVING…";
  } else if (state.mode !== "off" && state.mode === "done" && state.cupVolume === state.targetVolume) {
    activeGuide = "cup";
    nextAction = "CLICK CUP TO SERVE";
  } else if (state.mode !== "off" && state.cupVolume >= MAX_CUP_VOLUME) {
    activeGuide = "cup";
    nextAction = "CUP FULL · SERVE IT";
  } else if (state.mode !== "off" && state.water === 0) {
    activeGuide = "water";
    nextAction = "ADD WATER";
  } else if (state.mode !== "off" && state.mode === "paused") {
    activeGuide = "capsule";
    nextAction = "LOWER LEVER TO RESUME";
  } else if (state.mode !== "off" && (!state.hasPod || state.lidOpen)) {
    activeGuide = "capsule";
    nextAction = state.lidOpen ? "TAP THE POD" : "LIFT LEVER";
  } else if (state.mode === "brewing") {
    activeGuide = "cup";
    nextAction = "BREWING…";
  } else if (state.mode !== "off") {
    activeGuide = "cup";
    nextAction = "CHOOSE A POUR";
  }

  ui.machine.classList.remove("guide-power", "guide-water", "guide-capsule", "guide-cup");
  ui.machine.classList.add(`guide-${activeGuide}`);
  ui.nextAction.textContent = nextAction;
  ui.guideSteps.forEach((step) => {
    const name = step.dataset.guide;
    step.classList.toggle("active", name === activeGuide);
    step.classList.toggle("complete", (name === "power" && state.mode !== "off") || (name === "water" && state.water > 0) || (name === "capsule" && state.hasPod && !state.lidOpen) || (name === "cup" && state.mode === "done"));
  });
}

function stopBrewing() {
  window.clearInterval(state.brewTimer);
  state.brewTimer = null;
  sound.stopBrew();
}

function finishCoffee() {
  stopBrewing();
  state.water -= 1;
  state.hasPod = false;
  state.lidOpen = false;
  state.cupVolume += doseVolume[state.cupSize];
  state.pourHistory.push(doseVolume[state.cupSize]);
  sound.pourComplete(state.cupSize);
  setMode("done", `${doseVolume[state.cupSize]} ml added. Add more, or serve the guest.`, "if the brew timer finishes, add the selected amount to the cup total and wait for the user to serve it.");
}

function beginTimer() {
  sound.startBrew();
  state.brewTimer = window.setInterval(() => {
    state.progress += 1;
    if (state.progress >= doseDuration[state.cupSize]) {
      finishCoffee();
    } else {
      render();
    }
  }, 500);
}

function startBrewing(size) {
  state.cupSize = size;
  state.progress = 0;
  setMode("brewing", `${doseVolume[size]} ml is brewing.`, "if power is on, water is available, and a capsule is loaded, add the selected pour.");
  beginTimer();
}

function tryBrew(size) {
  if (state.mode === "off") {
    ui.logicMessage.textContent = "if power = off, block brewing. The machine must be on first.";
    return;
  }
  if (state.cupVolume + doseVolume[size] > MAX_CUP_VOLUME) {
    showCapacityDialog(size);
    return;
  }
  if (state.water === 0) {
    setMode("no-water", "The tank is empty. Add water first.", "if water = 0, change state to no water instead of brewing.");
    return;
  }
  if (!state.hasPod) {
    ui.logicMessage.textContent = "Load a capsule first.";
    return;
  }
  if (state.lidOpen) {
    ui.logicMessage.textContent = "Lower the lever before brewing.";
    return;
  }
  if (state.mode === "ready" || state.mode === "done" || state.mode === "no-water") startBrewing(size);
}

ui.powerButton.addEventListener("click", () => {
  sound.click();
  stopBrewing();
  state.lidOpen = false;
  if (state.mode === "off") {
    setMode("ready", "Machine is on. Add water and load a capsule.", "if power is pressed while off, change state to ready.");
  } else {
    setMode("off", "Machine is off.", "if power is pressed, stop the current process and set state to off.");
  }
});

ui.refillButton.addEventListener("click", () => {
  sound.refill();
  state.water = MAX_WATER;
  if (state.mode === "no-water") {
    setMode("ready", "Tank refilled. Continue the order.", "if water is refilled while empty, return to ready.");
  } else {
    render();
    ui.logicMessage.textContent = "water is full. Continue making the current order.";
  }
});

ui.lidButton.addEventListener("click", () => {
  sound.click();
  if (state.mode === "off") {
    state.lidOpen = !state.lidOpen;
    render();
    ui.logicMessage.textContent = "The lever can move, but the machine is still off.";
    return;
  }
  state.lidOpen = !state.lidOpen;
  if (state.mode === "brewing" && state.lidOpen) {
    stopBrewing();
    setMode("paused", "Lever lifted. Brewing is paused.", "if lever is lifted while brewing, set state to paused.");
  } else if (state.mode === "paused" && !state.lidOpen) {
    setMode("brewing", "Lever lowered. Brewing resumes.", "if lever is lowered while paused, return to brewing.");
    beginTimer();
  } else {
    render();
  }
});

ui.podButton.addEventListener("click", () => {
  if (!state.lidOpen) {
    ui.logicMessage.textContent = "Lift the lever before loading a capsule.";
    return;
  }
  if (state.mode === "brewing" || state.mode === "paused" || state.orderStatus !== "active") {
    ui.logicMessage.textContent = "The capsule cannot be changed right now.";
    return;
  }
  state.hasPod = !state.hasPod;
  if (state.hasPod) sound.capsule();
  else sound.click();
  render();
  ui.logicMessage.textContent = state.hasPod ? "capsule = loaded." : "capsule = empty.";
});

ui.espressoButton.addEventListener("click", () => { sound.click(); tryBrew("ESPRESSO"); });
ui.regularButton.addEventListener("click", () => { sound.click(); tryBrew("REGULAR"); });
ui.lungoButton.addEventListener("click", () => { sound.click(); tryBrew("LUNGO"); });

ui.cup.addEventListener("click", () => {
  if (state.mode !== "done") {
    ui.logicMessage.textContent = "Finish the current pour before serving the cup.";
    return;
  }
  if (state.orderStatus === "wrong") {
    remakeOrder();
  } else if (state.cupVolume === state.targetVolume) {
    serveCorrectOrder();
  } else {
    state.orderStatus = "wrong";
    const stars = orderStars();
    state.streak = 0;
    sound.wrong();
    changeStars(-stars, `ORDER MISMATCH · −${stars} ★ · STREAK RESET`);
    render();
    ui.logicMessage.textContent = "if cup total does not equal the guest request, show an error and let the user remake the same order.";
  }
});

ui.resetOrderButton.addEventListener("click", () => {
  if (state.orderStatus === "serving") return;
  sound.reset();
  stopBrewing();
  state.progress = 0;
  state.cupVolume = 0;
  state.pourHistory = [];
  state.cupSize = null;
  state.hasPod = false;
  state.lidOpen = false;
  state.orderStatus = "active";
  ui.cup.classList.remove("serving");

  if (state.mode === "off") {
    setMode("off", "Fresh cup ready. Press power when you are ready.", "if reset is pressed while off, clear the order without turning the machine on.");
  } else if (state.water === 0) {
    setMode("no-water", "Fresh cup ready. Refill to try again.", "if reset clears an order with no water left, keep the machine in no-water state.");
  } else {
    setMode("ready", "Fresh cup. Try this guest’s order again.", "if reset is pressed, clear the cup and keep the same guest request.");
  }
  showReward("FRESH CUP · SAME ORDER");
});

function remakeOrder() {
  sound.reset();
  ui.cup.classList.add("serving");
  window.setTimeout(() => {
    state.cupVolume = 0;
    state.pourHistory = [];
    state.cupSize = null;
    state.hasPod = false;
    state.lidOpen = false;
    state.orderStatus = "active";
    ui.cup.classList.remove("serving");
    setMode("ready", "Same guest, fresh cup. Try again.", "if an incorrect cup is clicked, clear the cup and keep the same target for another attempt.");
  }, 560);
}

function serveCorrectOrder() {
  state.orderStatus = "serving";
  state.streak += 1;
  const baseStars = orderStars();
  const streakBonus = state.streak >= 3 ? 1 : 0;
  const earnedStars = baseStars + streakBonus;
  const rewardMessage = streakBonus
    ? `${state.streak} ORDER STREAK · +${earnedStars} ★ (+1 BONUS)`
    : `EXACT ORDER · +${baseStars} ★`;
  sound.correct(state.streak);
  changeStars(earnedStars, rewardMessage);
  ui.cup.classList.add("serving");
  render();
  ui.logicMessage.textContent = "if cup total equals the guest request, serve the cup and create a new customer order.";
  window.setTimeout(() => {
    state.customerNumber += 1;
    state.cupVolume = 0;
    state.pourHistory = [];
    state.cupSize = null;
    state.hasPod = false;
    state.lidOpen = false;
    ui.cup.classList.remove("serving");

    if (state.shiftPosition === CUSTOMERS_PER_SHIFT) {
      state.orderStatus = "shift-complete";
      setMode("ready", "Shift complete. Your stars have been saved.", "after five correct orders, close the shift, keep total stars, and reset only the shift streak.");
      showShiftSummary();
      return;
    }

    state.shiftPosition += 1;
    const nextOrder = createShiftOrder(state.shiftPosition);
    state.targetVolume = nextOrder.total;
    state.targetPours = nextOrder.pours;
    state.orderStatus = "active";
    welcomeNextCustomer();
    setMode("ready", "A new guest has arrived.", "new customer state: generate a reachable target total and return to ready.");
    showDifficultyBadge();
  }, 760);
}

function showShiftSummary() {
  sound.shiftComplete();
  ui.completedShift.textContent = state.shiftNumber;
  ui.shiftStars.textContent = `${state.shiftStars >= 0 ? "+" : ""}${state.shiftStars} ★`;
  ui.nextShiftButton.textContent = `START SHIFT ${state.shiftNumber + 1}`;
  ui.shiftDialog.showModal();
}

function startNextShift() {
  sound.click();
  ui.shiftDialog.close();
  state.shiftNumber += 1;
  state.shiftPosition = 1;
  state.streak = 0;
  state.shiftStars = 0;
  state.pourHistory = [];
  const nextOrder = createShiftOrder(state.shiftPosition);
  state.targetVolume = nextOrder.total;
  state.targetPours = nextOrder.pours;
  state.orderStatus = "active";
  welcomeNextCustomer();
  setMode("ready", "A new shift has started.", "at the start of each shift, reset the five-order progress and streak while keeping total stars and unlocked rewards.");
  showDifficultyBadge();
}

function showCapacityDialog(size) {
  const remaining = MAX_CUP_VOLUME - state.cupVolume;
  ui.capacityMessage.textContent = `Your cup has ${state.cupVolume} ml inside. ${size.toLowerCase()} adds ${doseVolume[size]} ml, but only ${remaining} ml remains before the 500 ml limit.`;
  ui.capacityDialog.showModal();
  ui.logicMessage.textContent = "if current cup volume + selected drink is over 500 ml, block brewing and show the cup-limit message.";
}

ui.closeDialogButton.addEventListener("click", () => ui.capacityDialog.close());
ui.nextShiftButton.addEventListener("click", startNextShift);
ui.soundToggle.addEventListener("click", () => {
  if (sound.enabled) {
    sound.click();
    sound.setEnabled(false);
  } else {
    sound.setEnabled(true);
    if (state.mode === "brewing") {
      sound.startBrew();
    } else {
      sound.note(659, 0.12, 0, "sine", 0.045);
      sound.note(880, 0.16, 0.1, "sine", 0.045);
    }
  }
  renderRewards();
});

ui.skinOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const category = option.dataset.category;
    const skin = option.dataset.skin;
    const cost = Number(option.dataset.cost);
    const itemKey = `${category}-${skin}`;
    if (state.unlockedItems.has(itemKey)) {
      state.selectedSkins[category] = skin;
      renderRewards();
      showReward(`${skin.toUpperCase()} EQUIPPED`);
      return;
    }
    if (state.stars < cost) {
      showReward(`NEED ${cost} ★ · YOU HAVE ${state.stars} ★`);
      return;
    }
    state.stars -= cost;
    state.unlockedItems.add(itemKey);
    state.selectedSkins[category] = skin;
    renderRewards();
    showReward(`${skin.toUpperCase()} UNLOCKED`);
  });
});

setMode("off", "Press power to begin.", "if power is off, brewing is blocked.");
showDifficultyBadge();
