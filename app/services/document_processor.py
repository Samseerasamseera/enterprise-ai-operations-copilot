
from io import BytesIO

from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter


MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=150,
    length_function=len,
)


def extract_text(filename: str, content: bytes) -> str:
    suffix = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if suffix == "pdf":
        reader = PdfReader(BytesIO(content))

        if reader.is_encrypted:
            raise ValueError("Password-protected PDFs are not supported.")

        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    elif suffix == "txt":
        text = content.decode("utf-8-sig")
    else:
        raise ValueError("Only PDF and TXT files are supported.")

    if not text.strip():
        raise ValueError(
            "No readable text found. Scanned PDFs require OCR."
        )

    return text


def split_text(text: str) -> list[str]:
    return text_splitter.split_text(text)
