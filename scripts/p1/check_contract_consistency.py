#!/usr/bin/env python3
"""Static consistency gate for ERD v2, canonical baseline SQL and RFC4180 Data Dictionary."""
from __future__ import annotations
import csv
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ERD = ROOT / "docs/refactor-v2/target/erd-v2-approved.mmd"
SQL = ROOT / "backend/src/main/resources/db/migration/V1__fido_target_schema.sql"
DICT = ROOT / "docs/refactor-v2/p1/P1-data-dictionary.csv"


def close_paren(text, start):
    depth, quote, escaped = 0, None, False
    i = start
    while i < len(text):
        ch = text[i]
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                if i + 1 < len(text) and text[i + 1] == quote:
                    i += 1
                else:
                    quote = None
        elif ch in ("'", '"', chr(96)):
            quote = ch
        elif ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise ValueError("Unclosed parenthesis")


def split_fields(body):
    out, start, depth, quote, escaped = [], 0, 0, None, False
    i = 0
    while i < len(body):
        ch = body[i]
        if quote:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == quote:
                if i + 1 < len(body) and body[i + 1] == quote:
                    i += 1
                else:
                    quote = None
        elif ch in ("'", '"', chr(96)):
            quote = ch
        elif ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        elif ch == "," and depth == 0:
            out.append(body[start:i].strip())
            start = i + 1
        i += 1
    if body[start:].strip():
        out.append(body[start:].strip())
    return out


def parse_sql(text):
    tables, constraints, order = {}, {}, []
    pattern = re.compile(r"\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_]+)\s*\(", re.I)
    for match in pattern.finditer(text):
        table = match.group(1).lower()
        op = match.start() + match.group(0).rfind("(")
        end = close_paren(text, op)
        parts = split_fields(text[op + 1:end])
        columns, constraint_parts = {}, []
        for part in parts:
            if re.match(r"^(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|KEY|INDEX)\b", part, re.I):
                constraint_parts.append(part)
                continue
            cm = re.match(r"^\s*(?:\x60)?([A-Za-z0-9_]+)(?:\x60)?\s+([A-Za-z]+(?:\s*\([^)]*\))?)", part, re.I)
            if not cm:
                continue
            name = cm.group(1).lower()
            typ = re.sub(r"\s+", "", cm.group(2)).upper()
            default = "AUTO_INCREMENT" if re.search(r"\bAUTO_INCREMENT\b", part, re.I) else "NONE"
            if default == "NONE":
                dm = re.search(r"\bDEFAULT\s+('(?:''|[^'])*'|CURRENT_TIMESTAMP(?:\(\d+\))?|NULL|TRUE|FALSE|-?\d+(?:\.\d+)?)", part, re.I)
                if dm:
                    default = dm.group(1)
            generated = ""
            gm = re.search(r"\bGENERATED\s+ALWAYS\s+AS\s*\(", part, re.I)
            if gm:
                po = part.find("(", gm.start())
                generated = part[po + 1:close_paren(part, po)]
            columns[name] = {
                "type": typ,
                "base": re.match(r"[A-Z]+", typ).group(0),
                "nullable": "NULL" if not re.search(r"\bNOT\s+NULL\b", part, re.I) else "NOT NULL",
                "default": default,
                "generated": generated,
            }
        tables[table] = columns
        constraints[table] = constraint_parts
        order.append(table)
    named = set()
    for parts in constraints.values():
        for part in parts:
            nm = re.match(r"^CONSTRAINT\s+([A-Za-z0-9_]+)\s+", part, re.I)
            if nm:
                named.add(nm.group(1))
    indexes = {}
    unique_index_columns = set()
    ip = re.compile(r"\bCREATE\s+(UNIQUE\s+)?INDEX\s+([A-Za-z0-9_]+)\s+ON\s+([A-Za-z0-9_]+)\s*\(([^)]+)\)", re.I)
    for m in ip.finditer(text):
        table = m.group(3).lower()
        for item in m.group(4).split(","):
            col = re.sub(r"[\x60\"]", "", item.strip()).split()[0].lower()
            key = (table, col)
            indexes.setdefault(key, []).append(m.group(2))
            if m.group(1):
                unique_index_columns.add(key)
    evidence = {}
    for table, parts in constraints.items():
        for part in parts:
            nm = re.match(r"^CONSTRAINT\s+([A-Za-z0-9_]+)\s+", part, re.I)
            label = nm.group(1) if nm else part.split()[0] + "_unnamed"
            for col in local_constraint_columns(part, tables[table].keys()):
                evidence.setdefault((table, col), []).append(label)
    return tables, named, order, indexes, evidence, constraints, unique_index_columns



def local_constraint_columns(part, table_columns):
    """Resolve local constrained columns only, excluding FK parent columns."""
    key_match = re.search(
        r"\b(?:PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE(?:\s+KEY)?)\s*\(([^)]*)\)",
        part,
        re.I,
    )
    if key_match:
        requested = [
            token.strip().strip(chr(96)).strip('"').lower()
            for token in key_match.group(1).split(",")
        ]
        return [column for column in requested if column in table_columns]
    check_match = re.search(r"\bCHECK\s*\(", part, re.I)
    if check_match:
        open_at = part.find("(", check_match.start())
        expression = part[open_at + 1:close_paren(part, open_at)]
        return [
            column for column in table_columns
            if re.search(r"(?<![A-Za-z0-9_])" + re.escape(column) + r"(?![A-Za-z0-9_])", expression, re.I)
        ]
    return []


def parse_erd(text):
    result, current = {}, None
    for line in text.splitlines():
        tm = re.match(r"^\s*([A-Z][A-Z0-9_]*)\s*\{\s*$", line)
        if tm:
            current = tm.group(1).lower()
            result[current] = {}
            continue
        if current is None:
            continue
        if re.match(r"^\s*\}\s*$", line):
            current = None
            continue
        fm = re.match(r"^\s*([A-Za-z]+(?:\([^)]*\))?)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(.*?)\s*$", line)
        if fm:
            typ = fm.group(1).upper()
            result[current][fm.group(2).lower()] = {
                "type": typ,
                "base": re.match(r"[A-Z]+", typ).group(0),
                "annotations": sorted(set(re.findall(r"\b(PK|FK|UK)\b", fm.group(3).upper()))),
            }
    return result


def norm(value):
    return re.sub(r"\s+", " ", (value or "").strip()).upper()


def main():
    issues = []
    erd = parse_erd(ERD.read_text(encoding="utf-8"))
    sql_text = SQL.read_text(encoding="utf-8")
    sql, named_constraints, create_order, indexes, evidence, sql_constraints, unique_index_columns = parse_sql(sql_text)
    with DICT.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, strict=True)
        rows = list(reader)
        headers = reader.fieldnames or []

    required = {
        "table", "column", "sql_type_proposal", "physical_sql_nullability",
        "physical_sql_default", "generated_expression",
        "current_implementation_status", "current_implementation_evidence",
        "related_constraint_index",
    }
    if required - set(headers):
        issues.append("Dictionary missing headers: " + ", ".join(sorted(required - set(headers))))
    if len(sql) != len(erd):
        issues.append("SQL table count is " + str(len(sql)) + "; canonical ERD table count is " + str(len(erd)))
    if set(erd) != set(sql):
        issues.append("ERD/SQL table set differs: ERD-only=" + repr(sorted(set(erd) - set(sql))) + ", SQL-only=" + repr(sorted(set(sql) - set(erd))))

    dictionary = {}
    for line, row in enumerate(rows, 2):
        key = ((row.get("table") or "").strip().lower(), (row.get("column") or "").strip().lower())
        if not all(key):
            issues.append("Blank table/column in dictionary line " + str(line))
        elif key in dictionary:
            issues.append("Duplicate dictionary field " + key[0] + "." + key[1])
        dictionary[key] = row

    sql_keys = {(t, c) for t, cols in sql.items() for c in cols}
    erd_keys = {(t, c) for t, cols in erd.items() for c in cols}
    dict_keys = set(dictionary)
    for t, c in sorted(sql_keys - dict_keys):
        issues.append("SQL field missing from dictionary: " + t + "." + c)
    for t, c in sorted(dict_keys - sql_keys):
        issues.append("Dictionary field absent from SQL: " + t + "." + c)
    for t, c in sorted(sql_keys & dict_keys):
        ddl, row = sql[t][c], dictionary[(t, c)]
        if norm(row.get("sql_type_proposal")) != norm(ddl["type"]):
            issues.append("Type mismatch " + t + "." + c + ": SQL=" + ddl["type"] + "; dictionary=" + str(row.get("sql_type_proposal")))
        if norm(row.get("physical_sql_nullability")) != norm(ddl["nullable"]):
            issues.append("Nullability mismatch " + t + "." + c)
        if norm(row.get("physical_sql_default")) != norm(ddl["default"]):
            issues.append("Default mismatch " + t + "." + c)
        if norm(row.get("generated_expression")) != norm(ddl["generated"]):
            issues.append("Generated expression mismatch " + t + "." + c)
        if c not in erd.get(t, {}):
            if not ddl["generated"] or row.get("current_implementation_status") != "DATABASE_GENERATED_NOT_ENTITY_MAPPED":
                issues.append("Undocumented SQL-only column " + t + "." + c)
        elif erd[t][c]["base"] != ddl["base"]:
            issues.append("ERD/SQL logical type mismatch " + t + "." + c + ": ERD=" + erd[t][c]["type"] + "; SQL=" + ddl["type"])
    for t, cols in erd.items():
        for c in cols:
            if c not in sql.get(t, {}):
                issues.append("ERD field absent from SQL: " + t + "." + c)

    money = {
        "selling_price", "cost_price", "discount_value", "minimum_order_value",
        "maximum_discount", "subtotal", "discount_amount", "shipping_fee",
        "total_amount", "unit_price", "unit_cost", "line_total", "amount",
        "refund_amount", "discount_value_snapshot", "discount_amount_snapshot",
    }
    for t, cols in sql.items():
        for c in money & set(cols):
            if cols[c]["base"] != "BIGINT":
                issues.append("VND field not BIGINT: " + t + "." + c + " (" + cols[c]["type"] + ")")

    normalized = re.sub(r"\s+", " ", SQL.read_text(encoding="utf-8").lower())
    critical = {
        "active phone unique": "unique (phone_active_key)",
        "receipt warehouse FK": "foreign key (warehouse_id) references warehouses (id)",
        "inventory composite PK": "primary key (warehouse_id, product_id)",
        "attribute option ownership": "foreign key (option_id, attribute_id) references attribute_options (id, attribute_id)",
        "nonnegative stock": "check (quantity_on_hand >= 0)",
        "unique order/ledger idempotency": "unique (idempotency_key)",
        "voucher usage count": "ck_vouchers_usage_count",
        "refund metadata": "ck_payments_refund_metadata",
        "order amount reconciliation": "total_amount = subtotal - discount_amount + shipping_fee",
    }
    for label, fragment in critical.items():
        if fragment not in normalized:
            issues.append("Missing critical constraint: " + label)
    if "warehouses" not in create_order or "goods_receipts" not in create_order or create_order.index("warehouses") > create_order.index("goods_receipts"):
        issues.append("WAREHOUSES must be created before GOODS_RECEIPTS")

    # Check that every ERD PK/FK/UK marker maps to a physical SQL constraint.
    for table, fields in erd.items():
        for column, field in fields.items():
            for annotation in field.get("annotations", []):
                keyword = {
                    "PK": re.compile(r"\bPRIMARY\s+KEY\b", re.I),
                    "FK": re.compile(r"\bFOREIGN\s+KEY\b", re.I),
                    "UK": re.compile(r"\bUNIQUE\b", re.I),
                }[annotation]
                physical_match = any(
                    keyword.search(part)
                    and column in local_constraint_columns(part, sql.get(table, {}).keys())
                    for part in sql_constraints.get(table, [])
                )
                if annotation == "UK" and (table, column) in unique_index_columns:
                    physical_match = True
                if not physical_match:
                    issues.append(
                        "ERD key annotation has no matching SQL constraint: "
                        + table + "." + column + " (" + annotation + ")"
                    )

    # Verify each dictionary row's own constraint/index evidence.
    for table, column in sorted(sql_keys & dict_keys):
        row = dictionary[(table, column)]
        expected_labels = set(evidence.get((table, column), []))
        expected_labels.update(indexes.get((table, column), []))
        expected_labels = sorted(expected_labels)
        observed_labels = sorted({
            label.strip()
            for label in re.split(r"[;,]\s*", row.get("related_constraint_index") or "")
            if label.strip() and label.strip() != "NONE"
        })
        if expected_labels != observed_labels:
            issues.append(
                "Constraint/index evidence mismatch " + table + "." + column
                + ": SQL=" + repr(expected_labels)
                + "; Dictionary=" + repr(observed_labels)
            )


    dict_constraint_names = {
        item
        for row in rows
        for item in re.split(r"[;,]\s*", row.get("related_constraint_index") or "")
        if item and item != "NONE"
    }
    for name in sorted(named_constraints - dict_constraint_names):
        issues.append("Named SQL constraint absent from dictionary evidence: " + name)

    print("ERD tables=" + str(len(erd)) + "; SQL tables=" + str(len(sql)) +
          "; ERD fields=" + str(len(erd_keys)) + "; SQL columns=" + str(len(sql_keys)) +
          "; Dictionary rows=" + str(len(dict_keys)))
    print("Named constraints=" + str(len(named_constraints)) + "; standalone indexes=" + str(len(indexes)))
    if issues:
        for issue in issues:
            print("FAIL: " + issue, file=sys.stderr)
        print("Contract consistency FAILED: " + str(len(issues)) + " finding(s).", file=sys.stderr)
        return 1
    print("Contract consistency PASS (static only; MySQL runtime and application behavior are not proven).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
