import React from 'react';
import { renderToString } from 'react-dom/server';
import LetterForm from './components/LetterForm';
import LetterPreview from './components/LetterPreview';

const mockCompany = 'Petro South';
const mockFormData = {
  recipient: 'Test Recipient',
  subject: 'Test Subject',
  refNumber: 'PS-2026-06-101',
  date: '2026-06-13',
  body: 'This is a test body paragraph.\nAnd a second paragraph.',
  includeStamp: true,
  signatoryName: 'Test Name',
  signatoryTitle: 'Test Title',
  bodyFontSize: 15,
  lineHeight: 1.8,
  paragraphSpacing: 16,
  signatureMarginTop: 40,
  headerX: 380,
  headerY: 800
};
const mockQuotationData = {
  clientName: 'Test Client',
  clientAddress: 'Test Address',
  rfqNumber: 'RFQ-123',
  validity: '30 days',
  paymentTerms: '50/50',
  notes: 'Some notes',
  currency: 'USD',
  discountValue: 10,
  discountType: 'percent',
  items: [
    { id: '1', description: 'Item 1', qty: 2, price: 100 }
  ]
};

function runTest() {
  console.log('--- RENDERING IN LETTER MODE ---');
  try {
    const formHtmlLetter = renderToString(
      <LetterForm 
        company={mockCompany}
        formData={mockFormData}
        setFormData={() => {}}
        onExportPDF={() => {}}
        mode="letter"
        setMode={() => {}}
        quotationData={mockQuotationData}
        setQuotationData={() => {}}
      />
    );
    console.log('LetterForm (Letter mode) rendered successfully. Length:', formHtmlLetter.length);
    console.log('Contains "الموقع المعتمد":', formHtmlLetter.includes('الموقع المعتمد'));
    console.log('Contains "ضبط موقع الترويسة":', formHtmlLetter.includes('ضبط موقع الترويسة'));

    const previewHtmlLetter = renderToString(
      <LetterPreview 
        company={mockCompany}
        formData={mockFormData}
        mode="letter"
        quotationData={mockQuotationData}
      />
    );
    console.log('LetterPreview (Letter mode) rendered successfully. Length:', previewHtmlLetter.length);
  } catch (err) {
    console.error('CRASH in Letter Mode:', err);
  }

  console.log('\n--- RENDERING IN QUOTATION MODE ---');
  try {
    const formHtmlQuotation = renderToString(
      <LetterForm 
        company={mockCompany}
        formData={mockFormData}
        setFormData={() => {}}
        onExportPDF={() => {}}
        mode="quotation"
        setMode={() => {}}
        quotationData={mockQuotationData}
        setQuotationData={() => {}}
      />
    );
    console.log('LetterForm (Quotation mode) rendered successfully. Length:', formHtmlQuotation.length);
    console.log('Contains "الموقع المعتمد":', formHtmlQuotation.includes('الموقع المعتمد'));
    console.log('Contains "ضبط موقع الترويسة":', formHtmlQuotation.includes('ضبط موقع الترويسة'));

    const previewHtmlQuotation = renderToString(
      <LetterPreview 
        company={mockCompany}
        formData={mockFormData}
        mode="quotation"
        quotationData={mockQuotationData}
      />
    );
    console.log('LetterPreview (Quotation mode) rendered successfully. Length:', previewHtmlQuotation.length);
  } catch (err) {
    console.error('CRASH in Quotation Mode:', err);
  }
}

runTest();
