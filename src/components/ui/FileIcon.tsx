import { FileText, FileSpreadsheet, FileImage, File } from "lucide-react";

export function getFileIcon(fileType?: string) {
  switch (fileType?.toUpperCase()) {
    case "PDF": return <FileText className="w-5 h-5 text-red-500" />;
    case "DOC": case "DOCX": return <FileText className="w-5 h-5 text-blue-500" />;
    case "XLS": case "XLSX": return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
    case "IMG": case "PNG": case "JPG": case "JPEG": return <FileImage className="w-5 h-5 text-purple-500" />;
    default: return <File className="w-5 h-5 text-slate-400" />;
  }
}
