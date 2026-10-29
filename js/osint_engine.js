/**
 * FreeLLM Hub — Live OSINT & Attack-Surface Reconnaissance Engine (v2.1)
 * 100% Free, Keyless, CORS-Enabled Threat Intelligence Pipeline:
 * - Shodan InternetDB (Open ports, CPEs, CVEs, Hostnames)
 * - Google DNS-over-HTTPS (A, MX, TXT, NS records with chained IP lookup)
 * - crt.sh Certificate Transparency Subdomain Enumeration
 * - RDAP Domain Registration & Ownership Data (rdap.org)
 * - GitHub Public OSINT (Profile & Git Commit Author Emails)
 * - Interactive Visual Attack Surface Graph Artifact Generator
 */

class OsintEngine {
  constructor() {
    window.osintEngine = this;
    this.excludedExtensions = new Set([
      "js", "py", "json", "md", "css", "html", "png", "jpg", "jpeg",
      "gif", "svg", "txt", "ts", "sh", "yml", "yaml", "ico", "map",
      "wasm", "zip", "tar", "gz", "lock", "mjs", "cjs"
    ]);
  }

  createTimeoutSignal(ms = 6000) {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      try {
        return AbortSignal.timeout(ms);
      } catch (e) {}
    }
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }

  // --- Target Extraction Regexes ---
  extractTargets(text) {
    if (!text) return { ips: [], domains: [], githubUsers: [] };

    const cleanText = text.replace(/https?:\/\//gi, " ");

    // 1. IPv4 Regex
    const ipRegex = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;
    const rawIps = text.match(ipRegex) || [];
    const ips = [...new Set(rawIps)].filter(ip => {
      // Filter common bogus IPs
      return ip !== "0.0.0.0" && ip !== "255.255.255.255";
    });

    // 2. Domain Regex
    const domainRegex = /\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b/g;
    const rawDomains = cleanText.match(domainRegex) || [];
    const domains = [...new Set(rawDomains)].filter(d => {
      const parts = d.toLowerCase().split(".");
      const ext = parts[parts.length - 1];
      if (this.excludedExtensions.has(ext)) return false;
      // Filter out pure numbers (e.g. 1.0.0)
      if (/^\d+$/.test(ext)) return false;
      // Filter out internal localhost
      if (d === "localhost" || d.endsWith(".local") || d.endsWith(".internal")) return false;
      return true;
    });

    // 3. GitHub Username Regex
    const ghRegexes = [
      /(?:github\.com\/|@gh:|gh:)([a-zA-Z0-9-]+)/gi,
      /\/osint\s+(?:gh:|@)?([a-zA-Z0-9-]+)/i
    ];
    const rawUsers = [];
    for (const rx of ghRegexes) {
      let m;
      while ((m = rx.exec(text)) !== null) {
        if (m[1] && !["orgs", "topics", "features", "pulls", "issues"].includes(m[1].toLowerCase())) {
          rawUsers.push(m[1]);
        }
      }
    }
    const githubUsers = [...new Set(rawUsers)];

    return { ips, domains, githubUsers };
  }

  // --- Shodan InternetDB (100% Free, Keyless, CORS-Enabled) ---
  async fetchShodanIp(ip) {
    try {
      const signal = this.createTimeoutSignal(6000);
      const res = await fetch(`https://internetdb.shodan.io/${ip}`, { signal });
      if (!res.ok) {
        return {
          ip,
          ports: [],
          cpes: [],
          hostnames: [],
          tags: [],
          vulns: [],
          status: "No open ports or services indexed in Shodan InternetDB"
        };
      }
      const data = await res.json();
      return {
        ip: data.ip || ip,
        ports: Array.isArray(data.ports) ? data.ports : [],
        cpes: Array.isArray(data.cpes) ? data.cpes : [],
        hostnames: Array.isArray(data.hostnames) ? data.hostnames : [],
        tags: Array.isArray(data.tags) ? data.tags : [],
        vulns: Array.isArray(data.vulns) ? data.vulns : [],
        status: "Exposed Services Indexed"
      };
    } catch (e) {
      return {
        ip,
        ports: [],
        cpes: [],
        hostnames: [],
        tags: [],
        vulns: [],
        status: `Shodan Query Timeout / Unreachable (${e.message})`
      };
    }
  }

  // --- Google DNS-over-HTTPS (DoH) ---
  async fetchGoogleDns(domain, type = "A") {
    try {
      const signal = this.createTimeoutSignal(6000);
      const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, { signal });
      if (!res.ok) return [];
      const data = await res.json();
      if (!data.Answer) return [];
      return data.Answer.map(a => a.data).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  // --- crt.sh Certificate Transparency Subdomain Enumeration ---
  async fetchCrtShSubdomains(domain) {
    try {
      const signal = this.createTimeoutSignal(6000);
      const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`, { signal });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      const rawSet = new Set();
      for (const item of data) {
        if (!item.name_value) continue;
        const names = item.name_value.split("\n");
        for (let n of names) {
          n = n.trim().toLowerCase();
          if (n.startsWith("*.")) n = n.substring(2);
          if (n.endsWith(`.${domain}`) || n === domain) {
            rawSet.add(n);
          }
        }
      }

      const highValueKeywords = ["dev", "staging", "api", "vpn", "admin", "test", "internal", "oci", "tunnel", "auth", "portal", "mail", "corp"];
      const sorted = [...rawSet].sort((a, b) => {
        const aScore = highValueKeywords.filter(k => a.includes(k)).length;
        const bScore = highValueKeywords.filter(k => b.includes(k)).length;
        return bScore - aScore;
      });

      return sorted.slice(0, 80);
    } catch (e) {
      console.warn("crt.sh fetch error:", e);
      return [];
    }
  }

  // --- RDAP Domain Registration & Ownership Data ---
  async fetchRdap(domain) {
    try {
      const signal = this.createTimeoutSignal(6000);
      const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { signal });
      if (!res.ok) return null;
      const data = await res.json();

      let registrar = "Unknown / Redacted";
      if (Array.isArray(data.entities)) {
        for (const ent of data.entities) {
          if (Array.isArray(ent.roles) && ent.roles.includes("registrar")) {
            if (Array.isArray(ent.vcardArray) && ent.vcardArray[1]) {
              const fnEntry = ent.vcardArray[1].find(item => item[0] === "fn");
              if (fnEntry && fnEntry[3]) registrar = fnEntry[3];
            }
          }
        }
      }

      let regDate = "";
      let expDate = "";
      if (Array.isArray(data.events)) {
        for (const ev of data.events) {
          if (ev.eventAction === "registration") regDate = ev.eventDate;
          if (ev.eventAction === "expiration") expDate = ev.eventDate;
        }
      }

      const nameservers = Array.isArray(data.nameservers)
        ? data.nameservers.map(ns => ns.ldhName).filter(Boolean)
        : [];

      return {
        domain,
        registrar,
        registrationDate: regDate,
        expirationDate: expDate,
        status: Array.isArray(data.status) ? data.status.slice(0, 4) : [],
        nameservers
      };
    } catch (e) {
      return null;
    }
  }

  // --- GitHub Profile & Commit Author Emails ---
  async fetchGitHubOsint(username) {
    const result = {
      username,
      name: "",
      bio: "",
      company: "",
      location: "",
      public_repos: 0,
      blog: "",
      emailsDiscovered: []
    };

    try {
      const signal = this.createTimeoutSignal(6000);
      const [profileRes, eventsRes] = await Promise.allSettled([
        fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { signal }),
        fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=30`, { signal })
      ]);

      if (profileRes.status === "fulfilled" && profileRes.value.ok) {
        const prof = await profileRes.value.json();
        result.name = prof.name || "";
        result.bio = prof.bio || "";
        result.company = prof.company || "";
        result.location = prof.location || "";
        result.public_repos = prof.public_repos || 0;
        result.blog = prof.blog || "";
      }

      if (eventsRes.status === "fulfilled" && eventsRes.value.ok) {
        const events = await eventsRes.value.json();
        const emails = new Set();
        if (Array.isArray(events)) {
          for (const ev of events) {
            if (ev.type === "PushEvent" && ev.payload && Array.isArray(ev.payload.commits)) {
              for (const c of ev.payload.commits) {
                if (c.author && c.author.email && !c.author.email.includes("users.noreply.github.com")) {
                  emails.add(c.author.email);
                }
              }
            }
          }
        }
        result.emailsDiscovered = [...emails];
      }
    } catch (e) {}

    return result;
  }

  // --- Main Autonomous Reconnaissance Pipeline ---
  async runOsintEnrichment(promptText, onProgress = null) {
    const targets = this.extractTargets(promptText);
    const hasTargets = targets.ips.length > 0 || targets.domains.length > 0 || targets.githubUsers.length > 0;

    if (!hasTargets) {
      return null;
    }

    if (onProgress) {
      onProgress("🛰️ Scanning Shodan InternetDB, crt.sh Certificate Logs, DoH DNS & RDAP...");
    }

    const telemetry = {
      timestamp: new Date().toISOString(),
      targets,
      ipRecon: [],
      domainRecon: [],
      githubRecon: [],
      metrics: {
        totalOpenPorts: 0,
        totalCves: 0,
        totalSubdomains: 0,
        verifiedDns: 0
      }
    };

    const taskPromises = [];

    // 1. IPs Shodan Recon
    const directIpSet = new Set(targets.ips);
    for (const ip of directIpSet) {
      taskPromises.push(
        this.fetchShodanIp(ip).then(res => {
          telemetry.ipRecon.push(res);
          telemetry.metrics.totalOpenPorts += res.ports.length;
          telemetry.metrics.totalCves += res.vulns.length;
        })
      );
    }

    // 2. Domain Recon (DoH, crt.sh, RDAP, and chained Shodan on resolved A-records)
    for (const domain of targets.domains) {
      const domainItem = {
        domain,
        dns: { a: [], mx: [], txt: [], ns: [] },
        subdomains: [],
        rdap: null
      };
      telemetry.domainRecon.push(domainItem);

      // DoH Lookups
      const dnsPromise = Promise.allSettled([
        this.fetchGoogleDns(domain, "A"),
        this.fetchGoogleDns(domain, "MX"),
        this.fetchGoogleDns(domain, "TXT"),
        this.fetchGoogleDns(domain, "NS")
      ]).then(async ([aRes, mxRes, txtRes, nsRes]) => {
        domainItem.dns.a = aRes.status === "fulfilled" ? aRes.value : [];
        domainItem.dns.mx = mxRes.status === "fulfilled" ? mxRes.value : [];
        domainItem.dns.txt = txtRes.status === "fulfilled" ? txtRes.value : [];
        domainItem.dns.ns = nsRes.status === "fulfilled" ? nsRes.value : [];
        if (domainItem.dns.a.length > 0) telemetry.metrics.verifiedDns++;

        // Automatically chain Shodan on newly resolved A-record IPs!
        for (const aIp of domainItem.dns.a) {
          if (!directIpSet.has(aIp)) {
            directIpSet.add(aIp);
            try {
              const shodanRes = await this.fetchShodanIp(aIp);
              telemetry.ipRecon.push(shodanRes);
              telemetry.metrics.totalOpenPorts += shodanRes.ports.length;
              telemetry.metrics.totalCves += shodanRes.vulns.length;
            } catch (e) {}
          }
        }
      });
      taskPromises.push(dnsPromise);

      // crt.sh Lookups
      taskPromises.push(
        this.fetchCrtShSubdomains(domain).then(subs => {
          domainItem.subdomains = subs;
          telemetry.metrics.totalSubdomains += subs.length;
        })
      );

      // RDAP Lookups
      taskPromises.push(
        this.fetchRdap(domain).then(rdapData => {
          domainItem.rdap = rdapData;
        })
      );
    }

    // 3. GitHub Recon
    for (const ghUser of targets.githubUsers) {
      taskPromises.push(
        this.fetchGitHubOsint(ghUser).then(ghData => {
          telemetry.githubRecon.push(ghData);
        })
      );
    }

    await Promise.allSettled(taskPromises);

    return telemetry;
  }

  // --- Visual Attack Surface Map HTML Generator (Interactive Artifact) ---
  generateAttackSurfaceHtml(telemetry) {
    const rawJsonSafe = encodeURIComponent(JSON.stringify(telemetry, null, 2));
    const targetTitle = telemetry.targets.domains[0] || telemetry.targets.ips[0] || "Target Surface";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OSINT Attack Surface Map: ${targetTitle}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #0c0c0e; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .glass-card { background: rgba(24, 24, 27, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
    .badge-dev { background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }
    .badge-api { background: rgba(168, 85, 247, 0.15); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
    .badge-vuln { background: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.3); }
    .badge-port { background: rgba(251, 191, 36, 0.15); color: #fcd34d; border: 1px solid rgba(251, 191, 36, 0.3); }
  </style>
</head>
<body class="p-4 sm:p-6 min-h-screen">
  <div class="max-w-6xl mx-auto space-y-6">
    
    <!-- Header Bar -->
    <div class="glass-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-lg">🛰️</div>
        <div>
          <h1 class="text-base font-bold text-white flex items-center gap-2">
            <span>Attack Surface Reconnaissance:</span>
            <span class="text-rose-400 font-mono">${targetTitle}</span>
          </h1>
          <p class="text-xs text-stone-400 font-mono mt-0.5">Live Shodan InternetDB · crt.sh CT Logs · Google DoH · RDAP Registry</p>
        </div>
      </div>
      <div class="flex items-center gap-2 text-xs">
        <span class="px-2.5 py-1 rounded-lg badge-port font-mono font-bold">🔓 ${telemetry.metrics.totalOpenPorts} Ports</span>
        <span class="px-2.5 py-1 rounded-lg badge-vuln font-mono font-bold">⚠️ ${telemetry.metrics.totalCves} CVEs</span>
        <span class="px-2.5 py-1 rounded-lg badge-dev font-mono font-bold">🌐 ${telemetry.metrics.totalSubdomains} Subdomains</span>
      </div>
    </div>

    <!-- Infrastructure & Open Ports (Shodan InternetDB) -->
    <div class="glass-card rounded-2xl p-5">
      <h2 class="text-sm font-bold text-stone-200 mb-3 flex items-center gap-2">
        <span>🔌 Infrastructure & Exposed Ports (Shodan InternetDB)</span>
      </h2>
      ${telemetry.ipRecon.length === 0 ? '<p class="text-xs text-stone-500 italic">No IP records resolved.</p>' : `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${telemetry.ipRecon.map(ipData => `
            <div class="rounded-xl bg-stone-900/90 border border-stone-800 p-3.5 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-mono text-sm font-bold text-amber-400">${ipData.ip}</span>
                <span class="text-[11px] font-mono text-stone-400">${ipData.status}</span>
              </div>
              <div class="flex flex-wrap gap-1.5 pt-1">
                ${ipData.ports.length > 0 ? ipData.ports.map(p => `
                  <span class="px-2 py-0.5 rounded text-xs font-mono badge-port font-semibold">Port ${p}</span>
                `).join('') : '<span class="text-xs text-stone-500 font-mono">Zero exposed ports</span>'}
              </div>
              ${ipData.vulns.length > 0 ? `
                <div class="pt-2 border-t border-stone-800">
                  <span class="text-[11px] font-bold text-rose-400 uppercase">CVE Vulnerabilities:</span>
                  <div class="flex flex-wrap gap-1 mt-1">
                    ${ipData.vulns.map(v => `<span class="px-2 py-0.5 rounded text-[11px] font-mono badge-vuln font-bold">${v}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
              ${ipData.hostnames.length > 0 ? `
                <div class="text-[11px] text-stone-400 font-mono pt-1 truncate">
                  Hostnames: ${ipData.hostnames.join(', ')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `}
    </div>

    <!-- Subdomains Discovered via Certificate Transparency (crt.sh) -->
    <div class="glass-card rounded-2xl p-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-bold text-stone-200 flex items-center gap-2">
          <span>🌐 Subdomain Attack Surface (crt.sh CT Logs · Top ${telemetry.metrics.totalSubdomains})</span>
        </h2>
        <input id="subdomain-filter" type="text" placeholder="Filter subdomains (e.g. dev, api)..." oninput="filterSubdomains(this.value)" class="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-rose-500/50">
      </div>
      <div id="subdomains-grid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
        ${(telemetry.domainRecon[0]?.subdomains || []).map(s => {
          let badge = "bg-stone-900 border-stone-800 text-stone-300";
          if (s.includes("dev") || s.includes("staging") || s.includes("test")) badge = "badge-dev";
          if (s.includes("api") || s.includes("graphql")) badge = "badge-api";
          if (s.includes("admin") || s.includes("portal") || s.includes("vpn")) badge = "badge-vuln";
          return `<div class="subdomain-item px-2.5 py-1.5 rounded-lg border text-xs font-mono truncate ${badge}">${s}</div>`;
        }).join('')}
      </div>
    </div>

    <!-- DNS Records & RDAP Registration -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="glass-card rounded-2xl p-5 space-y-3">
        <h2 class="text-sm font-bold text-stone-200">📡 DNS Records (Google DoH)</h2>
        ${telemetry.domainRecon.map(d => `
          <div class="space-y-2 text-xs font-mono">
            <div><span class="text-stone-500 font-bold">A Records:</span> <span class="text-emerald-400">${d.dns.a.join(', ') || 'None'}</span></div>
            <div><span class="text-stone-500 font-bold">MX Records:</span> <span class="text-sky-400">${d.dns.mx.join(', ') || 'None'}</span></div>
            <div><span class="text-stone-500 font-bold">NS Records:</span> <span class="text-purple-400">${d.dns.ns.join(', ') || 'None'}</span></div>
          </div>
        `).join('')}
      </div>

      <div class="glass-card rounded-2xl p-5 space-y-3">
        <h2 class="text-sm font-bold text-stone-200">📋 Domain Registration (RDAP)</h2>
        ${telemetry.domainRecon.map(d => d.rdap ? `
          <div class="space-y-1.5 text-xs font-mono">
            <div><span class="text-stone-500 font-bold">Registrar:</span> <span class="text-stone-200">${d.rdap.registrar}</span></div>
            <div><span class="text-stone-500 font-bold">Registered:</span> <span class="text-stone-200">${d.rdap.registrationDate || 'Unknown'}</span></div>
            <div><span class="text-stone-500 font-bold">Expires:</span> <span class="text-amber-400">${d.rdap.expirationDate || 'Unknown'}</span></div>
            <div><span class="text-stone-500 font-bold">Status:</span> <span class="text-stone-400">${d.rdap.status.join(', ')}</span></div>
          </div>
        ` : '<p class="text-xs text-stone-500 font-mono">No RDAP registry record returned.</p>').join('')}
      </div>
    </div>

  </div>

  <script>
    function filterSubdomains(q) {
      const term = q.toLowerCase().trim();
      document.querySelectorAll('.subdomain-item').forEach(el => {
        if (!term || el.textContent.toLowerCase().includes(term)) {
          el.style.display = 'block';
        } else {
          el.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`;
  }

  // --- Collapsible Summary Card HTML for Chat Stream ---
  renderTelemetryCardHtml(telemetry, cardId = `osint-card-${Date.now()}`) {
    const counts = telemetry.metrics;
    const safeArtifactHtml = encodeURIComponent(this.generateAttackSurfaceHtml(telemetry));
    const safeJson = encodeURIComponent(JSON.stringify(telemetry, null, 2));

    return `
      <div class="my-3 rounded-xl border border-rose-500/40 bg-stone-900/90 shadow-lg overflow-hidden text-xs" id="${cardId}">
        <div class="p-3 bg-gradient-to-r from-rose-950/40 via-stone-900 to-stone-900 flex items-center justify-between border-b border-rose-500/20 cursor-pointer"
             onclick="document.getElementById('${cardId}-body').classList.toggle('hidden')">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold">🛰️</span>
            <span class="font-bold text-stone-100">Live OSINT Reconnaissance Telemetry</span>
            <span class="text-[10px] text-stone-400 font-mono">(Click to expand)</span>
          </div>
          <div class="flex items-center gap-1.5 font-mono">
            <span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">🔓 ${counts.totalOpenPorts} Ports</span>
            <span class="px-2 py-0.5 rounded ${counts.totalCves > 0 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold' : 'bg-stone-800 text-stone-400'}">⚠️ ${counts.totalCves} CVEs</span>
            <span class="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">🌐 ${counts.totalSubdomains} Subs</span>
            <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hidden sm:inline">📡 DoH/RDAP</span>
          </div>
        </div>
        <div id="${cardId}-body" class="p-3 bg-stone-950/80 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800/80 pb-2">
            <div class="flex items-center gap-2">
              <button type="button"
                      onclick="navigator.clipboard.writeText(decodeURIComponent('${safeJson}')).then(() => window.app.showCommandToast('📋 Copied full OSINT JSON telemetry!'))"
                      class="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700/80 font-mono text-[11px] flex items-center gap-1 cursor-pointer transition-all">
                <span>📋 Copy Raw JSON</span>
              </button>
              <button type="button"
                      onclick="window.app.openArtifact('Attack Surface Map', 'html', decodeURIComponent('${safeArtifactHtml}'))"
                      class="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-all shadow-sm">
                <span>🎨 Open Visual Attack Surface Map in Artifacts</span>
              </button>
            </div>
            <span class="text-[10px] text-stone-500 font-mono">${telemetry.timestamp}</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
            <div>
              <span class="text-stone-400 font-bold block mb-1">Target IPs & Ports (Shodan InternetDB):</span>
              ${telemetry.ipRecon.length === 0 ? '<span class="text-stone-500 italic">None resolved</span>' : telemetry.ipRecon.map(i => `
                <div class="truncate text-stone-300"><span class="text-amber-400 font-bold">${i.ip}</span>: Ports [${i.ports.join(', ') || 'None'}] ${i.vulns.length > 0 ? '<span class=\"text-rose-400 font-bold\">(' + i.vulns.join(', ') + ')</span>' : ''}</div>
              `).join('')}
            </div>
            <div>
              <span class="text-stone-400 font-bold block mb-1">Subdomains Discovered (crt.sh):</span>
              <div class="text-stone-400 truncate">${(telemetry.domainRecon[0]?.subdomains || []).slice(0, 5).join(', ')}${counts.totalSubdomains > 5 ? ` +${counts.totalSubdomains - 5} more` : ''}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

window.OsintEngine = OsintEngine;
window.osintEngine = new OsintEngine();
