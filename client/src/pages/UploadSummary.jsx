import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notesAPI, aiAPI } from '../services/api';
import {
  DocumentArrowUpIcon,
  DocumentTextIcon,
  SparklesIcon,
  ClipboardDocumentIcon,
  BookmarkIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const UploadSummary = () => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [summary, setSummary] = useState('');
  const [bullets, setBullets] = useState([]);
  const [currentStep, setCurrentStep] = useState('upload'); // upload, extract, summarize, save
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mutations
  const uploadPDFMutation = useMutation({
    mutationFn: notesAPI.uploadPDF,
    onSuccess: (response) => {
      setExtractedText(response.data.extractedText || '');
      setCurrentStep('extract');
      setLoading(false);
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to extract text from PDF');
      setLoading(false);
    }
  });

  const summarizeMutation = useMutation({
    mutationFn: aiAPI.summarize,
    onSuccess: (response) => {
      setSummary(response.data.summary || '');
      setBullets(response.data.bullets || []);
      setCurrentStep('summarize');
      setLoading(false);
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to generate summary');
      setLoading(false);
    }
  });

  const saveNoteMutation = useMutation({
    mutationFn: notesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      setCurrentStep('save');
      setLoading(false);
    },
    onError: (error) => {
      setError(error.response?.data?.message || 'Failed to save note');
      setLoading(false);
    }
  });

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setError('');
    } else {
      setError('Please select a valid PDF file');
      setSelectedFile(null);
    }
  };

  const handleUploadAndExtract = async () => {
    if (!selectedFile) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError('');
    uploadPDFMutation.mutate(selectedFile);
  };

  const handleSummarize = async () => {
    if (!extractedText.trim()) {
      setError('No text to summarize');
      return;
    }

    setLoading(true);
    setError('');
    summarizeMutation.mutate(extractedText);
  };

  const handleSaveAsNote = async () => {
    if (!summary.trim()) {
      setError('No summary to save');
      return;
    }

    setLoading(true);
    setError('');
    
    const noteData = {
      title: `Summary: ${selectedFile?.name?.replace('.pdf', '') || 'PDF Document'}`,
      content: `## Summary\n\n${summary}\n\n## Key Points\n\n${(bullets || []).map(bullet => `- ${bullet}`).join('\n')}\n\n## Original Text\n\n${extractedText}`,
    };

    saveNoteMutation.mutate(noteData);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const resetForm = () => {
    setSelectedFile(null);
    setExtractedText('');
    setSummary('');
    setBullets([]);
    setCurrentStep('upload');
    setError('');
    setLoading(false);
  };

  return (
    <div className="page-container">
      <h1 className="section-title">AI Text Summarizer</h1>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center space-x-4">
          {['upload', 'extract', 'summarize', 'save'].map((step, index) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === step 
                  ? 'bg-primary-600 text-white' 
                  : index < ['upload', 'extract', 'summarize', 'save'].indexOf(currentStep)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {index + 1}
              </div>
              {index < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  index < ['upload', 'extract', 'summarize', 'save'].indexOf(currentStep)
                    ? 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}></div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-2 space-x-8 text-sm text-gray-600 dark:text-gray-400">
          <span>Upload PDF</span>
          <span>Extract Text</span>
          <span>Generate Summary</span>
          <span>Save Note</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          {/* File Upload */}
          {currentStep === 'upload' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Upload PDF File
              </h2>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors duration-200">
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="btn-primary inline-flex items-center">
                      <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
                      Choose PDF File
                    </span>
                  </label>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".pdf"
                    className="sr-only"
                    onChange={handleFileSelect}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  PDF files only, max 10MB
                </p>
                {selectedFile && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              <button
                onClick={handleUploadAndExtract}
                disabled={!selectedFile || loading}
                className="btn-primary w-full mt-4 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Extracting Text...
                  </>
                ) : (
                  <>
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    Extract Text
                  </>
                )}
              </button>
            </div>
          )}

          {/* Extracted Text */}
          {currentStep === 'extract' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Extracted Text
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {extractedText?.length || 0} characters extracted
                  </span>
                  <button
                    onClick={() => copyToClipboard(extractedText)}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm flex items-center"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                    Copy
                  </button>
                </div>
                <textarea
                  rows={12}
                  className="input-field resize-none"
                  value={extractedText}
                  readOnly
                />
                <button
                  onClick={handleSummarize}
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Generating Summary...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="h-5 w-5 mr-2" />
                      Generate Summary
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          {/* Summary */}
          {currentStep === 'summarize' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                AI Generated Summary
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Summary</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <p className="text-gray-700 dark:text-gray-300">{summary}</p>
                  </div>
                </div>

                {bullets && bullets.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">Key Points</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <ul className="space-y-1">
                        {bullets.map((bullet, index) => (
                          <li key={index} className="text-gray-700 dark:text-gray-300 flex items-start">
                            <span className="text-primary-600 dark:text-primary-400 mr-2">•</span>
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={() => copyToClipboard(summary)}
                    className="flex-1 btn-secondary flex items-center justify-center"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4 mr-2" />
                    Copy Summary
                  </button>
                  <button
                    onClick={handleSaveAsNote}
                    disabled={loading}
                    className="flex-1 btn-primary flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <BookmarkIcon className="h-4 w-4 mr-2" />
                        Save as Note
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {currentStep === 'save' && (
            <div className="card">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                  <BookmarkIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Note Saved Successfully!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Your summary has been saved as a note. You can view it in the Notes section.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={resetForm}
                    className="btn-primary flex items-center justify-center"
                  >
                    <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                    Upload Another PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Reset Button */}
      {currentStep !== 'upload' && currentStep !== 'save' && (
        <div className="mt-6 text-center">
          <button
            onClick={resetForm}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm flex items-center mx-auto"
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            Start Over
          </button>
        </div>
      )}
    </div>
  );
};

export default UploadSummary;
