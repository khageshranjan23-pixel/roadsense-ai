import React, { useState, useRef } from 'react';
import { Upload, X, Shield, Send, Loader2, Play } from 'lucide-react';
import { useAdvisorStore } from '../../stores/useAdvisorStore';
import { useUIStore } from '../../stores/useUIStore';
import { Card, Button, Badge } from '../ui';

// ========================================================
// MEDIA UPLOAD BOX
// ========================================================
export const AdvisorUploadZone: React.FC = () => {
  const { uploadMedia, isAnalyzing, uploadedFile, sceneContext, riskAssessment, clearSession } = useAdvisorStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await uploadMedia(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadMedia(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Determine file preview URL
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);

  React.useEffect(() => {
    if (!uploadedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(uploadedFile);
    setPreviewUrl(url);
    setIsVideo(uploadedFile.type.startsWith('video/'));

    return () => URL.revokeObjectURL(url);
  }, [uploadedFile]);

  return (
    <Card className="h-full flex flex-col justify-between border-gray-800">
      <div>
        <h3 className="text-base font-bold text-gray-100 mb-3">Road Scene Upload</h3>
        <p className="text-xs text-gray-400 mb-4">
          Upload a photo or short video of a road crosswalk to run CV object detection and safety reviews.
        </p>

        {/* Drag and Drop Zone */}
        {!uploadedFile ? (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={twMerge(
              "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[220px]",
              dragActive 
                ? "border-primary bg-primary/5 scale-[0.98]" 
                : "border-gray-800 hover:border-gray-700 bg-black/10 hover:bg-black/20"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {isAnalyzing ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                <span className="text-sm font-medium text-gray-200">Analyzing media using YOLO...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload className="w-10 h-10 text-gray-500 mb-3" />
                <span className="text-sm font-medium text-gray-300">Drag & drop your file here, or click to browse</span>
                <span className="text-[10px] text-gray-500 mt-2">Supports JPG, PNG, WEBP, MP4, MOV (max 50MB)</span>
              </div>
            )}
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden bg-black/40 border border-gray-800 p-2 min-h-[220px] flex flex-col items-center justify-center">
            {/* Clear Media Button */}
            <button
              onClick={clearSession}
              className="absolute top-4 right-4 z-10 bg-black/75 hover:bg-black/90 p-1.5 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Render CV annotated frame or preview */}
            {sceneContext?.annotated_frame_base64 ? (
              <img
                src={`data:image/jpeg;base64,${sceneContext.annotated_frame_base64}`}
                alt="CV Detections"
                className="max-h-[260px] object-contain rounded-lg"
              />
            ) : (
              isVideo ? (
                <div className="relative w-full h-[200px] flex items-center justify-center bg-gray-900 rounded-lg">
                  <Play className="w-12 h-12 text-primary fill-primary/10" />
                  <span className="absolute bottom-2 text-xs text-gray-400">Video Preview Loaded</span>
                </div>
              ) : (
                previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-[220px] object-contain rounded-lg"
                  />
                )
              )
            )}
          </div>
        )}
      </div>

      {/* Analysis Output summary card */}
      {uploadedFile && !isAnalyzing && sceneContext && (
        <div className="mt-4 pt-4 border-t border-gray-800 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-400">CV Status Assessment:</span>
            {riskAssessment && (
              <Badge variant={riskAssessment === 'SAFE' ? 'success' : (riskAssessment === 'CAUTION' ? 'warning' : 'danger')}>
                {riskAssessment}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {sceneContext.objects.map((obj, idx) => (
              <span key={idx} className="bg-gray-800/80 px-2 py-0.5 rounded text-[10px] text-gray-300 flex items-center border border-gray-700/50">
                {obj.class_name.toUpperCase()}
              </span>
            ))}
            {sceneContext.objects.length === 0 && (
              <span className="text-xs text-gray-500 italic">No targets detected on road.</span>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

// ========================================================
// CHAT PANEL
// ========================================================
export const AdvisorChatWindow: React.FC = () => {
  const { messages, sendMessage, isChatting } = useAdvisorStore();
  const { language } = useUIStore();
  const [question, setQuestion] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to latest message
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isChatting) return;
    const q = question;
    setQuestion('');
    await sendMessage(q, language);
  };

  const handleChipClick = async (chipQuestion: string) => {
    if (isChatting) return;
    await sendMessage(chipQuestion, language);
  };

  // Suggestion chips based on context
  const chips = [
    "Is it safe to cross the street now?",
    "What risk exists in this scene?",
    "Where is the nearest pedestrian light?",
    "Explain what the yellow traffic light represents."
  ];

  return (
    <Card className="h-full flex flex-col justify-between border-gray-800 bg-[#0D1B2E]/90">
      {/* Header */}
      <div className="border-b border-gray-800 pb-3 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <Shield className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-100">AI Safety Advisor</h3>
          <p className="text-[10px] text-gray-400">Powered by Gemini 2.0 Flash</p>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[350px] min-h-[250px] pr-2">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 py-8">
            <Shield className="w-10 h-10 text-primary/30 mb-3 animate-pulse" />
            <p className="text-xs text-gray-300 font-semibold mb-1">Welcome to RoadSense Advisor!</p>
            <p className="text-[11px] text-gray-500 max-w-[260px]">
              Ask me any safety questions, or upload a road scenario file on the left to review specific hazards.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-5">
              {chips.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleChipClick(c)}
                  className="bg-[#050D1A] hover:bg-primary/5 hover:text-primary border border-gray-800 hover:border-primary/30 px-3 py-1.5 rounded-lg text-[10px] text-gray-400 text-left transition-all duration-200"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          
          // Parse VERDICT, REASON, ADVICE formatting in AI replies
          const content = msg.content;
          const verdictMatch = content.match(/VERDICT:\s*([^\n]+)/i);
          const reasonMatch = content.match(/REASON:\s*([^\n]+)/i);
          const adviceMatch = content.match(/ADVICE:\s*([\s\S]+)/i);

          const hasFormatting = verdictMatch || reasonMatch || adviceMatch;

          return (
            <div key={idx} className={twMerge("flex w-full", isUser ? "justify-end" : "justify-start")}>
              <div
                className={twMerge(
                  "max-w-[85%] rounded-xl p-3.5 text-xs transition-all",
                  isUser
                    ? "bg-primary text-white rounded-br-none"
                    : "bg-[#050D1A] border border-gray-800 text-gray-200 rounded-bl-none"
                )}
              >
                {!isUser && hasFormatting ? (
                  <div className="space-y-2">
                    {verdictMatch && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-gray-400 text-[10px] uppercase tracking-wider">Verdict:</span>
                        <span className={twMerge(
                          "font-bold text-xs uppercase px-1.5 py-0.5 rounded text-[10px]",
                          verdictMatch[1].includes('UNSAFE') ? 'bg-danger/10 text-red-400 border border-danger/20' : 
                          (verdictMatch[1].includes('CAUTION') ? 'bg-accent/10 text-amber-400 border border-accent/20' : 'bg-success/10 text-emerald-400 border border-success/20')
                        )}>
                          {verdictMatch[1].trim()}
                        </span>
                      </div>
                    )}
                    {reasonMatch && (
                      <div>
                        <span className="font-bold text-gray-400 text-[10px] uppercase block tracking-wider mb-0.5">Reason:</span>
                        <p className="text-gray-200">{reasonMatch[1].trim()}</p>
                      </div>
                    )}
                    {adviceMatch && (
                      <div className="border-t border-gray-800/80 pt-1.5 mt-1.5">
                        <span className="font-bold text-primary text-[10px] uppercase block tracking-wider mb-0.5">Advice:</span>
                        <p className="text-gray-300 font-medium">{adviceMatch[1].trim()}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{content || 'Thinking...'}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Input controls */}
      <form onSubmit={handleSubmit} className="border-t border-gray-800 pt-3 flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about traffic lights, crossing guides..."
          className="flex-1 bg-[#050D1A] border border-gray-800 focus:border-primary rounded-lg px-3.5 py-2 text-xs text-gray-200 placeholder-gray-500 outline-none transition-colors"
        />
        <Button 
          type="submit" 
          variant="primary" 
          size="sm" 
          isLoading={isChatting}
          disabled={!question.trim()}
          className="h-9 px-3"
        >
          {!isChatting && <Send className="w-3.5 h-3.5" />}
        </Button>
      </form>
    </Card>
  );
};

// Helper function to handle merging class names
function twMerge(...args: any[]) {
  const classes = args.filter(Boolean).join(' ');
  return classes;
}
