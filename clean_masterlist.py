import openpyxl
import csv
import os

# ── File paths ──
INPUT_FILE = r"C:\Users\compa\Downloads\Enrollment With Promotional Report_SY2026-2027_1st Semester_Enrollment_1_25_black (1) (1).xlsx"
OUTPUT_FILE = r"C:\Users\compa\OneDrive\Desktop\students_master_v3.csv"

# ── Department name mapping → exact values used in the DB ──
DEPT_MAP = {
    "college of business education":           "College of Business Education (CBE)",
    "college of computer studies":             "College of Computer Studies (CCS)",
    "criminal justice education":              "College of Criminal Justice Education (CCJE)",
    "college of criminal justice education":   "College of Criminal Justice Education (CCJE)",
    "college of teacher education":            "College of Teacher Education (CTE)",
    "psychology":                              "Psychology (PSYCH)",
    "psychology program":                      "Psychology (PSYCH)",
}

def map_department(raw):
    if not raw:
        return "UNKNOWN"
    key = str(raw).strip().lower()
    for k, v in DEPT_MAP.items():
        if k in key:
            return v
    return str(raw).strip()  # keep original if no match found

def fix_student_id(raw):
    """Keep the full student ID as-is, just clean whitespace and decimals"""
    s = str(raw).strip()
    # Remove decimal if Excel stored as float (e.g. 20250003173.0 → 20250003173)
    if "." in s:
        s = s.split(".")[0]
    return s

def split_name(full_name):
    """Split 'LASTNAME, FIRSTNAME MIDDLE' into (first_name, last_name)"""
    if not full_name:
        return "", ""
    full_name = str(full_name).strip()
    if "," in full_name:
        parts = full_name.split(",", 1)
        last_name = parts[0].strip().title()
        first_parts = parts[1].strip().split()
        # First word after comma = first name, rest = middle name (we skip middle)
        first_name = first_parts[0].title() if first_parts else ""
    else:
        # No comma — treat whole thing as last name
        last_name = full_name.title()
        first_name = ""
    return first_name, last_name

# ── Read Excel ──
print(f"Reading: {INPUT_FILE}")
wb = openpyxl.load_workbook(INPUT_FILE, data_only=True)
ws = wb.active

rows_written = 0
skipped = 0
seen_ids = set()

with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f)
    writer.writerow(["student_id", "first_name", "last_name", "department", "year_level"])

    for row in ws.iter_rows(values_only=True):
        # Column B = Student No (index 1), C = Name (2), F = Department (5), G = Year (6)
        raw_id   = row[1]   # Column B
        raw_name = row[2]   # Column C
        raw_dept = row[5]   # Column F
        raw_year = row[7]   # Column H (actual year level number)

        # Skip rows without a student number
        if not raw_id:
            skipped += 1
            continue

        # Skip header rows (student ID should be numeric-ish)
        student_id_str = str(raw_id).strip()
        if not student_id_str[0].isdigit():
            skipped += 1
            continue

        student_id = fix_student_id(raw_id)
        first_name, last_name = split_name(raw_name)
        department = map_department(raw_dept)

        # Year level — convert number to text
        year_map = {"1": "1st Year", "2": "2nd Year", "3": "3rd Year", "4": "4th Year", "5": "5th Year"}
        year_level = year_map.get(str(raw_year).strip().split(".")[0], str(raw_year).strip() if raw_year else "")

        # Skip duplicates
        if student_id in seen_ids:
            skipped += 1
            continue
        seen_ids.add(student_id)

        writer.writerow([student_id, first_name, last_name, department, year_level])
        rows_written += 1

print(f"\n✅ Done!")
print(f"   Students written : {rows_written}")
print(f"   Rows skipped     : {skipped}")
print(f"   Output saved to  : {OUTPUT_FILE}")
