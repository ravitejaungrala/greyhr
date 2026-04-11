import base64
import os

def parse_base64_with_meta(b64_string: str):
    ext = ".jpg"
    mime = "image/jpeg"
    if ',' in b64_string:
        header, b64_string = b64_string.split(',', 1)
        if 'image/png' in header: ext = ".png"; mime = "image/png"
        elif 'image/jpeg' in header or 'image/jpg' in header: ext = ".jpg"; mime = "image/jpeg"
        elif 'application/pdf' in header: ext = ".pdf"; mime = "application/pdf"
    try:
        data = base64.b64decode(b64_string)
        if data.startswith(b'%PDF-'): ext = ".pdf"; mime = "application/pdf"
        elif data.startswith(b'\x89PNG\r\n\x1a\n'): ext = ".png"; mime = "image/png"
        elif data.startswith(b'\xff\xd8\xff'): ext = ".jpg"; mime = "image/jpeg"
        return data, ext, mime
    except:
        return base64.b64decode(b64_string), ext, mime

# Test 1: PDF Simulation
pdf_b64 = "data:application/pdf;base64,JVBERi0xLjQKJ...(simulated)" # Simplified
# Real PDF magic bytes start: JVBERi0
pdf_b64_real = "data:application/pdf;base64,JVBERi0xLjUKJSDi48fN"
data, ext, mime = parse_base64_with_meta(pdf_b64_real)
print(f"PDF Test: ext={ext}, mime={mime}, starts_with_pdf_header={data.startswith(b'%PDF-')}")

# Test 2: JPEG Simulation
jpg_b64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD"
data, ext, mime = parse_base64_with_meta(jpg_b64)
print(f"JPG Test: ext={ext}, mime={mime}, starts_with_jpg_header={data.startswith(b'\xff\xd8\xff')}")

# Test 3: Mismatched PNG (Saved as JPGEG header but PNG data)
png_b64_mismatched = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
data, ext, mime = parse_base64_with_meta(png_b64_mismatched)
print(f"Mismatched PNG Test: ext={ext}, mime={mime}, starts_with_png_header={data.startswith(b'\x89PNG')}")
