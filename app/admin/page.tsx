"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { buildDefaultQuiz, INITIAL_ROUNDS, INITIAL_SETS } from "@/lib/quiz-data";

/* ---------- Types ---------- */

type Section = "overview" | "sets" | "rounds" | "questions" | "settings";

interface QuestionSet {
  id: string;
  name: string;
}

interface Round {
  id: string;
  name: string;
}

interface Question {
  id: string;
  setId: string;
  roundId: string;
  text: string;
  answer: string;
  marks: number;
  timer: number;
  imageUrl: string;
  options?: string[];
  targetWord?: string;
  tabooWords?: string[];
}

type ModalState =
  | null
  | { kind: "set"; id?: string }
  | { kind: "round"; id?: string }
  | { kind: "question"; id?: string };

const initialSets: QuestionSet[] = INITIAL_SETS;
const initialRounds: Round[] = INITIAL_ROUNDS;

function buildInitialQuestions(): Question[] {
  return buildDefaultQuiz().questions;
}

/* ---------- Shared styles ---------- */

const inputClass =
  "w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300";
const labelClass = "mb-1 block font-mono text-xs uppercase tracking-widest text-neutral-400";
const primaryBtn =
  "rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40";
const ghostBtn =
  "rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:border-violet-400 hover:text-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";
const smallBtn =
  "rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-neutral-200 transition hover:border-cyan-300 hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";
const dangerBtn =
  "rounded-md border border-red-400/30 px-2.5 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400";
const cardClass = "rounded-2xl border border-white/10 bg-white/[0.03]";

/* ---------- Modal & Sub-components ---------- */

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/15 bg-neutral-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
          <button type="button" onClick={onClose} className={smallBtn} aria-label="Close dialog">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function NameForm({
  title,
  label,
  initial,
  onSave,
  onClose,
}: {
  title: string;
  label: string;
  initial: string;
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a name.");
      return;
    }
    onSave(trimmed);
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="name-input" className={labelClass}>
            {label}
          </label>
          <input
            id="name-input"
            autoFocus
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={ghostBtn}>
            Cancel
          </button>
          <button type="submit" className={primaryBtn}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

type QuestionDraft = Omit<Question, "id">;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const AI_OR_REAL_ROUND_NAME = "ai or real image";
const TECH_TABOO_ROUND_NAME = "tech taboo";

function QuestionForm({
  title,
  sets,
  rounds,
  initial,
  uploadKey,
  onUploadKeyChange,
  onSave,
  onClose,
}: {
  title: string;
  sets: QuestionSet[];
  rounds: Round[];
  initial: QuestionDraft;
  uploadKey: string;
  onUploadKeyChange: (value: string) => void;
  onSave: (draft: QuestionDraft) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<QuestionDraft>(initial);
  const [tabooInput, setTabooInput] = useState(
    Array.isArray(initial.tabooWords) ? initial.tabooWords.join(", ") : "",
  );
  const [optionsInput, setOptionsInput] = useState(
    Array.isArray(initial.options) ? initial.options.join("\n") : "",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const selectedRound = rounds.find((r) => r.id === draft.roundId);
  const roundLower = selectedRound?.name.trim().toLowerCase() ?? "";
  const isImageRound = roundLower === AI_OR_REAL_ROUND_NAME;
  const isTabooRound = roundLower.includes(TECH_TABOO_ROUND_NAME);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError("");
    const isExtValid = /\.(jpe?g|png|webp)$/i.test(file.name);
    const isMimeValid = ALLOWED_IMAGE_TYPES.includes(file.type) || file.type.startsWith("image/");
    if (!isExtValid && !isMimeValid) {
      setUploadError("Only JPG, JPEG, PNG or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 4 MB.`);
      return;
    }
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function removeImage() {
    setPendingFile(null);
    setPreviewUrl("");
    setUploadError("");
    setDraft((d) => ({ ...d, imageUrl: "" }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!draft.text.trim()) {
      setError("Please enter the question text.");
      return;
    }
    if (!Number.isFinite(draft.marks) || draft.marks < 0) {
      setError("Marks must be 0 or more.");
      return;
    }
    if (!Number.isFinite(draft.timer) || draft.timer < 5) {
      setError("Timer must be at least 5 seconds.");
      return;
    }
    setError("");

    let imageUrl = draft.imageUrl;

    if (pendingFile) {
      if (!uploadKey.trim()) {
        setUploadError("Enter the admin password to upload the new image.");
        return;
      }
      setSaving(true);
      setUploadError("");
      try {
        const body = new FormData();
        body.append("file", pendingFile);
        const res = await fetch("/api/upload-image", {
          method: "POST",
          headers: { "x-admin-key": uploadKey.trim() },
          body,
        });
        const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
        if (!res.ok || !data?.url) {
          setUploadError(data?.error ?? `Upload failed (HTTP ${res.status}).`);
          setSaving(false);
          return;
        }
        imageUrl = data.url;
      } catch {
        setUploadError("Could not reach the server to upload image.");
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    // Parse taboo words
    const tabooWords = isTabooRound
      ? tabooInput
        .split(/[,;\n]/)
        .map((w) => w.trim())
        .filter(Boolean)
      : undefined;

    // Parse options
    const options = optionsInput
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);

    onSave({
      ...draft,
      text: draft.text.trim(),
      answer: draft.answer.trim(),
      imageUrl,
      targetWord: isTabooRound ? (draft.targetWord?.trim() || draft.answer.trim()) : undefined,
      tabooWords: tabooWords && tabooWords.length > 0 ? tabooWords : undefined,
      options: options.length > 0 ? options : undefined,
    });
  }

  const shownImage = previewUrl || draft.imageUrl;

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="q-set" className={labelClass}>
              Set
            </label>
            <select
              id="q-set"
              className={inputClass}
              value={draft.setId}
              onChange={(e) => setDraft({ ...draft, setId: e.target.value })}
            >
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="q-round" className={labelClass}>
              Round
            </label>
            <select
              id="q-round"
              className={inputClass}
              value={draft.roundId}
              onChange={(e) => setDraft({ ...draft, roundId: e.target.value })}
            >
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="q-text" className={labelClass}>
            Question text / Clue
          </label>
          <textarea
            id="q-text"
            rows={3}
            className={inputClass}
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            placeholder="Enter the question or clue description"
          />
        </div>

        {/* Taboo Specific Fields */}
        {isTabooRound && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/[0.04] p-4 space-y-3">
            <p className="font-mono text-xs uppercase tracking-wider text-red-300 font-bold">
              Tech Taboo Rules
            </p>
            <div>
              <label htmlFor="q-target" className={labelClass}>
                Target Word (Word team must guess)
              </label>
              <input
                id="q-target"
                className={inputClass}
                value={draft.targetWord ?? draft.answer}
                onChange={(e) =>
                  setDraft({ ...draft, targetWord: e.target.value, answer: e.target.value })
                }
                placeholder="e.g. Python"
              />
            </div>
            <div>
              <label htmlFor="q-taboo" className={labelClass}>
                Prohibited / Taboo Clue Words (comma or newline separated)
              </label>
              <textarea
                id="q-taboo"
                rows={2}
                className={inputClass}
                value={tabooInput}
                onChange={(e) => setTabooInput(e.target.value)}
                placeholder="e.g. Snake, Programming, Language, Guido, Code"
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                These words cannot be spoken by the clue giver during the round.
              </p>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="q-answer" className={labelClass}>
            Correct Answer
          </label>
          {isImageRound ? (
            <select
              id="q-answer"
              className={inputClass}
              value={draft.answer}
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
            >
              <option value="">Choose the correct answer</option>
              <option value="Real photo">Real photo</option>
              <option value="AI-generated">AI-generated</option>
            </select>
          ) : (
            <>
              <input
                id="q-answer"
                className={inputClass}
                value={draft.answer}
                onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
                placeholder="e.g. Rizz or Python"
              />
              <p className="mt-1 text-xs text-neutral-500">
                To accept alternate spellings, separate them with | (e.g. flex|flexing).
              </p>
            </>
          )}
        </div>

        {/* Optional Multiple Choice Options */}
        {!isImageRound && (
          <div>
            <label htmlFor="q-options" className={labelClass}>
              Multiple Choice Options (Optional, one per line)
            </label>
            <textarea
              id="q-options"
              rows={2}
              className={inputClass}
              value={optionsInput}
              onChange={(e) => setOptionsInput(e.target.value)}
              placeholder="Leave empty for open text input, or list choices one per line"
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="q-marks" className={labelClass}>
              Marks
            </label>
            <input
              id="q-marks"
              type="number"
              min={0}
              className={inputClass}
              value={Number.isFinite(draft.marks) ? draft.marks : ""}
              onChange={(e) => setDraft({ ...draft, marks: e.target.valueAsNumber })}
            />
          </div>
          <div>
            <label htmlFor="q-timer" className={labelClass}>
              Timer (seconds)
            </label>
            <input
              id="q-timer"
              type="number"
              min={5}
              className={inputClass}
              value={Number.isFinite(draft.timer) ? draft.timer : ""}
              onChange={(e) => setDraft({ ...draft, timer: e.target.valueAsNumber })}
            />
          </div>
        </div>

        {/* Image Attachment (For AI or Real Image, or any visual question) */}
        <div className="space-y-3 rounded-xl border border-white/10 p-4">
          <p className={labelClass}>Question Image visual</p>
          {shownImage && (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shownImage}
                alt="Question visual preview"
                className="max-h-48 w-full rounded-lg border border-white/10 bg-neutral-900 object-contain"
              />
              <p className="text-xs text-neutral-400">
                {pendingFile ? "New file ready. Uploads on Save." : "Saved image reference."}
              </p>
              <button type="button" className={dangerBtn} onClick={removeImage}>
                Remove Image
              </button>
            </div>
          )}
          <div>
            <label htmlFor="q-image" className={labelClass}>
              {shownImage ? "Replace image" : "Upload image"} (JPG, PNG, WebP max 4 MB)
            </label>
            <input
              id="q-image"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              disabled={saving}
              onChange={handleFile}
              className="block w-full text-sm text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-violet-500/30 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-violet-500/50"
            />
          </div>
          {uploadError && <p className="text-xs text-red-300">{uploadError}</p>}
        </div>

        {error && <p className="text-xs text-red-300">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
          <button type="button" onClick={onClose} className={ghostBtn}>
            Cancel
          </button>
          <button type="submit" className={primaryBtn} disabled={saving}>
            {saving ? "Saving question..." : "Save Question"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SummaryCard({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className={`${cardClass} p-5`}>
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-400">{label}</p>
      <p className="mt-3 text-4xl font-extrabold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{note}</p>
    </div>
  );
}

/* ---------- Admin Page ---------- */

export default function AdminPage() {
  const [section, setSection] = useState<Section>("overview");
  const [sets, setSets] = useState<QuestionSet[]>(initialSets);
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [questions, setQuestions] = useState<Question[]>(buildInitialQuestions());
  const [defaultCount, setDefaultCount] = useState<number>(5);

  const [filterSet, setFilterSet] = useState<string>("all");
  const [filterRound, setFilterRound] = useState<string>("all");

  const [modal, setModal] = useState<ModalState>(null);
  const [uploadKey, setUploadKey] = useState<string>("");
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [unlocking, setUnlocking] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string>("");
  const [saveState, setSaveState] = useState<
    { kind: "clean" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; message: string }
  >({ kind: "clean" });
  const [retryTick, setRetryTick] = useState<number>(0);
  const lastSaved = useRef<string | null>(null);

  const nextId = (prefix: string) => {
    const random =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
        : Math.random().toString(36).slice(2, 12);
    return `${prefix}${random}`;
  };

  const snapshot = useMemo(() => JSON.stringify({ sets, rounds, questions }), [sets, rounds, questions]);

  async function unlock(e: FormEvent) {
    e.preventDefault();
    if (!uploadKey.trim()) {
      setUnlockError("Enter the admin password.");
      return;
    }
    setUnlocking(true);
    setUnlockError("");
    try {
      const res = await fetch("/api/admin/quiz", {
        headers: { "x-admin-key": uploadKey.trim() },
        cache: "no-store",
      });
      const body = (await res.json().catch(() => null)) as {
        data?: { sets: QuestionSet[]; rounds: Round[]; questions: Question[] } | null;
        error?: string;
      } | null;
      if (!res.ok) {
        setUnlockError(body?.error ?? `Could not load data (HTTP ${res.status}).`);
        return;
      }
      if (body?.data && body.data.sets.length > 0) {
        setSets(body.data.sets);
        setRounds(body.data.rounds);
        setQuestions(body.data.questions);
        lastSaved.current = JSON.stringify(body.data);
      } else {
        lastSaved.current = null;
      }
      setUnlocked(true);
    } catch {
      setUnlockError("Could not reach the server. Check your connection and try again.");
    } finally {
      setUnlocking(false);
    }
  }

  // Autosave to database
  useEffect(() => {
    if (!unlocked || snapshot === lastSaved.current) return;
    setSaveState({ kind: "saving" });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/quiz", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-admin-key": uploadKey.trim() },
          body: snapshot,
        });
        if (res.ok) {
          lastSaved.current = snapshot;
          setSaveState({ kind: "saved" });
        } else {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setSaveState({ kind: "error", message: body?.error ?? `Save failed (HTTP ${res.status}).` });
        }
      } catch {
        setSaveState({ kind: "error", message: "Could not reach the server." });
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [unlocked, snapshot, uploadKey, retryTick]);

  const setName = (id: string) => sets.find((s) => s.id === id)?.name ?? "Unknown set";
  const roundName = (id: string) => rounds.find((r) => r.id === id)?.name ?? "Unknown round";

  const activeSetFilter = filterSet === "all" || sets.some((s) => s.id === filterSet) ? filterSet : "all";
  const activeRoundFilter = filterRound === "all" || rounds.some((r) => r.id === filterRound) ? filterRound : "all";

  const visibleQuestions = useMemo(
    () =>
      questions.filter(
        (q) =>
          (activeSetFilter === "all" || q.setId === activeSetFilter) &&
          (activeRoundFilter === "all" || q.roundId === activeRoundFilter),
      ),
    [questions, activeSetFilter, activeRoundFilter],
  );

  const countFor = (setId: string, roundId?: string) =>
    questions.filter((q) => q.setId === setId && (roundId === undefined || q.roundId === roundId)).length;

  function saveSet(name: string, id?: string) {
    if (id) {
      setSets((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
    } else {
      const newId = nextId("s");
      setSets((prev) => [...prev, { id: newId, name }]);
    }
    setModal(null);
  }

  function deleteSet(id: string) {
    const count = countFor(id);
    if (!window.confirm(`Delete "${setName(id)}" and its ${count} question(s)?`)) return;
    setSets((prev) => prev.filter((s) => s.id !== id));
    setQuestions((prev) => prev.filter((q) => q.setId !== id));
  }

  function saveRound(name: string, id?: string) {
    if (id) {
      setRounds((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
    } else {
      const newId = nextId("r");
      setRounds((prev) => [...prev, { id: newId, name }]);
    }
    setModal(null);
  }

  function deleteRound(id: string) {
    const count = questions.filter((q) => q.roundId === id).length;
    if (!window.confirm(`Delete "${roundName(id)}" and its ${count} question(s) across all sets?`)) return;
    setRounds((prev) => prev.filter((r) => r.id !== id));
    setQuestions((prev) => prev.filter((q) => q.roundId !== id));
  }

  function saveQuestion(draft: QuestionDraft, id?: string) {
    if (id) {
      setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...draft } : q)));
    } else {
      setQuestions((prev) => [...prev, { id: nextId("q"), ...draft }]);
    }
    setModal(null);
  }

  function deleteQuestion(id: string) {
    if (!window.confirm("Delete this question?")) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function resetAll() {
    if (
      !window.confirm(
        "Reset everything back to 6 sets, 3 rounds and 5 questions each (90 total questions)? This replaces existing saved data.",
      )
    )
      return;
    const defaultData = buildDefaultQuiz();
    setSets(defaultData.sets);
    setRounds(defaultData.rounds);
    setQuestions(defaultData.questions);
    setDefaultCount(5);
    setFilterSet("all");
    setFilterRound("all");
  }

  const canAddQuestion = sets.length > 0 && rounds.length > 0;

  function renderModal() {
    if (!modal) return null;

    if (modal.kind === "set") {
      const existing = modal.id ? sets.find((s) => s.id === modal.id) : undefined;
      return (
        <NameForm
          key={modal.id ?? "new-set"}
          title={existing ? "Rename set" : "Create set"}
          label="Set name"
          initial={existing?.name ?? `Set 0${sets.length + 1}`}
          onSave={(name) => saveSet(name, modal.id)}
          onClose={() => setModal(null)}
        />
      );
    }

    if (modal.kind === "round") {
      const existing = modal.id ? rounds.find((r) => r.id === modal.id) : undefined;
      return (
        <NameForm
          key={modal.id ?? "new-round"}
          title={existing ? "Rename round" : "Add round"}
          label="Round name"
          initial={existing?.name ?? ""}
          onSave={(name) => saveRound(name, modal.id)}
          onClose={() => setModal(null)}
        />
      );
    }

    const existing = modal.id ? questions.find((q) => q.id === modal.id) : undefined;
    const initial: QuestionDraft = existing
      ? {
        setId: existing.setId,
        roundId: existing.roundId,
        text: existing.text,
        answer: existing.answer,
        marks: existing.marks,
        timer: existing.timer,
        imageUrl: existing.imageUrl,
        options: existing.options,
        targetWord: existing.targetWord,
        tabooWords: existing.tabooWords,
      }
      : {
        setId: activeSetFilter !== "all" ? activeSetFilter : (sets[0]?.id ?? ""),
        roundId: activeRoundFilter !== "all" ? activeRoundFilter : (rounds[0]?.id ?? ""),
        text: "",
        answer: "",
        marks: 10,
        timer: 30,
        imageUrl: "",
      };
    return (
      <QuestionForm
        key={modal.id ?? "new-question"}
        title={existing ? "Edit question" : "Add question"}
        sets={sets}
        rounds={rounds}
        initial={initial}
        uploadKey={uploadKey}
        onUploadKeyChange={setUploadKey}
        onSave={(draft) => saveQuestion(draft, modal.id)}
        onClose={() => setModal(null)}
      />
    );
  }

  const actionBar = (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={primaryBtn} onClick={() => setModal({ kind: "set" })}>
        + Create Set
      </button>
      <button type="button" className={ghostBtn} onClick={() => setModal({ kind: "round" })}>
        + Add Round
      </button>
      <button
        type="button"
        className={ghostBtn}
        onClick={() => setModal({ kind: "question" })}
        disabled={!canAddQuestion}
      >
        + Add Question
      </button>
    </div>
  );

  const overview = (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Question sets" value={sets.length} note="Sets participants can choose" />
        <SummaryCard label="Rounds" value={rounds.length} note="Shared across every set" />
        <SummaryCard label="Total questions" value={questions.length} note="Across all sets and rounds" />
      </div>

      <div className={`${cardClass} overflow-x-auto p-5`}>
        <h2 className="mb-4 text-lg font-bold tracking-tight">Questions per set and round</h2>
        {sets.length === 0 || rounds.length === 0 ? (
          <p className="text-sm text-neutral-400">Create at least one set and one round to see this table.</p>
        ) : (
          <table className="w-full min-w-[32rem] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 font-mono text-xs uppercase tracking-widest text-neutral-400">
                <th className="py-2 pr-4">Set</th>
                {rounds.map((r) => (
                  <th key={r.id} className="py-2 pr-4">
                    {r.name}
                  </th>
                ))}
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((s) => (
                <tr key={s.id} className="border-b border-white/5">
                  <td className="py-2 pr-4 font-medium text-white">{s.name}</td>
                  {rounds.map((r) => (
                    <td key={r.id} className="py-2 pr-4 text-neutral-300">
                      {countFor(s.id, r.id)}
                    </td>
                  ))}
                  <td className="py-2 text-cyan-300 font-bold">{countFor(s.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const setsView = (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sets.map((s) => (
        <li key={s.id} className={`${cardClass} p-5`}>
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-500">Question set</p>
          <p className="mt-2 text-xl font-bold tracking-tight text-white">{s.name}</p>
          <p className="mt-1 text-sm text-neutral-400">{countFor(s.id)} questions</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={smallBtn}
              onClick={() => {
                setFilterSet(s.id);
                setFilterRound("all");
                setSection("questions");
              }}
            >
              View questions
            </button>
            <button type="button" className={smallBtn} onClick={() => setModal({ kind: "set", id: s.id })}>
              Rename
            </button>
            <button type="button" className={dangerBtn} onClick={() => deleteSet(s.id)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );

  const roundsView = (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rounds.map((r, i) => (
        <li key={r.id} className={`${cardClass} p-5`}>
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">Round {i + 1}</p>
          <p className="mt-2 text-xl font-bold tracking-tight text-white">{r.name}</p>
          <p className="mt-1 text-sm text-neutral-400">
            {questions.filter((q) => q.roundId === r.id).length} questions across {sets.length} sets
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className={smallBtn}
              onClick={() => {
                setFilterRound(r.id);
                setFilterSet("all");
                setSection("questions");
              }}
            >
              View questions
            </button>
            <button type="button" className={smallBtn} onClick={() => setModal({ kind: "round", id: r.id })}>
              Rename
            </button>
            <button type="button" className={dangerBtn} onClick={() => deleteRound(r.id)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );

  const questionsView = (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-56">
          <label htmlFor="filter-set" className={labelClass}>
            Filter by set
          </label>
          <select
            id="filter-set"
            className={inputClass}
            value={activeSetFilter}
            onChange={(e) => setFilterSet(e.target.value)}
          >
            <option value="all">All sets</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:w-64">
          <label htmlFor="filter-round" className={labelClass}>
            Filter by round
          </label>
          <select
            id="filter-round"
            className={inputClass}
            value={activeRoundFilter}
            onChange={(e) => setFilterRound(e.target.value)}
          >
            <option value="all">All rounds</option>
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <p className="font-mono text-xs text-neutral-500 sm:ml-auto">
          Showing {visibleQuestions.length} of {questions.length}
        </p>
      </div>

      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 font-mono text-xs uppercase tracking-widest text-neutral-400">
              <th className="px-4 py-3">Question</th>
              <th className="px-4 py-3">Set</th>
              <th className="px-4 py-3">Round</th>
              <th className="px-4 py-3">Answer / Target</th>
              <th className="px-4 py-3">Marks</th>
              <th className="px-4 py-3">Timer</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleQuestions.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  No questions match. Use Add Question to create one.
                </td>
              </tr>
            )}
            {visibleQuestions.map((q) => (
              <tr key={q.id} className="border-b border-white/5 align-top">
                <td className="max-w-xs px-4 py-3 text-neutral-100">
                  <p className="font-medium text-white">{q.text}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {q.imageUrl && (
                      <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">
                        Image Attached
                      </span>
                    )}
                    {q.tabooWords && q.tabooWords.length > 0 && (
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 font-mono text-[10px] text-red-300">
                        {q.tabooWords.length} Taboo Clues
                      </span>
                    )}
                    {q.options && q.options.length > 0 && (
                      <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-mono text-[10px] text-violet-300">
                        MCQ ({q.options.length} options)
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-neutral-300 font-mono text-xs">{setName(q.setId)}</td>
                <td className="px-4 py-3 text-neutral-300 font-mono text-xs">{roundName(q.roundId)}</td>
                <td className="px-4 py-3 text-neutral-300 font-semibold">
                  {q.targetWord ? (
                    <div>
                      <span className="text-cyan-300 font-bold">{q.targetWord}</span>
                      {q.tabooWords && (
                        <p className="text-[11px] text-neutral-500 mt-0.5 truncate max-w-[14rem]">
                          Taboo: {q.tabooWords.join(", ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    q.answer || "—"
                  )}
                </td>
                <td className="px-4 py-3 text-cyan-300 font-mono font-bold">{q.marks}</td>
                <td className="px-4 py-3 text-neutral-300 font-mono">{q.timer}s</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button type="button" className={smallBtn} onClick={() => setModal({ kind: "question", id: q.id })}>
                      Edit
                    </button>
                    <button type="button" className={dangerBtn} onClick={() => deleteQuestion(q.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const settingsView = (
    <div className="max-w-2xl space-y-6">
      {/* Backend Status Card */}
      <div className={`${cardClass} p-5 space-y-3 border-l-4 border-l-cyan-400`}>
        <p className="font-mono text-xs uppercase tracking-widest text-cyan-300 font-bold">
          Backend & Storage Status
        </p>
        <p className="text-sm text-neutral-200">
          The quiz questions, images, answer checking, and live leaderboard are active.
        </p>
        <div className="rounded-lg bg-black/40 p-3 font-mono text-xs text-neutral-300 space-y-1">
          <p>
            Storage mode: <span className="text-emerald-400 font-bold">Local File System & In-Memory Store</span>
          </p>
          <p>
            Image Uploads: <span className="text-emerald-400 font-bold">Serving via Next.js Public Uploads</span>
          </p>
          <p>
            Admin Protection: <span className="text-cyan-300 font-bold">Active (Password Protected)</span>
          </p>
        </div>
      </div>

      <div className={`${cardClass} p-5`}>
        <label htmlFor="default-count" className={labelClass}>
          Default questions created when adding a set or round
        </label>
        <input
          id="default-count"
          type="number"
          min={0}
          max={50}
          className={`${inputClass} max-w-[8rem]`}
          value={defaultCount}
          onChange={(e) => {
            const n = e.target.valueAsNumber;
            setDefaultCount(Number.isFinite(n) ? Math.min(50, Math.max(0, Math.floor(n))) : 0);
          }}
        />
      </div>

      <div className={`${cardClass} p-5`}>
        <p className="text-sm text-neutral-300">
          Reset all questions back to the standard event bank (6 sets, 3 rounds, 5 rich questions each = 90 total questions).
        </p>
        <button type="button" className={`${dangerBtn} mt-4`} onClick={resetAll}>
          Reset to starting data
        </button>
      </div>
    </div>
  );

  const gate = (
    <form onSubmit={unlock} className={`${cardClass} max-w-md space-y-4 p-6`}>
      <h2 className="text-xl font-bold tracking-tight">Admin access</h2>
      <p className="text-sm text-neutral-400">
        Enter the admin password to edit sets, rounds, and questions.
      </p>
      <div>
        <label htmlFor="admin-password" className={labelClass}>
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="off"
          className={inputClass}
          value={uploadKey}
          onChange={(e) => setUploadKey(e.target.value)}
        />
      </div>
      {unlockError && (
        <p className="text-xs text-red-300" role="alert">
          {unlockError}
        </p>
      )}
      <button type="submit" className={primaryBtn} disabled={unlocking}>
        {unlocking ? "Checking..." : "Unlock admin dashboard"}
      </button>
    </form>
  );

  const titles: Record<Section, string> = {
    overview: "Overview",
    sets: "Question Sets",
    rounds: "Rounds",
    questions: "Question Editor",
    settings: "Settings & Storage",
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-neutral-950 text-neutral-100">
      <div
        className="pointer-events-none absolute -top-48 left-1/2 h-[26rem] w-[26rem] -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl"
        aria-hidden="true"
      />

      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="font-mono text-sm font-bold tracking-[0.25em] text-white">
            TECH<span className="text-cyan-300">/</span>SCRAMBLE
          </Link>
          <div className="flex items-center gap-3">
            {unlocked && (
              <span className="font-mono text-xs text-neutral-400">
                {saveState.kind === "saving" && <span className="text-amber-300">Saving...</span>}
                {saveState.kind === "saved" && <span className="text-cyan-300">Saved to database</span>}
                {saveState.kind === "error" && (
                  <span className="text-red-300">
                    Save failed.{" "}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setRetryTick((t) => t + 1)}
                    >
                      Retry
                    </button>
                  </span>
                )}
              </span>
            )}
            <span className="font-mono text-xs uppercase tracking-widest text-violet-300">Admin</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {!unlocked ? (
          gate
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-3xl font-black tracking-tight">{titles[section]}</h1>
              {actionBar}
            </div>

            <nav className="flex flex-wrap gap-2 border-b border-white/10 pb-3" aria-label="Admin sections">
              {(["overview", "sets", "rounds", "questions", "settings"] as Section[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSection(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${section === tab
                    ? "bg-white/10 text-cyan-300 border border-cyan-300/30"
                    : "text-neutral-400 hover:text-white"
                    }`}
                >
                  {titles[tab]}
                </button>
              ))}
            </nav>

            {section === "overview" && overview}
            {section === "sets" && setsView}
            {section === "rounds" && roundsView}
            {section === "questions" && questionsView}
            {section === "settings" && settingsView}
          </div>
        )}

        {renderModal()}
      </main>
    </div>
  );
}