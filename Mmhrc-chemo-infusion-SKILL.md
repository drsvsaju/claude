---
name: mmhrc-chemo-infusion-template
description: "Generate an MMHRC Dept of Medical Oncology chemotherapy infusion/administration order-sheet PDF from a drug regimen's name, dose(s) and schedule; cross-checks premedication and infusion parameters against standard oncology references before building."
---

# MMHRC Chemotherapy Infusion Order-Sheet Generator

Use this skill whenever Saju gives a chemo regimen (drug name(s), dose(s), route, schedule/days) and wants the department's standard infusion/administration order-sheet PDF — the same house format used for "Carboplatin 5-FU" and "Mitomycin C 5-FU". Trigger phrases: "create a template for <regimen>", "generate the chemo chart/order sheet for <regimen>", "make an infusion sheet for <drug>".

## 0. Gather the regimen (ask only what's missing)

For each drug in the regimen, you need: name, dose expression (mg/m², mg/kg, AUC, or flat dose), route, diluent + volume, infusion duration, which day(s) of the cycle it is given, and any absolute/cap dose. For the cycle, you need the day(s) chemo drugs are administered (this decides how many DATE/CYCLE NO/DAY blocks the sheet needs) and the regimen's overall name for the title.

If the user gives an incomplete spec (e.g. no diluent volume or infusion duration), do NOT leave it blank or guess silently — look it up (step 1) and state what you used.

## 1. Cross-verify against standard references BEFORE building

This is a patient-safety step, not paperwork — do it for every new regimen, even ones that look familiar. Use WebSearch to confirm current guidance (protocols get revised); do not rely purely on memory for infusion parameters.

For each drug, check:
- **Standard diluent, volume and infusion duration/rate** against recognized references: BC Cancer Agency Cancer Drug Manual, eviQ, Lexicomp/Micromedex, or the manufacturer's current SmPC/package insert. If what the user specified matches standard practice, proceed silently. If it diverges meaningfully (e.g. a vesicant specified as rapid push, an infusion duration well outside the usual range), flag it to Saju and ask for confirmation rather than silently changing a physician-specified parameter — dosing and administration decisions are his, not the skill's.
- **Vesicant/irritant status.** If a drug in the regimen is a vesicant (e.g. Mitomycin C, anthracyclines, vinca alkaloids), add a short caution line under that drug's entry (e.g. "Vesicant — administer via free-flowing IV line; extravasation precautions") and, when the regimen has multiple IV drugs on the same day, sequence the vesicant first per standard practice.
- **Absolute/cap doses.** Carry forward known caps (e.g. Mitomycin C capped near 20mg absolute dose, vincristine capped at 2mg) into the drug line, as the user did for Mitomycin C.
- **Emetogenic risk and premedication**, per the MASCC/ESMO Antiemetic Guideline (check current version) applied to the combined regimen for that day, not each drug in isolation:
  - High emetogenic risk (HEC) → 5-HT3 antagonist + dexamethasone + NK1 antagonist. House convention: "Inj. RANTAC 50mg + Inj. EMESET 8mg + Inj. DEXA 8mg in 100ml NS over 1 hour" + "Inj. FOSA / AKYNZEO ___mg in 100ml NS over 30 minutes OR APRECAP KIT D1/D2/D3".
  - Moderate/low emetogenic risk (MEC/LEC) → 5-HT3 antagonist + dexamethasone, no routine NK1. House convention: "Inj. RANTAC 50mg + Inj. EMESET 8mg + Inj. DEXA 8mg in 100ml NS over 1 hour" + "APRECAP KIT D1/D2/D3".
  - Minimal emetogenic risk → no routine antiemetic prophylaxis; note this to Saju rather than defaulting to the standard block.
  State which emetogenic category you assigned and why, briefly, in your reply (not on the PDF).
- **Febrile-neutropenia risk** for the regimen (per ASCO/EORTC/ESMO myeloid growth factor guidance): include the G-CSF line ("Inj. NEUKINE 300mic OR Inj. PEGSTIM 6mg S/C") only if risk is intermediate/high, or if Saju asks for it; otherwise ask or omit and say why.
- Note explicitly if any parameter you used was extrapolated from a Western-population source rather than Indian/Asian data, per Saju's standing preference — only when it's material to the administration parameters, not routinely.

## 2. Map the schedule to day-blocks

One DATE/CYCLE NO/DAY block per administration day in the cycle (e.g. "Day 1 only" → 1 block; "Days 1–4" → 4 blocks; "Days 1, 8, 15 q28 days" → 3 blocks labeled by their day number). Each block has a PREMED table (per step 1) and a CHEMO DRUGS table listing only the drugs actually given that day, in bold, with the numeric dose left blank as "________mg" (or the appropriate unit) for the treating physician to fill in per the patient's actual BSA/AUC/weight on the day — never pre-calculate or fill in an absolute dose yourself.

## 3. Standard sections (keep identical to house template unless told otherwise)

- **Patient info grid**: Name / Age / Sex / Hosp No / Height / Weight / BSA / ECHO / EF / Prechemo Blood Test: Normal/Abnormal / Chemotherapy Consent: Yes/No.
- **POST CHEMO MEDICATIONS**: Tab. PAN 40mg (before food) 1–0–0 x5 days; Tab. EMESET 8mg (before food) 1–1–1 x5 days; Tab. Perinorm SOS (5 tabs); G-CSF line per step 1.
- **WBC checking Date / Review Date / Blood Tests to be done on next review date.**
- **Sign-off block**: Dr Honey Susan Raju – Consultant, Dr Saju S V – Sr Consultant, Dr Krishnakumar Rathnam – Sr Consultant & HOD — unless Saju names different signatories for a given sheet.

## 4. Build the PDF

Use WeasyPrint with the Carlito font (Calibri-metric-compatible; install via `apt-get install -y fonts-crosextra-carlito` if not already present, and `pip install weasyprint --break-system-packages` if missing) and the MMHRC logo embedded below. Do not re-derive the CSS from scratch — reuse the template below, only substituting the day-block content, title, and post-chemo rows.

Save the script to the scratchpad, run it to produce the PDF, then rasterize with `pdftoppm -png -r 150` and visually Read the resulting page image(s) to confirm: table borders intact, no block split awkwardly across a page break, blanks/underscores present where doses should be handwritten, and the header/logo repeats on every page. Only then deliver via SendUserFile, named "<Regimen Name> Chemo Order Template.pdf".

```python
# build_chemo_template.py
# Usage: fill DAY_BLOCKS, POST_CHEMO_ROWS, REGIMEN_TITLE, SIGNATORIES below, then run.

LOGO_B64 = "iVBORw0KGgoAAAANSUhEUgAAAWgAAABMCAMAAAB3cd1zAAADAFBMVEX8//7///j//v3//v//+f///Pz///z0///////9////+/n/+P//+v/x//79/f/6//6nFiP/9//++//9//z2//z4/PWXICz2/Pr//f/3///ar6v//+/5//z2/vr3/v//+vv4/ff++fXPIhj//fj//vTOkIf++PD/9/aUKCv5+v3/9vv+/vr7+/rTHhfs//z+/v78/vv+9fL/9P7NjYb+9Pfasqv5/P789/74+fXUHB7aHBfGVFzx+vLx/f3+/PH///Tz+vry//jJIBf6//jGJhqdMzHjzcXw/vTl/vv+8u/+7vHXIx72//G+Hyf+6ub69/nn0c2cIiP+8frq+/nIWWDcGiP+8OakHhyvEyKKJx7RISn29fDx9/r+9ej74dzmxrypIyf75tuuHxXq/vK4IBmwHCaaGhinGBK3KSqtTlHQKibLkorIGBbcqqiaSknFJyrXmZqEKC/+7v26KBns2Nn4+u2KNTT61NafKjCOIR730Mu6Fhu9cm/syMzcFRuNVFOpKyKhZmP+4+rHHSjVopbtzLrHmpba/vj27+v7293nuq2OGBvlpKO/h4isR0Trur6OP0KRIiyaDhf38/pzQD7MqaeiWFHq9Om2WFTQiI7z4+H3wbnburzDMi7AkZV8HB+vNDnLhHuoPkOHSUfOtbN6MzH6/+vu/+ngv7OUKh742c64aF7AaW+adHNyKCisb3GteXnuwMeNaWrw6eb/+ufIoaLn+uz+6PTAPkCOXl20MiZmNTK/SUb7ycvt39atKTLCDA3ehoWtl5J6DxNpHR68fYPor7XkxbXVx8WpXmP87NjQbG1wTEqeKR6aGy/Ld3bTERSfPDGwhIHXj5Hh/u7qnKL9/uPlICW7WmdVJyTvrKTy+eX74cy3Ch67fGzjko/yta/QwrbeLSmqChD4tsO0opvPFSjnERPu18Ls7e/VfYPc3tKKChOwjolxYFvj6txcERG1raC/k3+agXz38tXU1cTaXlrkdXSbi4fAuarVSVfZalTXNjuCe3C6wbeJlIJShKn0AAAgAElEQVR42pyX/W8T5x3Az8Q+22f7bj77ODu170WX2TnfyT5fzeW22WDvxGJShiFRiaKYpgM0FXWJFhQalYVtbFWhiGREES2rUFo0GLCNJgi1kybt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"

REGIMEN_TITLE = "Mitomycin C 5-FU"  # matches the regimen name printed under the header

# One entry per administration day. Each PREMED/CHEMO block is a list of lines;
# use <b>...</b> for bold drug names and a blank underscore span for the
# physician-filled dose. Do NOT pre-fill an actual mg value.
BLANK = '<span class="blank"></span>'

DAY_BLOCKS = [
    {
        "premed": "Inj. RANTAC 50mg + Inj. EMESET 8mg + Inj. DEXA 8mg in 100ml NS over 1 hour<br>APRECAP KIT D1/D2/D3",
        "chemo": f"<b>Inj. MITOMYCIN C</b> {BLANK} mg IV bolus over 5&ndash;10 minutes (Max 20mg absolute dose)<br><br><b>Inj. 5-FU</b> {BLANK} mg in 500ml NS IV infusion over 4 hours",
    },
    {
        "premed": "Inj. RANTAC 50mg + Inj. EMESET 8mg + Inj. DEXA 8mg in 100ml NS over 1 hour<br>APRECAP KIT D1/D2/D3",
        "chemo": f"<b>Inj. 5-FU</b> {BLANK} mg in 500ml NS IV infusion over 4 hours",
    },
    # repeat/duplicate dicts above for each further administration day
]

POST_CHEMO_ROWS = [
    # (num, drug_html, freq_or_None, duration_or_None) ; use colspan when freq/duration are None
    ("1", "Tab. PAN 40mg (before food)", "1 &ndash; 0 &ndash; 0", "x 5 days"),
    ("2", "Tab. EMESET 8mg (before food)", "1 &ndash; 1 &ndash; 1", "x 5 days"),
    ("3", "Tab. Perinorm SOS (5 tabs)", None, None),
    ("4", f'Inj. NEUKINE 300mic <b>OR</b> Inj. PEGSTIM 6mg S/C {BLANK}, {BLANK}, {BLANK}', None, None),
]

SIGNATORIES = [
    ("Dr Honey Susan Raju", "Consultant"),
    ("Dr Saju S V", "Sr Consultant"),
    ("Dr Krishnakumar Rathnam", "Sr Consultant &amp; HOD"),
]

# ---------------------------------------------------------------------------

def day_block_html(block):
    return f'''
<div class="daterow">DATE : <span class="blank blank-med"></span> &nbsp; CYCLE NO : <span class="blank blank-med"></span> &nbsp; DAY : <span class="blank blank-med"></span></div>

<table class="med">
<tr><td class="num"></td><td class="label">PREMED</td><td class="sign">PG/MO sign</td></tr>
<tr><td class="num">1</td><td>{block["premed"]}</td><td class="signcell"></td></tr>
</table>

<table class="med">
<tr><td class="num"></td><td class="label">CHEMO DRUGS</td><td class="sign">PG/MO sign</td></tr>
<tr><td class="num">2</td><td>{block["chemo"]}</td><td class="signcell"></td></tr>
</table>
'''

def post_chemo_row_html(row):
    num, drug, freq, dur = row
    if freq is None and dur is None:
        return f'<tr><td class="num">{num}</td><td class="drug" colspan="3">{drug}</td></tr>'
    return f'<tr><td class="num">{num}</td><td class="drug">{drug}</td><td class="freq">{freq}</td><td class="dur">{dur}</td></tr>'

days_html = "".join(day_block_html(b) for b in DAY_BLOCKS)
post_rows_html = "".join(post_chemo_row_html(r) for r in POST_CHEMO_ROWS)
sign_html = "".join(
    f'<td><div class="name">{n}</div><div>{d}</div></td>' for n, d in SIGNATORIES
)

HTML_DOC = f'''<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page {{
  size: A4; margin: 20mm 18mm 18mm 18mm;
  @top-center {{ content: element(pageheader); }}
  @bottom-right {{ content: counter(page); font-family: Carlito, sans-serif; font-size: 10pt; }}
}}
* {{ box-sizing: border-box; }}
body {{ font-family: Carlito, "Liberation Sans", sans-serif; font-size: 10.5pt; color: #000; line-height: 1.25; }}
#pageheader {{ position: running(pageheader); width: 100%; }}
.headerwrap {{ display: table; width: 100%; margin-bottom: 2mm; }}
.headertext {{ display: table-cell; vertical-align: middle; text-align: center; font-weight: bold; font-size: 11pt; width: 68%; }}
.headertext div {{ margin: 0; }}
.headerlogo {{ display: table-cell; vertical-align: middle; text-align: right; width: 32%; }}
.headerlogo img {{ height: 13mm; }}
.title {{ text-align: center; font-weight: bold; font-size: 12pt; margin: 1mm 0 4mm 0; }}
table.patient {{ width: 100%; border-collapse: collapse; margin-bottom: 4mm; }}
table.patient td {{ border: 0.75pt solid #000; padding: 1.3mm 2mm; vertical-align: top; }}
table.patient td.bold {{ font-weight: bold; }}
table.patient col.c1 {{ width: 46%; }} table.patient col.c2 {{ width: 22%; }} table.patient col.c3 {{ width: 32%; }}
.daterow {{ margin: 3mm 0 1.5mm 0; font-size: 10.5pt; }}
.blank {{ display: inline-block; border-bottom: 0.75pt solid #000; width: 20mm; height: 3.6mm; }}
.blank-med {{ width: 26mm; }}
table.med {{ width: 100%; border-collapse: collapse; margin-bottom: 3mm; }}
table.med td {{ border: 0.75pt solid #000; padding: 1.3mm 2mm; vertical-align: top; }}
table.med td.num {{ width: 5%; }} table.med td.label {{ width: 78%; }} table.med td.sign {{ width: 17%; }}
table.post {{ width: 100%; border-collapse: collapse; margin-top: 5mm; margin-bottom: 3mm; }}
table.post td {{ border: 0.75pt solid #000; padding: 1.3mm 2mm; vertical-align: top; }}
table.post td.num {{ width: 5%; }} table.post td.drug {{ width: 45%; }} table.post td.freq {{ width: 25%; }} table.post td.dur {{ width: 25%; }}
table.post td.header {{ font-weight: bold; }}
table.wbc {{ width: 100%; border-collapse: collapse; margin-top: 5mm; margin-bottom: 6mm; }}
table.wbc td {{ border: 0.75pt solid #000; padding: 1.3mm 2mm; font-weight: bold; vertical-align: top; }}
table.wbc td.w50 {{ width: 50%; }}
table.sign {{ width: 100%; margin-top: 10mm; border-collapse: collapse; }}
table.sign td {{ width: 33.33%; font-weight: bold; vertical-align: top; padding: 0 2mm; }}
table.sign .name {{ margin-bottom: 1mm; }}
.block-avoid {{ page-break-inside: avoid; }}
</style></head><body>

<div id="pageheader">
  <div class="headerwrap">
    <div class="headertext">
      <div>Dept of Medical Oncology, Hemato-Oncology, Pediatric Oncology &amp; BMT</div>
      <div>Meenakshi Mission Hospital &amp; Research Centre, Madurai</div>
    </div>
    <div class="headerlogo"><img src="data:image/png;base64,{LOGO_B64}"></div>
  </div>
</div>

<div class="title">{REGIMEN_TITLE}</div>

<table class="patient">
<colgroup><col class="c1"><col class="c2"><col class="c3"></colgroup>
<tr><td>Name:</td><td>Age:</td><td>Sex:</td></tr>
<tr><td>Hosp No:</td><td rowspan="2">Height:<br>Weight:<br><br><br>BSA:</td><td class="bold">Prechemo Blood Test: Normal / Abnormal</td></tr>
<tr><td>ECHO&nbsp;:<br>EF&nbsp;&nbsp;&nbsp;&nbsp;:</td><td class="bold">Chemotherapy Consent: Yes / No</td></tr>
</table>

{days_html}

<table class="post block-avoid">
<tr><td class="num header"></td><td class="header" colspan="3">POST CHEMO MEDICATIONS</td></tr>
{post_rows_html}
</table>

<table class="wbc block-avoid">
<tr><td class="w50">WBC checking Date:</td><td class="w50">Review Date:</td></tr>
<tr><td colspan="2">Blood Tests to be done on next review date:</td></tr>
</table>

<table class="sign block-avoid"><tr>{sign_html}</tr></table>

</body></html>
'''

with open('template.html', 'w') as f:
    f.write(HTML_DOC)

from weasyprint import HTML
out_name = f"{REGIMEN_TITLE}.pdf"
HTML('template.html').write_pdf(out_name)
print('Wrote', out_name)
```

## 5. Delivery

After the visual QA pass in step 4, deliver the PDF via SendUserFile. In your reply to Saju, state in one or two lines: which emetogenic-risk category you assigned the regimen and why, any vesicant/sequencing caution added, and any parameter you flagged as non-standard versus what he specified (if any) — do not repeat the whole regimen back to him, he can see the PDF.