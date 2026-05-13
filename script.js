const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const TUNINGS = {
  // 4 string bass
  "bass-standard": ["G", "D", "A", "E"],
  "bass-drop-d": ["G", "D", "A", "D"],
  "bass-d-standard": ["F", "C", "G", "D"],

  // 5 string bass
  "bass-5-standard": ["G", "D", "A", "E", "B"],
  "bass-5-tenor": ["C", "G", "D", "A", "E"],
  "bass-5-drop-a": ["G", "D", "A", "E", "A"],
  "bass-5-a-standard": ["F", "C", "G", "D", "A"],

  // 6 string guitar
  standard: ["e", "B", "G", "D", "A", "E"],
  "drop-d": ["e", "B", "G", "D", "A", "D"],
  "d-standard": ["d", "A#", "F", "C", "G", "D"],

  // 7 string guitar
  "7-standard": ["e", "B", "G", "D", "A", "E", "B"],
  "7-drop-a": ["e", "B", "G", "D", "A", "E", "A"],
  "7-a-standard": ["d", "A", "F", "C", "G", "D", "A"],
  "7-drop-g": ["d", "A", "F", "C", "G", "D", "G"]
};

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  pentatonicMinor: [0, 3, 5, 7, 10],
  majorTriad: [0, 4, 7],
  minorTriad: [0, 3, 7],
  dominant7: [0, 4, 7, 10]
};

const CIRCLE_OF_FIFTHS = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
  "G#",
  "D#",
  "A#",
  "F"
];

let audioEnabled = false;

const tableContainer = document.getElementById("table-container");
const modeSelect = document.getElementById("mode");
// string count selector removed; determined automatically from tuning preset
const tuningSelect = document.getElementById("tuning");
const orientationSelect = document.getElementById("orientation");
const intervalSelect = document.getElementById("interval-select");
const audioButton = document.getElementById("toggle-audio");
const themeButton = document.getElementById("toggle-theme");
const controlsDrawer = document.getElementById("controls-drawer");
const controlsSummaryLine = document.getElementById("controls-summary-line");

function closeControlsDrawerIfNarrow() {
  if (!controlsDrawer || !window.matchMedia("(max-width: 700px)").matches) {
    return;
  }
  controlsDrawer.checked = false;
}

function selectedOptionLabel(select) {
  const t = select.selectedOptions[0]?.textContent ?? "";
  return t.replace(/\s+/g, " ").trim();
}

function updateControlsSummaryLine() {
  if (!controlsSummaryLine) return;

  const parts = [
    selectedOptionLabel(modeSelect),
    selectedOptionLabel(tuningSelect),
    selectedOptionLabel(orientationSelect)
  ];

  if (modeSelect.value === "intervals") {
    parts.push(selectedOptionLabel(intervalSelect));
  }

  const isDark = document.body.classList.contains("dark");
  parts.push(`Audio ${audioEnabled ? "on" : "off"}`);
  parts.push(isDark ? "Dark" : "Light");

  controlsSummaryLine.textContent = parts.join(" · ");
}

audioButton.addEventListener("click", () => {
  audioEnabled = !audioEnabled;
  audioButton.textContent = `Audio: ${audioEnabled ? "ON" : "OFF"}`;
  updateControlsSummaryLine();
});

themeButton.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  const isDark = document.body.classList.contains("dark");

  themeButton.textContent = isDark ? "Light Mode" : "Dark Mode";

  localStorage.setItem("fretboard-dark-mode", isDark);
  updateControlsSummaryLine();
});

const savedTheme = localStorage.getItem("fretboard-dark-mode");

if (savedTheme === "true") {
  document.body.classList.add("dark");
  themeButton.textContent = "Light Mode";
}

function normalize(note) {
  return note.toUpperCase();
}

function noteIndex(note) {
  return NOTES.indexOf(normalize(note));
}

function buildString(openNote, frets = 12) {
  const output = [];
  const start = noteIndex(openNote);

  for (let i = 0; i <= frets; i++) {
    output.push(NOTES[(start + i) % NOTES.length]);
  }

  return output;
}

function generateChart() {
  const tuning = tuningSelect.value;
  let notes = [...TUNINGS[tuning]];

  if (orientationSelect.value === "left") {
    notes.reverse();
  }

  return notes.map((note) => ({
    open: note,
    notes: buildString(note)
  }));
}

function clearHighlights() {
  document.querySelectorAll("td").forEach((cell) => {
    cell.className = "";
  });
}

function highlightMatching(root) {
  document.querySelectorAll("td").forEach((cell) => {
    if (cell.dataset.note === root) {
      cell.classList.add("root");
    }
  });
}

function highlightCircle(root) {
  const index = CIRCLE_OF_FIFTHS.indexOf(root);

  if (index === -1) return;

  const previous =
    CIRCLE_OF_FIFTHS[
      (index - 1 + CIRCLE_OF_FIFTHS.length) % CIRCLE_OF_FIFTHS.length
    ];

  const next = CIRCLE_OF_FIFTHS[(index + 1) % CIRCLE_OF_FIFTHS.length];

  document.querySelectorAll("td").forEach((cell) => {
    if (cell.dataset.note === root) {
      cell.classList.add("root");
    }

    if (cell.dataset.note === previous) {
      cell.classList.add("previous");
    }

    if (cell.dataset.note === next) {
      cell.classList.add("next");
    }
  });
}

function highlightPattern(root, intervals, className) {
  const rootIndex = noteIndex(root);

  const notes = intervals.map((i) => {
    return NOTES[(rootIndex + i) % NOTES.length];
  });

  document.querySelectorAll("td").forEach((cell) => {
    if (cell.dataset.note === root) {
      cell.classList.add("root");
    }

    if (notes.includes(cell.dataset.note)) {
      cell.classList.add(className);
    }
  });
}

function highlightInterval(root, interval) {
  const rootIndex = noteIndex(root);
  const target = NOTES[(rootIndex + interval) % NOTES.length];

  document.querySelectorAll("td").forEach((cell) => {
    if (cell.dataset.note === root) {
      cell.classList.add("root");
    }

    if (cell.dataset.note === target) {
      cell.classList.add("interval");
    }
  });
}

function playFrequency(note) {
  if (!audioEnabled) return;

  const frequencies = {
    C: 261.63,
    "C#": 277.18,
    D: 293.66,
    "D#": 311.13,
    E: 329.63,
    F: 349.23,
    "F#": 369.99,
    G: 392.0,
    "G#": 415.3,
    A: 440.0,
    "A#": 466.16,
    B: 493.88
  };

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.value = frequencies[note];

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.6);
}

function renderTable() {
  tableContainer.innerHTML = "";

  const chart = generateChart();

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const tbody = document.createElement("tbody");

  table.appendChild(thead);
  table.appendChild(tbody);

  const headerRow = document.createElement("tr");

  for (let i = 0; i <= 12; i++) {
    const th = document.createElement("th");
    th.textContent = i;

    if ([3, 5, 7, 9, 12].includes(i)) {
      th.classList.add("marker");
    }

    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);

  chart.forEach((string) => {
    const tr = document.createElement("tr");

    string.notes.forEach((note, index) => {
      if (index === 0) {
        const th = document.createElement("th");
        th.textContent = note;
        tr.appendChild(th);
        return;
      }

      const td = document.createElement("td");
      td.textContent = note;
      td.dataset.note = note;

      td.addEventListener("click", () => {
        clearHighlights();

        const mode = modeSelect.value;
        const root = note;

        playFrequency(root);

        switch (mode) {
          case "notes":
            highlightMatching(root);
            break;

          case "fifths":
            highlightCircle(root);
            break;

          case "major-scale":
            highlightPattern(root, SCALES.major, "scale");
            break;

          case "minor-pentatonic":
            highlightPattern(root, SCALES.pentatonicMinor, "scale");
            break;

          case "major-triad":
            highlightPattern(root, SCALES.majorTriad, "triad");
            break;

          case "minor-triad":
            highlightPattern(root, SCALES.minorTriad, "triad");
            break;

          case "dominant-7":
            highlightPattern(root, SCALES.dominant7, "seventh");
            break;

          case "intervals":
            highlightInterval(root, Number(intervalSelect.value));
            break;
        }
      });

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  tableContainer.appendChild(table);
}

[modeSelect, intervalSelect].forEach((control) => {
  control.addEventListener("change", () => {
    updateControlsSummaryLine();
    closeControlsDrawerIfNarrow();
  });
});

[tuningSelect, orientationSelect].forEach((control) => {
  control.addEventListener("change", () => {
    updateControlsSummaryLine();
    closeControlsDrawerIfNarrow();
    renderTable();
  });
});

updateControlsSummaryLine();
renderTable();
