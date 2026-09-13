"""Sealed PDF of the terms a seller agreed to.

The PDF is generated from the terms text stored on the agreement at the moment
of acceptance, so the document can always be reproduced byte for byte and
checked against the stored SHA-256 hash.
"""
from __future__ import annotations

from io import BytesIO

from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    KeepTogether,
)

INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#6B7280")
RULE = colors.HexColor("#D1D5DB")

_H1 = ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=INK)
_META = ParagraphStyle("meta", fontName="Helvetica", fontSize=8.5, leading=12, textColor=MUTED)
_LABEL = ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=7.5, leading=10, textColor=MUTED)
_VALUE = ParagraphStyle("value", fontName="Helvetica", fontSize=9, leading=12, textColor=INK)
_H2 = ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=9.5, leading=13, textColor=INK,
                     spaceBefore=8, spaceAfter=2)
_BODY = ParagraphStyle("body", fontName="Helvetica", fontSize=8.5, leading=12.5, textColor=INK,
                       alignment=TA_JUSTIFY, spaceAfter=4)
_BOXH = ParagraphStyle("boxh", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=INK)
_BOXB = ParagraphStyle("boxb", fontName="Helvetica", fontSize=8.5, leading=12.5, textColor=INK,
                       alignment=TA_JUSTIFY, spaceAfter=4)


def _esc(text: str) -> str:
    return (text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def _kv_table(rows: list[tuple[str, str]], width: float) -> Table:
    data = [[Paragraph(_esc(k).upper(), _LABEL), Paragraph(_esc(v or "-"), _VALUE)] for k, v in rows]
    t = Table(data, colWidths=[42 * mm, width - 42 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.4, RULE),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def build_agreement_pdf(*, brand_label: str, seller_name: str, seller_email: str,
                        address: str, agent_label: str, reference: str,
                        accepted_label: str, ip: str, device: str,
                        fee_due_label: str, fee_summary: list[tuple[str, str]],
                        terms_label: str, clauses: list[dict],
                        payment_section: dict, terms_sha256: str) -> bytes:
    """Render the signed terms as a flat, print-clean A4 PDF."""
    buf = BytesIO()
    page_w, page_h = A4
    margin = 18 * mm
    frame_w = page_w - 2 * margin

    doc = BaseDocTemplate(buf, pagesize=A4, title=f"Signed Home Insight Survey Terms — {reference}",
                          author="Gazeal Surveys", subject=terms_label,
                          leftMargin=margin, rightMargin=margin,
                          topMargin=margin, bottomMargin=16 * mm)

    def footer(canvas, _doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7)
        canvas.setFillColor(MUTED)
        canvas.drawString(margin, 10 * mm,
                          f"{brand_label} · Reference {reference} · {terms_label}")
        canvas.drawRightString(page_w - margin, 10 * mm, f"Page {canvas.getPageNumber()}")
        canvas.restoreState()

    frame = Frame(margin, 16 * mm, frame_w, page_h - margin - 16 * mm, id="body",
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=footer)])

    story: list = [
        Paragraph("Signed Home Insight Survey Service Terms", _H1),
        Spacer(1, 3),
        Paragraph(f"{_esc(brand_label)} &nbsp;·&nbsp; {_esc(terms_label)}", _META),
        Spacer(1, 10),
        _kv_table([
            ("Seller", seller_name),
            ("Seller email", seller_email),
            ("Property", address),
            ("Arranged by", agent_label),
            ("Reference", reference),
        ], frame_w),
        Spacer(1, 10),
        Paragraph("Acceptance record", _H2),
        _kv_table([
            ("Accepted", accepted_label),
            ("IP address", ip or "unknown"),
            ("Device", device or "unknown"),
            ("Fee payable by", fee_due_label),
        ], frame_w),
    ]

    if fee_summary:
        story += [Spacer(1, 8), Paragraph("Property and fee as confirmed by the seller", _H2),
                  _kv_table(fee_summary, frame_w)]

    # Payment box — highlighted, reproduced in full.
    box_inner = [Paragraph(_esc(payment_section["title"]), _BOXH), Spacer(1, 4)]
    for p in payment_section["paragraphs"]:
        box_inner.append(Paragraph(_esc(p), _BOXB))
    box = Table([[box_inner]], colWidths=[frame_w])
    box.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.9, INK),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F3F4F6")),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story += [Spacer(1, 12), KeepTogether(box), Spacer(1, 14),
              Paragraph("The terms accepted", _H2)]

    for c in clauses:
        block = [Paragraph(f"{_esc(c['no'])} &nbsp; {_esc(c['title'])}", _H2)]
        for p in c["paragraphs"]:
            block.append(Paragraph(_esc(p), _BODY))
        story.append(KeepTogether(block) if len(c["paragraphs"]) == 1 else block[0])
        if len(c["paragraphs"]) > 1:
            story.extend(block[1:])

    story += [
        Spacer(1, 12),
        Paragraph(
            "By accepting online, the seller confirmed they had read and agreed to these "
            f"terms ({_esc(terms_label)}), that the property details above were correct, "
            "and that they understood when the survey fee becomes payable.", _BODY),
        Spacer(1, 6),
        Paragraph(f"Integrity check (SHA-256 of the terms text): {terms_sha256}", _META),
    ]

    doc.build(story)
    return buf.getvalue()
