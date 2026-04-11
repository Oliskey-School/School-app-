import React from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, Loader2 } from 'lucide-react';
import { SchoolProfile, InspectionSchema } from '../../types/inspector';

interface Props {
  school: SchoolProfile;
  type: string;
  responses: Record<string, any>;
  photos: Record<string, string[]>;
  inspectorName: string;
  signatureInspector: string | null;
  signatureSchool: string | null;
  overallRating: string;
}

export const PDFReportBuilder: React.FC<Props> = ({
  school,
  type,
  responses,
  photos,
  inspectorName,
  signatureInspector,
  signatureSchool,
  overallRating
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    try {
      // 1. COVER PAGE
      doc.setFillColor(15, 23, 42); // Slate-900
      doc.rect(0, 0, pageWidth, 60, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('OFFICIAL INSPECTION REPORT', pageWidth / 2, 35, { align: 'center' });
      
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(32);
      doc.text(school.name.toUpperCase(), pageWidth / 2, 90, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`Inspection Type: ${type}`, pageWidth / 2, 105, { align: 'center' });
      doc.text(`Date of Inspection: ${new Date().toLocaleDateString()}`, pageWidth / 2, 115, { align: 'center' });
      
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, 130, pageWidth - margin, 130);
      
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('EXECUTIVE SUMMARY', margin, 150);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Institutional Rating: ${overallRating}`, margin, 160);
      doc.text(`Lead Inspector: ${inspectorName}`, margin, 170);
      doc.text(`School Location: ${school.lga || 'N/A'}, Lagos State`, margin, 180);
      
      // 2. DETAILED FINDINGS TABLE
      doc.addPage();
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('DETAILED EVALUATIONS', margin, 20);
      
      const tableData = Object.entries(responses).map(([fieldId, value]) => {
        // Here we ideally want labels, but for brevity using ID
        return [fieldId, typeof value === 'boolean' ? (value ? 'YES / PASS' : 'NO / FAIL') : String(value)];
      });
      
      autoTable(doc, {
        startY: 30,
        head: [['EVALUATION PARAMETER', 'OBSERVATION']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        styles: { fontSize: 10, cellPadding: 5 }
      });
      
      // 3. SIP ITEMS (FAILURES)
      const failures = Object.entries(responses).filter(([_, v]) => v === false);
      if (failures.length > 0) {
        doc.addPage();
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('SCHOOL IMPROVEMENT PLAN (REQUIRED ACTIONS)', margin, 20);
        
        const sipData = failures.map(([id]) => [
          id, 
          'Corrective action required. Re-evaluate during follow-through.', 
          '30 Days'
        ]);
        
        autoTable(doc, {
          startY: 30,
          head: [['DEFICIENCY', 'RECOMMENDED ACTION', 'DEADLINE']],
          body: sipData,
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38] }
        });
      }
      
      // 4. SIGNATURES
      const finalY = (doc as any).lastAutoTable.finalY + 30;
      doc.addPage();
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('AUTHORIZATION & CERTIFICATION', margin, 20);
      
      if (signatureInspector) {
        doc.addImage(signatureInspector, 'PNG', margin, 40, 60, 30);
        doc.setFontSize(10);
        doc.text('__________________________', margin, 75);
        doc.text('Inspector Signature', margin, 80);
      }
      
      if (signatureSchool) {
        doc.addImage(signatureSchool, 'PNG', pageWidth - margin - 60, 40, 60, 30);
        doc.setFontSize(10);
        doc.text('__________________________', pageWidth - margin - 60, 75);
        doc.text('Principal Signature', pageWidth - margin - 60, 80);
      }
      
      // Save
      doc.save(`Inspection_Report_${school.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating || !signatureInspector || !signatureSchool}
      className={`
        px-10 py-5 rounded-[2rem] font-black text-xl transition-all shadow-2xl flex items-center gap-3
        ${isGenerating ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-900 border-4 border-slate-100 hover:bg-slate-50 hover:scale-105 active:scale-95'}
      `}
    >
      {isGenerating ? (
        <Loader2 className="w-6 h-6 animate-spin" />
      ) : (
        <FileDown className="w-6 h-6 text-indigo-600" />
      )}
      <span>{isGenerating ? 'Generating PDF...' : 'Download Full PDF Report'}</span>
    </button>
  );
};
