#!/usr/bin/env python3
"""Validate the latest FIDO Work structural review for the current PR head.

No third-party dependencies. The script is intentionally narrow:
- reads PR reviews from GitHub REST API;
- accepts only reviews carrying the FIDO marker;
- requires the review to be for the current head SHA;
- validates the JSON contract and PASS/FAIL consistency;
- exits non-zero when the structural gate is not satisfied.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request
from typing import Any

MARKER = "<!-- FIDO_WORK_REVIEW_V1 -->"
SHA_RE = re.compile(r"^[0-9a-f]{40}$")
ID_RE = re.compile(r"^[A-Z][A-Z0-9_-]*-[0-9]{3}$")
BLOCKING_SEVERITIES = {"BLOCKER", "MAJOR"}
ALLOWED_SEVERITIES = BLOCKING_SEVERITIES | {"MINOR", "INFO"}


class GateError(RuntimeError):
    pass


def required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise GateError(f"Missing required environment variable: {name}")
    return value


def github_get(url: str, token: str) -> Any:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "fido-quality-gate",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise GateError(f"GitHub API error {exc.code}: {body}") from exc


def extract_payload(body: str) -> dict[str, Any]:
    marker_pos = body.find(MARKER)
    if marker_pos < 0:
        raise GateError("Review marker missing")
    tail = body[marker_pos + len(MARKER):].strip()
    fenced = re.search(r"```(?:json)?\s*(\{.*\})\s*```", tail, re.DOTALL)
    raw = fenced.group(1) if fenced else tail
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise GateError(f"Invalid review JSON: {exc}") from exc
    if not isinstance(payload, dict):
        raise GateError("Review payload must be a JSON object")
    return payload


def require_string(payload: dict[str, Any], key: str) -> str:
    value = payload.get(key)
    if not isinstance(value, str) or not value.strip():
        raise GateError(f"{key} must be a non-empty string")
    return value


def validate_payload(payload: dict[str, Any], expected_sha: str, review_state: str) -> None:
    allowed_top = {
        "version", "head_sha", "result", "summary", "blocking_findings", "findings"
    }
    unknown = set(payload) - allowed_top
    if unknown:
        raise GateError(f"Unknown top-level fields: {sorted(unknown)}")

    if payload.get("version") != "1":
        raise GateError("version must be '1'")

    head_sha = require_string(payload, "head_sha")
    if not SHA_RE.fullmatch(head_sha):
        raise GateError("head_sha must be a lowercase 40-character Git SHA")
    if head_sha != expected_sha:
        raise GateError(f"Stale review payload: {head_sha} != current head {expected_sha}")

    result = payload.get("result")
    if result not in {"PASS", "FAIL"}:
        raise GateError("result must be PASS or FAIL")

    require_string(payload, "summary")

    blocking = payload.get("blocking_findings")
    findings = payload.get("findings")
    if not isinstance(blocking, list) or not all(isinstance(x, str) for x in blocking):
        raise GateError("blocking_findings must be an array of finding IDs")
    if len(blocking) != len(set(blocking)):
        raise GateError("blocking_findings contains duplicate IDs")
    if not isinstance(findings, list):
        raise GateError("findings must be an array")

    finding_map: dict[str, dict[str, Any]] = {}
    allowed_finding = {
        "id", "severity", "principles", "evidence", "impact", "recommendation", "files"
    }
    for index, finding in enumerate(findings):
        if not isinstance(finding, dict):
            raise GateError(f"findings[{index}] must be an object")
        unknown_finding = set(finding) - allowed_finding
        if unknown_finding:
            raise GateError(
                f"findings[{index}] has unknown fields: {sorted(unknown_finding)}"
            )

        finding_id = require_string(finding, "id")
        if not ID_RE.fullmatch(finding_id):
            raise GateError(f"Invalid finding id: {finding_id}")
        if finding_id in finding_map:
            raise GateError(f"Duplicate finding id: {finding_id}")

        severity = finding.get("severity")
        if severity not in ALLOWED_SEVERITIES:
            raise GateError(f"Invalid severity for {finding_id}: {severity}")

        principles = finding.get("principles")
        evidence = finding.get("evidence")
        if (
            not isinstance(principles, list)
            or not principles
            or not all(isinstance(x, str) and x.strip() for x in principles)
        ):
            raise GateError(f"{finding_id}: principles must be a non-empty string array")
        if (
            not isinstance(evidence, list)
            or not evidence
            or not all(isinstance(x, str) and x.strip() for x in evidence)
        ):
            raise GateError(f"{finding_id}: evidence must be a non-empty string array")

        require_string(finding, "impact")
        require_string(finding, "recommendation")

        files = finding.get("files")
        if files is not None and (
            not isinstance(files, list)
            or not all(isinstance(x, str) and x.strip() for x in files)
        ):
            raise GateError(f"{finding_id}: files must be an array of non-empty strings")

        finding_map[finding_id] = finding

    for finding_id in blocking:
        if not ID_RE.fullmatch(finding_id):
            raise GateError(f"Invalid blocking finding id: {finding_id}")
        finding = finding_map.get(finding_id)
        if finding is None:
            raise GateError(f"Blocking finding {finding_id} is absent from findings")
        if finding["severity"] not in BLOCKING_SEVERITIES:
            raise GateError(
                f"Blocking finding {finding_id} must be BLOCKER or MAJOR"
            )

    expected_blocking = {
        finding_id
        for finding_id, finding in finding_map.items()
        if finding["severity"] in BLOCKING_SEVERITIES
    }
    if set(blocking) != expected_blocking:
        raise GateError(
            "blocking_findings must contain exactly all BLOCKER/MAJOR finding IDs"
        )

    # Work supplies evidence and judgment only. CI is the final decider, so the
    # GitHub review itself is always a neutral COMMENTED review.
    if review_state.upper() != "COMMENTED":
        raise GateError(
            f"Work review must use GitHub state COMMENTED, got {review_state}"
        )

    if result == "PASS":
        if blocking:
            raise GateError("PASS review cannot contain blocking findings")
    else:
        if not blocking:
            raise GateError("FAIL review must contain at least one BLOCKER/MAJOR finding")


def main() -> int:
    try:
        repository = required_env("GITHUB_REPOSITORY")
        token = required_env("GITHUB_TOKEN")
        pr_number = required_env("PR_NUMBER")
        head_sha = required_env("PR_HEAD_SHA").lower()

        if not SHA_RE.fullmatch(head_sha):
            raise GateError("PR_HEAD_SHA is not a valid lowercase 40-character Git SHA")

        reviews_url = (
            f"https://api.github.com/repos/{repository}/pulls/{pr_number}/reviews"
            "?per_page=100"
        )
        reviews = github_get(reviews_url, token)
        if not isinstance(reviews, list):
            raise GateError("Unexpected GitHub reviews response")

        candidates = [
            review
            for review in reviews
            if isinstance(review, dict)
            and isinstance(review.get("body"), str)
            and MARKER in review["body"]
        ]
        if not candidates:
            raise GateError(
                "No FIDO Work structural review found for this pull request"
            )

        # GitHub returns reviews oldest-first. The newest marker review anchored to
        # the current head is authoritative. Never fall back to an older current-head
        # review when the newest one is malformed or dismissed.
        stale_seen = False
        current_review: dict[str, Any] | None = None
        for review in reversed(candidates):
            commit_id = str(review.get("commit_id") or "").lower()
            if commit_id == head_sha:
                current_review = review
                break
            stale_seen = True

        if current_review is None:
            if stale_seen:
                raise GateError(
                    "Only stale Work reviews exist; a new review is required for current head "
                    + head_sha
                )
            raise GateError("No Work review is anchored to the current PR head")

        payload = extract_payload(current_review["body"])
        validate_payload(
            payload, head_sha, str(current_review.get("state") or "")
        )

        print(
            json.dumps(
                {
                    "status": "PASS" if payload["result"] == "PASS" else "FAIL",
                    "review_id": current_review.get("id"),
                    "reviewer": (current_review.get("user") or {}).get("login"),
                    "head_sha": head_sha,
                    "summary": payload["summary"],
                    "blocking_findings": payload["blocking_findings"],
                },
                ensure_ascii=False,
            )
        )

        if payload["result"] == "FAIL":
            raise GateError(
                "Structural review failed: "
                + ", ".join(payload["blocking_findings"])
            )
        return 0
    except GateError as exc:
        print(f"QUALITY GATE FAIL: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
