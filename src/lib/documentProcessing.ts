import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { Document, Packer, Paragraph, TextRun } from 'docx';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const imageToPdf = async (imageFile: File): Promise<Blob> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  const imageBytes = await imageFile.arrayBuffer();
  let image;
  if (imageFile.type === 'image/jpeg' || imageFile.type === 'image/jpg') {
    image = await pdfDoc.embedJpg(imageBytes);
  } else if (imageFile.type === 'image/png') {
    image = await pdfDoc.embedPng(imageBytes);
  } else {
    throw new Error('Unsupported image format');
  }

  const dims = image.scaleToFit(width - 40, height - 40);
  page.drawImage(image, {
    x: page.getWidth() / 2 - dims.width / 2,
    y: page.getHeight() / 2 - dims.height / 2,
    width: dims.width,
    height: dims.height,
  });

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

export const pdfToText = async (pdfFile: File): Promise<string> => {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  
  return fullText;
};

export const pdfToWord = async (pdfFile: File): Promise<Blob> => {
  const text = await pdfToText(pdfFile);
  const paragraphs = text.split('\n\n').map(p => new Paragraph({
    children: [new TextRun(p)]
  }));
  const doc = new Document({
    sections: [{
      properties: {},
      children: paragraphs
    }]
  });
  return await Packer.toBlob(doc);
};

export const wordToPdf = async (wordFile: File): Promise<Blob> => {
  const arrayBuffer = await wordFile.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  const text = result.value;

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  const pages = text.match(/[\s\S]{1,4000}/g) || ['']; // Simple chunking
  
  for (const chunk of pages) {
    const page = pdfDoc.addPage();
    page.drawText(chunk, {
      x: 50,
      y: page.getHeight() - 50,
      size: 12,
      font,
      maxWidth: page.getWidth() - 100,
      lineHeight: 14
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

export const mergePdfs = async (pdfFiles: File[]): Promise<Blob> => {
  const mergedPdf = await PDFDocument.create();
  for (const file of pdfFiles) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

export const splitPdf = async (pdfFile: File, startPage: number, endPage: number): Promise<Blob> => {
  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const newPdf = await PDFDocument.create();
  
  const start = Math.max(0, startPage - 1);
  const end = Math.min(pdf.getPageCount() - 1, endPage - 1);
  
  const indices = [];
  for (let i = start; i <= end; i++) indices.push(i);
  
  const copiedPages = await newPdf.copyPages(pdf, indices);
  copiedPages.forEach((page) => newPdf.addPage(page));
  
  const pdfBytes = await newPdf.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
};

