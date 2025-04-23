'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import { AlertCircle, FileUp, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

import { formatFileSize } from '@/lib/utils/fileUtils';

export default function DocumentUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Allowed file types
  const allowedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ];
  
  // File change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) {
      return;
    }
    
    // Check file type
    if (!allowedFileTypes.includes(selectedFile.type)) {
      setError('File type not supported. Please upload a PDF, Word, Excel, PowerPoint, or text document.');
      return;
    }
    
    // Check file size (20MB limit)
    if (selectedFile.size > 20 * 1024 * 1024) {
      setError('File size exceeds 20MB limit.');
      return;
    }
    
    setFile(selectedFile);
    
    // Auto-fill name with file name (without extension)
    if (!name) {
      const fileName = selectedFile.name.split('.').slice(0, -1).join('.');
      setName(fileName);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    
    if (!name.trim()) {
      setError('Please enter a document name.');
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', name);
      formData.append('description', description);
      
      // Upload with progress tracking using XMLHttpRequest
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(percentComplete);
        }
      });
      
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          router.push('/documents');
        } else {
          const errorData = JSON.parse(xhr.responseText);
          setError(errorData.message || 'Failed to upload document. Please try again.');
          setUploading(false);
        }
      });
      
      xhr.addEventListener('error', () => {
        setError('Network error occurred. Please try again.');
        setUploading(false);
      });
      
      xhr.open('POST', '/api/documents', true);
      xhr.send(formData);
      
    } catch (error) {
      console.error('Error uploading document:', error);
      setError('Failed to upload document. Please try again.');
      setUploading(false);
    }
  };
  
  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Check file type
      if (!allowedFileTypes.includes(droppedFile.type)) {
        setError('File type not supported. Please upload a PDF, Word, Excel, PowerPoint, or text document.');
        return;
      }
      
      // Check file size
      if (droppedFile.size > 20 * 1024 * 1024) {
        setError('File size exceeds 20MB limit.');
        return;
      }
      
      setFile(droppedFile);
      
      // Auto-fill name with file name (without extension)
      if (!name) {
        const fileName = droppedFile.name.split('.').slice(0, -1).join('.');
        setName(fileName);
      }
    }
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-6">
        {/* Error alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {/* File upload area */}
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={allowedFileTypes.join(',')}
            className="hidden"
            disabled={uploading}
          />
          
          {file ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center">
                <FileUp size={24} className="text-green-500 mr-2" />
                <span className="font-medium">{file.name}</span>
              </div>
              <p className="text-sm text-gray-500">
                {formatFileSize(file.size)}
              </p>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Change File
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <FileUp size={32} className="mx-auto text-gray-400" />
              <div>
                <p className="font-medium">Drag and drop your file here, or</p>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2"
                >
                  Browse Files
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Supports: PDF, Word, Excel, PowerPoint, Text, Markdown (Max 20MB)
              </p>
            </div>
          )}
        </div>
        
        {/* Document name */}
        <div className="space-y-2">
          <Label htmlFor="name">Document Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter document name"
            required
            disabled={uploading}
          />
        </div>
        
        {/* Document description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter document description"
            rows={3}
            disabled={uploading}
          />
        </div>
        
        {/* Upload progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} max={100} />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/documents')}
          disabled={uploading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!file || uploading}>
          {uploading ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload Document'
          )}
        </Button>
      </CardFooter>
    </form>
  );
}