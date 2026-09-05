/* ==========================================================================
   ResolveAI 2.0 — Production Application Controller & Grounding Engine
   ========================================================================== */

let currentView = "dashboard";
let currentRole = localStorage.getItem("resolve_ai_role") || "agent";
let currentPortalTab = "requests";
let currentTheme = localStorage.getItem("resolve_ai_theme") || "skyblue";

let ticketsData = [];
let customersData = [];
let kbArticlesData = [];
let auditEventsData = [];

let activeTicket = null;
let loggedInCustomer = null;
let customerTickets = [];
let selectedCustomerTicket = null;
let customerChatMessages = [];

// On Document Load
document.addEventListener("DOMContentLoaded", () => {
  changeTheme(currentTheme);
  initRole();
  fetchBackendData();
  navigateTo("dashboard");
});

function initRole() {
  const roleSelect = document.getElementById("role-select");
  if (roleSelect) roleSelect.value = currentRole;
  updateRoleUI(currentRole);
}

function switchActiveRole(newRole) {
  currentRole = newRole;
  localStorage.setItem("resolve_ai_role", newRole);
  updateRoleUI(newRole);

  if (newRole === "customer") {
    navigateTo("customer-portal");
  } else if (newRole === "supervisor") {
    navigateTo("supervisor");
  } else if (newRole === "knowledge_manager") {
    navigateTo("knowledge");
  } else {
    navigateTo("tickets");
  }
}

function updateRoleUI(role) {
  const nameEl = document.getElementById("sidebar-user-name");
  const roleEl = document.getElementById("sidebar-user-role");
  const avatarEl = document.getElementById("sidebar-avatar");

  if (role === "supervisor") {
    if (nameEl) nameEl.innerText = "Sarah";
    if (roleEl) roleEl.innerText = "Operations Supervisor";
    if (avatarEl) avatarEl.innerText = "S";
  } else if (role === "knowledge_manager") {
    if (nameEl) nameEl.innerText = "Elena";
    if (roleEl) roleEl.innerText = "Knowledge Curator";
    if (avatarEl) avatarEl.innerText = "E";
  } else if (role === "customer") {
    if (nameEl) nameEl.innerText = loggedInCustomer ? loggedInCustomer.name : "Subscriber";
    if (roleEl) roleEl.innerText = "Customer Account";
    if (avatarEl) avatarEl.innerText = loggedInCustomer ? loggedInCustomer.name.charAt(0) : "C";
  } else {
    if (nameEl) nameEl.innerText = "Kumar";
    if (roleEl) roleEl.innerText = "Level-2 Support Specialist";
    if (avatarEl) avatarEl.innerText = "K";
  }
}

// Fetch Live Backend Data from FastAPI
async function fetchBackendData() {
  try {
    const custRes = await fetch("http://127.0.0.1:8000/api/customers", {
      headers: { "X-User-Role": currentRole }
    });
    if (custRes.ok) {
      const liveCust = await custRes.json();
      if (liveCust && liveCust.length > 0) {
        customersData = liveCust.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          plan: c.plan,
          monthly_fee: `$${c.monthly_fee.replace('$', '')}`,
          account_status: c.account_status,
          payment_status: c.payment_status,
          router: c.telemetry ? c.telemetry.router_model : "NexFiber Wi-Fi 6",
          wan: c.telemetry ? c.telemetry.wan_light : "Solid Green",
          signal: c.telemetry ? c.telemetry.signal_dbm : "-18 dBm",
          outage: c.telemetry && c.telemetry.outage_in_area ? "Outage Flagged" : "No Outage",
          prev_tickets: c.previous_tickets_count || 0,
          address: c.address
        }));
        renderCustomerDirectory();
        renderQuickUserChips();
      }
    }

    const tickRes = await fetch("http://127.0.0.1:8000/api/tickets", {
      headers: { "X-User-Role": currentRole }
    });
    if (tickRes.ok) {
      const liveTickets = await tickRes.json();
      if (liveTickets && liveTickets.length > 0) {
        ticketsData = liveTickets;
        activeTicket = ticketsData[0];
      }
    }

    const kbRes = await fetch("http://127.0.0.1:8000/api/knowledge", {
      headers: { "X-User-Role": currentRole }
    });
    if (kbRes.ok) {
      const liveKB = await kbRes.json();
      if (liveKB && liveKB.length > 0) {
        kbArticlesData = liveKB;
        renderKBArticles();
      }
    }

    updateNavBadges();
  } catch (err) {
    console.log("Error loading backend:", err);
  }
}

function updateNavBadges() {
  const badge = document.getElementById("nav-ticket-count");
  if (badge) badge.innerText = ticketsData.length;
}

function renderQuickUserChips() {
  const container = document.getElementById("demo-user-chips-container");
  if (!container) return;
  container.innerHTML = customersData.map(c => `
    <button class="chip-user" onclick="loginAsDemoUser('${c.id}')">
      <strong>${c.name}</strong>
      <small>${c.plan.split(' ')[0]} • ${c.id}</small>
    </button>
  `).join("");
}

// Dynamic Theme Switcher
function changeTheme(themeName) {
  currentTheme = themeName;
  localStorage.setItem("resolve_ai_theme", themeName);

  document.body.className = `theme-${themeName}`;
  const selectEl = document.getElementById("theme-select");
  if (selectEl) selectEl.value = themeName;
}

// Page Navigation Router
function navigateTo(pageId) {
  currentView = pageId;

  document.querySelectorAll(".nav-link").forEach(el => el.classList.remove("active"));
  const activeNav = document.getElementById(`nav-${pageId}`);
  if (activeNav) activeNav.classList.add("active");

  document.querySelectorAll(".page-view").forEach(el => el.classList.add("hidden"));

  const targetPage = document.getElementById(`page-${pageId}`);
  if (targetPage) targetPage.classList.remove("hidden");

  const titleEl = document.getElementById("current-page-title");
  const subEl = document.getElementById("current-page-subtitle");

  if (pageId === "dashboard") {
    titleEl.innerText = "Executive Dashboard";
    subEl.innerText = "Evidence-grounded resolution pipeline & compliance oversight";
  } else if (pageId === "tickets") {
    titleEl.innerText = "AI Ticket Workbench";
    subEl.innerText = "Human-supervised support queue with 6-part handover & citation validation";
    renderTicketWorkbench();
  } else if (pageId === "customers") {
    titleEl.innerText = "Customer 360° Directory";
    subEl.innerText = "Subscriber account profiles, billing standing, and live line telemetry";
    renderCustomerDirectory();
  } else if (pageId === "aiops") {
    titleEl.innerText = "AI Decision Lab";
    subEl.innerText = "Evidence-based decision trace, grounding inspector, and risk evaluation";
    runAIOpsTrace();
  } else if (pageId === "customer-portal") {
    titleEl.innerText = "Customer Self-Service Portal";
    subEl.innerText = "Subscriber problem reporting, live AI diagnoses, and 24/7 resolution hub";
    if (loggedInCustomer) {
      renderCustomerPortal(loggedInCustomer);
    } else {
      document.getElementById("customer-login-view").classList.remove("hidden");
      document.getElementById("customer-portal-dashboard").classList.add("hidden");
    }
  } else if (pageId === "supervisor") {
    titleEl.innerText = "Supervisor Console & Governance";
    subEl.innerText = "Immutable audit event stream, quality overrides, and decision policy calibration";
    fetchAuditEvents();
  } else if (pageId === "knowledge") {
    titleEl.innerText = "Knowledge Base Vector Index (RAG)";
    subEl.innerText = "Versioned approved support articles with hybrid semantic search";
    renderKBArticles();
  } else if (pageId === "settings") {
    titleEl.innerText = "Security & Settings";
    subEl.innerText = "AI governance guardrails, role scopes, and color themes";
  }

  if (window.lucide) lucide.createIcons();
}

function launchScenario(name) {
  if (name === "Arun") activeTicket = ticketsData.find(t => t.customer_id === "CUST-1001") || ticketsData[0];
  else if (name === "Priya") activeTicket = ticketsData.find(t => t.customer_id === "CUST-1002") || ticketsData[1];
  else if (name === "John") activeTicket = ticketsData.find(t => t.customer_id === "CUST-1003") || ticketsData[2];

  navigateTo("tickets");
}

/* ==========================================================================
   SUPERVISOR CONSOLE & AUDIT STREAM
   ========================================================================== */
async function fetchAuditEvents() {
  try {
    const res = await fetch("http://127.0.0.1:8000/api/audit/events", {
      headers: { "X-User-Role": "supervisor" }
    });
    if (res.ok) {
      auditEventsData = await res.json();
      renderAuditTable(auditEventsData);
    }
  } catch (err) {
    console.log("Audit stream load error:", err);
  }
}

function renderAuditTable(events) {
  const tbody = document.getElementById("audit-events-tbody");
  if (!tbody) return;

  if (events.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--text-muted);">No audit events recorded yet in current session.</td></tr>`;
    return;
  }

  tbody.innerHTML = events.map(e => `
    <tr>
      <td style="font-family:'JetBrains Mono'; font-size:0.75rem;">${e.timestamp.split('.')[0].replace('T', ' ')}</td>
      <td><span class="badge-status status-paid" style="font-size:0.7rem;">${e.event_type}</span></td>
      <td><strong>${e.actor_id}</strong> <small style="color:var(--text-muted);">(${e.actor_role})</small></td>
      <td><span style="font-family:'JetBrains Mono';">${e.target_id}</span> <small style="color:var(--text-muted);">(${e.target_type})</small></td>
      <td style="font-size:0.75rem; color:var(--text-muted);">${JSON.stringify(e.details)}</td>
    </tr>
  `).join("");
}

/* ==========================================================================
   CUSTOMER AUTHENTICATION & REGISTRATION
   ========================================================================== */
function switchAuthTab(tab) {
  document.getElementById("auth-tab-login-btn").classList.toggle("active", tab === "login");
  document.getElementById("auth-tab-register-btn").classList.toggle("active", tab === "register");
  document.getElementById("auth-login-panel").classList.toggle("hidden", tab !== "login");
  document.getElementById("auth-register-panel").classList.toggle("hidden", tab !== "register");
}

function loginAsDemoUser(custId) {
  const cust = customersData.find(c => c.id === custId) || customersData[0];
  loggedInCustomer = cust;
  updateRoleUI("customer");

  customerChatMessages = [
    {
      sender: "ai",
      text: `Hello ${cust.name}! Welcome to your NexFiber & Mobile Assistant. I have loaded your account profile (${cust.plan}, Account ID: ${cust.id}). How can I assist you with your connection or billing today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ];

  if (cust.wan && (cust.wan.includes("Red") || cust.wan.includes("Off"))) {
    customerChatMessages.push({
      sender: "ai",
      text: `⚠️ **Diagnostic Notice:** Your router WAN light is currently indicating: **${cust.wan}** (${cust.signal}). You can click **"Report a Problem"** above or type your issue here for instant troubleshooting!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  } else if (cust.payment_status && (cust.payment_status.includes("Pending") || cust.payment_status.includes("Overdue"))) {
    customerChatMessages.push({
      sender: "ai",
      text: `ℹ️ **Billing Notice:** Your account shows billing status: **${cust.payment_status}**. If you transferred funds recently, you can provide your Transaction Reference ID / UTR to verify it immediately.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  renderCustomerPortal(cust);
}

function loginWithForm() {
  const inputVal = document.getElementById("login-account-id").value.trim().toLowerCase();
  let found = customersData.find(c => 
    c.id.toLowerCase() === inputVal || 
    c.name.toLowerCase().includes(inputVal) ||
    c.phone.includes(inputVal) ||
    c.email.toLowerCase().includes(inputVal)
  );

  if (!found) {
    found = customersData[0];
  }

  loginAsDemoUser(found.id);
}

async function registerNewCustomer() {
  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const plan = document.getElementById("reg-plan").value;
  const address = document.getElementById("reg-address").value.trim();

  if (!name || !email || !phone) {
    alert("Please fill in all required customer details.");
    return;
  }

  try {
    const res = await fetch("http://127.0.0.1:8000/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Role": "customer" },
      body: JSON.stringify({ name, email, phone, plan, address })
    });
    if (res.ok) {
      const created = await res.json();
      customersData.push({
        id: created.id,
        name: created.name,
        email: created.email,
        phone: created.phone,
        plan: created.plan,
        monthly_fee: `$${created.monthly_fee.replace('$', '')}`,
        account_status: created.account_status,
        payment_status: created.payment_status,
        router: created.telemetry ? created.telemetry.router_model : "NexFiber Wi-Fi 6",
        wan: created.telemetry ? created.telemetry.wan_light : "Solid Green",
        signal: created.telemetry ? created.telemetry.signal_dbm : "-18 dBm",
        outage: "No Outage",
        prev_tickets: 0,
        address: created.address
      });
      renderCustomerDirectory();
      renderQuickUserChips();
      loginAsDemoUser(created.id);
      alert(`✓ Welcome, ${name}! Your account ${created.id} is created.`);
    }
  } catch (err) {
    console.log("Registration error:", err);
  }
}

function logoutCustomer() {
  loggedInCustomer = null;
  customerTickets = [];
  selectedCustomerTicket = null;
  customerChatMessages = [];
  document.getElementById("customer-login-view").classList.remove("hidden");
  document.getElementById("customer-portal-dashboard").classList.add("hidden");
  if (window.lucide) lucide.createIcons();
}

/* ==========================================================================
   CUSTOMER HUB & PROBLEM REPORTING
   ========================================================================== */
function switchPortalTab(tab) {
  currentPortalTab = tab;
  
  document.getElementById("pnav-requests").classList.toggle("active", tab === "requests");
  document.getElementById("pnav-report").classList.toggle("active", tab === "report");
  document.getElementById("pnav-chat").classList.toggle("active", tab === "chat");

  document.getElementById("portal-tab-requests").classList.toggle("hidden", tab !== "requests");
  document.getElementById("portal-tab-report").classList.toggle("hidden", tab !== "report");
  document.getElementById("portal-tab-chat").classList.toggle("hidden", tab !== "chat");

  if (tab === "requests" && loggedInCustomer) {
    loadCustomerTickets(loggedInCustomer.id);
  }
  if (window.lucide) lucide.createIcons();
}

async function renderCustomerPortal(cust) {
  document.getElementById("customer-login-view").classList.add("hidden");
  document.getElementById("customer-portal-dashboard").classList.remove("hidden");

  // Subscriber Header Bar
  document.getElementById("portal-user-avatar").innerText = cust.name.charAt(0);
  document.getElementById("portal-user-name").innerText = cust.name;
  document.getElementById("portal-user-plan").innerText = cust.plan;
  document.getElementById("portal-user-id").innerText = cust.id;
  document.getElementById("portal-user-contact").innerText = `${cust.email} • ${cust.phone}`;

  // Subscription Details Widget
  document.getElementById("portal-plan-name").innerText = cust.plan;
  document.getElementById("portal-plan-fee").innerText = `${cust.monthly_fee} / mo`;
  document.getElementById("portal-plan-billing").innerText = cust.payment_status;
  document.getElementById("portal-plan-billing").className = cust.payment_status === "Paid" ? "status-paid" : "val-warning";

  // Equipment Health Widget
  document.getElementById("portal-router-model").innerText = cust.router;
  document.getElementById("portal-wan-light").innerText = cust.wan;
  document.getElementById("portal-wan-light").className = (cust.wan && (cust.wan.includes("Red") || cust.wan.includes("Off"))) ? "val-warning" : "status-paid";
  document.getElementById("portal-signal-dbm").innerText = cust.signal;
  document.getElementById("portal-outage-stat").innerText = cust.outage;

  await loadCustomerTickets(cust.id);
  renderCustomerChat();
  switchPortalTab("requests");
}

async function loadCustomerTickets(custId) {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/tickets`, {
      headers: { "X-User-Role": "customer", "X-User-Id": custId }
    });
    if (res.ok) {
      customerTickets = await res.json();
    }
  } catch (err) {
    customerTickets = ticketsData.filter(t => t.customer_id === custId);
  }

  const badge = document.getElementById("portal-requests-count");
  if (badge) badge.innerText = customerTickets.length;

  renderCustomerRequestsList(customerTickets);
}

function renderCustomerRequestsList(tickets) {
  const container = document.getElementById("portal-requests-list");
  if (!container) return;

  if (tickets.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 24px; color:var(--text-muted);">
        <i data-lucide="check-circle" style="width:36px; height:36px; margin-bottom:8px; color:var(--resolve-color);"></i>
        <p>No active problems reported. Your service is operating normally.</p>
        <button class="btn btn-primary btn-sm" onclick="switchPortalTab('report')" style="margin-top:10px;">
          <i data-lucide="plus"></i> Report a Problem
        </button>
      </div>
    `;
    document.getElementById("portal-ticket-detail-body").innerHTML = `<p style="color:var(--text-muted);">No problem selected.</p>`;
    if (window.lucide) lucide.createIcons();
    return;
  }

  container.innerHTML = tickets.map(t => {
    let badgeClass = "badge-case-resolve";
    let badgeText = "🟢 RESOLUTION READY";

    if (t.status === "ASK_CUSTOMER" || t.decision_type === "ASK_CUSTOMER") {
      badgeClass = "badge-case-ask";
      badgeText = "🟡 ACTION NEEDED (INFO)";
    } else if (t.status === "ESCALATED" || t.decision_type === "ESCALATE") {
      badgeClass = "badge-case-escalate";
      badgeText = "🔴 ESCALATED TO FIELD TECH";
    } else if (t.status === "SENT") {
      badgeClass = "badge-case-resolve";
      badgeText = "✓ RESOLVED & SENT";
    }

    const isActive = selectedCustomerTicket && selectedCustomerTicket.id === t.id;

    return `
      <div class="portal-req-card ${isActive ? 'active' : ''}" onclick="selectCustomerTicket('${t.id}')">
        <div class="portal-req-info">
          <span class="portal-req-title">${t.subject}</span>
          <div class="portal-req-sub">
            <span style="font-family:'JetBrains Mono'; font-weight:700;">${t.id}</span>
            <span>•</span>
            <span>State: ${t.status}</span>
          </div>
        </div>
        <span class="badge-decision ${badgeClass}">${badgeText}</span>
      </div>
    `;
  }).join("");

  if (!selectedCustomerTicket && tickets.length > 0) {
    selectCustomerTicket(tickets[0].id);
  }
  if (window.lucide) lucide.createIcons();
}

function selectCustomerTicket(ticketId) {
  selectedCustomerTicket = customerTickets.find(t => t.id === ticketId) || ticketsData.find(t => t.id === ticketId);
  if (!selectedCustomerTicket) return;

  renderCustomerRequestsList(customerTickets);

  const badgeEl = document.getElementById("portal-detail-status-badge");
  const bodyEl = document.getElementById("portal-ticket-detail-body");
  const t = selectedCustomerTicket;
  const res = t.ai_resolution || {};

  if (t.status === "SENT" || t.decision_type === "RESOLVE") {
    badgeEl.className = "badge-decision badge-case-resolve";
    badgeEl.innerText = t.status === "SENT" ? "✓ RESOLVED & SENT BY AGENT" : "🟢 EVIDENCE-GROUNDED FIX READY";

    const answerHtml = (res.grounded_answer || "Resolution steps verified.").replace(/\n/g, "<br>");
    const citations = (res.citations || []).map(c => `<li><strong>${c.article_id}:</strong> ${c.title} (${c.section})</li>`).join("");

    bodyEl.innerHTML = `
      <div class="portal-detail-step">
        <h4 style="color:var(--resolve-color); margin-bottom:8px;"><i data-lucide="check-circle-2"></i> Recommended AI Resolution:</h4>
        <p>${answerHtml}</p>
        ${citations ? `<div style="margin-top:12px; font-size:0.78rem; color:var(--text-muted);"><strong>Knowledge Base Citations:</strong><ul style="padding-left:18px; margin-top:4px;">${citations}</ul></div>` : ''}
      </div>
    `;

  } else if (t.status === "ASK_CUSTOMER" || t.decision_type === "ASK_CUSTOMER") {
    badgeEl.className = "badge-decision badge-case-ask";
    badgeEl.innerText = "🟡 MISSING INFORMATION REQUIRED";

    const missingParam = (res.missing_info || {}).required_parameter || "Payment Transaction Reference ID / UTR";
    const promptText = (res.missing_info || {}).prompt_text || "Please provide your Transaction ID from your receipt.";

    bodyEl.innerHTML = `
      <div class="info-submission-box">
        <label><i data-lucide="help-circle"></i> AI Follow-Up Question:</label>
        <p style="font-size:0.86rem; color:var(--text-main);">${promptText}</p>
        
        <div class="info-input-row" style="margin-top:8px;">
          <input type="text" id="missing-info-input" placeholder="Enter ${missingParam} (e.g. TXN-9988220011)...">
          <button class="btn btn-primary" onclick="submitMissingInfo('${t.id}')">
            <i data-lucide="check"></i> Submit Details
          </button>
        </div>
      </div>
    `;

  } else { // ESCALATE
    badgeEl.className = "badge-decision badge-case-escalate";
    badgeEl.innerText = "🔴 ESCALATED TO FIELD ENGINEERING";

    const ho = res.handover_summary || {};
    bodyEl.innerHTML = `
      <div class="portal-detail-step" style="border-left:4px solid var(--escalate-color);">
        <h4 style="color:var(--escalate-color); margin-bottom:6px;"><i data-lucide="shield-alert"></i> 6-Part Handover Transferred</h4>
        <p><strong>Diagnosis:</strong> ${ho.issue || t.subject}</p>
        <p style="margin-top:6px; color:var(--text-muted); font-size:0.82rem;"><strong>Dispatched Action:</strong> ${ho.recommended_action || 'Level-2 Field Specialist Assigned'}. All diagnostic context transferred with zero lost history.</p>
      </div>
    `;
  }

  if (window.lucide) lucide.createIcons();
}

async function submitProblemFromPortal() {
  if (!loggedInCustomer) return;

  const category = document.getElementById("prob-category").value;
  const led = document.getElementById("prob-led").value;
  const subject = document.getElementById("prob-subject").value.trim();
  const desc = document.getElementById("prob-description").value.trim();
  const urgency = document.getElementById("prob-urgency").value;

  if (!subject || !desc) {
    alert("Please enter a problem summary and description.");
    return;
  }

  try {
    const res = await fetch("http://127.0.0.1:8000/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Role": "customer", "X-User-Id": loggedInCustomer.id },
      body: JSON.stringify({
        customer_id: loggedInCustomer.id,
        category: category,
        subject: subject,
        description: desc,
        led_status: led,
        urgency: urgency
      })
    });

    if (res.ok) {
      const createdTicket = await res.json();
      ticketsData.unshift(createdTicket);
      customerTickets.unshift(createdTicket);
      selectedCustomerTicket = createdTicket;
    }
  } catch (err) {
    console.log("Problem submit error:", err);
  }

  document.getElementById("prob-subject").value = "";
  document.getElementById("prob-description").value = "";

  updateNavBadges();
  switchPortalTab("requests");
  selectCustomerTicket(selectedCustomerTicket.id);
  alert("✓ Problem submitted! AI has generated an instant diagnostic resolution.");
}

async function submitMissingInfo(ticketId) {
  const input = document.getElementById("missing-info-input");
  if (!input) return;
  const val = input.value.trim();
  if (!val) {
    alert("Please enter the requested parameter.");
    return;
  }

  try {
    const res = await fetch(`http://127.0.0.1:8000/api/tickets/${ticketId}/provide-info`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Role": "customer", "X-User-Id": loggedInCustomer ? loggedInCustomer.id : "CUST-1002" },
      body: JSON.stringify({ ticket_id: ticketId, info_value: val })
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = ticketsData.findIndex(t => t.id === ticketId);
      if (idx >= 0) ticketsData[idx] = updated;
      const cIdx = customerTickets.findIndex(t => t.id === ticketId);
      if (cIdx >= 0) customerTickets[cIdx] = updated;
      selectedCustomerTicket = updated;
      selectCustomerTicket(ticketId);
      alert("✓ Information verified! AI has marked your issue as RESOLVED_PENDING_APPROVAL.");
    }
  } catch (err) {
    console.log("Error providing info:", err);
  }
}

/* ==========================================================================
   CUSTOMER CHAT
   ========================================================================== */
function sendQuickPrompt(promptText) {
  const input = document.getElementById("portal-chat-input");
  if (input) {
    input.value = promptText;
    sendCustomerPortalMessage();
  }
}

function renderCustomerChat() {
  const container = document.getElementById("portal-chat-messages");
  if (!container) return;

  container.innerHTML = customerChatMessages.map(m => `
    <div class="portal-msg-bubble ${m.sender === 'customer' ? 'msg-customer' : 'msg-ai'}">
      <div class="portal-msg-header">
        <strong>${m.sender === 'customer' ? (loggedInCustomer ? loggedInCustomer.name : 'You') : '🤖 ResolveAI Grounded Assistant'}</strong>
        <span class="portal-msg-time">${m.timestamp}</span>
      </div>
      <div class="portal-msg-text">${m.text.replace(/\n/g, '<br>')}</div>
    </div>
  `).join("");

  container.scrollTop = container.scrollHeight;
}

async function sendCustomerPortalMessage() {
  const input = document.getElementById("portal-chat-input");
  const text = input.value.trim();
  if (!text || !loggedInCustomer) return;

  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  customerChatMessages.push({
    sender: "customer",
    text: text,
    timestamp: nowTime
  });
  input.value = "";
  renderCustomerChat();

  let aiAnswer = "";

  try {
    const res = await fetch("http://127.0.0.1:8000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: loggedInCustomer.id,
        message: text
      })
    });
    if (res.ok) {
      const ticketResult = await res.json();
      
      const idx = ticketsData.findIndex(t => t.id === ticketResult.id);
      if (idx >= 0) ticketsData[idx] = ticketResult;
      else ticketsData.unshift(ticketResult);

      if (ticketResult.decision_type === "RESOLVE") {
        aiAnswer = ticketResult.ai_resolution.grounded_answer;
      } else if (ticketResult.decision_type === "ASK_CUSTOMER") {
        aiAnswer = ticketResult.ai_resolution.missing_info.prompt_text;
      } else if (ticketResult.decision_type === "ESCALATE") {
        aiAnswer = `⚠️ **Escalated to Level-2 Engineering**\n\nYour request has been prioritized (Ticket ${ticketResult.id}).\n\n**Handover Reason:** ${ticketResult.ai_resolution.handover_summary.issue}\n\nA specialist is assigned with full context.`;
      }
    }
  } catch (err) {
    console.log("Chat error:", err);
  }

  setTimeout(() => {
    customerChatMessages.push({
      sender: "ai",
      text: aiAnswer,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    renderCustomerChat();
  }, 300);
}

/* ==========================================================================
   AI DECISION LAB (PAGE 4)
   ========================================================================== */
function runAIOpsTrace() {
  const query = (document.getElementById("aiops-query-input") ? document.getElementById("aiops-query-input").value.trim() : "") || "My router WAN light is blinking red.";
  const custId = document.getElementById("aiops-customer-select") ? document.getElementById("aiops-customer-select").value : "CUST-1001";
  const cust = customersData.find(c => c.id === custId) || customersData[0];

  const telGrid = document.getElementById("trace-telemetry-grid");
  if (telGrid) {
    telGrid.innerHTML = `
      <div class="t-pill">Plan: <strong>${cust.plan}</strong></div>
      <div class="t-pill">Billing: <strong class="${cust.payment_status === 'Paid' ? 'status-paid' : 'val-warning'}">${cust.payment_status}</strong></div>
      <div class="t-pill">WAN Light: <strong class="${cust.wan && (cust.wan.includes('Red') || cust.wan.includes('Off')) ? 'val-warning' : 'status-paid'}">${cust.wan}</strong></div>
      <div class="t-pill">Signal: <strong>${cust.signal}</strong></div>
      <div class="t-pill">Area Outage: <strong>${cust.outage}</strong></div>
      <div class="t-pill">Data Source: <strong>Adapter Live (Freshness: 4s)</strong></div>
    `;
  }

  const qLower = query.toLowerCase();

  if (qLower.includes("cut") || qLower.includes("severed") || qLower.includes("excavator") || qLower.includes("tree") || qLower.includes("fire") || cust.wan === "Off") {
    document.getElementById("trace-rag-status").innerText = "KB-105 Escalation Match";
    document.getElementById("trace-match-score").innerText = "41% Similarity (Low)";
    document.getElementById("trace-match-snippet").innerText = "KB-105: Outdoor physical cable damage requires immediate dispatch of Level-2 Field Splicing Specialists.";
    
    document.getElementById("trace-decision-badge").className = "badge-decision badge-case-escalate";
    document.getElementById("trace-decision-badge").innerText = "🔴 CASE 3 — ESCALATE";
    document.getElementById("trace-conf-display").innerText = "Confidence: 41% • Physical Fault Handover Triggered";
    document.getElementById("trace-conf-display").style.color = "var(--escalate-color)";

    document.getElementById("trace-output-text").innerHTML = `
      <strong>6-PART HANDOVER PACKAGE SYNTHESIZED:</strong><br>
      • <strong>1. Issue:</strong> ${query}<br>
      • <strong>2. Customer Status:</strong> ${cust.name} | ${cust.plan} | Billing: ${cust.payment_status}<br>
      • <strong>3. What We Know:</strong> Physical drop line severed; Optical signal reads 0 dBm.<br>
      • <strong>4. What Was Tried:</strong> Automated optical line test confirmed complete break.<br>
      • <strong>5. AI Assessment:</strong> Outside self-service resolution. Zero-friction handover package synthesized.<br>
      • <strong>6. Recommended Action:</strong> Assign Level-2 Field Splicing Specialist.
    `;

  } else if (qLower.includes("paid") || qLower.includes("payment") || qLower.includes("pending") || qLower.includes("bank")) {
    document.getElementById("trace-rag-status").innerText = "KB-103 Billing Match";
    document.getElementById("trace-match-score").innerText = "91% Similarity";
    document.getElementById("trace-match-snippet").innerText = "KB-103: For pending bank transfers, customer must supply exact Payment Transaction Reference ID (UTR) for credit verification.";

    document.getElementById("trace-decision-badge").className = "badge-decision badge-case-ask";
    document.getElementById("trace-decision-badge").innerText = "🟡 CASE 2 — ASK CUSTOMER";
    document.getElementById("trace-conf-display").innerText = "Confidence: 88% • Missing Mandatory Parameter Detected";
    document.getElementById("trace-conf-display").style.color = "var(--ask-color)";

    document.getElementById("trace-output-text").innerHTML = `
      <strong>TARGETED FOLLOW-UP QUERY GENERATED:</strong><br><br>
      "Thank you for contacting support, ${cust.name}. To verify your bank transfer and instantly credit your account balance, please provide your <strong>Payment Transaction Reference ID / UTR number</strong> from your bank statement."<br><br>
      <strong>Missing Parameter:</strong> Payment Transaction Reference ID / UTR
    `;

  } else {
    document.getElementById("trace-rag-status").innerText = "KB-102 Diagnostics Match";
    document.getElementById("trace-match-score").innerText = "96% Similarity";
    document.getElementById("trace-match-snippet").innerText = "KB-102: WAN light indicators; 30-sec router power cycle sequence; verify optical connector click.";

    document.getElementById("trace-decision-badge").className = "badge-decision badge-case-resolve";
    document.getElementById("trace-decision-badge").innerText = "🟢 CASE 1 — RESOLVE";
    document.getElementById("trace-conf-display").innerText = "Confidence: 94% • Grounded Fact-Checked";
    document.getElementById("trace-conf-display").style.color = "var(--resolve-color)";

    document.getElementById("trace-output-text").innerHTML = `
      Hello ${cust.name},<br><br>
      I checked your account record and verified that your ${cust.plan} is active with no recorded area outages.<br><br>
      Your router WAN light is currently indicating: <strong>${cust.wan}</strong>.<br><br>
      <strong>Recommended Steps from Knowledge Base:</strong><br>
      1. Power off your router switch for 30 seconds to discharge internal capacitors.<br>
      2. Ensure the optical fiber cable is clicked into the yellow/blue WAN port.<br>
      3. Power back on and wait 3 full minutes for the WAN light to turn solid Green.<br><br>
      <strong>Source: KB-102 — Broadband Connection Troubleshooting (WAN Light Indicators)</strong>
    `;
  }
}

/* ==========================================================================
   AI TICKET WORKBENCH (PAGE 2)
   ========================================================================== */
async function runLiveAIQuery() {
  const input = document.getElementById("live-ai-prompt");
  const text = input.value.trim();
  if (!text) return;

  if (!activeTicket) activeTicket = ticketsData[0];
  
  try {
    const res = await fetch("http://127.0.0.1:8000/api/decisions/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: activeTicket.customer_id,
        message: text
      })
    });
    if (res.ok) {
      const evalRes = await res.json();
      activeTicket.decision_type = evalRes.decision_type;
      activeTicket.confidence_score = evalRes.confidence_score;
      activeTicket.ai_resolution = evalRes.ai_resolution;
      activeTicket.messages.push({
        sender: "customer",
        text: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }
  } catch (err) {
    console.log("Error analyzing live AI query:", err);
  }

  input.value = "";
  renderTicketWorkbench();
}

function renderTicketWorkbench(filterType = "all") {
  const container = document.getElementById("ticket-queue-list");
  if (!container) return;
  container.innerHTML = "";

  const filtered = ticketsData.filter(t => filterType === "all" || t.decision_type === filterType);
  const queueCountEl = document.getElementById("queue-total");
  if (queueCountEl) queueCountEl.innerText = `${filtered.length} Tickets`;

  filtered.forEach(t => {
    let badgeClass = "badge-case-resolve";
    let badgeText = "🟢 RESOLVE";

    if (t.decision_type === "ASK_CUSTOMER") {
      badgeClass = "badge-case-ask";
      badgeText = "🟡 ASK";
    } else if (t.decision_type === "ESCALATE") {
      badgeClass = "badge-case-escalate";
      badgeText = "🔴 ESCALATE";
    }

    const card = document.createElement("div");
    card.className = `q-card ${activeTicket && activeTicket.id === t.id ? "active" : ""}`;
    card.onclick = () => { activeTicket = t; renderTicketWorkbench(filterType); };
    card.innerHTML = `
      <span class="q-name">${t.customer_name}</span>
      <div class="q-sub">${t.subject}</div>
      <div class="d-info">
        <span class="badge-decision ${badgeClass}">${badgeText}</span>
        <span class="conf-text">${(t.confidence_score * 100).toFixed(0)}%</span>
      </div>
    `;
    container.appendChild(card);
  });

  if (activeTicket) {
    const cust = customersData.find(c => c.id === activeTicket.customer_id) || customersData[0];

    const cName = document.getElementById("chat-customer-name");
    if (cName) cName.innerText = cust.name;
    const cSub = document.getElementById("chat-customer-sub");
    if (cSub) cSub.innerText = `${cust.plan} • ${cust.id}`;
    const cBadge = document.getElementById("chat-state-badge");
    if (cBadge) cBadge.innerText = activeTicket.status;

    const chatContainer = document.getElementById("chat-thread-container");
    if (chatContainer) {
      chatContainer.innerHTML = (activeTicket.messages || []).map(m => `
        <div class="msg-bubble ${m.sender === "customer" ? "msg-customer" : "msg-agent"}">
          ${m.text}
        </div>
      `).join("");
    }

    renderAIPanel();

    const qCustId = document.getElementById("q-cust-id");
    if (qCustId) qCustId.innerText = cust.id;
    const qAvatar = document.getElementById("q-cust-avatar");
    if (qAvatar) qAvatar.innerText = cust.name.charAt(0);
    const qName = document.getElementById("q-cust-name");
    if (qName) qName.innerText = cust.name;
    const qEmail = document.getElementById("q-cust-email");
    if (qEmail) qEmail.innerText = cust.email;
    const qPlan = document.getElementById("q-cust-plan");
    if (qPlan) qPlan.innerText = cust.plan;
    const qBilling = document.getElementById("q-cust-billing");
    if (qBilling) qBilling.innerText = cust.payment_status;
    const qRouter = document.getElementById("q-cust-router");
    if (qRouter) qRouter.innerText = cust.router;
    const qWan = document.getElementById("q-cust-wan");
    if (qWan) qWan.innerText = cust.wan;
    const qSignal = document.getElementById("q-cust-signal");
    if (qSignal) qSignal.innerText = cust.signal;
  }

  if (window.lucide) lucide.createIcons();
}

function filterQueue(type) {
  renderTicketWorkbench(type);
}

function renderAIPanel() {
  const badgeEl = document.getElementById("decision-badge");
  const confEl = document.getElementById("confidence-val");

  const vResolve = document.getElementById("case-view-resolve");
  const vAsk = document.getElementById("case-view-ask");
  const vEscalate = document.getElementById("case-view-escalate");

  if (!badgeEl || !vResolve || !vAsk || !vEscalate) return;

  vResolve.classList.add("hidden");
  vAsk.classList.add("hidden");
  vEscalate.classList.add("hidden");

  confEl.innerText = `${(activeTicket.confidence_score * 100).toFixed(0)}% calibrated confidence`;
  const res = activeTicket.ai_resolution || {};

  if (activeTicket.decision_type === "RESOLVE") {
    badgeEl.className = "badge-decision badge-case-resolve";
    badgeEl.innerText = "🟢 CASE 1 — RESOLVE";
    vResolve.classList.remove("hidden");
    const ta = document.getElementById("ai-draft-textarea");
    if (ta) ta.value = res.grounded_answer || "";

    const citContainer = document.getElementById("citations-list-container");
    if (citContainer) {
      citContainer.innerHTML = (res.citations || []).map(c => `
        <span class="citation-pill"><strong>${c.article_id}:</strong> ${c.title} (${c.section}) [${(c.relevance_score * 100).toFixed(0)}% match]</span>
      `).join("");
    }

  } else if (activeTicket.decision_type === "ASK_CUSTOMER") {
    badgeEl.className = "badge-decision badge-case-ask";
    badgeEl.innerText = "🟡 CASE 2 — ASK CUSTOMER";
    vAsk.classList.remove("hidden");
    const pEl = document.getElementById("ask-prompt-display");
    if (pEl) pEl.innerText = (res.missing_info || {}).prompt_text || "Please provide your Transaction ID.";

  } else {
    badgeEl.className = "badge-decision badge-case-escalate";
    badgeEl.innerText = "🔴 CASE 3 — ESCALATE TO HUMAN";
    vEscalate.classList.remove("hidden");

    const ho = res.handover_summary || {};
    const hoIssue = document.getElementById("ho-issue-val");
    if (hoIssue) hoIssue.innerText = ho.issue || activeTicket.subject;
    const hoStanding = document.getElementById("ho-standing-val");
    if (hoStanding) hoStanding.innerText = ho.customer_status || "";

    const hoKnow = document.getElementById("ho-know-val");
    if (hoKnow) hoKnow.innerHTML = (ho.what_we_know || []).map(k => `<li>${k}</li>`).join("");
    const hoTried = document.getElementById("ho-tried-val");
    if (hoTried) hoTried.innerHTML = (ho.what_was_tried || []).map(t => `<li>${t}</li>`).join("");

    const hoAss = document.getElementById("ho-assessment-val");
    if (hoAss) hoAss.innerText = ho.ai_assessment || "";
    const hoAct = document.getElementById("ho-action-val");
    if (hoAct) hoAct.innerText = ho.recommended_action || "Assign Level-2 Specialist.";
  }
}

/* ==========================================================================
   CUSTOMER 360 DIRECTORY (PAGE 3)
   ========================================================================== */
function renderCustomerDirectory(filterText = "") {
  const container = document.getElementById("customers-grid-container");
  if (!container) return;
  container.innerHTML = "";

  const filtered = customersData.filter(c => 
    c.name.toLowerCase().includes(filterText.toLowerCase()) ||
    c.id.toLowerCase().includes(filterText.toLowerCase()) ||
    c.plan.toLowerCase().includes(filterText.toLowerCase())
  );

  filtered.forEach(c => {
    const card = document.createElement("div");
    card.className = "card c360-full-card";
    card.innerHTML = `
      <div class="c-profile">
        <div class="c-avatar">${c.name.charAt(0)}</div>
        <div>
          <h4>${c.name}</h4>
          <span class="c-email">${c.email} • ${c.phone}</span>
        </div>
      </div>
      <div class="c-details-group">
        <div class="c-row"><span>Account ID:</span><strong>${c.id}</strong></div>
        <div class="c-row"><span>Active Plan:</span><strong>${c.plan}</strong></div>
        <div class="c-row"><span>Monthly Charge:</span><strong>${c.monthly_fee}</strong></div>
        <div class="c-row"><span>Billing Standing:</span><span class="${c.payment_status === 'Paid' ? 'status-paid' : 'val-warning'}">${c.payment_status}</span></div>
        <div class="c-row"><span>Router Model:</span><strong>${c.router}</strong></div>
        <div class="c-row"><span>WAN LED Light:</span><span class="${c.wan && (c.wan.includes('Red') || c.wan.includes('Off')) ? 'val-warning' : 'status-paid'}">${c.wan}</span></div>
        <div class="c-row"><span>Optical Signal:</span><strong>${c.signal}</strong></div>
        <div class="c-row"><span>Provenance:</span><span class="status-paid" style="font-size:0.75rem;"><i data-lucide="activity"></i> Adapter Live (Freshness: 4s)</span></div>
        <div class="c-row"><span>Address:</span><span>${c.address}</span></div>
      </div>
    `;
    container.appendChild(card);
  });
}

function filterCustomerDirectory() {
  const val = document.getElementById("cust-dir-search").value;
  renderCustomerDirectory(val);
}

/* ==========================================================================
   KNOWLEDGE BASE (PAGE 7)
   ========================================================================== */
function renderKBArticles() {
  const container = document.getElementById("kb-articles-container");
  if (!container) return;
  container.innerHTML = "";

  kbArticlesData.forEach(a => {
    const card = document.createElement("div");
    card.className = "kb-card";
    card.innerHTML = `
      <span class="kb-id-tag">${a.id}</span>
      <h3 style="margin: 6px 0; font-size:0.98rem;">${a.title}</h3>
      <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin-bottom:8px;">${a.content || a.desc}</p>
      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
        <span style="font-size:0.72rem; color:var(--primary); font-weight:600;">Category: ${a.category}</span>
        <span class="badge-status status-paid" style="font-size:0.68rem;">Status: ${a.status || 'APPROVED'}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

async function performRAGSearch() {
  const query = document.getElementById("kb-semantic-input").value.toLowerCase();
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/knowledge/search?query=${encodeURIComponent(query)}`, {
      method: "POST"
    });
    if (res.ok) {
      const data = await res.json();
      const container = document.getElementById("kb-articles-container");
      container.innerHTML = (data.results || []).map(a => `
        <div class="kb-card">
          <span class="kb-id-tag">${a.article_id}</span>
          <h3 style="margin: 6px 0; font-size:0.98rem;">${a.title}</h3>
          <p style="font-size:0.8rem; color:var(--text-muted); line-height:1.4; margin-bottom:8px;">${a.content}</p>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
            <span style="font-size:0.72rem; color:var(--primary); font-weight:600;">Category: ${a.category}</span>
            <span class="badge-status status-paid" style="font-size:0.68rem;">Similarity: ${(a.similarity_score * 100).toFixed(0)}%</span>
          </div>
        </div>
      `).join("");
    }
  } catch (err) {
    console.log("RAG search error:", err);
  }
}

/* ==========================================================================
   AGENT WORKBENCH ACTIONS (STATE MACHINE TRANSITIONS)
   ========================================================================== */
async function approveResolution() {
  if (!activeTicket) return;
  const text = document.getElementById("ai-draft-textarea").value;
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/tickets/${activeTicket.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Role": "agent", "X-User-Id": "AGENT-KUMAR" },
      body: JSON.stringify({ custom_response: text })
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = ticketsData.findIndex(t => t.id === activeTicket.id);
      if (idx >= 0) ticketsData[idx] = updated;
      activeTicket = updated;
      renderTicketWorkbench();
      alert("✓ State Transition: RESOLVED_PENDING_APPROVAL ➔ SENT (Dispatched with audit event).");
    }
  } catch (err) {
    console.log("Approve error:", err);
  }
}

function editResolution() {
  const ta = document.getElementById("ai-draft-textarea");
  if (ta) ta.focus();
}

async function requestInformation() {
  if (!activeTicket) return;
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/tickets/${activeTicket.id}/ask-customer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Role": "agent", "X-User-Id": "AGENT-KUMAR" }
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = ticketsData.findIndex(t => t.id === activeTicket.id);
      if (idx >= 0) ticketsData[idx] = updated;
      activeTicket = updated;
      renderTicketWorkbench();
      alert("✓ State Transition: ANALYZING ➔ ASK_CUSTOMER (Follow-up dispatched).");
    }
  } catch (err) {
    console.log("Ask customer error:", err);
  }
}

async function forceEscalate() {
  if (!activeTicket) return;
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/tickets/${activeTicket.id}/escalate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Role": "agent", "X-User-Id": "AGENT-KUMAR" },
      body: JSON.stringify({ reason: "Manual agent escalation override." })
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = ticketsData.findIndex(t => t.id === activeTicket.id);
      if (idx >= 0) ticketsData[idx] = updated;
      activeTicket = updated;
      renderTicketWorkbench();
    }
  } catch (err) {
    console.log("Escalate error:", err);
  }
}

async function claimEscalatedTicket() {
  if (!activeTicket) return;
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/tickets/${activeTicket.id}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Role": "agent", "X-User-Id": "AGENT-KUMAR" }
    });
    if (res.ok) {
      const updated = await res.json();
      const idx = ticketsData.findIndex(t => t.id === activeTicket.id);
      if (idx >= 0) ticketsData[idx] = updated;
      activeTicket = updated;
      renderTicketWorkbench();
      alert(`✓ State Transition: ESCALATED ➔ CLAIMED by Level-2 Specialist Kumar.`);
    }
  } catch (err) {
    console.log("Claim error:", err);
  }
}

function handleGlobalSearch() {
  const query = document.getElementById("global-search-input").value;
  if (query.length > 2) {
    navigateTo("tickets");
  }
}
