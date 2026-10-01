#!/usr/bin/env python3
"""Fail CI unless the current PR head has a valid FIDO Work structural PASS."""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from typing import Any

MARKER = "<!-- FIDO_WORK_REVIEW_V1 -->"
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
ID_RE = re.compile(r"^[A-Z][A-Z0-9_-]*-[0-9]{3}$")
BLOCKING = {"BLOCKER", "MAJOR"}
SEVERITIES = BLOCKING | {"MINOR", "INFO"}


class GateError(RuntimeError):
    pass


def env(name: str, default: str = "") -> str:
    value = os.getenv(name, default).strip()
    if not value and not default:
        raise GateError(f"Missing environment variable: {name}")
    return value


def github_reviews(repo: str, pr: str, token: str) -> list[dict[str, Any]]:
    url = f"https://api.github.com/repos/{repo}/pulls/{pr}/reviews?per_page=100"
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "fido-quality-gate",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.load(response)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise GateError(f"GitHub API {exc.code}: {detail}") from exc
    if not isinstance(data, list):
        raise GateError("Unexpected GitHub reviews response")
    return data


def current_review(reviews: list[dict[str, Any]], head: str) -> tuple[dict[str, Any] | None, bool]:
    marked = [r for r in reviews if MARKER in str(r.get("body") or "")]
    stale = False
    for review in reversed(marked):
        if str(review.get("commit_id") or "").lower() == head:
            return review, stale
        stale = True
    return None, stale


def payload_from(body: str) -> dict[str, Any]:
    tail = body.split(MARKER, 1)[1].strip()
    match = re.search(r"```(?:json)?\s*(\{.*\})\s*```", tail, re.DOTALL)
    raw = match.group(1) if match else tail
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise GateError(f"Invalid review JSON: {exc}") from exc
    if not isinstance(payload, dict):
        raise GateError("Review payload must be a JSON object")
    return payload


def nonempty(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise GateError(f"{label} must be a non-empty string")
    return value


def validate(payload: dict[str, Any], head: str, state: str) -> None:
    required = {"version", "head_sha", "result", "summary", "blocking_findings", "findings"}
    if set(payload) != required:
        raise GateError(f"Review fields must be exactly {sorted(required)}")
    if payload["version"] != "1":
        raise GateError("version must be '1'")
    if payload["head_sha"] != head or not SHA_RE.fullmatch(str(payload["head_sha"])):
        raise GateError("Review head_sha is invalid or stale")
    if payload["result"] not in {"PASS", "FAIL"}:
        raise GateError("result must be PASS or FAIL")
    nonempty(payload["summary"], "summary")
    if state.upper() != "COMMENTED":
        raise GateError(f"Work review must be COMMENTED, got {state}")

    ids = payload["blocking_findings"]
    findings = payload["findings"]
    if not isinstance(ids, list) or len(ids) != len(set(ids)):
        raise GateError("blocking_findings must be a unique array")
    if not isinstance(findings, list):
        raise GateError("findings must be an array")

    finding_map: dict[str, dict[str, Any]] = {}
    allowed = {"id", "severity", "principles", "evidence", "impact", "recommendation", "files"}
    required_finding = {"id", "severity", "principles", "evidence", "impact", "recommendation"}
    for finding in findings:
        if not isinstance(finding, dict) or not required_finding <= set(finding):
            raise GateError(
                "Each finding must contain id, severity, principles, evidence, impact, recommendation"
            )
        if set(finding) - allowed:
            raise GateError(f"Unknown finding fields: {sorted(set(finding) - allowed)}")
        fid = nonempty(finding["id"], "finding.id")
        if not ID_RE.fullmatch(fid) or fid in finding_map:
            raise GateError(f"Invalid or duplicate finding id: {fid}")
        if finding["severity"] not in SEVERITIES:
            raise GateError(f"Invalid severity for {fid}")
        for key in ("principles", "evidence"):
            values = finding[key]
            if not isinstance(values, list) or not values or not all(
                isinstance(v, str) and v.strip() for v in values
            ):
                raise GateError(f"{fid}.{key} must be a non-empty string array")
        if "files" in finding:
            files = finding["files"]
            if not isinstance(files, list) or not all(
                isinstance(v, str) and v.strip() for v in files
            ):
                raise GateError(f"{fid}.files must be a string array")
        nonempty(finding["impact"], f"{fid}.impact")
        nonempty(finding["recommendation"], f"{fid}.recommendation")
        finding_map[fid] = finding

    expected = {fid for fid, finding in finding_map.items() if finding["severity"] in BLOCKING}
    if set(ids) != expected:
        raise GateError("blocking_findings must equal all BLOCKER/MAJOR finding IDs")
    if payload["result"] == "PASS" and expected:
        raise GateError("PASS cannot contain BLOCKER/MAJOR findings")
    if payload["result"] == "FAIL" and not expected:
        raise GateError("FAIL requires a BLOCKER/MAJOR finding")


def main() -> int:
    try:
        repo, token, pr = env("GITHUB_REPOSITORY"), env("GITHUB_TOKEN"), env("PR_NUMBER")
        head = env("PR_HEAD_SHA").lower()
        if not SHA_RE.fullmatch(head):
            raise GateError("PR_HEAD_SHA must be a lowercase 40-character SHA")
        wait = max(0, int(env("WORK_REVIEW_WAIT_SECONDS", "0")))
        poll = max(5, int(env("WORK_REVIEW_POLL_SECONDS", "15")))
        deadline = time.monotonic() + wait
        review: dict[str, Any] | None = None
        stale = False
        while review is None:
            review, stale = current_review(github_reviews(repo, pr, token), head)
            if review is not None:
                break
            if time.monotonic() >= deadline:
                reason = "Only stale Work reviews exist" if stale else "No Work review found"
                raise GateError(f"{reason} for current head {head}")
            print(f"Waiting for Work review for {head}; retry in {poll}s", flush=True)
            time.sleep(poll)

        payload = payload_from(str(review.get("body") or ""))
        validate(payload, head, str(review.get("state") or ""))
        print(json.dumps({
            "result": payload["result"],
            "review_id": review.get("id"),
            "reviewer": (review.get("user") or {}).get("login"),
            "head_sha": head,
            "summary": payload["summary"],
            "blocking_findings": payload["blocking_findings"],
        }, ensure_ascii=False))
        if payload["result"] == "FAIL":
            raise GateError("Structural review failed: " + ", ".join(payload["blocking_findings"]))
        return 0
    except (GateError, ValueError) as exc:
        print(f"QUALITY GATE FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
