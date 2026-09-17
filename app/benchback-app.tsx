"use client";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  FileText,
  HelpCircle,
  Loader2,
  LockKeyhole,
  LogIn,
  LogOut,
  Mic,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Square,
  Truck,
  Upload,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import {
  applyAction,
  actionSchema,
  normalizeId,
  demoCores,
  demoPolicy,
  demoSteps,
  exportCsv,
  inspectReadiness,
  money,
  searchCores,
  type AuditEvent,
  type Core,
  type CoreAction,
  type Policy,
  type Transcript,
} from "@/lib/domain";
import {
  CoreDetail,
  CoreForm,
  ImportForm,
  PolicyForm,
  RecordActionForm,
} from "./benchback-forms";
export type User = {
  userId: string;
  email: string;
  displayName: string;
} | null;
export async function api(path: string, data?: unknown) {
  const r = await fetch(`/api/${path}`, {
    method: data === undefined ? "GET" : "POST",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const d = (await r.json()) as {
    error?: string;
    cores: Core[];
    policies: Policy[];
    policy: Policy;
    voiceConfigured: boolean;
    events: AuditEvent[];
    transcripts: Transcript[];
    state: Core["state"];
    event: AuditEvent;
  };
  if (!r.ok) throw new Error(d.error || "The request could not be completed.");
  return d;
}
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Benchback home">
      <span className="brand-mark">
        <AudioLines strokeWidth={2.6} />
      </span>
      benchback<span style={{ color: "#afa7ec" }}>↗</span>
    </Link>
  );
}
function ensureUnallocated(cores: Core[], core: Core, action: CoreAction) {
  if (action.type !== "add_credit") return;
  if (
    cores.some(
      (c) =>
        normalizeId(c.supplier) === normalizeId(core.supplier) &&
        c.state.credits.some(
          (cr) =>
            !cr.reversedAt &&
            normalizeId(cr.memo) === normalizeId(action.memo) &&
            normalizeId(cr.lineRef) === normalizeId(action.lineRef),
        ),
    )
  )
    throw new Error(
      "This supplier memo line is already allocated. Reverse the incorrect posting before reusing it.",
    );
}
export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`badge ${status === "Credited" ? "green" : status === "Ready to return" ? "purple" : status === "Short credit" ? "amber" : status === "Awaiting credit" ? "blue" : ""}`}
    >
      {status === "Credited" && <Check size={12} />} {status}
    </span>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    ref.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab" && ref.current) {
        const all = Array.from(
          ref.current.querySelectorAll<HTMLElement>(
            "button:not(:disabled),a[href],input:not(:disabled),textarea,select",
          ),
        );
        const first = all[0],
          last = all.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = previous;
      old?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="close" onClick={close} aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
export default function BenchbackApp({
  user,
  workspace = false,
}: {
  user: User;
  workspace?: boolean;
}) {
  const [cores, setCores] = useState<Core[]>(workspace ? [] : demoCores());
  const [policies, setPolicies] = useState<Policy[]>(
    workspace ? [] : [demoPolicy()],
  );
  const [selectedId, setSelectedId] = useState("core-418");
  const [view, setView] = useState("Recovery desk");
  const [detail, setDetail] = useState(false);
  const [tab, setTab] = useState("Return checklist");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All cores");
  const [modal, setModal] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!workspace);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [transcripts, setTranscripts] = useState<Record<string, Transcript[]>>(
    {},
  );
  const [step, setStep] = useState(-1);
  const [voiceReady, setVoiceReady] = useState(false);
  const [voiceState, setVoiceState] = useState("idle");
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const voice = useRef<{ end: () => void; mute: (v: boolean) => void } | null>(
    null,
  );
  const selected = cores.find((c) => c.id === selectedId) || cores[0];
  const isDemo = !workspace;
  const isLive = voiceState !== "idle";
  const refresh = useCallback(async () => {
    const d = await api("workspace");
    setCores(d.cores);
    setPolicies(d.policies);
    setLoaded(true);
    return d;
  }, []);
  useEffect(() => {
    api("health")
      .then((d) => setVoiceReady(d.voiceConfigured))
      .catch(() => {});
    if (workspace)
      api("workspace")
        .then((d) => {
          setCores(d.cores);
          setPolicies(d.policies);
          setLoaded(true);
        })
        .catch((e) => {
          setError(e.message);
          setLoaded(true);
        });
  }, [workspace, refresh]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const activeCoreId = selected?.id;
  useEffect(() => {
    if (!workspace || !activeCoreId) return;
    api(`cores/${activeCoreId}/events`)
      .then((d) => {
        setEvents((es) => [
          ...es.filter((e) => e.coreId !== activeCoreId),
          ...d.events,
        ]);
        setTranscripts((t) => ({ ...t, [activeCoreId]: d.transcripts }));
      })
      .catch((e) => setError(e.message));
  }, [workspace, activeCoreId]);
  useEffect(() => () => voice.current?.end(), []);
  useEffect(() => {
    if (!["listening", "speaking"].includes(voiceState)) return;
    const t = setInterval(() => setVoiceSeconds((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [voiceState]);
  function updateCore(id: string, state: Core["state"]) {
    setCores((cs) => cs.map((c) => (c.id === id ? { ...c, state } : c)));
  }
  async function act(
    action: CoreAction,
    source = "manual",
    role: "owner" | "agent" = "owner",
  ) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      if (isDemo) {
        action = actionSchema.parse(action);
        ensureUnallocated(cores, selected, action);
        const after = applyAction(
          selected,
          action,
          role === "agent" ? "Benchback AI" : "Demo parts manager",
          role,
        );
        const event: AuditEvent = {
          id: crypto.randomUUID(),
          coreId: selected.id,
          action: action.type,
          actor: role === "agent" ? "Benchback AI" : "Demo parts manager",
          source: "interactive demo",
          at: new Date().toISOString(),
          before: selected.state,
          after,
          note: "note" in action ? action.note : "",
        };
        updateCore(selected.id, after);
        setEvents((es) => [...es, event]);
      } else {
        const d = await api(`cores/${selected.id}/actions`, {
          action,
          revision: selected.state.revision,
          requestId: crypto.randomUUID(),
        });
        updateCore(selected.id, d.state);
        setEvents((es) => [...es.filter((e) => e.id !== d.event.id), d.event]);
      }
      if (source === "manual")
        setToast(
          action.type === "add_credit"
            ? "Supplier credit posted. Outstanding balance updated."
            : "Record saved. History updated.",
        );
    } finally {
      setBusy(false);
    }
  }
  function navigate(next: string) {
    if (isLive) {
      setToast("End the voice check before switching views.");
      return;
    }
    setView(next);
    setDetail(false);
    setSearch("");
    setFilter("All cores");
  }
  function openCore(id: string) {
    if (isLive && id !== selectedId) {
      setToast("End this voice check before opening a different core.");
      return;
    }
    setSelectedId(id);
    setDetail(true);
    setTab("Return checklist");
    setView("Recovery desk");
  }
  function startDemo() {
    if (isLive) return;
    const cs = demoCores();
    setCores(cs);
    setSelectedId(cs[0].id);
    setEvents([]);
    setTranscripts({
      [cs[0].id]: [
        {
          id: "demo-0",
          speaker: demoSteps[0].speaker,
          text: demoSteps[0].text,
        },
      ],
    });
    setStep(0);
    setDetail(true);
    setTab("Conversation");
    setModal("");
  }
  function nextDemo() {
    const next = step + 1;
    if (next >= demoSteps.length) return;
    const item = demoSteps[next];
    setStep(next);
    setTranscripts((t) => ({
      ...t,
      [selected.id]: [
        ...(t[selected.id] || []),
        { id: `demo-${next}`, speaker: item.speaker, text: item.text },
      ],
    }));
    if (item.action)
      void act(item.action, "guided", "agent").catch((e) =>
        setError(e.message),
      );
  }
  async function startVoice() {
    setModal("");
    setError("");
    setVoiceState("connecting");
    setVoiceSeconds(0);
    setDetail(true);
    setTab("Conversation");
    try {
      const { startVoiceSession } = await import("@/lib/voice-client");
      voice.current = await startVoiceSession({
        coreId: selected.id,
        onStatus: setVoiceState,
        onTranscript: (t) =>
          setTranscripts((ts) => ({
            ...ts,
            [selected.id]: [
              ...(ts[selected.id] || []).filter((x) => x.id !== t.id),
              t,
            ],
          })),
        onState: (state, event) => {
          updateCore(selected.id, state);
          if (event)
            setEvents((es) => [...es.filter((e) => e.id !== event.id), event]);
        },
        onError: setError,
        onEnd: () => {
          voice.current = null;
          setVoiceState("idle");
          setMuted(false);
        },
      });
    } catch (e) {
      setVoiceState("idle");
      setError((e as Error).message);
    }
  }
  async function loadPractice() {
    setBusy(true);
    try {
      const d = await api("seed", {});
      setCores((cs) => [...d.cores, ...cs]);
      setPolicies((ps) => [...d.policies, ...ps]);
      setSelectedId(d.cores[0].id);
      setToast("Practice purchases loaded into your private workspace.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const total = cores.reduce((n, c) => n + c.depositCents, 0),
    credited = cores.reduce((n, c) => n + inspectReadiness(c).creditedCents, 0),
    open = cores.reduce((n, c) => n + inspectReadiness(c).outstandingCents, 0);
  const due = cores.filter(
    (c) => !c.state.dispatchedAt && inspectReadiness(c).daysLeft <= 7,
  );
  const dueAmount = due.reduce((n, c) => n + c.depositCents, 0);
  const short = cores.filter(
    (c) => inspectReadiness(c).status === "Short credit",
  );
  const ready = cores.filter(
    (c) => inspectReadiness(c).status === "Ready to return",
  );
  const filtered = (
    search ? searchCores(cores, search, cores.length) : cores
  ).filter(
    (c) => filter === "All cores" || inspectReadiness(c).status === filter,
  );
  const voiceCard = selected && (
    <div className="voice-card">
      <div className="voice-top">
        <span className="voice-label">
          <AudioLines size={16} />
          Bench assistant
        </span>
        <span className="badge">
          {isLive
            ? `${Math.floor(voiceSeconds / 60)}:${String(voiceSeconds % 60).padStart(2, "0")}`
            : "AssemblyAI"}
        </span>
      </div>
      <div className="voice-visual">
        <div className="voice-orb">
          <Mic size={29} strokeWidth={1.6} />
        </div>
        <h2>
          {isLive
            ? voiceState === "speaking"
              ? "Benchback is speaking"
              : voiceState === "connecting"
                ? "Connecting…"
                : voiceState === "ending"
                  ? "Finishing…"
                  : muted
                    ? "Microphone muted"
                    : "Tell me about the part."
            : "Hands on the part."}
        </h2>
        <p>
          {isLive
            ? "Inspect the core while Benchback checks the paperwork."
            : "Talk through the return. Keep your hands on the work."}
        </p>
        <div
          className={`waveform ${isLive ? "active" : ""}`}
          aria-hidden="true"
        >
          {[
            6, 12, 8, 20, 15, 30, 19, 40, 27, 15, 25, 36, 44, 26, 34, 18, 28,
            38, 22, 14, 24, 17, 10, 15, 6,
          ].map((h, i) => (
            <span
              key={i}
              style={{ height: h, animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </div>
      </div>
      <div className="voice-actions">
        {isLive ? (
          <>
            <button
              className="btn primary"
              disabled={voiceState === "connecting" || voiceState === "ending"}
              onClick={() => voice.current?.end()}
            >
              <Square size={14} />
              End conversation
            </button>
            <button
              className="btn secondary"
              disabled={voiceState === "connecting" || voiceState === "ending"}
              onClick={() => {
                voice.current?.mute(!muted);
                setMuted(!muted);
              }}
            >
              {muted ? "Unmute microphone" : "Mute microphone"}
            </button>
          </>
        ) : (
          <>
            <button
              className="btn primary"
              disabled={!!selected.state.dispatchedAt}
              onClick={() => setModal(isDemo ? "signin" : "voice")}
            >
              <Mic size={16} />
              Start bench conversation
            </button>
            {isDemo ? (
              <button className="btn secondary" onClick={startDemo}>
                <Play size={14} />
                Try the $240 example
              </button>
            ) : (
              <button
                className="btn secondary"
                onClick={() => {
                  setDetail(true);
                  setTab("Inspection form");
                }}
              >
                Use the inspection form
              </button>
            )}
          </>
        )}
      </div>
      <div className="voice-footer">
        {isLive
          ? "Live AI conversation · 10-minute session limit"
          : isDemo
            ? "Example is scripted · live voice requires sign-in"
            : voiceReady
              ? "Live voice ready · transcript saved, audio not stored"
              : "Voice key needed · forms and exports work now"}
      </div>
    </div>
  );
  const rightSide = selected && (
    <div className="stack right-stack">
      {voiceCard}
      <div className="panel right-card">
        <h3>
          <FileText size={17} color="#8d83be" />
          Supplier rule, not a guess
        </h3>
        <p className="instruction">
          {selected.policy.allowAlternative
            ? "Original box missing? This supplier permits an approved alternative. Check the exact requirements before writing off the deposit."
            : "This supplier requires original packaging. A different box needs supplier approval."}
        </p>
        <button className="text-link" onClick={() => setModal("policy")}>
          Read {selected.supplier} policy <ArrowRight size={13} />
        </button>
      </div>
      {!detail && (
        <div className="panel right-card">
          <h3>Don’t leave it on the shelf</h3>
          {due.slice(0, 2).map((c) => (
            <button
              key={c.id}
              className="task-card task-button"
              onClick={() => openCore(c.id)}
            >
              <CircleDollarSign size={17} />
              <div>
                <strong>
                  {money(c.depositCents)} · {c.job}
                </strong>
                <p>
                  {inspectReadiness(c).daysLeft < 0
                    ? "Return window passed"
                    : `${inspectReadiness(c).daysLeft} days left`}{" "}
                  · {c.part}
                </p>
              </div>
              <ChevronRight size={15} style={{ marginLeft: "auto" }} />
            </button>
          ))}
          {!due.length && (
            <p className="instruction">
              No undispatched cores due within seven days.
            </p>
          )}
        </div>
      )}
    </div>
  );
  return (
    <div className="app">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">
          <Wrench size={17} />
          <div>
            {workspace ? "Your repair shop" : "Pine Ridge Diesel"}
            <small>
              {workspace ? "Private workspace" : "Fictional demo shop"}
            </small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {[
            { name: "Recovery desk", icon: Activity },
            { name: "Return queue", icon: Truck },
            { name: "Credit ledger", icon: Wallet },
            { name: "Supplier policies", icon: FileText },
            { name: "Settings", icon: Settings2 },
          ].map((n) => (
            <button
              key={n.name}
              className={`nav-button ${view === n.name ? "active" : ""}`}
              onClick={() => navigate(n.name)}
              aria-label={n.name}
            >
              <n.icon size={18} />
              <span className="nav-text">{n.name}</span>
              {n.name === "Return queue" && (
                <span className="nav-count">{ready.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-button" onClick={() => setModal("guide")}>
            <HelpCircle size={18} />
            How Benchback works
          </button>
          <div className="powered">
            VOICE INFRASTRUCTURE<strong>Powered by AssemblyAI</strong>
          </div>
          <div className="profile">
            <span className="avatar">
              {user ? user.displayName.slice(0, 2).toUpperCase() : "SG"}
            </span>
            <div>
              {user?.displayName || "Shivam Gupta"}
              <small>{user ? "Signed in" : "Creator & builder"}</small>
            </div>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={13} />
            <b>{view}</b>
          </div>
          <div className="top-actions">
            <span className="badge">
              <LockKeyhole size={12} />
              {workspace ? "Private records" : "Interactive demo"}
            </span>
            {user ? (
              <>
                <a className="btn small" href={workspace ? "/" : "/workspace"}>
                  {workspace ? "Public demo" : "My workspace"}
                </a>
                <button
                  className="close"
                  aria-label="Sign out"
                  onClick={async () => {
                    if (
                      user.email === "Guest workspace" &&
                      !window.confirm(
                        "Sign out of this guest workspace? Without creating an account first, these records cannot be restored. Choose Cancel and open Settings to keep your workspace.",
                      )
                    )
                      return;
                    const response = await fetch("/api/auth/logout", {
                      method: "POST",
                    });
                    if (response.ok) {
                      const { getAuth, signOut } = await import(
                        "firebase/auth"
                      );
                      const { getApps, initializeApp } = await import(
                        "firebase/app"
                      );
                      const config = (
                        await import("@/lib/firebase-config.json")
                      ).default;
                      await signOut(
                        getAuth(getApps()[0] || initializeApp(config)),
                      );
                      // Full navigation clears cached authenticated server components.
                      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                      window.location.assign("/");
                    }
                  }}
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <a
                className="btn small"
                href="/signin?return_to=%2Fworkspace"
                target="_top"
              >
                <LogIn size={14} />
                Sign in
              </a>
            )}
          </div>
        </header>
        <div className="content">
          {error && (
            <div
              className="alert error"
              role="alert"
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span>{error}</span>
              <button
                className="close"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={17} />
              </button>
            </div>
          )}
          {!loaded ? (
            <div className="large-empty">
              <Loader2 size={29} style={{ margin: "auto" }} />
              <p>Loading your recovery desk…</p>
            </div>
          ) : view === "Settings" ? (
            <SettingsView
              voiceReady={voiceReady}
              user={user}
              workspace={workspace}
              onDelete={() => setModal("delete-workspace")}
              onExport={async () => {
                try {
                  download(
                    "Benchback-workspace.json",
                    JSON.stringify(await api("export"), null, 2),
                    "application/json",
                  );
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            />
          ) : view === "Supplier policies" ? (
            <>
              <PageHeading
                eyebrow="The rules behind each return"
                title="Supplier policies"
                subtitle="Versioned requirements. Every purchase keeps its original policy snapshot."
                action={
                  <button
                    className="btn primary"
                    onClick={() => setModal(isDemo ? "signin" : "new-policy")}
                  >
                    <Plus size={16} />
                    Add policy
                  </button>
                }
              />
              <div className="settings-grid">
                {policies.map((p) => (
                  <div className="panel" key={p.id}>
                    <div className="panel-header">
                      <div>
                        <h2>{p.supplier}</h2>
                        <p className="subtitle">
                          {p.name} · {p.version}
                        </p>
                      </div>
                      {p.exercise && (
                        <span className="badge purple">Sample</span>
                      )}
                    </div>
                    <div className="panel-body">
                      <div className="settings-item">
                        <span>Return window</span>
                        <b>
                          {p.windowDays} days · {p.deadlineBasis}
                        </b>
                      </div>
                      <div className="settings-item">
                        <span>Alternative packaging</span>
                        <b>
                          {p.allowAlternative
                            ? "Allowed with conditions"
                            : "Not permitted"}
                        </b>
                      </div>
                      <div className="settings-item">
                        <span>Credit follow-up after</span>
                        <b>{p.creditDays} days</b>
                      </div>
                      <p className="instruction">{p.instructions}</p>
                      {p.allowAlternative && (
                        <div className="quote">{p.alternativeInstructions}</div>
                      )}
                      <p className="subtitle">
                        Source: {p.source || "Owner-entered policy"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {!policies.length && (
                <div className="panel empty">
                  Add your first supplier policy before importing purchases.
                </div>
              )}
            </>
          ) : view === "Credit ledger" ? (
            <>
              <PageHeading
                eyebrow="Only posted memos count"
                title="Expected is not recovered."
                subtitle="Match supplier credits to the deposit you actually paid."
                action={
                  <button
                    className="btn primary"
                    onClick={() => setModal("import-credits")}
                  >
                    <Upload size={16} />
                    Import credit memos
                  </button>
                }
              />
              <div className="metrics">
                <Metric
                  label="Deposits paid"
                  value={money(total)}
                  caption="Across your purchase records"
                  icon={<Wallet size={17} />}
                />
                <Metric
                  label="Actually credited"
                  value={money(credited)}
                  caption="Posted supplier credit memos"
                  icon={<CheckCircle2 size={17} />}
                />
                <Metric
                  label="Still outstanding"
                  value={money(open)}
                  caption="Expected credit, not guaranteed"
                  icon={<CircleDollarSign size={17} />}
                />
                <Metric
                  label="Short credit cases"
                  value={String(short.length)}
                  caption={`${money(short.reduce((n, c) => n + inspectReadiness(c).outstandingCents, 0))} needs follow-up`}
                  icon={<Activity size={17} />}
                  warning
                />
              </div>
              <div className="panel">
                <div className="panel-header">
                  <h2>Credit reconciliation</h2>
                  <button
                    className="btn small"
                    onClick={() =>
                      download(
                        "benchback-ledger.csv",
                        exportCsv(cores),
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    <ArrowDownToLine size={14} />
                    Export
                  </button>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Purchase</th>
                        <th>Deposit</th>
                        <th>Credited</th>
                        <th>Accepted deduction</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {cores.map((c) => {
                        const r = inspectReadiness(c);
                        return (
                          <tr key={c.id}>
                            <td>
                              <button
                                className="location-button"
                                onClick={() => openCore(c.id)}
                              >
                                {c.invoice}
                              </button>
                              <div className="location-sub">
                                {c.part} · {c.job}
                              </div>
                            </td>
                            <td>{money(c.depositCents)}</td>
                            <td style={{ color: "#33785c" }}>
                              {money(r.creditedCents)}
                            </td>
                            <td>{money(r.deductionCents)}</td>
                            <td
                              style={
                                r.status === "Short credit"
                                  ? { color: "#a76c20", fontWeight: 650 }
                                  : {}
                              }
                            >
                              {money(r.outstandingCents)}
                            </td>
                            <td>
                              <Badge status={r.status} />
                            </td>
                            <td>
                              <button
                                className="close"
                                aria-label={`Open ${c.invoice}`}
                                onClick={() => openCore(c.id)}
                              >
                                <ChevronRight size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="subtitle">
                Credits are manually entered or imported from supplier memos.
                Benchback does not access bank accounts or verify settlement.
              </p>
            </>
          ) : (
            <>
              <PageHeading
                eyebrow={
                  detail
                    ? "Core return workspace"
                    : view === "Return queue"
                      ? "Make the next pickup count"
                      : "Core-deposit recovery desk"
                }
                title={
                  detail
                    ? selected?.description || "Core return"
                    : view === "Return queue"
                      ? "Ready to leave the shelf."
                      : "From parts shelf to paid back."
                }
                subtitle={
                  detail
                    ? `${selected?.job} · ${selected?.invoice} · ${selected?.part}`
                    : view === "Return queue"
                      ? "Reviewed returns, dispatch references and supplier follow-through."
                      : "Find the deposit. Prepare the return. Make sure the credit comes back."
                }
                action={
                  !detail && (
                    <button
                      className="btn primary"
                      onClick={() => setModal(isDemo ? "signin" : "new-core")}
                    >
                      <Plus size={16} />
                      Add purchase
                    </button>
                  )
                }
              />
              {isDemo && (
                <div className="notice-banner">
                  <Sparkles size={18} />
                  <span>
                    <strong>A working example, not your books.</strong>{" "}
                    Fictional purchases and supplier terms. Changes reset on
                    refresh.
                  </span>
                  <button className="btn small" onClick={startDemo}>
                    Try the $240 recovery <ArrowRight size={13} />
                  </button>
                </div>
              )}
              {!cores.length ? (
                <div className="panel large-empty">
                  <Wrench
                    size={38}
                    style={{ margin: "0 auto 16px", color: "#7b6ccc" }}
                  />
                  <h2>Start with the deposits you already paid.</h2>
                  <p>
                    Add a supplier policy, then enter purchases or import your
                    CSV. Or load a private practice workspace to try the whole
                    flow.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="btn primary"
                      onClick={() => setModal("new-policy")}
                    >
                      Add supplier policy
                    </button>
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={loadPractice}
                    >
                      Load practice purchases
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!detail && (
                    <div className="metrics">
                      <Metric
                        label="Deposits still open"
                        value={money(open)}
                        caption={`${cores.filter((c) => inspectReadiness(c).outstandingCents > 0).length} cores with unresolved deposits`}
                        icon={<CircleDollarSign size={17} />}
                      />
                      <Metric
                        label="Return within 7 days"
                        value={money(dueAmount)}
                        caption={`${due.length} ${due.length === 1 ? "core needs" : "cores need"} attention`}
                        warning
                        icon={<Activity size={17} />}
                      />
                      <Metric
                        label="Ready for pickup"
                        value={money(
                          ready.reduce((n, c) => n + c.depositCents, 0),
                        )}
                        caption={`${ready.length} reviewed ${ready.length === 1 ? "return" : "returns"}`}
                        icon={<Truck size={17} />}
                      />
                      <Metric
                        label="Actually credited"
                        value={money(credited)}
                        caption="Supplier memos posted to the ledger"
                        icon={<CheckCircle2 size={17} />}
                      />
                    </div>
                  )}
                  {detail && (
                    <div className="details-header no-print">
                      <button
                        className="btn small"
                        onClick={() => {
                          if (isLive) {
                            setToast("End the active conversation first.");
                            return;
                          }
                          setDetail(false);
                        }}
                      >
                        <ArrowLeft size={14} />
                        All cores
                      </button>
                      <div
                        style={{ marginLeft: "auto", display: "flex", gap: 8 }}
                      >
                        <button
                          className="btn small"
                          onClick={() => {
                            download(
                              `benchback-${selected.invoice}-evidence.json`,
                              JSON.stringify(
                                {
                                  schemaVersion: 1,
                                  generatedAt: new Date().toISOString(),
                                  core: selected,
                                  events: events.filter(
                                    (e) => e.coreId === selected.id,
                                  ),
                                  transcript: transcripts[selected.id] || [],
                                  notice:
                                    "User-reported observations and posted supplier memos. Not proof of supplier acceptance.",
                                },
                                null,
                                2,
                              ),
                              "application/json",
                            );
                            setToast("Evidence package downloaded.");
                          }}
                        >
                          <ArrowDownToLine size={14} />
                          Evidence
                        </button>
                        <button
                          className="btn small"
                          disabled={!selected.state.preparedAt}
                          onClick={() => setModal("packet")}
                        >
                          <FileText size={14} />
                          Return packet
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="grid-main">
                    <div className="stack">
                      {detail ? (
                        <CoreDetail
                          core={selected}
                          tab={tab}
                          setTab={setTab}
                          events={events.filter(
                            (e) => e.coreId === selected.id,
                          )}
                          transcript={transcripts[selected.id] || []}
                          act={(a) => act(a)}
                          busy={busy || isLive}
                          openModal={setModal}
                          demoIndex={
                            isDemo && selected.id === "core-418" ? step : -1
                          }
                          nextDemo={nextDemo}
                          resetDemo={startDemo}
                        />
                      ) : (
                        <div className="panel">
                          <div className="panel-header">
                            <div>
                              <h2>
                                {view === "Return queue"
                                  ? "Return queue"
                                  : "Your core deposits"}
                              </h2>
                              <p className="subtitle">
                                One record from purchase to supplier credit.
                              </p>
                            </div>
                            <button
                              className="btn small"
                              onClick={() =>
                                setModal(isDemo ? "signin" : "import-purchases")
                              }
                            >
                              <Upload size={14} />
                              Import CSV
                            </button>
                          </div>
                          <div className="list-toolbar">
                            <div className="search-field">
                              <Search size={15} />
                              <input
                                aria-label="Search purchases"
                                placeholder="Search part, invoice or job…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                              />
                            </div>
                            <select
                              aria-label="Filter by status"
                              value={filter}
                              onChange={(e) => setFilter(e.target.value)}
                            >
                              {[
                                "All cores",
                                "Needs inspection",
                                "Ready to return",
                                "In transit",
                                "Awaiting credit",
                                "Short credit",
                                "Credited",
                                "Closed with deduction",
                              ].map((s) => (
                                <option key={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                          <div className="table-wrap">
                            <table>
                              <thead>
                                <tr>
                                  <th>Part & purchase</th>
                                  <th>Deposit</th>
                                  <th>Return by</th>
                                  <th>Status</th>
                                  <th />
                                </tr>
                              </thead>
                              <tbody>
                                {filtered
                                  .filter(
                                    (c) =>
                                      view !== "Return queue" ||
                                      !c.state.dispatchedAt,
                                  )
                                  .map((c) => {
                                    const r = inspectReadiness(c);
                                    return (
                                      <tr
                                        className={`location-row ${c.id === selected?.id ? "selected" : ""}`}
                                        key={c.id}
                                      >
                                        <td>
                                          <button
                                            className="location-button"
                                            onClick={() => openCore(c.id)}
                                          >
                                            {c.description}
                                          </button>
                                          <div className="location-sub">
                                            <span className="mono">
                                              {c.part}
                                            </span>{" "}
                                            · {c.job}
                                          </div>
                                        </td>
                                        <td className="deposit-value">
                                          {money(c.depositCents)}
                                        </td>
                                        <td>
                                          <span
                                            className={`due-date ${!c.state.dispatchedAt && r.daysLeft <= 7 ? "urgent" : ""}`}
                                          >
                                            {dateLabel(r.deadline)}
                                          </span>
                                          <div className="location-sub">
                                            {c.state.dispatchedAt
                                              ? "Return dispatched"
                                              : r.daysLeft < 0
                                                ? "Window passed"
                                                : `${r.daysLeft} days left`}
                                          </div>
                                        </td>
                                        <td>
                                          <Badge status={r.status} />
                                        </td>
                                        <td>
                                          <button
                                            className="close"
                                            aria-label={`Open ${c.job}`}
                                            onClick={() => openCore(c.id)}
                                          >
                                            <ChevronRight size={16} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </div>
                          {!filtered.length && (
                            <div className="empty">
                              No purchases match. Clear the search or choose
                              another status.
                            </div>
                          )}
                          <div className="table-footer">
                            <ShieldCheck size={14} />
                            Expected deposits stay separate from actual supplier
                            credits.
                          </div>
                        </div>
                      )}
                      {!detail && (
                        <div className="recovery-strip">
                          <span className="strip-icon">
                            <RotateCcw size={20} />
                          </span>
                          <div>
                            <h3>Old part. New possibility.</h3>
                            <p>
                              A missing box doesn’t always mean a lost deposit.
                              Your supplier’s policy decides.
                            </p>
                          </div>
                          <button
                            className="text-link"
                            onClick={() => navigate("Supplier policies")}
                          >
                            See the rules <ArrowRight size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    {rightSide}
                  </div>
                </>
              )}
            </>
          )}
          <footer className="footer">
            <span>Benchback · Created by Shivam Gupta</span>
            <span>
              <a href="/privacy">Privacy & data</a> ·{" "}
              <a
                href="https://github.com/shi1720/AssemblyAI"
                target="_blank"
                rel="noreferrer"
              >
                Open source
              </a>
            </span>
          </footer>
        </div>
      </main>
      {modal && (
        <Modal title={modalTitle(modal)} close={() => setModal("")}>
          {modal === "signin" && (
            <>
              <p className="section-description">
                The public example is scripted. Sign in to save your own
                purchases and policies, run live AssemblyAI voice conversations,
                and track actual return credits.
              </p>
              <a
                className="btn primary wide"
                href="/signin?return_to=%2Fworkspace"
                target="_top"
              >
                <LogIn size={16} />
                Open your workspace
              </a>
              <button
                className="btn wide"
                style={{ marginTop: 13 }}
                onClick={startDemo}
              >
                <Play size={14} />
                Explore the example without signing in
              </button>
            </>
          )}
          {modal === "voice" && (
            <>
              <p className="section-description">
                You’ll speak with an AI assistant about {selected.job}. Your
                microphone audio goes to AssemblyAI for transcription and spoken
                replies. Benchback saves the transcript and structured
                observations; it does not store audio.
              </p>
              <div className="alert">
                Only share information you’re authorized to use. The agent
                cannot approve a return or post a credit. Check its work before
                confirming.
              </div>
              <div className="form-actions">
                <button
                  className="btn"
                  onClick={() => {
                    setModal("");
                    setDetail(true);
                    setTab("Inspection form");
                  }}
                >
                  Use the form
                </button>
                <button
                  className="btn primary"
                  disabled={!voiceReady}
                  onClick={startVoice}
                >
                  <Mic size={15} />
                  Agree & start microphone
                </button>
              </div>
              {!voiceReady && (
                <p className="subtitle">
                  The server needs an AssemblyAI API key before live voice can
                  start.
                </p>
              )}
            </>
          )}
          {modal === "guide" && (
            <div className="checklist">
              {[
                "Import purchases with core deposits and add the supplier’s actual return rules.",
                "At the bench, talk through the part, invoice, completeness and packaging.",
                "Confirm the purchase match, review the checklist and prepare the return.",
                "Download a return packet. Record the real pickup or dispatch reference.",
                "Post supplier credit memos. A short credit stays open until resolved.",
              ].map((t, i) => (
                <div className="checklist-row" key={t}>
                  <span className="badge purple">{i + 1}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          )}
          {modal === "policy" && (
            <>
              <div className="eyebrow">
                {selected.policy.version}
                {selected.policy.exercise ? " · FICTIONAL SAMPLE" : ""}
              </div>
              <h3>
                {selected.supplier} - {selected.policy.name}
              </h3>
              <p className="instruction">{selected.policy.instructions}</p>
              <div className="settings-item">
                <span>Deadline</span>
                <b>
                  {selected.policy.windowDays} days from shipment ·{" "}
                  {selected.policy.deadlineBasis}
                </b>
              </div>
              {selected.policy.allowAlternative && (
                <div className="quote">
                  <strong>Approved alternative</strong>
                  <br />
                  {selected.policy.alternativeInstructions}
                </div>
              )}
              <p className="subtitle">
                Source: {selected.policy.source || "Entered by the shop owner"}
              </p>
              <p className="subtitle">
                This purchase retains this policy version even if a newer policy
                is added.
              </p>
            </>
          )}
          {modal === "new-policy" && (
            <PolicyForm
              busy={busy}
              submit={async (data) => {
                setBusy(true);
                try {
                  const d = await api("policies", data);
                  setPolicies((ps) => [d.policy, ...ps]);
                  setModal("");
                  setToast("Policy saved. You can now use it for purchases.");
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
          {modal === "new-core" && (
            <CoreForm
              policies={policies}
              busy={busy}
              addPolicy={() => setModal("new-policy")}
              submit={async (data) => {
                setBusy(true);
                try {
                  const d = await api("cores", data);
                  setCores((cs) => [...d.cores, ...cs]);
                  setSelectedId(d.cores[0].id);
                  setModal("");
                  setToast(
                    "Purchase added. Its supplier policy is now attached.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
          {(modal === "import-purchases" || modal === "import-credits") && (
            <ImportForm
              kind={modal === "import-credits" ? "credits" : "purchases"}
              policies={policies}
              cores={cores}
              busy={busy}
              isDemo={isDemo}
              submit={async (data) => {
                setBusy(true);
                try {
                  if (modal === "import-credits") {
                    if (isDemo) {
                      const items = (
                        data as {
                          items: {
                            coreId: string;
                            memo: string;
                            lineRef: string;
                            amountCents: number;
                            date: string;
                            note: string;
                          }[];
                        }
                      ).items;
                      let next = [...cores];
                      const newEvents: AuditEvent[] = [];
                      for (const item of items) {
                        const core = next.find((c) => c.id === item.coreId)!;
                        const action = {
                          type: "add_credit",
                          memo: item.memo,
                          lineRef: item.lineRef,
                          amountCents: item.amountCents,
                          date: item.date,
                          note: item.note,
                        } as const;
                        ensureUnallocated(next, core, action);
                        const after = applyAction(
                          core,
                          action,
                          "Demo parts manager",
                          "owner",
                        );
                        newEvents.push({
                          id: crypto.randomUUID(),
                          coreId: core.id,
                          action: "add_credit",
                          actor: "Demo parts manager",
                          source: "sample credit import",
                          at: new Date().toISOString(),
                          before: core.state,
                          after,
                          note: item.note,
                        });
                        next = next.map((c) =>
                          c.id === core.id ? { ...c, state: after } : c,
                        );
                      }
                      setCores(next);
                      setEvents((es) => [...es, ...newEvents]);
                    } else {
                      const d = await api("credits/import", data);
                      setCores((cs) =>
                        cs.map(
                          (c) => d.cores.find((n: Core) => n.id === c.id) || c,
                        ),
                      );
                      setEvents((es) => [...es, ...d.events]);
                    }
                  } else {
                    const d = await api("cores", data);
                    setCores((cs) => [...d.cores, ...cs]);
                  }
                  setModal("");
                  setToast("Import complete. The ledger is up to date.");
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
          {[
            "dispatch",
            "credit",
            "followup",
            "receipt",
            "historical",
            "reverse",
            "settle",
            "reopen",
            "correct-return",
          ].includes(modal) && (
            <RecordActionForm
              core={selected}
              kind={modal}
              busy={busy}
              submit={async (action) => {
                await act(action);
                setModal("");
              }}
            />
          )}
          {modal === "packet" && <ReturnPacket core={selected} />}
          {modal === "delete-workspace" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                setBusy(true);
                try {
                  await api("workspace-delete", {
                    confirmation: data.get("confirmation"),
                  });
                  await refresh();
                  setEvents([]);
                  setTranscripts({});
                  setDetail(false);
                  setModal("");
                  setToast("Workspace data deleted.");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p>
                This permanently removes your core records, policies,
                transcripts and audit history. Export your complete workspace
                first. Your daily voice allowance does not reset.
              </p>
              <label className="field">
                Type DELETE MY WORKSPACE
                <input
                  name="confirmation"
                  required
                  pattern="DELETE MY WORKSPACE"
                  autoComplete="off"
                />
              </label>
              <button className="btn primary" disabled={busy}>
                Permanently delete workspace data
              </button>
            </form>
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}
function Metric({
  label,
  value,
  caption,
  icon,
  warning,
}: {
  label: string;
  value: string;
  caption: string;
  icon: ReactNode;
  warning?: boolean;
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        {label}
        <span style={{ color: warning ? "#c49656" : "#9da6b7" }}>{icon}</span>
      </div>
      <div
        className="metric-value num"
        style={warning ? { color: "#af7939" } : {}}
      >
        {value}
      </div>
      <div className={`metric-caption ${warning ? "warning" : ""}`}>
        {caption}
      </div>
    </div>
  );
}
function dateLabel(s: string) {
  return new Date(s + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
function modalTitle(m: string) {
  return (
    (
      {
        signin: "Your own shop, your own recovery desk",
        voice: "Start a live bench conversation",
        guide: "From shelf to supplier credit",
        policy: "Supplier return policy",
        "new-policy": "Add a supplier policy",
        "new-core": "Add a core-deposit purchase",
        "import-purchases": "Import purchase records",
        "import-credits": "Reconcile supplier credit memos",
        receipt: "Record supplier receipt",
        historical: "Import an existing return",
        reverse: "Reverse a mistaken credit",
        dispatch: "Record a real dispatch",
        credit: "Post a supplier credit",
        settle: "Accept final supplier deduction",
        reopen: "Reopen accepted deduction",
        "correct-return": "Correct return dates",
        followup: "Record a follow-up",
        packet: "Return packet",
        "delete-workspace": "Delete workspace data",
      } as Record<string, string>
    )[m] || m
  );
}
function SettingsView({
  voiceReady,
  user,
  workspace,
  onDelete,
  onExport,
}: {
  voiceReady: boolean;
  user: User;
  workspace: boolean;
  onDelete: () => void;
  onExport: () => void;
}) {
  return (
    <>
      <PageHeading
        eyebrow="Workspace settings"
        title="Clear boundaries. Useful automation."
        subtitle="Know what the agent can change and where your data goes."
      />
      <div className="settings-grid">
        <div className="panel">
          <div className="panel-header">
            <h2>Voice connection</h2>
            <span className={`badge ${voiceReady ? "green" : "amber"}`}>
              {voiceReady ? "Configured" : "Key needed"}
            </span>
          </div>
          <div className="panel-body">
            <p className="section-description">
              AssemblyAI handles speech recognition, reasoning, tool calls,
              turn-taking and voice output through one connection.
            </p>
            {[
              ["Voice", "Alba · English"],
              ["Session limit", "10 minutes"],
              ["Daily allowance", "8 sessions per account"],
              ["Provider price", "$0.075 / minute*"],
              ["Audio stored by Benchback", "No"],
            ].map(([a, b]) => (
              <div className="settings-item" key={a}>
                <span>{a}</span>
                <b>{b}</b>
              </div>
            ))}
            <p className="subtitle">
              *Published rate, excludes hosting and support.{" "}
              <a
                className="text-link"
                href="https://www.assemblyai.com/pricing"
                target="_blank"
                rel="noreferrer"
              >
                Source
              </a>
            </p>
            {!voiceReady && (
              <div className="alert" style={{ marginTop: 16 }}>
                Set ASSEMBLYAI_API_KEY on the server to enable live voice. No
                API key is sent to the browser.
              </div>
            )}
          </div>
        </div>
        <div className="panel">
          <div className="panel-header">
            <h2>Built for your control</h2>
            <ShieldCheck size={19} />
          </div>
          <div className="panel-body">
            <div className="checklist">
              {[
                "Voice records observations; a person approves the return.",
                "The server checks purchase matches and supplier rules.",
                "Corrections invalidate previous preparation.",
                "Dispatched return evidence is locked.",
                "Only posted supplier credit memos count as credited.",
                "Your workspace records are scoped to your signed-in account.",
              ].map((t) => (
                <div className="checklist-row done" key={t}>
                  <CheckCircle2 size={17} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
            <p className="instruction">
              Benchback prepares and tracks returns. The supplier decides
              acceptance and credit. No automatic shipping, refunds or bank
              access.
            </p>
            <a className="text-link" href="/privacy">
              Privacy & data details <ArrowRight size={13} />
            </a>
            {user && <p className="subtitle">Signed in as {user.email}</p>}
            {user?.email === "Guest workspace" && (
              <div className="instruction">
                Guest access belongs to this browser. Create an account before
                signing out or clearing browser data to keep your records.
                <a className="text-link" href="/signin?mode=signup">
                  Create an account for this workspace <ArrowRight size={13} />
                </a>
              </div>
            )}
            {workspace && (
              <div className="button-row" style={{ marginTop: 20 }}>
                <button className="btn secondary" onClick={onExport}>
                  Export complete workspace
                </button>
                <button className="btn secondary" onClick={onDelete}>
                  Delete workspace data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
function ReturnPacket({ core }: { core: Core }) {
  const r = inspectReadiness(core);
  return (
    <>
      <div className="packet-preview">
        <div className="eyebrow">
          BENCHBACK ·{" "}
          {core.exercise ? "FICTIONAL PRACTICE RETURN" : "CORE RETURN PACKET"}
        </div>
        <h2>{core.supplier}</h2>
        <p className="subtitle">
          Prepared {core.state.preparedAt?.slice(0, 10)} · {core.policy.version}
        </p>
        <div className="packet-amount">
          {money(core.depositCents)}
          <span> expected deposit credit</span>
        </div>
        {[
          ["Part", `${core.part} · ${core.description}`],
          [
            "Purchase",
            `${core.invoice} / line ${core.purchaseLine} / ${core.job}`,
          ],
          ["Return deadline", `${r.deadline} (${core.policy.deadlineBasis})`],
          ["Packaging", core.state.packaging.replaceAll("_", " ")],
          ["Complete assembly", core.state.complete],
          [
            "Invoice label",
            core.state.labelAttached ? "Attached (reported)" : "Not confirmed",
          ],
          [
            "Authorization",
            core.state.rma || "Not required by configured policy",
          ],
        ].map(([a, b]) => (
          <div className="settings-item" key={a}>
            <span>{a}</span>
            <b>{b}</b>
          </div>
        ))}
        <p className="instruction">{core.state.conditionNote}</p>
        <p className="subtitle">{core.policy.instructions}</p>
        <div className="quote">
          Prepared by {core.state.preparedBy}. This packet is not a shipping
          label, supplier authorization or guarantee of credit.
        </div>
      </div>
      <div className="form-actions">
        <button
          className="btn"
          onClick={() =>
            download(
              `return-${core.invoice}.txt`,
              returnText(core),
              "text/plain",
            )
          }
        >
          <ArrowDownToLine size={15} />
          Download text
        </button>
        <button
          className="btn primary"
          onClick={async () => {
            const { downloadReturnPdf } = await import("@/lib/return-pdf");
            await downloadReturnPdf(core);
          }}
        >
          <FileText size={15} />
          Download PDF
        </button>
      </div>
    </>
  );
}
function returnText(c: Core) {
  return `BENCHBACK - ${c.exercise ? "FICTIONAL PRACTICE " : ""}CORE RETURN\nSupplier: ${c.supplier}\nPolicy: ${c.policy.version}\nPart: ${c.part} / ${c.description}\nInvoice: ${c.invoice}\nJob: ${c.job}\nExpected deposit: ${money(c.depositCents)}\nReturn by: ${inspectReadiness(c).deadline} (${c.policy.deadlineBasis})\nPackaging: ${c.state.packaging}\nComplete: ${c.state.complete}\nLabel attached: ${c.state.labelAttached}\nNotes: ${c.state.conditionNote}\nPrepared by: ${c.state.preparedBy}\n\n${c.policy.instructions}\n\nNot a shipping label or guarantee of supplier credit.`;
}
