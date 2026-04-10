import zipfile
import xml.etree.ElementTree as ET
import sys
import os

def read_docx(file_path):
    try:
        with zipfile.ZipFile(file_path) as docx:
            xml_content = docx.read('word/document.xml')
        tree = ET.fromstring(xml_content)
        
        namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        
        text = []
        for paragraph in tree.findall('.//w:p', namespaces):
            para_text = []
            for run in paragraph.findall('.//w:r', namespaces):
                t = run.find('.//w:t', namespaces)
                if t is not None and t.text:
                    para_text.append(t.text)
            text.append(''.join(para_text))
        
        return '\n'.join(text)
    except Exception as e:
        return f"Error reading {file_path}: {str(e)}"

if __name__ == '__main__':
    output_file = sys.argv[1]
    input_files = sys.argv[2:]
    
    with open(output_file, 'w', encoding='utf-8') as out:
        for f in input_files:
            out.write(f"\n\n{'='*40}\nFILE: {os.path.basename(f)}\n{'='*40}\n\n")
            out.write(read_docx(f))
