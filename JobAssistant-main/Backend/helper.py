import io
import pypdf
import docx


class Helper:

    @staticmethod
    def parse_resume_text(file_bytes: bytes, mimetype: str) -> str:
        if mimetype == "application/pdf":
            return Helper._parse_pdf(file_bytes)
        elif mimetype == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
            return Helper._parse_docx(file_bytes)
        raise ValueError(f"Unsupported mimetype: {mimetype}")

    @staticmethod
    def _parse_pdf(file_bytes: bytes) -> str:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        return "\n".join(
            t for page in reader.pages if (t := page.extract_text())
        )

    @staticmethod
    def _parse_docx(file_bytes: bytes) -> str:
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs if p.text)
