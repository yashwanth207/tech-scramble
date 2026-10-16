"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import {
  buildDefaultQuiz,
  INITIAL_ROUNDS,
  INITIAL_SETS,
  StoredQuestion,
  StoredQuiz,
  StoredRound,
  StoredSet,
} from "@/lib/quiz-data";

/* ---------- Types ---------- */

type Section =
  | "overview"
  | "sets"
  | "rounds"
  | "questions"
  | "unassigned"
  | "review"
  | "settings";

type QuestionSet = StoredSet;
type Round = StoredRound;
type Question = StoredQuestion;

type ModalState =
  | null
  | { kind: "set"; id?: string }
  | { kind: "round"; id?: string }
  | { kind: "question"; id?: string; isUnassigned?: boolean }
  | { kind: "move"; id: string; isUnassigned?: boolean }
  | { kind: "import" };

const initialSets: QuestionSet[] = INITIAL_SETS;
const initialRounds: Round[] = INITIAL_ROUNDS;

function buildInitialData(): StoredQuiz {
  return buildDefaultQuiz();
}

/* ---------- Shared styles ---------- */

const inputClass =
  "w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-300";
const labelClass =
  "mb-1 block font-mono text-xs uppercase tracking-widest text-neutral-400";
const primaryBtn =
  "rounded-lg bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40";
const ghostBtn =
  "rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-neutral-100 transition hover:border-violet-400 hover:text-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";
const smallBtn =
  "rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-neutral-200 transition hover:border-cyan-300 hover:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";
const dangerBtn =
  "rounded-md border border-red-400/30 px-2.5 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400";
const successBtn =
  "rounded-md border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20";
const cardClass = "rounded-2xl border border-white/10 bg-white/[0.03]";

/* ---------- Modal Component ---------- */

function Modal({
  title,
  children,
  onClose,
  maxWidth = "max-w-lg",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-2xl border border-white/15 bg-neutral-950 p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className={smallBtn}
            aria-label="Close dialog"
          >
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

/* ---------- Question Form Component (Round-Tailored) ---------- */

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
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const selectedRound = rounds.find((r) => r.id === draft.roundId);
  const roundLower = selectedRound?.name.trim().toLowerCase() ?? "";

  const isR1 = roundLower.includes("quick") || roundLower.includes("q&a") || draft.roundId === "r1";
  const isR2 = roundLower.includes("emoji") || draft.roundId === "r2";
  const isR3 = roundLower.includes("taboo") || draft.roundId === "r3";

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
    const isMimeValid =
      ALLOWED_IMAGE_TYPES.includes(file.type) || file.type.startsWith("image/");
    if (!isExtValid && !isMimeValid) {
      setUploadError("Only JPG, JPEG, PNG or WebP images are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUploadError(
        `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 4 MB.`,
      );
      return;
    }
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function removeImage() {
    setPendingFile(null);
    setPreviewUrl("");
    setUploadError("");
    setDraft((d) => ({ ...d, imageUrl: "", cardReference: "" }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    if (isR2 && !draft.emojiClue?.trim() && !draft.text.trim()) {
      setError("Please provide an Emoji Clue sequence for Round 2.");
      return;
    }

    if (isR3 && !draft.targetWord?.trim() && !draft.answer.trim()) {
      setError("Please provide the Target Word for Tech Taboo.");
      return;
    }

    if (!isR2 && !isR3 && !draft.text.trim()) {
      setError("Please enter the question text.");
      return;
    }

    if (!draft.answer.trim() && !draft.targetWord?.trim()) {
      setError("Please provide the correct answer or target word.");
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
        const data = (await res.json().catch(() => null)) as {
          url?: string;
          error?: string;
        } | null;
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
    const tabooWords = isR3
      ? tabooInput
          .split(/[,;\n]/)
          .map((w) => w.trim())
          .filter(Boolean)
      : undefined;

    const answer = draft.answer.trim() || draft.targetWord?.trim() || "";
    const targetWord = isR3 ? (draft.targetWord?.trim() || answer) : undefined;
    const text = isR2
      ? draft.text.trim() || draft.emojiClue?.trim() || "Emoji Tech Clue"
      : draft.text.trim() || (targetWord ? `Describe: ${targetWord}` : "");

    onSave({
      ...draft,
      text,
      answer,
      targetWord,
      tabooWords: tabooWords && tabooWords.length > 0 ? tabooWords : undefined,
      emojiClue: isR2 ? draft.emojiClue?.trim() : undefined,
      cardReference: draft.cardReference?.trim() || imageUrl || undefined,
      imageUrl: imageUrl || draft.cardReference?.trim() || "",
      flaggedForReview: draft.flaggedForReview || undefined,
      reviewNotes: draft.reviewNotes?.trim() || undefined,
    });
  }

  const shownImage = previewUrl || draft.cardReference || draft.imageUrl;

  return (
    <Modal title={title} onClose={onClose} maxWidth="max-w-xl">
      <form onSubmit={submit} className="space-y-4">
        {/* Set & Round selectors */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="q-set" className={labelClass}>
              Target Set
            </label>
            <select
              id="q-set"
              className={inputClass}
              value={draft.setId}
              onChange={(e) => setDraft({ ...draft, setId: e.target.value })}
            >
              <option value="unassigned">— Unassigned Question Bank —</option>
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="q-round" className={labelClass}>
              Round Category
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

        {/* Round 1: AI Quick Q&A Fields */}
        {isR1 && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.04] p-4 space-y-3">
            <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-xs font-bold text-cyan-300">
              Round 1 — AI Quick Q&A
            </span>
            <div>
              <label htmlFor="q-text" className={labelClass}>
                Question / Prompt
              </label>
              <textarea
                id="q-text"
                rows={2}
                className={inputClass}
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                placeholder="e.g. Which test checks if a machine can exhibit human-like intelligence?"
              />
            </div>
            <div>
              <label htmlFor="q-answer" className={labelClass}>
                Correct Answer (Short / One-Word)
              </label>
              <input
                id="q-answer"
                className={inputClass}
                value={draft.answer}
                onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
                placeholder="e.g. Turing Test (use | for alternates like Turing Test|Turing)"
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                Separate accepted alternates with | (e.g. GPU|Graphics Processing Unit).
              </p>
            </div>
          </div>
        )}

        {/* Round 2: Emoji Tech Guess Fields */}
        {isR2 && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/[0.04] p-4 space-y-3">
            <span className="rounded bg-violet-500/20 px-2 py-0.5 font-mono text-xs font-bold text-violet-300">
              Round 2 — Emoji Tech Guess
            </span>
            <div>
              <label htmlFor="q-emoji" className={labelClass}>
                Emoji Sequence / Clue
              </label>
              <input
                id="q-emoji"
                className={`${inputClass} text-xl`}
                value={draft.emojiClue ?? draft.text}
                onChange={(e) =>
                  setDraft({ ...draft, emojiClue: e.target.value, text: e.target.value })
                }
                placeholder="e.g. ☁️ + 💻 or 🧠 + 🤖"
              />
            </div>
            <div>
              <label htmlFor="q-emoji-answer" className={labelClass}>
                Correct Tech Term / Answer
              </label>
              <input
                id="q-emoji-answer"
                className={inputClass}
                value={draft.answer}
                onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
                placeholder="e.g. Cloud Computing or Artificial Intelligence"
              />
            </div>
          </div>
        )}

        {/* Round 3: Tech Taboo Fields */}
        {isR3 && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/[0.04] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="rounded bg-red-500/20 px-2 py-0.5 font-mono text-xs font-bold text-red-300">
                Round 3 — Tech Taboo / Forbidden Words
              </span>
              {draft.flaggedForReview && (
                <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                  ⚠️ Review Flag Active
                </span>
              )}
            </div>
            <div>
              <label htmlFor="q-target" className={labelClass}>
                Target Word (Word team must guess)
              </label>
              <input
                id="q-target"
                className={inputClass}
                value={draft.targetWord ?? draft.answer}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    targetWord: e.target.value,
                    answer: e.target.value,
                  })
                }
                placeholder="e.g. Keyboard"
              />
            </div>
            <div>
              <label htmlFor="q-taboo" className={labelClass}>
                Forbidden Words (Comma or newline separated)
              </label>
              <textarea
                id="q-taboo"
                rows={2}
                className={inputClass}
                value={tabooInput}
                onChange={(e) => setTabooInput(e.target.value)}
                placeholder="e.g. keys, type, computer, letters"
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                These words cannot be spoken by the clue giver during the round.
              </p>
            </div>
            <div>
              <label htmlFor="q-card-ref" className={labelClass}>
                Card Image Reference (e.g. /taboo/card-1.jpg)
              </label>
              <input
                id="q-card-ref"
                className={inputClass}
                value={draft.cardReference ?? draft.imageUrl}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    cardReference: e.target.value,
                    imageUrl: e.target.value,
                  })
                }
                placeholder="e.g. /taboo/card-1.jpg"
              />
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.05] p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-white/20 bg-neutral-900 text-amber-400"
                  checked={Boolean(draft.flaggedForReview)}
                  onChange={(e) =>
                    setDraft({ ...draft, flaggedForReview: e.target.checked })
                  }
                />
                <span className="font-mono text-xs font-bold text-amber-300">
                  Flag row for manual admin review (uncertain OCR / cropped text)
                </span>
              </label>
              {draft.flaggedForReview && (
                <input
                  className={inputClass}
                  placeholder="Review notes (e.g. Cropped 4th forbidden word in screenshot)"
                  value={draft.reviewNotes ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, reviewNotes: e.target.value })
                  }
                />
              )}
            </div>
          </div>
        )}

        {/* Marks and Timer */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="q-marks" className={labelClass}>
              Marks / Points
            </label>
            <input
              id="q-marks"
              type="number"
              min={0}
              className={inputClass}
              value={Number.isFinite(draft.marks) ? draft.marks : ""}
              onChange={(e) =>
                setDraft({ ...draft, marks: e.target.valueAsNumber })
              }
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
              onChange={(e) =>
                setDraft({ ...draft, timer: e.target.valueAsNumber })
              }
            />
          </div>
        </div>

        {/* Optional Image Attachment */}
        <div className="space-y-3 rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between">
            <p className={labelClass}>Visual Asset / Card Image</p>
            {shownImage && (
              <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
                Image Attached
              </span>
            )}
          </div>
          {shownImage && (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={shownImage}
                alt="Visual preview"
                className="max-h-40 w-full rounded-lg border border-white/10 bg-neutral-900 object-contain"
              />
              <button
                type="button"
                className={dangerBtn}
                onClick={removeImage}
              >
                Remove Image
              </button>
            </div>
          )}
          <div className="space-y-2">
            <div>
              <label htmlFor="q-image-file" className={labelClass}>
                {shownImage ? "Replace image file" : "Upload new image"}
              </label>
              <input
                id="q-image-file"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                disabled={saving}
                onChange={handleFile}
                className="block w-full text-xs text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-violet-500/30 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-violet-500/50"
              />
            </div>
            <div>
              <label htmlFor="q-image-url-alt" className={labelClass}>
                Or direct URL / path
              </label>
              <input
                id="q-image-url-alt"
                type="text"
                className={inputClass}
                value={draft.imageUrl || draft.cardReference || ""}
                onChange={(e) => {
                  setPendingFile(null);
                  setPreviewUrl("");
                  setDraft({
                    ...draft,
                    imageUrl: e.target.value,
                    cardReference: e.target.value,
                  });
                }}
                placeholder="e.g. /taboo/card-1.jpg or /uploads/..."
              />
            </div>
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

/* ---------- Move Question Modal ---------- */

function MoveQuestionModal({
  question,
  sets,
  rounds,
  onMove,
  onClose,
}: {
  question: Question;
  sets: QuestionSet[];
  rounds: Round[];
  onMove: (targetSetId: string, targetRoundId: string) => void;
  onClose: () => void;
}) {
  const [targetSetId, setTargetSetId] = useState(
    question.setId === "unassigned" ? sets[0]?.id ?? "s1" : question.setId,
  );
  const [targetRoundId, setTargetRoundId] = useState(question.roundId);
  const [isUnassigned, setIsUnassigned] = useState(question.setId === "unassigned");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (isUnassigned) {
      onMove("unassigned", targetRoundId);
    } else {
      onMove(targetSetId, targetRoundId);
    }
  }

  return (
    <Modal title="Move Question" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm">
          <p className="font-semibold text-white">
            {question.targetWord || question.emojiClue || question.text || "Question"}
          </p>
          <p className="mt-1 font-mono text-xs text-neutral-400">
            Current: {question.setId === "unassigned" ? "Unassigned Bank" : question.setId} · {question.roundId}
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-white/20 bg-neutral-900 text-cyan-400"
              checked={isUnassigned}
              onChange={(e) => setIsUnassigned(e.target.checked)}
            />
            <span className="text-sm font-semibold text-neutral-200">
              Move to Unassigned Question Bank (Reserve)
            </span>
          </label>
        </div>

        {!isUnassigned && (
          <div className="space-y-3">
            <div>
              <label htmlFor="move-set" className={labelClass}>
                Destination Set
              </label>
              <select
                id="move-set"
                className={inputClass}
                value={targetSetId}
                onChange={(e) => setTargetSetId(e.target.value)}
              >
                {sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="move-round" className={labelClass}>
                Destination Round
              </label>
              <select
                id="move-round"
                className={inputClass}
                value={targetRoundId}
                onChange={(e) => setTargetRoundId(e.target.value)}
              >
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
          <button type="button" onClick={onClose} className={ghostBtn}>
            Cancel
          </button>
          <button type="submit" className={primaryBtn}>
            Confirm Move
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Import & Review Modal ---------- */

function ImportReviewModal({
  currentSets,
  currentRounds,
  onImportConfirm,
  onClose,
}: {
  currentSets: QuestionSet[];
  currentRounds: Round[];
  onImportConfirm: (imported: StoredQuiz) => void;
  onClose: () => void;
}) {
  const [jsonText, setJsonText] = useState("");
  const [parsed, setParsed] = useState<StoredQuiz | null>(null);
  const [parseError, setParseError] = useState("");

  function analyze(text: string) {
    setJsonText(text);
    setParseError("");
    setParsed(null);
    if (!text.trim()) return;
    try {
      const data = JSON.parse(text) as StoredQuiz;
      if (!Array.isArray(data.sets) || !Array.isArray(data.rounds) || !Array.isArray(data.questions)) {
        setParseError("JSON must contain sets, rounds, and questions arrays.");
        return;
      }
      setParsed(data);
    } catch {
      setParseError("Invalid JSON syntax.");
    }
  }

  const validationChecks = useMemo(() => {
    if (!parsed) return null;
    const issues: string[] = [];
    for (const s of parsed.sets) {
      for (const r of parsed.rounds) {
        const count = parsed.questions.filter((q) => q.setId === s.id && q.roundId === r.id).length;
        if (count !== 5) {
          issues.push(`${s.name} → ${r.name}: has ${count} questions (must be 5)`);
        }
      }
    }
    const flaggedCount =
      parsed.questions.filter((q) => q.flaggedForReview).length +
      (parsed.unassignedQuestions?.filter((q) => q.flaggedForReview).length ?? 0);

    return {
      issues,
      isValid: issues.length === 0,
      assignedCount: parsed.questions.length,
      unassignedCount: parsed.unassignedQuestions?.length ?? 0,
      flaggedCount,
    };
  }, [parsed]);

  return (
    <Modal title="Import & Review Quiz Content" onClose={onClose} maxWidth="max-w-2xl">
      <div className="space-y-4">
        <p className="text-sm text-neutral-300">
          Paste the quiz JSON below to inspect and validate before saving. Rounds will be verified to have exactly 5 questions each.
        </p>

        <div>
          <label htmlFor="import-json" className={labelClass}>
            Quiz JSON Payload
          </label>
          <textarea
            id="import-json"
            rows={6}
            className={`${inputClass} font-mono text-xs`}
            value={jsonText}
            onChange={(e) => analyze(e.target.value)}
            placeholder='{"sets": [...], "rounds": [...], "questions": [...], "unassignedQuestions": [...]}'
          />
        </div>

        {parseError && <p className="text-xs text-red-300">{parseError}</p>}

        {validationChecks && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <h3 className="font-bold text-white text-sm">Validation & Inspection Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-black/40">
                <span className="text-neutral-400 block">Sets</span>
                <span className="text-white font-bold text-sm">{parsed?.sets.length}</span>
              </div>
              <div className="p-2 rounded bg-black/40">
                <span className="text-neutral-400 block">Rounds</span>
                <span className="text-white font-bold text-sm">{parsed?.rounds.length}</span>
              </div>
              <div className="p-2 rounded bg-black/40">
                <span className="text-neutral-400 block">Assigned Qs</span>
                <span className="text-cyan-300 font-bold text-sm">{validationChecks.assignedCount}</span>
              </div>
              <div className="p-2 rounded bg-black/40">
                <span className="text-neutral-400 block">Unassigned Qs</span>
                <span className="text-violet-300 font-bold text-sm">{validationChecks.unassignedCount}</span>
              </div>
            </div>

            {validationChecks.flaggedCount > 0 && (
              <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] text-xs text-amber-200">
                ⚠️ {validationChecks.flaggedCount} item(s) flagged for OCR / manual review.
              </div>
            )}

            {validationChecks.issues.length > 0 ? (
              <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/[0.08] text-xs text-red-200 space-y-1">
                <p className="font-bold">❌ Validation Blockers (Each round must have exactly 5 questions):</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  {validationChecks.issues.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.06] text-xs text-emerald-200 font-semibold">
                ✓ All round counts pass! Exactly 5 questions per round per set.
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-white/10 pt-3">
          <button type="button" onClick={onClose} className={ghostBtn}>
            Cancel
          </button>
          <button
            type="button"
            className={primaryBtn}
            disabled={!parsed || !validationChecks?.isValid}
            onClick={() => {
              if (parsed) {
                onImportConfirm(parsed);
              }
            }}
          >
            Import & Save to Database
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SummaryCard({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: number | string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div className={`${cardClass} p-5 ${highlight ? "border-cyan-400/40 bg-cyan-500/[0.03]" : ""}`}>
      <p className="font-mono text-xs uppercase tracking-widest text-neutral-400">{label}</p>
      <p className="mt-3 text-4xl font-extrabold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{note}</p>
    </div>
  );
}

/* ---------- Admin Page Component ---------- */

export default function AdminPage() {
  const [section, setSection] = useState<Section>("overview");
  const [sets, setSets] = useState<QuestionSet[]>(initialSets);
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [questions, setQuestions] = useState<Question[]>(() => buildInitialData().questions);
  const [unassignedQuestions, setUnassignedQuestions] = useState<Question[]>(
    () => buildInitialData().unassignedQuestions || [],
  );

  const [filterSet, setFilterSet] = useState<string>("all");
  const [filterRound, setFilterRound] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [modal, setModal] = useState<ModalState>(null);
  const [uploadKey, setUploadKey] = useState<string>("");
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [unlocking, setUnlocking] = useState<boolean>(false);
  const [unlockError, setUnlockError] = useState<string>("");
  const [saveState, setSaveState] = useState<
    | { kind: "clean" }
    | { kind: "saving" }
    | { kind: "saved" }
    | { kind: "error"; message: string }
    | { kind: "validation-blocked"; message: string }
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

  /* ---------- Validation Guard: Exactly 5 questions per round per set ---------- */
  const validationReport = useMemo(() => {
    const issues: {
      setId: string;
      setName: string;
      roundId: string;
      roundName: string;
      count: number;
    }[] = [];

    for (const s of sets) {
      for (const r of rounds) {
        const count = questions.filter((q) => q.setId === s.id && q.roundId === r.id).length;
        if (count !== 5) {
          issues.push({
            setId: s.id,
            setName: s.name,
            roundId: r.id,
            roundName: r.name,
            count,
          });
        }
      }
    }

    const totalAssigned = questions.length;
    const isExact60 = totalAssigned === 60;
    const isValid = issues.length === 0 && sets.length === 4 && rounds.length === 3 && isExact60;

    return { issues, isValid, totalAssigned };
  }, [sets, rounds, questions]);

  /* ---------- Flagged Review Items (e.g. uncertain OCR) ---------- */
  const flaggedItems = useMemo(() => {
    const assigned = questions.filter((q) => q.flaggedForReview);
    const unassigned = unassignedQuestions.filter((q) => q.flaggedForReview);
    return [...assigned, ...unassigned];
  }, [questions, unassignedQuestions]);

  const snapshot = useMemo(
    () => JSON.stringify({ sets, rounds, questions, unassignedQuestions }),
    [sets, rounds, questions, unassignedQuestions],
  );

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
        data?: StoredQuiz | null;
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
        if (Array.isArray(body.data.unassignedQuestions)) {
          setUnassignedQuestions(body.data.unassignedQuestions);
        }
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

  // Persistent save to database with 5-question guard
  useEffect(() => {
    if (!unlocked || snapshot === lastSaved.current) return;

    // Check validation guard: prevent saving if round counts are not exactly 5
    if (!validationReport.isValid) {
      setSaveState({
        kind: "validation-blocked",
        message: `Validation guard active: Each round in every set must contain exactly 5 questions (${validationReport.totalAssigned}/60 assigned). Autosave paused until resolved.`,
      });
      return;
    }

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
  }, [unlocked, snapshot, uploadKey, retryTick, validationReport]);

  const setName = (id: string) => sets.find((s) => s.id === id)?.name ?? "Unknown set";
  const roundName = (id: string) => rounds.find((r) => r.id === id)?.name ?? "Unknown round";

  const activeSetFilter = filterSet === "all" || sets.some((s) => s.id === filterSet) ? filterSet : "all";
  const activeRoundFilter = filterRound === "all" || rounds.some((r) => r.id === filterRound) ? filterRound : "all";

  const countFor = (setId: string, roundId?: string) =>
    questions.filter((q) => q.setId === setId && (roundId === undefined || q.roundId === roundId)).length;

  const visibleQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchSet = activeSetFilter === "all" || q.setId === activeSetFilter;
      const matchRound = activeRoundFilter === "all" || q.roundId === activeRoundFilter;
      const qText = (q.text + " " + q.answer + " " + (q.targetWord ?? "") + " " + (q.emojiClue ?? "")).toLowerCase();
      const matchSearch = !searchQuery.trim() || qText.includes(searchQuery.trim().toLowerCase());
      return matchSet && matchRound && matchSearch;
    });
  }, [questions, activeSetFilter, activeRoundFilter, searchQuery]);

  /* ---------- Set / Round Handlers ---------- */

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
    if (!window.confirm(`Delete "${setName(id)}" and move its ${count} question(s) to Unassigned Bank?`)) return;
    const moved = questions.filter((q) => q.setId === id).map((q) => ({ ...q, setId: "unassigned" }));
    setUnassignedQuestions((prev) => [...prev, ...moved]);
    setQuestions((prev) => prev.filter((q) => q.setId !== id));
    setSets((prev) => prev.filter((s) => s.id !== id));
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
    if (!window.confirm(`Delete "${roundName(id)}" and move its ${count} question(s) to Unassigned Bank?`)) return;
    const moved = questions.filter((q) => q.roundId === id).map((q) => ({ ...q, setId: "unassigned" }));
    setUnassignedQuestions((prev) => [...prev, ...moved]);
    setQuestions((prev) => prev.filter((q) => q.roundId !== id));
    setRounds((prev) => prev.filter((r) => r.id !== id));
  }

  /* ---------- Question CRUD & Reorder Handlers ---------- */

  function saveQuestion(draft: QuestionDraft, id?: string, isUnassigned?: boolean) {
    if (draft.setId === "unassigned") {
      if (id) {
        // Was it in assigned questions or unassigned?
        if (isUnassigned) {
          setUnassignedQuestions((prev) =>
            prev.map((q) => (q.id === id ? { ...q, ...draft, setId: "unassigned" } : q)),
          );
        } else {
          setQuestions((prev) => prev.filter((q) => q.id !== id));
          setUnassignedQuestions((prev) => [...prev, { id, ...draft, setId: "unassigned" }]);
        }
      } else {
        setUnassignedQuestions((prev) => [...prev, { id: nextId("q"), ...draft, setId: "unassigned" }]);
      }
    } else {
      if (id) {
        if (isUnassigned) {
          setUnassignedQuestions((prev) => prev.filter((q) => q.id !== id));
          setQuestions((prev) => [...prev, { id, ...draft }]);
        } else {
          setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...draft } : q)));
        }
      } else {
        setQuestions((prev) => [...prev, { id: nextId("q"), ...draft }]);
      }
    }
    setModal(null);
  }

  function deleteQuestion(id: string, fromUnassigned = false) {
    if (!window.confirm("Delete this question?")) return;
    if (fromUnassigned) {
      setUnassignedQuestions((prev) => prev.filter((q) => q.id !== id));
    } else {
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    }
  }

  function moveQuestionToUnassigned(id: string) {
    const target = questions.find((q) => q.id === id);
    if (!target) return;
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setUnassignedQuestions((prev) => [...prev, { ...target, setId: "unassigned" }]);
  }

  function moveQuestionToTarget(id: string, targetSetId: string, targetRoundId: string) {
    const inAssigned = questions.find((q) => q.id === id);
    const inUnassigned = unassignedQuestions.find((q) => q.id === id);
    const item = inAssigned || inUnassigned;
    if (!item) return;

    if (targetSetId === "unassigned") {
      if (inAssigned) {
        setQuestions((prev) => prev.filter((q) => q.id !== id));
        setUnassignedQuestions((prev) => [...prev, { ...item, setId: "unassigned", roundId: targetRoundId }]);
      }
    } else {
      if (inUnassigned) {
        setUnassignedQuestions((prev) => prev.filter((q) => q.id !== id));
        setQuestions((prev) => [...prev, { ...item, setId: targetSetId, roundId: targetRoundId }]);
      } else {
        setQuestions((prev) =>
          prev.map((q) => (q.id === id ? { ...q, setId: targetSetId, roundId: targetRoundId } : q)),
        );
      }
    }
    setModal(null);
  }

  function moveQuestionOrder(id: string, direction: "up" | "down") {
    const index = questions.findIndex((q) => q.id === id);
    if (index === -1) return;
    const targetQ = questions[index];

    // Find siblings in the same set and round
    const siblings = questions
      .map((q, idx) => ({ q, idx }))
      .filter((item) => item.q.setId === targetQ.setId && item.q.roundId === targetQ.roundId);

    const siblingPos = siblings.findIndex((item) => item.q.id === id);
    if (siblingPos === -1) return;

    const swapSiblingPos = direction === "up" ? siblingPos - 1 : siblingPos + 1;
    if (swapSiblingPos < 0 || swapSiblingPos >= siblings.length) return;

    const swapWithIndex = siblings[swapSiblingPos].idx;

    const copy = [...questions];
    const temp = copy[index];
    copy[index] = copy[swapWithIndex];
    copy[swapWithIndex] = temp;
    setQuestions(copy);
  }

  function clearFlagReview(id: string) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, flaggedForReview: false, reviewNotes: undefined } : q)),
    );
    setUnassignedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, flaggedForReview: false, reviewNotes: undefined } : q)),
    );
  }

  function resetAllToStandard() {
    if (
      !window.confirm(
        "Reset everything back to standard quiz structure? (4 sets × 3 rounds × 5 questions = 60 assigned, plus 25 in Unassigned Bank).",
      )
    )
      return;
    const defaultData = buildDefaultQuiz();
    setSets(defaultData.sets);
    setRounds(defaultData.rounds);
    setQuestions(defaultData.questions);
    setUnassignedQuestions(defaultData.unassignedQuestions ?? []);
    setFilterSet("all");
    setFilterRound("all");
  }

  function handleImportConfirm(imported: StoredQuiz) {
    setSets(imported.sets);
    setRounds(imported.rounds);
    setQuestions(imported.questions);
    setUnassignedQuestions(imported.unassignedQuestions ?? []);
    setModal(null);
  }

  /* ---------- Render Modals ---------- */

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

    if (modal.kind === "question") {
      const existing = modal.id
        ? modal.isUnassigned
          ? unassignedQuestions.find((q) => q.id === modal.id)
          : questions.find((q) => q.id === modal.id)
        : undefined;

      const initial: QuestionDraft = existing
        ? {
            setId: existing.setId,
            roundId: existing.roundId,
            text: existing.text,
            answer: existing.answer,
            marks: existing.marks,
            timer: existing.timer,
            imageUrl: existing.imageUrl,
            targetWord: existing.targetWord,
            tabooWords: existing.tabooWords,
            emojiClue: existing.emojiClue,
            cardReference: existing.cardReference,
            flaggedForReview: existing.flaggedForReview,
            reviewNotes: existing.reviewNotes,
          }
        : {
            setId: activeSetFilter !== "all" ? activeSetFilter : (sets[0]?.id ?? "s1"),
            roundId: activeRoundFilter !== "all" ? activeRoundFilter : (rounds[0]?.id ?? "r1"),
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
          onSave={(draft) => saveQuestion(draft, modal.id, modal.isUnassigned)}
          onClose={() => setModal(null)}
        />
      );
    }

    if (modal.kind === "move") {
      const q = modal.isUnassigned
        ? unassignedQuestions.find((item) => item.id === modal.id)
        : questions.find((item) => item.id === modal.id);
      if (!q) return null;
      return (
        <MoveQuestionModal
          key={modal.id}
          question={q}
          sets={sets}
          rounds={rounds}
          onMove={(targetSet, targetRound) => moveQuestionToTarget(q.id, targetSet, targetRound)}
          onClose={() => setModal(null)}
        />
      );
    }

    if (modal.kind === "import") {
      return (
        <ImportReviewModal
          currentSets={sets}
          currentRounds={rounds}
          onImportConfirm={handleImportConfirm}
          onClose={() => setModal(null)}
        />
      );
    }

    return null;
  }

  /* ---------- Action Bar ---------- */

  const actionBar = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={primaryBtn}
        onClick={() => setModal({ kind: "question" })}
      >
        + Add Question
      </button>
      <button
        type="button"
        className={ghostBtn}
        onClick={() => setModal({ kind: "import" })}
      >
        📥 Import & Review
      </button>
      <button
        type="button"
        className={ghostBtn}
        onClick={() => setModal({ kind: "set" })}
      >
        + Set
      </button>
      <button
        type="button"
        className={ghostBtn}
        onClick={() => setModal({ kind: "round" })}
      >
        + Round
      </button>
    </div>
  );

  /* ---------- Section 1: Overview ---------- */

  const overview = (
    <div className="space-y-8">
      {/* 5-Question Validation Guard Banner */}
      {!validationReport.isValid ? (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.08] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <h3 className="font-bold text-amber-300 text-base tracking-tight">
              Quiz Structure Validation Alert — 5 Questions Required Per Round
            </h3>
          </div>
          <p className="text-sm text-neutral-200">
            Each set must contain exactly 3 rounds, and each round must have <strong>EXACTLY 5 QUESTIONS</strong> (total 60 assigned).
            Currently, {validationReport.totalAssigned} / 60 questions are assigned.
          </p>
          <div className="rounded-xl bg-black/40 p-3 font-mono text-xs space-y-1">
            <p className="font-bold text-amber-200">Discrepancies found:</p>
            {validationReport.issues.map((iss, idx) => (
              <p key={idx} className="text-amber-300">
                • {iss.setName} → {iss.roundName}: has <strong>{iss.count}</strong> questions (needs exactly 5)
              </p>
            ))}
          </div>
          <p className="text-xs text-neutral-400">
            Use the Question Editor or Unassigned Bank to reassign questions until all 12 slots have 5 questions.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-300">
              Quiz Structure Validated: 4 Sets × 3 Rounds × Exactly 5 Questions = 60 Assigned Slots Total
            </p>
          </div>
          <span className="rounded bg-emerald-400/20 px-2 py-0.5 font-mono text-xs text-emerald-200">
            {unassignedQuestions.length} reserve in bank
          </span>
        </div>
      )}

      {/* Flagged Review Alert */}
      {flaggedItems.length > 0 && (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/[0.06] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="text-lg">🔍</span>
            <div>
              <p className="font-bold text-red-200 text-sm">
                {flaggedItems.length} Question Flagged for Admin OCR / Manual Review
              </p>
              <p className="text-xs text-neutral-300 mt-0.5">
                {flaggedItems[0].reviewNotes ||
                  "Cropped text in original screenshot requires manual review."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={smallBtn}
              onClick={() => {
                setModal({ kind: "question", id: flaggedItems[0].id, isUnassigned: flaggedItems[0].setId === "unassigned" });
              }}
            >
              Review & Edit
            </button>
            <button
              type="button"
              className={successBtn}
              onClick={() => clearFlagReview(flaggedItems[0].id)}
            >
              Approve / Clear Flag
            </button>
          </div>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <SummaryCard
          label="Question Sets"
          value={sets.length}
          note="Alpha, Beta, Gamma, Delta"
        />
        <SummaryCard
          label="Rounds"
          value={rounds.length}
          note="AI Q&A, Emoji, Tech Taboo"
        />
        <SummaryCard
          label="Assigned Questions"
          value={`${questions.length} / 60`}
          note="5 questions per round per set"
          highlight={questions.length === 60}
        />
        <SummaryCard
          label="Unassigned Question Bank"
          value={unassignedQuestions.length}
          note="Reserve questions stored safely"
        />
      </div>

      {/* Set × Round Matrix with Clear 5-Question Counters */}
      <div className={`${cardClass} overflow-x-auto p-5 space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-white">
              Questions Matrix (Set → Round → 5 Questions)
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Target requirement: EXACTLY 5 questions in each round of each set.
            </p>
          </div>
        </div>

        <table className="w-full min-w-[36rem] text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10 font-mono text-xs uppercase tracking-widest text-neutral-400">
              <th className="py-2.5 pr-4">Set Name</th>
              {rounds.map((r) => (
                <th key={r.id} className="py-2.5 pr-4">
                  {r.name}
                </th>
              ))}
              <th className="py-2.5 text-right">Total Set Questions</th>
            </tr>
          </thead>
          <tbody>
            {sets.map((s) => {
              const setTotal = countFor(s.id);
              return (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-3 pr-4 font-bold text-white flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    {s.name}
                  </td>
                  {rounds.map((r) => {
                    const c = countFor(s.id, r.id);
                    const isFive = c === 5;
                    return (
                      <td key={r.id} className="py-3 pr-4 font-mono">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold ${
                            isFive
                              ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                              : "bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse"
                          }`}
                        >
                          {c} / 5 questions {isFive ? "✓" : "⚠️"}
                        </span>
                      </td>
                    );
                  })}
                  <td className="py-3 text-right font-mono font-bold">
                    <span
                      className={`text-sm ${
                        setTotal === 15 ? "text-cyan-300" : "text-amber-300"
                      }`}
                    >
                      {setTotal} / 15
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ---------- Section 2: Sets View ---------- */

  const setsView = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">
          Exactly 4 sets are configured. Each set must have 15 questions (3 rounds × 5 questions).
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {sets.map((s) => {
          const count = countFor(s.id);
          return (
            <li key={s.id} className={`${cardClass} p-5 space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-neutral-500">
                  Question Set
                </span>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${
                    count === 15
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {count} / 15 Qs
                </span>
              </div>
              <p className="text-2xl font-black tracking-tight text-white">{s.name}</p>
              <div className="space-y-1 text-xs font-mono text-neutral-400 pt-2 border-t border-white/5">
                {rounds.map((r) => (
                  <div key={r.id} className="flex justify-between">
                    <span>{r.name}</span>
                    <span
                      className={
                        countFor(s.id, r.id) === 5 ? "text-cyan-300" : "text-red-300"
                      }
                    >
                      {countFor(s.id, r.id)} / 5
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  className={smallBtn}
                  onClick={() => {
                    setFilterSet(s.id);
                    setFilterRound("all");
                    setSection("questions");
                  }}
                >
                  Filter questions
                </button>
                <button
                  type="button"
                  className={smallBtn}
                  onClick={() => setModal({ kind: "set", id: s.id })}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className={dangerBtn}
                  onClick={() => deleteSet(s.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );

  /* ---------- Section 3: Rounds View ---------- */

  const roundsView = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-400">
          Exactly 3 rounds in sequential order. Each round has 20 assigned questions (5 per set across Alpha, Beta, Gamma, Delta).
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {rounds.map((r, i) => {
          const count = questions.filter((q) => q.roundId === r.id).length;
          const unassigned = unassignedQuestions.filter((q) => q.roundId === r.id).length;
          return (
            <li key={r.id} className={`${cardClass} p-5 space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-cyan-300">
                  Round {i + 1}
                </span>
                <span
                  className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${
                    count === 20
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {count} / 20 Assigned
                </span>
              </div>
              <p className="text-xl font-bold tracking-tight text-white">{r.name}</p>
              <p className="text-xs text-neutral-400">
                5 questions in Alpha, 5 in Beta, 5 in Gamma, 5 in Delta.
              </p>
              <div className="rounded-lg bg-black/40 p-2.5 font-mono text-xs text-neutral-300">
                <span>Reserve in bank: </span>
                <span className="font-bold text-violet-300">{unassigned} items</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-white/5">
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
                <button
                  type="button"
                  className={smallBtn}
                  onClick={() => setModal({ kind: "round", id: r.id })}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className={dangerBtn}
                  onClick={() => deleteRound(r.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );

  /* ---------- Section 4: Questions Editor ---------- */

  const questionsView = (
    <div className="space-y-4">
      {/* Filter and Search Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-48">
          <label htmlFor="filter-set" className={labelClass}>
            Filter by set
          </label>
          <select
            id="filter-set"
            className={inputClass}
            value={activeSetFilter}
            onChange={(e) => setFilterSet(e.target.value)}
          >
            <option value="all">All 4 Sets ({questions.length})</option>
            {sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({countFor(s.id)} questions)
              </option>
            ))}
          </select>
        </div>
        <div className="sm:w-56">
          <label htmlFor="filter-round" className={labelClass}>
            Filter by round
          </label>
          <select
            id="filter-round"
            className={inputClass}
            value={activeRoundFilter}
            onChange={(e) => setFilterRound(e.target.value)}
          >
            <option value="all">All 3 Rounds</option>
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({questions.filter((q) => q.roundId === r.id).length})
              </option>
            ))}
          </select>
        </div>
        <div className="sm:flex-1">
          <label htmlFor="search-q" className={labelClass}>
            Search text / answer / clue
          </label>
          <input
            id="search-q"
            className={inputClass}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords..."
          />
        </div>
        <p className="font-mono text-xs text-neutral-400 sm:ml-auto">
          Showing {visibleQuestions.length} of {questions.length} assigned
        </p>
      </div>

      {/* Questions Table */}
      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full min-w-[56rem] text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10 font-mono text-xs uppercase tracking-widest text-neutral-400">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Question / Clue</th>
              <th className="px-4 py-3">Set</th>
              <th className="px-4 py-3">Round</th>
              <th className="px-4 py-3">Answer / Target</th>
              <th className="px-4 py-3">Marks</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleQuestions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-neutral-400">
                  No questions match your current filters.
                </td>
              </tr>
            ) : (
              visibleQuestions.map((q, idx) => {
                // Compute question index within its set and round
                const siblings = questions.filter(
                  (item) => item.setId === q.setId && item.roundId === q.roundId,
                );
                const orderInSlot = siblings.findIndex((item) => item.id === q.id) + 1;

                return (
                  <tr
                    key={q.id}
                    className={`border-b border-white/5 align-top hover:bg-white/[0.02] ${
                      q.flaggedForReview ? "bg-amber-500/[0.04]" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-neutral-400 font-bold">
                      {orderInSlot} / {siblings.length}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-neutral-100">
                      <div className="flex items-start gap-3">
                        {/* Visual or Taboo Card Preview */}
                        {(q.imageUrl || q.cardReference) && (
                          <div className="relative shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={q.imageUrl || q.cardReference}
                              alt="Visual"
                              className="h-10 w-10 rounded-lg border border-cyan-400/40 object-cover bg-neutral-900"
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          {q.emojiClue ? (
                            <p className="text-xl font-bold tracking-wider">{q.emojiClue}</p>
                          ) : (
                            <p className="font-medium text-white">{q.text || "(No text)"}</p>
                          )}

                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {q.flaggedForReview && (
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] text-amber-300 font-bold">
                                ⚠️ Review Flagged
                              </span>
                            )}
                            {q.cardReference && (
                              <span className="rounded bg-violet-500/20 px-1.5 py-0.5 font-mono text-[10px] text-violet-300">
                                Card Attached
                              </span>
                            )}
                            {q.tabooWords && q.tabooWords.length > 0 && (
                              <span className="rounded bg-red-500/20 px-1.5 py-0.5 font-mono text-[10px] text-red-300">
                                {q.tabooWords.length} Taboo Words
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-200 font-mono text-xs font-semibold">
                      {setName(q.setId)}
                    </td>
                    <td className="px-4 py-3 text-neutral-300 font-mono text-xs">
                      {roundName(q.roundId)}
                    </td>
                    <td className="px-4 py-3 text-neutral-200">
                      {q.targetWord ? (
                        <div>
                          <span className="text-cyan-300 font-bold">{q.targetWord}</span>
                          {q.tabooWords && (
                            <p className="text-[11px] text-neutral-400 mt-0.5 truncate max-w-[14rem]">
                              Taboo: {q.tabooWords.join(", ")}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="font-semibold text-cyan-300">{q.answer || "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-cyan-300 font-mono font-bold">{q.marks}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          type="button"
                          className={smallBtn}
                          title="Move question up"
                          onClick={() => moveQuestionOrder(q.id, "up")}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={smallBtn}
                          title="Move question down"
                          onClick={() => moveQuestionOrder(q.id, "down")}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className={smallBtn}
                          onClick={() => setModal({ kind: "move", id: q.id })}
                          title="Move question to another set, round, or unassigned bank"
                        >
                          Move...
                        </button>
                        <button
                          type="button"
                          className={smallBtn}
                          onClick={() => setModal({ kind: "question", id: q.id })}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={dangerBtn}
                          onClick={() => moveQuestionToUnassigned(q.id)}
                          title="Move to reserve bank"
                        >
                          To Bank
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ---------- Section 5: Unassigned Question Bank ---------- */

  const unassignedView = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Unassigned Question Bank (Admin Reserve)
          </h2>
          <p className="text-sm text-neutral-400">
            Source questions preserved in reserve (Items 21–25 of AI Q&A, 21–30 of Emoji Clues, 21–30 of Tech Taboo).
            You can assign any item to a set or keep it here.
          </p>
        </div>
        <button
          type="button"
          className={primaryBtn}
          onClick={() =>
            setModal({
              kind: "question",
              isUnassigned: true,
            })
          }
        >
          + Add to Reserve Bank
        </button>
      </div>

      <div className={`${cardClass} overflow-x-auto`}>
        <table className="w-full min-w-[52rem] text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10 font-mono text-xs uppercase tracking-widest text-neutral-400">
              <th className="px-4 py-3">Round Category</th>
              <th className="px-4 py-3">Question / Clue</th>
              <th className="px-4 py-3">Answer / Target</th>
              <th className="px-4 py-3">Forbidden Words</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {unassignedQuestions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No reserve questions currently in bank.
                </td>
              </tr>
            ) : (
              unassignedQuestions.map((q) => (
                <tr
                  key={q.id}
                  className={`border-b border-white/5 align-top hover:bg-white/[0.02] ${
                    q.flaggedForReview ? "bg-amber-500/[0.04]" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-cyan-300 font-bold">
                    {roundName(q.roundId)}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-neutral-100">
                    <div className="flex items-start gap-2.5">
                      {(q.imageUrl || q.cardReference) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={q.imageUrl || q.cardReference}
                          alt="Card"
                          className="h-9 w-9 rounded-md border border-white/10 object-cover bg-neutral-900 shrink-0"
                        />
                      )}
                      <div>
                        {q.emojiClue ? (
                          <p className="text-xl font-bold tracking-wider">{q.emojiClue}</p>
                        ) : (
                          <p className="font-medium text-white">{q.text}</p>
                        )}
                        {q.flaggedForReview && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                            ⚠️ OCR Review
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white font-semibold">
                    {q.targetWord || q.answer}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400 font-mono">
                    {q.tabooWords && q.tabooWords.length > 0 ? (
                      <span className="text-red-300 font-medium">{q.tabooWords.join(", ")}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        className={successBtn}
                        onClick={() => setModal({ kind: "move", id: q.id, isUnassigned: true })}
                      >
                        Assign to Set...
                      </button>
                      <button
                        type="button"
                        className={smallBtn}
                        onClick={() =>
                          setModal({ kind: "question", id: q.id, isUnassigned: true })
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className={dangerBtn}
                        onClick={() => deleteQuestion(q.id, true)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  /* ---------- Section 6: OCR / Review Flagged Items ---------- */

  const reviewView = (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">
          OCR & Screenshot Text Review Center
        </h2>
        <p className="text-sm text-neutral-400">
          Rows with uncertain or cropped OCR text from screenshots are flagged here for administrative confirmation.
        </p>
      </div>

      {flaggedItems.length === 0 ? (
        <div className={`${cardClass} p-8 text-center text-emerald-300 font-mono text-sm`}>
          ✓ All cards and questions are clear! No items currently flagged for OCR review.
        </div>
      ) : (
        <div className="space-y-4">
          {flaggedItems.map((q) => (
            <div
              key={q.id}
              className="rounded-2xl border border-amber-500/40 bg-amber-500/[0.05] p-5 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300">
                    ⚠️ Review Required
                  </span>
                  <span className="font-mono text-xs text-neutral-300">
                    {q.setId === "unassigned" ? "Unassigned Bank" : setName(q.setId)} · {roundName(q.roundId)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={smallBtn}
                    onClick={() =>
                      setModal({
                        kind: "question",
                        id: q.id,
                        isUnassigned: q.setId === "unassigned",
                      })
                    }
                  >
                    Edit Card
                  </button>
                  <button
                    type="button"
                    className={successBtn}
                    onClick={() => clearFlagReview(q.id)}
                  >
                    Mark as Approved
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-mono text-xs text-neutral-400 uppercase">Target Word</p>
                  <p className="text-lg font-bold text-cyan-300">{q.targetWord || q.answer}</p>
                  <p className="font-mono text-xs text-neutral-400 uppercase mt-2">Forbidden Words</p>
                  <p className="text-sm text-red-300 font-mono">
                    {q.tabooWords?.join(", ") || "(None)"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-xs text-amber-300 uppercase font-bold">Review Note</p>
                  <p className="text-sm text-neutral-200 mt-1">
                    {q.reviewNotes || "OCR uncertain. Please verify with source screenshot."}
                  </p>
                  {q.cardReference && (
                    <div className="mt-2">
                      <p className="font-mono text-xs text-neutral-400">Card Reference:</p>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={q.cardReference}
                        alt="Card source"
                        className="mt-1 h-20 rounded border border-white/10 object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  /* ---------- Section 7: Settings & Storage ---------- */

  const settingsView = (
    <div className="max-w-2xl space-y-6">
      <div className={`${cardClass} p-5 space-y-3 border-l-4 border-l-cyan-400`}>
        <p className="font-mono text-xs uppercase tracking-widest text-cyan-300 font-bold">
          Backend & Storage Status
        </p>
        <div className="rounded-lg bg-black/40 p-3 font-mono text-xs text-neutral-300 space-y-1.5">
          <p>
            Storage mode:{" "}
            <span className="text-emerald-400 font-bold">
              Local File System (data/quiz-state.json) & Memory Store
            </span>
          </p>
          <p>
            Assigned Questions:{" "}
            <span className="text-cyan-300 font-bold">{questions.length}</span> / 60
          </p>
          <p>
            Unassigned Question Bank:{" "}
            <span className="text-violet-300 font-bold">{unassignedQuestions.length}</span> items
          </p>
          <p>
            Card / Clue Assets:{" "}
            <span className="text-emerald-400 font-bold">public/taboo/card-1.jpg..30.jpg</span>
          </p>
        </div>
      </div>

      <div className={`${cardClass} p-5 space-y-3`}>
        <h3 className="font-bold text-white text-base">Export Quiz Backup</h3>
        <p className="text-sm text-neutral-400">
          Download the entire current quiz configuration, including all 60 assigned questions and 25 unassigned items.
        </p>
        <button
          type="button"
          className={ghostBtn}
          onClick={() => {
            const dataStr =
              "data:text/json;charset=utf-8," +
              encodeURIComponent(JSON.stringify({ sets, rounds, questions, unassignedQuestions }, null, 2));
            const dl = document.createElement("a");
            dl.setAttribute("href", dataStr);
            dl.setAttribute("download", `tech-scramble-quiz-${new Date().toISOString().slice(0, 10)}.json`);
            dl.click();
          }}
        >
          Export JSON Backup
        </button>
      </div>

      <div className={`${cardClass} p-5 space-y-3 border border-red-500/20`}>
        <h3 className="font-bold text-red-300 text-base">Reset Quiz to Standard Event Setup</h3>
        <p className="text-sm text-neutral-400">
          Resets sets (Alpha, Beta, Gamma, Delta), 3 rounds, exactly 5 questions per round (60 assigned) and 25 unassigned reserve questions.
        </p>
        <button
          type="button"
          className={dangerBtn}
          onClick={resetAllToStandard}
        >
          Reset to Standard Bank
        </button>
      </div>
    </div>
  );

  /* ---------- Login Gate ---------- */

  const gate = (
    <form onSubmit={unlock} className={`${cardClass} max-w-md space-y-4 p-6 mx-auto`}>
      <h2 className="text-xl font-bold tracking-tight">Admin Access</h2>
      <p className="text-sm text-neutral-400">
        Enter the admin password to edit sets, rounds, and question banks.
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
    unassigned: `Unassigned Bank (${unassignedQuestions.length})`,
    review: `Review Center (${flaggedItems.length})`,
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
                {saveState.kind === "saved" && <span className="text-emerald-400 font-bold">✓ Saved</span>}
                {saveState.kind === "validation-blocked" && (
                  <span className="text-amber-300 font-semibold" title={saveState.message}>
                    ⚠️ 5 Qs Guard Active
                  </span>
                )}
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
            <span className="font-mono text-xs uppercase tracking-widest text-violet-300">
              Admin Portal
            </span>
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

            <nav
              className="flex flex-wrap gap-2 border-b border-white/10 pb-3"
              aria-label="Admin sections"
            >
              {(
                [
                  "overview",
                  "sets",
                  "rounds",
                  "questions",
                  "unassigned",
                  "review",
                  "settings",
                ] as Section[]
              ).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSection(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                    section === tab
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
            {section === "unassigned" && unassignedView}
            {section === "review" && reviewView}
            {section === "settings" && settingsView}
          </div>
        )}

        {renderModal()}
      </main>
    </div>
  );
}