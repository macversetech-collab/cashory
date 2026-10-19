#!/usr/bin/env python3
"""
Convert "💵 Bank Statement.numbers" into a Cashory import file.

    pip install numbers-parser
    python3 tools/import_numbers.py "💵 Bank Statement.numbers" data/cashory-import.json

What it does
- One sheet = one category. Each category lives in the bank its sheet is summed into
  on the "Banks Total" sheet (KBZ or AYA).
- A row with both Deposit and Withdraw becomes two entries (In + Out) on the same day.
  The remark goes on the Out entry (it usually names what was paid for).
- A row with no date takes the date of the row above it.
- Jar Gyi has no dates: "Jar ⭕️ for <Month>" rows are dated the 1st of that month,
  counting back from the last one (September 2026).
- Only the rows each sheet's own SUM() counts are imported (Birthday Cake starts at row 31).
- At the end it checks every category balance and both bank totals against the sheet.
"""
import json
import re
import sys
import datetime as dt
from numbers_parser import Document

# sheet name (trimmed) -> (category id, display name, account id, colour, sort, archived)
SHEETS = {
    "Showline":      ("cat_showline", "Showline",      "acc_kbz", "#B5D86A", 1, False),
    "Birthday Cake": ("cat_birthday", "Birthday Cake", "acc_kbz", "#F2D55C", 2, False),
    "Profits":       ("cat_profits",  "Profits",       "acc_kbz", "#9ED9B5", 3, False),
    "Fund":          ("cat_fund",     "Fund",          "acc_kbz", "#F4B98A", 4, False),
    "Dad&Mom":       ("cat_dadmom",   "Dad&Mom",       "acc_kbz", "#C7B4EA", 5, False),
    "😎Me":          ("cat_forme",    "For Me",        "acc_kbz", "#9CC7EE", 6, False),
    "🔴Own Account": ("cat_own",      "Own Account",   "acc_aya", "#E8A0A8", 7, False),
    "🔴JarGyi":      ("cat_jargyi",   "Jar Gyi",       "acc_aya", "#D9C27A", 8, False),
    "Distribution":  ("cat_distrib",  "Distribution",  "acc_kbz", "#C9CFB2", 9, True),
}

ACCOUNTS = [
    {"id": "acc_kbz",    "name": "KBZ",     "sort": 1, "archived": False},
    {"id": "acc_aya",    "name": "AYA",     "sort": 2, "archived": False},
    {"id": "acc_kpay",   "name": "KPay",    "sort": 3, "archived": False},
    {"id": "acc_ayapay", "name": "AYA Pay", "sort": 4, "archived": False},
    {"id": "acc_cash",   "name": "Cash",    "sort": 5, "archived": False},
]

MONTHS = ["january", "february", "march", "april", "may", "june", "july",
          "august", "september", "october", "november", "december"]


def clean_note(v):
    if v is None:
        return ""
    s = re.sub(r"\s+", " ", str(v)).strip()
    return s


def to_int(v):
    if v is None or v == "":
        return 0
    if isinstance(v, (int, float)):
        return int(round(v))
    s = str(v).replace(",", "").strip()
    return int(round(float(s))) if s else 0


def to_date(v):
    if isinstance(v, dt.datetime):
        return v.date()
    if isinstance(v, dt.date):
        return v
    return None


def sum_range(table, col):
    """Rows (0-based, inclusive) summed by the SUM() in the given column of the totals row."""
    for r in range(table.num_rows - 1, -1, -1):
        f = getattr(table.cell(r, col), "formula", None)
        if f and f.upper().startswith("SUM("):
            m = re.search(r"([A-Z]+)(\d+):([A-Z]+)(\d+)", f)
            if m:
                return int(m.group(2)) - 1, int(m.group(4)) - 1, r
    raise SystemExit(f"No SUM() found in table {table.name}")


def jar_dates(n_rows, last=(2026, 9)):
    """Dates for n monthly rows ending at `last`, 1st of each month."""
    y, m = last
    out = []
    for _ in range(n_rows):
        out.append(dt.date(y, m, 1))
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return list(reversed(out))


def main(src, dst):
    doc = Document(src)
    categories, entries, checks = [], [], []
    bank_totals = {}

    for sheet in doc.sheets:
        name = sheet.name.strip()
        if name.startswith("🏦"):
            for t in sheet.tables:
                acc = "acc_kbz" if "KBZ" in t.name else "acc_aya"
                bank_totals[acc] = to_int(t.cell(1, 0).value)
            continue
        if name not in SHEETS:
            print(f"!! sheet not mapped, skipped: {sheet.name!r}")
            continue
        cid, cname, acc, color, sort, archived = SHEETS[name]
        categories.append({"id": cid, "name": cname, "accountId": acc, "startingBalance": 0,
                           "color": color, "sort": sort, "archived": archived})
        t = sheet.tables[0]
        first, last, total_row = sum_range(t, 1)
        sheet_balance = to_int(t.cell(total_row, 1).value) - to_int(t.cell(total_row, 2).value)

        rows = list(range(first, last + 1))
        undated_jar = cid == "cat_jargyi"
        jar = jar_dates(sum(1 for r in rows if to_int(t.cell(r, 1).value) or to_int(t.cell(r, 2).value))) if undated_jar else []
        cur = None
        seq = 0
        for r in rows:
            dep = to_int(t.cell(r, 1).value)
            wd = to_int(t.cell(r, 2).value)
            if not dep and not wd:
                continue
            if undated_jar:
                note_month = clean_note(t.cell(r, 3).value).lower()
                cur = jar[seq]
                # sanity: remark month should match the date we give it
                mi = next((i for i, mn in enumerate(MONTHS) if mn in note_month), None)
                if mi is not None and mi + 1 != cur.month:
                    raise SystemExit(f"Jar Gyi row {r+1}: remark {note_month!r} vs date {cur}")
            else:
                d = to_date(t.cell(r, 0).value)
                if d:
                    cur = d
            if cur is None:
                raise SystemExit(f"{name} row {r+1}: no date above it")
            seq += 1
            note = clean_note(t.cell(r, 3).value)
            created = dt.datetime.combine(cur, dt.time(9, 0)) + dt.timedelta(seconds=r * 10)
            base = {"date": cur.isoformat(), "categoryId": cid, "accountId": acc,
                    "toCategoryId": None, "toAccountId": None}
            if dep:
                entries.append({**base, "id": f"imp-{cid[4:]}-{r+1}-in", "type": "in", "amount": dep,
                                "note": "" if wd else note,
                                "createdAt": created.isoformat() + "Z"})
            if wd:
                entries.append({**base, "id": f"imp-{cid[4:]}-{r+1}-out", "type": "out", "amount": wd,
                                "note": note,
                                "createdAt": (created + dt.timedelta(seconds=1)).isoformat() + "Z"})

        got = sum(e["amount"] if e["type"] == "in" else -e["amount"] for e in entries if e["categoryId"] == cid)
        checks.append((cname, sheet_balance, got))

    ok = True
    print(f"{'Category':<15}{'Sheet':>14}{'Imported':>14}")
    for n, want, got in checks:
        flag = "" if want == got else "   <-- MISMATCH"
        ok &= want == got
        print(f"{n:<15}{want:>14,}{got:>14,}{flag}")
    for acc, want in bank_totals.items():
        cats = {c["id"] for c in categories if c["accountId"] == acc}
        got = sum(e["amount"] if e["type"] == "in" else -e["amount"] for e in entries if e["categoryId"] in cats)
        flag = "" if want == got else "   <-- MISMATCH"
        ok &= want == got
        print(f"{acc:<15}{want:>14,}{got:>14,}{flag}")
    if not ok:
        raise SystemExit("Totals do not match the sheet — nothing written.")

    out = {"app": "cashory", "version": 1,
           "exportedAt": dt.datetime.now(dt.timezone.utc).replace(microsecond=0, tzinfo=None).isoformat() + "Z",
           "accounts": ACCOUNTS, "categories": sorted(categories, key=lambda c: c["sort"]),
           "entries": entries}
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"\nWrote {len(entries)} entries, {len(categories)} categories -> {dst}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    main(sys.argv[1], sys.argv[2])
