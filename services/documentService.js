const { Document, Packer, Paragraph, TextRun, ImageRun, TableOfContents, HeadingLevel, PageBreak, AlignmentType } = require('docx');
const fs = require('fs');
const path = require('path');
const os = require('os');

function formatIlksanTextToDocx(rawText) {
  const lines = rawText.split('\n');
  const paragraphs = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === '[TANIM]' || trimmed === '[İŞLEMLER]') continue;

    if (trimmed.toLowerCase().includes('yapılabilecek işlemler:')) {
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: 'Yapılabilecek işlemler:', bold: true, font: 'Calibri', size: 22, color: '222222' })],
        spacing: { before: 180, after: 100 }
      }));
      continue;
    }
    
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      const content = trimmed.replace(/^[\*\-]\s*/, '');
      const parts = content.split(/(\*\*.*?\*\*)/g);
      const isSubItem = trimmed.startsWith('- ');
      
      const runs = parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return new TextRun({ text: part.slice(2, -2), bold: true, font: 'Calibri', size: 21, color: '222222' });
        }
        return new TextRun({ text: part, font: 'Calibri', size: 21, color: '333333' });
      });

      paragraphs.push(new Paragraph({ 
        children: runs, 
        bullet: { level: isSubItem ? 1 : 0 }, 
        spacing: { before: isSubItem ? 40 : 80, after: isSubItem ? 40 : 80 } 
      }));
      continue;
    }

    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: trimmed, font: 'Calibri', size: 21, color: '333333' })],
      spacing: { before: 100, after: 140 },
      alignment: AlignmentType.JUSTIFIED
    }));
  }
  return paragraphs;
}

async function generateDocx(capturedScreens) {
  const docParagraphs = [
    new Paragraph({
      children: [new TextRun({ text: 'SİSTEM KULLANIM KILAVUZU', bold: true, size: 32, font: 'Calibri', color: '8B0000' })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 300 }
    }),
    new Paragraph({ text: 'İçindekiler', heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 150 } }),
    // İçindekiler tablosunu Heading 1 ve 2'yi alacak şekilde ayarlıyoruz
    new TableOfContents("İçindekiler Tablosu", { hyperlink: true, headingStyleRange: "1-2" }),
    new Paragraph({ children: [new PageBreak()] })
  ];

  let currentModule = "";
  let moduleIndex = 0; // YENİ: Ana modül sayacı (1, 2, 3...)
  let subIndex = 1;    // Alt ekran sayacı (1.1, 1.2, 1.3...)

  capturedScreens.forEach((item) => {
    const imgBuffer = fs.readFileSync(item.imagePath);
    const moduleName = item.moduleName || "Genel İşlemler";

    // 1. ANA MODÜL KONTROLÜ (Örn: 1- AİDAT Modülü)
    if (moduleName !== currentModule) {
      moduleIndex++; // Ana başlık sayacını 1 artır
      subIndex = 1;  // Alt başlık sayacını sıfırla
      
      docParagraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: `${moduleIndex}- ${moduleName}`, bold: true, size: 28, font: 'Calibri', color: '1F4E79' })],
          spacing: { before: 400, after: 200 }
        })
      );
      currentModule = moduleName;
    }

    // 2. EKRAN BAŞLIĞI KONTROLÜ (Örn: 1.1. Aidat Liste)
    docParagraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2, 
        children: [new TextRun({ text: `${moduleIndex}.${subIndex}. ${item.title}`, bold: true, size: 24, font: 'Calibri', color: '2E75B6' })],
        spacing: { before: 200, after: 150 }
      }),
      new Paragraph({
        children: [new ImageRun({ data: imgBuffer, type: 'png', transformation: { width: 580, height: 330 } })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      ...formatIlksanTextToDocx(item.description)
    );
    
    subIndex++; // Alt başlık numarasını bir sonraki ekran için artır
  });

  const doc = new Document({
    features: { updateFields: true },
    styles: { default: { document: { run: { font: 'Calibri', size: 21, color: '333333' } } } },
    sections: [{
      properties: { page: { margin: { top: 1200, bottom: 1200, left: 1400, right: 1400 } } },
      children: docParagraphs
    }]
  });

  const fileBuffer = await Packer.toBuffer(doc);
  const desktopPath = path.join(os.homedir(), 'Desktop');
  
  const now = new Date();
  const timeTag = `${now.getHours().toString().padStart(2, '0')}-${now.getMinutes().toString().padStart(2, '0')}-${now.getSeconds().toString().padStart(2, '0')}`;
  
  const fileName = `Arayuzle_Uretilen_Kilavuz_${timeTag}.docx`;
  const outputPath = path.join(desktopPath, fileName);
  
  fs.writeFileSync(outputPath, fileBuffer);
  return fileName; 
}

module.exports = { generateDocx };