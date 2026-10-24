const form = document.getElementById("scan-form");
const scanBtn = document.getElementById("scan-btn");
const btnLabel = scanBtn.querySelector(".btn-label");
const btnSpinner = scanBtn.querySelector(".btn-spinner");
const errorBox = document.getElementById("error-box");
const resultsPanel = document.getElementById("results-panel");
const resultsBody = document.getElementById("results-body");
const downloadBtn = document.getElementById("download-csv");

let lastResults = [];
let lastMeta = {};
let activeFilter = "all";

document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.getElementById("start_port").value = btn.dataset.start;
    document.getElementById("end_port").value = btn.dataset.end;
  });
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderTable();
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();
  setLoading(true);
  resultsPanel.hidden = true;

  const payload = {
    target: document.getElementById("target").value,
    start_port: document.getElementById("start_port").value,
    end_port: document.getElementById("end_port").value,
  };

  try {
    const res = await fetch("/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      showError(data.error || "Something went wrong. Please try again.");
      return;
    }

    lastResults = data.results;
    lastMeta = {
      target: data.target,
      resolved_ip: data.resolved_ip,
      port_range: data.port_range,
    };
    renderStats(data.stats, data.target, data.resolved_ip);
    activeFilter = "all";
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    document
      .querySelector('.filter-btn[data-filter="all"]')
      .classList.add("active");
    renderTable();
    resultsPanel.hidden = false;
  } catch (err) {
    showError("Could not reach the server. Please try again.");
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  scanBtn.disabled = isLoading;
  btnSpinner.hidden = !isLoading;
  btnLabel.textContent = isLoading ? "Scanning..." : "Start Scan";
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}
function hideError() {errorBox.hidden = true;}

function renderStats(stats, target, resolvedIp) {
  const targetLabel = target === resolvedIp ? target : `${target} (${resolvedIp})`;
  document.getElementById("stat-target").textContent = targetLabel;
  document.getElementById("stat-total").textContent = stats.total_ports;
  document.getElementById("stat-open").textContent = stats.open_count;
  document.getElementById("stat-closed").textContent = stats.closed_count;
  document.getElementById("stat-time").textContent =`${stats.elapsed_seconds}s`;
}

function renderTable() {
  resultsBody.innerHTML = "";
  const filtered = lastResults.filter((r) => {
    if (activeFilter === "all") return true;
    return r.status === activeFilter;
  });

  if (filtered.length === 0) {
    resultsBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color: var(--muted); padding: 20px;">No ports match this filter.</td></tr>`;
    return;
  }

  for (const r of filtered) {
    const statusClass =
      r.status === "open"
        ? "status-open"
        : r.status === "closed"
          ? "status-closed"
          : "status-other";
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${r.port}</td>
      <td class="${statusClass}">${r.status.toUpperCase()}</td>
      <td>${r.service}</td>
    `;
    resultsBody.appendChild(row);
  }
}

downloadBtn.addEventListener("click", () => {
  if (!lastResults.length) return;

  const rows = [["Port", "Status", "Service"]];
  for (const r of lastResults) {rows.push([r.port, r.status, r.service]);}
  const csvContent = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeTarget = (lastMeta.target || "scan").replace(/[^a-z0-9.-]/gi, "_");
  a.href = url;
  a.download = `portscan_${safeTarget}_${lastMeta.port_range}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});
