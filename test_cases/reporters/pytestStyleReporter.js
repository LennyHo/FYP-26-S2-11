// A custom Mocha reporter that prints test results in the style of `pytest -v`:
// a "test session starts" banner, environment info, one line per test
// (file::test_name PASSED [ XX%]), and a colored one-line summary at the end.
// Wired up via the "test" script in package.json (--reporter flag).
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const Base = require("mocha/lib/reporters/base");

const COLOR = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
};

function colorize(text, code) {
  if (!process.stdout.isTTY) return text;
  return `${code}${text}${COLOR.reset}`;
}

function terminalWidth() {
  return process.stdout.columns || 80;
}

function center(text, width) {
  const padding = Math.max(0, width - text.length);
  const left = Math.floor(padding / 2);
  const right = padding - left;
  return " ".repeat(left) + text + " ".repeat(right);
}

// Pytest's final line looks like "==== 5 passed in 0.12s ====" — "=" fill on
// both sides of the text itself, not a separate banner above/below it.
function summaryLine(text, width, colorCode) {
  const inner = ` ${text} `;
  const fillTotal = Math.max(0, width - inner.length);
  const left = Math.floor(fillTotal / 2);
  const right = fillTotal - left;
  return colorize("=".repeat(left) + inner + "=".repeat(right), colorCode);
}

function gitBranch() {
  try {
    return execSync("git rev-parse --abbrev-ref HEAD", { cwd: process.cwd() })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

function slugify(title) {
  return String(title).trim().replace(/\s+/g, "_");
}

function relFile(test) {
  const file = (test.file || (test.parent && test.parent.file) || "").toString();
  if (!file) return "unknown";
  return path.relative(process.cwd(), file).split(path.sep).join("/");
}

class PytestStyleReporter extends Base {
  constructor(runner, options) {
    super(runner, options);

    const width = terminalWidth();
    let completed = 0;
    let total = 0;

    runner.on("start", () => {
      total = runner.total;

      console.log("=".repeat(width));
      console.log(center("test session starts", width));
      console.log("=".repeat(width));
      console.log("");
      console.log(
        colorize(
          `platform ${process.platform} -- Node.js ${process.version} -- ${process.platform} ${os.release()}`,
          COLOR.cyan
        )
      );
      console.log(
        colorize(`rootdir: ${process.cwd()} ${gitBranch()}`.trimEnd(), COLOR.cyan)
      );
      console.log(colorize("framework: mocha", COLOR.cyan));
      console.log(colorize(`collected ${total} items`, COLOR.cyan));
      console.log("");
    });

    const printResult = (test, statusWord, colorCode) => {
      completed += 1;
      const pct = total ? Math.round((completed / total) * 100) : 100;
      const pctText = `[${String(pct).padStart(3, " ")}%]`;

      const left = `${relFile(test)}::${slugify(test.title)} ${statusWord}`;
      const gap = Math.max(1, width - left.length - pctText.length);

      console.log(`${relFile(test)}::${slugify(test.title)} ${colorize(statusWord, colorCode)}${" ".repeat(gap)}${pctText}`);
    };

    runner.on("pass", (test) => printResult(test, "PASSED", COLOR.green));
    runner.on("fail", (test) => printResult(test, "FAILED", COLOR.red));
    runner.on("pending", (test) => printResult(test, "SKIPPED", COLOR.yellow));

    runner.on("end", () => {
      const stats = this.stats;
      const seconds = (stats.duration / 1000).toFixed(2);

      const parts = [];
      if (stats.passes) parts.push(`${stats.passes} passed`);
      if (stats.failures) parts.push(`${stats.failures} failed`);
      if (stats.pending) parts.push(`${stats.pending} skipped`);
      const summaryText = `${parts.join(", ")} in ${seconds}s`;

      console.log("");
      console.log(summaryLine(summaryText, width, stats.failures ? COLOR.red : COLOR.green));
    });
  }
}

module.exports = PytestStyleReporter;
