import React, { useCallback, useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Upload,
  X,
  FileText,
  AlertCircle,
  CheckCircle,
  Cloud,
  FolderOpen,
  Loader,
  ArrowRight,
  Sparkles,
  Clock,
  Copy,
  Save,
  RotateCcw,
  Share2,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { processFileWithAihubmix } from "@/service/aihubmix";
import {
  generateSpecsFile,
  downloadSpecsFile,
  generateSpecsFileName,
} from "@/utils/specsGenerator";
import { Header } from "@/components/Header";
import type {
  UploadFile,
  ProcessingFile,
  ProcessingState,
  SpecsProcessingResult,
} from "@/types/context";
import type { User } from "@/types/user";

// 支持的文件格式配置
const SUPPORTED_FILE_FORMATS = {
  // 聊天记录和上下文文件
  context: ['ct', 'specs'],
  // 文档格式
  documents: ['md', 'txt', 'rtf', 'doc', 'docx'],
  // 数据格式
  data: ['json', 'yaml', 'yml', 'xml', 'csv', 'tsv'],
  // 网页格式
  web: ['html', 'htm', 'mhtml'],
  // 代码文件
  code: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'sh', 'bash', 'zsh', 'sql'],
  // 配置文件
  config: ['ini', 'cfg', 'conf', 'toml', 'env'],
  // 日志文件
  logs: ['log', 'logs'],
  // 其他文本文件
  other: ['readme', 'license', 'changelog']
};

// 获取所有支持的扩展名
const getAllSupportedExtensions = (): string[] => {
  return Object.values(SUPPORTED_FILE_FORMATS).flat();
};

// 检查文件是否支持
const isFileSupported = (fileName: string | undefined): boolean => {
  if (!fileName || typeof fileName !== 'string') {
    return false;
  }
  const extension = fileName.toLowerCase().split('.').pop() || '';
  return getAllSupportedExtensions().includes(extension);
};

interface ContextProcessorProps {
  user: User | null;
  onLogout: () => void;
}

export function ContextProcessor({ user, onLogout }: ContextProcessorProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  const [currentStep, setCurrentStep] = useState<
    "upload" | "process" | "complete"
  >("upload");
  const [showToast, setShowToast] = useState(false);
  // const [processingProgress, setProcessingProgress] = useState(0);

  // // 插件数据模拟文件上传函数
  // const simulateFileUpload = useCallback((content: string, filename: string, platform?: string) => {
  //   if (!content || !filename) {
  //     console.error('插件数据缺少必要信息')
  //     return
  //   }

  //   // 检查文件格式是否支持
  //   if (!isFileSupported(filename)) {
  //     console.error('不支持的文件格式:', filename)
  //     return
  //   }

  //   // 创建File对象
  //   const blob = new Blob([content], { type: 'text/plain' })
  //   const file = new File([blob], filename, { type: 'text/plain' })
    
  //   const newUploadFile: UploadFile = {
  //     file,
  //     name: filename,
  //     size: `${(file.size / 1024).toFixed(1)} KB`,
  //     status: 'uploading'
  //   }
    
  //   // 添加到上传队列，就像用户手动上传一样
  //   setUploadFiles(prev => [...prev, newUploadFile])
    
  //   console.log(`插件文件已添加: ${filename} (${platform || '未知平台'})`)
  // }, [])

  // // 监听插件消息
  // useEffect(() => {
  //   const handlePluginMessage = (event: MessageEvent) => {
  //     console.log('🔌 收到消息:', event.data)
      
  //     // 验证消息来源和格式
  //     if (event.data && event.data.type === 'PLUGIN_FILE_DATA') {
  //       console.log('✅ 插件文件数据消息:', {
  //         filename: event.data.filename,
  //         platform: event.data.platform,
  //         contentLength: event.data.content?.length || 0
  //       })
        
  //       const { content, filename, platform } = event.data
  //       simulateFileUpload(content, filename, platform)
  //     } else {
  //       console.log('❌ 非插件消息或格式错误')
  //     }
  //   }

  //   console.log('🎧 开始监听插件消息...')
  //   window.addEventListener('message', handlePluginMessage)
    
  //   return () => {
  //     console.log('🔇 停止监听插件消息')
  //     window.removeEventListener('message', handlePluginMessage)
  //   }
  // }, [simulateFileUpload])

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    e.preventDefault();

    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // 处理文件
    if (clipboardData.files.length > 0) {
      const files = Array.from(clipboardData.files);
      const validFiles = files.filter((file) => {
        return file && file.name && isFileSupported(file.name);
      });

      const newUploadFiles: UploadFile[] = validFiles.map((file) => ({
        file,
        name: file.name || '未知文件',
        size: `${((file.size || 0) / 1024).toFixed(1)} KB`,
        status: "uploading",
      }));

      setUploadFiles((prev) => [...prev, ...newUploadFiles]);
    }
    // 处理文本内容
    else if (clipboardData.getData("text")) {
      const textContent = clipboardData.getData("text");
      const blob = new Blob([textContent], { type: "text/plain" });
      const file = new File([blob], `clipboard-${Date.now()}.txt`, {
        type: "text/plain",
      });

      const newUploadFile: UploadFile = {
        file,
        name: file.name,
        size: `${(file.size / 1024).toFixed(1)} KB`,
        status: "uploading",
      };

      setUploadFiles((prev) => [...prev, newUploadFile]);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [handlePaste]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const validFiles = files.filter((file) => {
        return file && file.name && isFileSupported(file.name);
      });

      const newUploadFiles: UploadFile[] = validFiles.map((file) => ({
        file,
        name: file.name || '未知文件',
        size: `${((file.size || 0) / 1024).toFixed(1)} KB`,
        status: "uploading",
      }));

      setUploadFiles((prev) => [...prev, ...newUploadFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const files = Array.from(selectedFiles);
      const validFiles = files.filter((file) => {
        return file && file.name && isFileSupported(file.name);
      });

      const newUploadFiles: UploadFile[] = validFiles.map((file) => ({
        file,
        name: file.name || '未知文件',
        size: `${((file.size || 0) / 1024).toFixed(1)} KB`,
        status: "uploading",
      }));

      setUploadFiles((prev) => [...prev, ...newUploadFiles]);
    }
  };

  const handleProcess = async () => {
    if (uploadFiles.length === 0) return;

    setCurrentStep("process");
 
    // 转换为ProcessingFile格式
    const files: ProcessingFile[] = uploadFiles.map((file) => ({
      ...file,
      processingState: "idle" as ProcessingState,
    }));

    setProcessingFiles(files);

    // 依次处理每个文件
    for (let i = 0; i < files.length; i++) {
      try {
        // 更新状态为处理中
        setProcessingFiles((prev) =>
          prev.map((file, index) =>
            index === i ? { ...file, processingState: "generating" } : file
          )
        );

        // 直接传递文件给API处理
        setProcessingFiles((prev) =>
          prev.map((file, index) =>
            index === i
              ? { ...file, processingState: "processing" }
              : file
          )
        );

       
        const fileName = files[i]?.name || '未知文件';
        const apiResult = await processFileWithAihubmix(files[i].file);

        // 生成.specs文件 - 基于新的压缩格式
        const specsFile = generateSpecsFile(
          fileName,
          apiResult.contextAnalysis
        );

        const specsFileName = generateSpecsFileName(
          fileName,
          apiResult.contextAnalysis?.metadata?.name
        );

        const result: SpecsProcessingResult = {
          summary: apiResult.summary,
          generatedAt: apiResult.generatedAt,
          processingTime: apiResult.processingTime,
          specsFile,
          specsFileName,
          contextAnalysis: apiResult.contextAnalysis,
        };

        // 更新结果
        setProcessingFiles((prev) =>
          prev.map((file, index) =>
            index === i
              ? {
                  ...file,
                  processingState: "completed",
                  result,
                }
              : file
          )
        );

      } catch (error) {
        setProcessingFiles((prev) =>
          prev.map((file, index) =>
            index === i
              ? {
                  ...file,
                  processingState: "error",
                  error: error instanceof Error ? error.message : "处理失败",
                }
              : file
          )
        );

      
      }
    }

    setCurrentStep("complete");
  };


  const removeFile = (index: number) => {
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeProcessingFile = (index: number) => {
    setProcessingFiles((prev) => prev.filter((_, i) => i !== index));
  };


  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      <div className="flex items-center space-x-4">
        <div
          className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
            currentStep === "upload"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-600"
          )}
        >
          <Upload className="w-4 h-4" />
          <span>上传文件</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div
          className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
            currentStep === "process"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-600"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span>AI处理</span>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div
          className={cn(
            "flex items-center space-x-2 px-3 py-1 rounded-full text-sm",
            currentStep === "complete"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-600"
          )}
        >
          <CheckCircle className="w-4 h-4" />
          <span>完成</span>
        </div>
      </div>
    </div>
  );

  const renderUploadSection = () => (
    <div className="flex-1 p-6">
      <h3
        className="text-lg font-medium mb-4"
        style={{ color: "rgba(7, 11, 17, 1)" }}
      >
        上传文件
      </h3>

      <div
        className={cn(
          "upload-area flex flex-col justify-center items-center mb-6 pt-8 pr-6 pb-8 pl-6 border-2 border-dashed rounded-lg transition-colors",
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div
          className="flex justify-center items-center w-16 h-16 mb-4 rounded-md"
          style={{ backgroundColor: "rgba(33, 37, 40, 1)" }}
        >
          <Cloud className="w-6 h-6 text-white" />
        </div>
        <p
          className="mb-2 text-sm font-medium"
          style={{ color: "rgba(7, 11, 17, 1)" }}
        >
          拖放文件到此处或粘贴剪切板内容
        </p>
        <p className="mb-4 text-xs" style={{ color: "rgba(136, 138, 139, 1)" }}>
          支持 50+ 种文件格式：文档、代码、配置、数据文件等
        </p>
        <label className="btn btn-primary btn-sm cursor-pointer">
          <FolderOpen className="w-4 h-4 mr-2" />
          浏览文件
          <input
            type="file"
            accept={getAllSupportedExtensions().map(ext => `.${ext}`).join(',')}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {uploadFiles.length > 0 && (
        <div>
          <h4
            className="mb-3 text-sm font-medium"
            style={{ color: "rgba(7, 11, 17, 1)" }}
          >
            文件列表 ({uploadFiles.length})
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {uploadFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center pt-3 pr-3 pb-3 pl-3 rounded-md"
                style={{ backgroundColor: "rgba(244, 246, 248, 1)" }}
              >
                <FileText className="w-4 h-4 mr-3 text-gray-600" />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: "rgba(7, 11, 17, 1)" }}
                  >
                    {file?.name || '未知文件'}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "rgba(136, 138, 139, 1)" }}
                  >
                    {file.size}
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="ml-2 hover:bg-gray-200 p-1 rounded"
                  style={{ color: "rgba(136, 138, 139, 1)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderProcessSection = () => (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 min-h-[400px]">
      <div className="text-center">
        {currentStep === "upload" && (
          <>
            <div
              onClick={uploadFiles.length > 0 ? handleProcess : undefined}
              className={`w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-lg ${
                uploadFiles.length > 0
                  ? "cursor-pointer hover:bg-gray-100 transition-colors"
                  : "cursor-not-allowed opacity-50"
              }`}
              style={{ backgroundColor: "rgba(241, 245, 249, 1)" }}
            >
              <Sparkles className="w-8 h-8 text-gray-600" />
            </div>
            <h3
              onClick={uploadFiles.length > 0 ? handleProcess : undefined}
              className={`text-lg font-medium mb-2 ${
                uploadFiles.length > 0
                  ? "cursor-pointer hover:text-blue-600"
                  : "cursor-not-allowed"
              }`}
              style={{ color: "rgba(7, 11, 17, 1)" }}
            >
              Specs获取
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "rgba(136, 138, 139, 1)" }}
            >
              点击开始处理文件，AI将为您生成总结和分析
            </p>
            <button
              onClick={handleProcess}
              disabled={uploadFiles.length === 0}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              开始处理
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </>
        )}

        {currentStep === "process" && (
          <>
            <Loader className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-sm" style={{ color: "rgba(136, 138, 139, 1)" }}>
              AI正在分析和总结您的文件内容
            </p>
          </>
        )}

        {currentStep === "complete" && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <h3
              className="text-lg font-medium mb-2"
              style={{ color: "rgba(7, 11, 17, 1)" }}
            >
              处理完成
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: "rgba(136, 138, 139, 1)" }}
            >
              所有文件已成功处理，选择您要进行的操作
            </p>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  // 重新处理逻辑
                  setCurrentStep("upload");
                  setProcessingFiles([]);
                }}
                className="inline-flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                title="重新处理"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              
              <div className="inline-flex">
                <button
                  onClick={async () => {
                    try {
                      const completedFiles = processingFiles.filter(
                        (f) => f.processingState === "completed"
                      );

                      if (completedFiles.length === 0) {
                        alert("没有已完成的文件可供应用");
                        return;
                      }

                      // 获取第一个完成的文件的specs数据
                      const firstFile = completedFiles[0];
                      if (!firstFile.result?.specsFile || !firstFile.result?.specsFileName) {
                        alert("specs数据未生成");
                        return;
                      }

                      // 跳转到specs详情页面，通过state传递数据
                      const encodedFileName = encodeURIComponent(firstFile.result.specsFileName);
                      const specsDetailUrl = `/specs-detail/${encodedFileName}`;
                      
                      // 复制完整URL到剪贴板
                      const fullUrl = `${window.location.origin}${specsDetailUrl}`;
                      await navigator.clipboard.writeText(fullUrl);
                      
                      // 显示成功提示
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 3000);
                      
                      // 通过state传递specs数据到SpecsDetail页面
                      navigate(specsDetailUrl, {
                        state: {
                          specsData: firstFile.result.specsFile,
                          isLocalData: true // 标识这是本地数据，不需要从后端获取
                        }
                      });
                    } catch (error) {
                      console.error("应用失败:", error);
                      alert("应用失败，请重试");
                    }
                  }}
                  className="inline-flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors mr-3"
                  title="应用到新对话"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    try {
                      // 下载.specs文件
                      const completedFiles = processingFiles.filter(
                        (f) => f.processingState === "completed"
                      );

                      if (completedFiles.length === 0) {
                        alert("没有已完成的文件可供下载");
                        return;
                      }

                      completedFiles.forEach((file) => {
                        if (file.result?.specsFile && file.result?.specsFileName) {
                          downloadSpecsFile(
                            file.result.specsFile,
                            file.result.specsFileName
                          );
                        }
                      });

                      // 显示成功提示
                      console.log(
                        `成功下载 ${completedFiles.length} 个.specs文件`
                      );
                    } catch (error) {
                      console.error("下载文件失败:", error);
                      alert("下载文件失败，请重试");
                    }
                  }}
                  className="inline-flex items-center justify-center w-10 h-10 text-white bg-gray-800 hover:bg-gray-700 rounded-full transition-colors mr-3"
                  title="下载.specs文件"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={async () => {
                    try {
                      // 上传.specs文件到后端
                      const completedFiles = processingFiles.filter(
                        (f) => f.processingState === "completed"
                      );

                      if (completedFiles.length === 0) {
                        alert("没有已完成的文件可供上传");
                        return;
                      }

                      const firstFile = completedFiles[0];
                      if (!firstFile.result?.specsFile || !firstFile.result?.specsFileName) {
                        alert("specs数据未生成");
                        return;
                      }

                      // 将specs数据转为Blob
                      const specsBlob = new Blob(
                        [JSON.stringify(firstFile.result.specsFile, null, 2)], 
                        { type: 'application/json' }
                      );

                      // 创建FormData
                      const formData = new FormData();
                      formData.append('file', specsBlob, firstFile.result.specsFileName);

                      // 上传到后端
                      const token = localStorage.getItem('authToken');
                      if (!token) {
                        alert('未登录，请先登录');
                        return;
                      }

                      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
                      const response = await fetch(`${API_BASE_URL}/api/upload`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${token}`
                        },
                        body: formData
                      });

                      if (!response.ok) {
                        throw new Error(`上传失败: ${response.status}`);
                      }

                      const result = await response.json();
                      console.log('上传成功:', result);
                      
                      // 显示成功提示
                      alert(`文件上传成功！文件名: ${result.file_info.saved_name}`);
                      
                    } catch (error) {
                      console.error("上传文件失败:", error);
                      alert("上传文件失败，请重试");
                    }
                  }}
                  className="inline-flex items-center justify-center w-10 h-10 text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
                  title="上传到服务器"
                >
                  <Upload className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const renderResultSection = () => (
    <div className="flex-1 p-6 border-l border-gray-200">
      <h3
        className="text-lg font-medium mb-4"
        style={{ color: "rgba(7, 11, 17, 1)" }}
      >
        处理结果
      </h3>

      {processingFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FileText className="w-12 h-12 mb-4 text-gray-400" />
          <p className="text-sm" style={{ color: "rgba(136, 138, 139, 1)" }}>
            处理完成后，结果将在这里显示
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {processingFiles.map((file, index) => (
            <div key={index} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-sm">{file?.name || '未知文件'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  {file.processingState === "generating" && (
                    <span className="flex items-center text-xs text-blue-600">
                      <Loader className="w-3 h-3 mr-1 animate-spin" />
                      生成中...
                    </span>
                  )}
                  {file.processingState === "processing" && (
                    <span className="flex items-center text-xs text-blue-600">
                      <Clock className="w-3 h-3 mr-1" />
                      处理中...
                    </span>
                  )}
                  {file.processingState === "completed" && (
                    <span className="flex items-center text-xs text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      已完成
                    </span>
                  )}
                  {file.processingState === "error" && (
                    <span className="flex items-center text-xs text-red-600">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      处理失败
                    </span>
                  )}
                  <button
                    onClick={() => removeProcessingFile(index)}
                    className="hover:bg-gray-200 p-1 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {file.result && (
                <div
                  className="text-xs space-y-3"
                  style={{ color: "rgba(136, 138, 139, 1)" }}
                >
                  {/* 基本信息 */}
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      .specs文件: {file.result.specsFileName}
                    </span>
                    <span>
                      处理时间: {(file.result.processingTime / 1000).toFixed(1)}
                      s
                    </span>
                  </div>

                  {/* 显示解析结果 */}
                  <div>
                    <div className="font-medium text-gray-700 mb-2 flex items-center">
                      解析结果
                      {(file.result.contextAnalysis as any)?.parsing_method && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {(file.result.contextAnalysis as any).parsing_method}
                        </span>
                      )}
                    </div>
                    
                    {(() => {
                      const analysis = file.result.contextAnalysis;
                      if (!analysis) return <div className="text-gray-500">无分析结果</div>;
                      
                      const compressedContext = (analysis as any)?.compressed_context;
                      const parsingError = (analysis as any)?.parsing_error;
                      const rawResponse = (analysis as any)?.raw_api_response;
                      
                      // 🔧 优化：更灵活的显示逻辑，适应可选字段结构
                      
                      // 如果有解析错误但有原始响应，显示降级信息
                      if (parsingError && rawResponse) {
                        return (
                          <div>
                            <div className="text-amber-600 text-sm mb-2">
                              解析为降级格式: {parsingError}
                            </div>
                            <div className="bg-amber-50 p-3 rounded border">
                              <div className="text-sm font-medium mb-2">基础信息:</div>
                              <div className="text-sm space-y-1">
                                <div><strong>名称:</strong> {(analysis as any)?.metadata?.name || "未命名"}</div>
                                <div><strong>类型:</strong> {(analysis as any)?.metadata?.task_type || "general_chat"}</div>
                                <div><strong>处理方式:</strong> 降级解析</div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // 完全解析失败时显示原始响应
                      if (parsingError) {
                        return (
                          <div>
                            <div className="text-red-600 text-sm mb-2">解析失败: {parsingError}</div>
                            <div className="bg-gray-50 p-4 rounded border">
                              <pre className="text-sm whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                                {rawResponse || '暂无响应内容'}
                              </pre>
                            </div>
                          </div>
                        );
                      }
                      
                      // 如果成功解析，显示结构化信息
                      if (compressedContext) {
                        return (
                          <div className="space-y-3">
                            {/* 元数据 */}
                            {compressedContext.metadata && (
                              <div className="bg-purple-50 p-3 rounded">
                                <div className="font-medium text-purple-800 mb-1">📊 元数据</div>
                                <div className="text-sm grid grid-cols-2 gap-2">
                                  {compressedContext.metadata.priority_level && (
                                    <div><strong>优先级:</strong> {compressedContext.metadata.priority_level}</div>
                                  )}
                                  {compressedContext.metadata.context_version && (
                                    <div><strong>版本:</strong> {compressedContext.metadata.context_version}</div>
                                  )}
                                  {compressedContext.metadata.original_length && (
                                    <div><strong>消息数:</strong> {compressedContext.metadata.original_length}</div>
                                  )}
                                  {compressedContext.metadata.compression_time && (
                                    <div><strong>压缩时间:</strong> {new Date(compressedContext.metadata.compression_time).toLocaleString()}</div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* 核心摘要 */}
                            {compressedContext.context_summary && (
                              <div className="bg-blue-50 p-3 rounded">
                                <div className="font-medium text-blue-800 mb-1">📋 核心摘要</div>
                                <div className="text-sm space-y-1">
                                  {compressedContext.context_summary.main_topic && (
                                    <div><strong>主题:</strong> {compressedContext.context_summary.main_topic}</div>
                                  )}
                                  {compressedContext.context_summary.current_task && (
                                    <div><strong>任务:</strong> {compressedContext.context_summary.current_task}</div>
                                  )}
                                  {compressedContext.context_summary.user_intent && (
                                    <div><strong>意图:</strong> {compressedContext.context_summary.user_intent}</div>
                                  )}
                                  {compressedContext.context_summary.conversation_stage && (
                                    <div><strong>阶段:</strong> {compressedContext.context_summary.conversation_stage}</div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* 用户画像 - 可选 */}
                            {compressedContext.user_profile && (
                              <div className="bg-green-50 p-3 rounded">
                                <div className="font-medium text-green-800 mb-1">👤 用户画像</div>
                                <div className="text-sm space-y-1">
                                  {compressedContext.user_profile.expertise_level && (
                                    <div><strong>专业水平:</strong> {compressedContext.user_profile.expertise_level}</div>
                                  )}
                                  {compressedContext.user_profile.communication_style && (
                                    <div><strong>沟通风格:</strong> {compressedContext.user_profile.communication_style}</div>
                                  )}
                                  {compressedContext.user_profile.preferences && compressedContext.user_profile.preferences.length > 0 && (
                                    <div><strong>偏好:</strong> {compressedContext.user_profile.preferences.join(', ')}</div>
                                  )}
                                  {compressedContext.user_profile.constraints && compressedContext.user_profile.constraints.length > 0 && (
                                    <div><strong>限制:</strong> {compressedContext.user_profile.constraints.join(', ')}</div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* 关键实体 - 可选 */}
                            {compressedContext.key_entities && (
                              <div className="bg-teal-50 p-3 rounded">
                                <div className="font-medium text-teal-800 mb-1">🔗 关键实体</div>
                                <div className="text-sm grid grid-cols-2 gap-2">
                                  {compressedContext.key_entities.people && compressedContext.key_entities.people.length > 0 && (
                                    <div><strong>人物:</strong> {compressedContext.key_entities.people.join(', ')}</div>
                                  )}
                                  {compressedContext.key_entities.concepts && compressedContext.key_entities.concepts.length > 0 && (
                                    <div><strong>概念:</strong> {compressedContext.key_entities.concepts.join(', ')}</div>
                                  )}
                                  {compressedContext.key_entities.objects && compressedContext.key_entities.objects.length > 0 && (
                                    <div><strong>对象:</strong> {compressedContext.key_entities.objects.join(', ')}</div>
                                  )}
                                  {compressedContext.key_entities.locations && compressedContext.key_entities.locations.length > 0 && (
                                    <div><strong>地点:</strong> {compressedContext.key_entities.locations.join(', ')}</div>
                                  )}
                                  {compressedContext.key_entities.time_references && compressedContext.key_entities.time_references.length > 0 && (
                                    <div><strong>时间:</strong> {compressedContext.key_entities.time_references.join(', ')}</div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* 决策记录 - 可选 */}
                            {compressedContext.decisions_made && compressedContext.decisions_made.length > 0 && (
                              <div className="bg-yellow-50 p-3 rounded">
                                <div className="font-medium text-yellow-800 mb-1">✅ 决策记录 ({compressedContext.decisions_made.length})</div>
                                <div className="text-sm space-y-2">
                                  {compressedContext.decisions_made.slice(0, 2).map((decision: any, idx: number) => (
                                    <div key={idx} className="border-l-2 border-yellow-300 pl-2">
                                      <div><strong>{decision.decision}</strong></div>
                                      <div className="text-gray-600">{decision.reasoning}</div>
                                      <div className="text-xs text-yellow-700">状态: {decision.status}</div>
                                    </div>
                                  ))}
                                  {compressedContext.decisions_made.length > 2 && (
                                    <div className="text-xs text-gray-500">... 还有 {compressedContext.decisions_made.length - 2} 个决策</div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* 待解决问题 */}
                            {compressedContext.pending_issues && compressedContext.pending_issues.length > 0 && (
                              <div className="bg-red-50 p-3 rounded">
                                <div className="font-medium text-red-800 mb-1">❓ 待解决问题 ({compressedContext.pending_issues.length})</div>
                                <div className="text-sm space-y-2">
                                  {compressedContext.pending_issues.slice(0, 2).map((issue: any, idx: number) => (
                                    <div key={idx} className="border-l-2 border-red-300 pl-2">
                                      <div><strong>{issue.issue}</strong></div>
                                      <div className="text-gray-600">{issue.context}</div>
                                      <div className="text-xs text-red-700">优先级: {issue.priority}</div>
                                    </div>
                                  ))}
                                  {compressedContext.pending_issues.length > 2 && (
                                    <div className="text-xs text-gray-500">... 还有 {compressedContext.pending_issues.length - 2} 个问题</div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* 资源使用 - 可选 */}
                            {compressedContext.resources_used && (
                              <div className="bg-purple-50 p-3 rounded">
                                <div className="font-medium text-purple-800 mb-1">🛠️ 资源使用</div>
                                <div className="text-sm space-y-1">
                                  {compressedContext.resources_used.tools && compressedContext.resources_used.tools.length > 0 && (
                                    <div><strong>工具:</strong> {compressedContext.resources_used.tools.join(', ')}</div>
                                  )}
                                  {compressedContext.resources_used.files && compressedContext.resources_used.files.length > 0 && (
                                    <div><strong>文件:</strong> {compressedContext.resources_used.files.join(', ')}</div>
                                  )}
                                  {compressedContext.resources_used.external_refs && compressedContext.resources_used.external_refs.length > 0 && (
                                    <div><strong>外部引用:</strong> {compressedContext.resources_used.external_refs.join(', ')}</div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* 对话流程 - 可选 */}
                            {compressedContext.conversation_flow && compressedContext.conversation_flow.length > 0 && (
                              <div className="bg-cyan-50 p-3 rounded">
                                <div className="font-medium text-cyan-800 mb-1">🔄 对话流程 ({compressedContext.conversation_flow.length})</div>
                                <div className="text-sm space-y-2">
                                  {compressedContext.conversation_flow.slice(0, 2).map((flow: any, idx: number) => (
                                    <div key={idx} className="border-l-2 border-cyan-300 pl-2">
                                      <div><strong>{flow.stage}</strong></div>
                                      <div className="text-gray-600">{flow.key_exchange}</div>
                                      <div className="text-xs text-cyan-700">结果: {flow.outcome}</div>
                                    </div>
                                  ))}
                                  {compressedContext.conversation_flow.length > 2 && (
                                    <div className="text-xs text-gray-500">... 还有 {compressedContext.conversation_flow.length - 2} 个阶段</div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* 上下文恢复指令 - 可选 */}
                            {compressedContext.context_restoration && (
                              <div className="bg-indigo-50 p-3 rounded">
                                <div className="font-medium text-indigo-800 mb-1">🔄 上下文恢复</div>
                                <div className="text-sm space-y-1">
                                  {compressedContext.context_restoration.role_continuation && (
                                    <div><strong>角色延续:</strong> {compressedContext.context_restoration.role_continuation}</div>
                                  )}
                                  {compressedContext.context_restoration.conversation_tone && (
                                    <div><strong>对话语调:</strong> {compressedContext.context_restoration.conversation_tone}</div>
                                  )}
                                  {compressedContext.context_restoration.knowledge_assumptions && (
                                    <div><strong>知识假设:</strong> {compressedContext.context_restoration.knowledge_assumptions}</div>
                                  )}
                                  {compressedContext.context_restoration.next_expected_action && (
                                    <div><strong>下一步:</strong> {compressedContext.context_restoration.next_expected_action}</div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* 接收方使用要求 */}
                            {compressedContext.receiver_instructions && (
                              <div className="bg-orange-50 p-3 rounded">
                                <div className="font-medium text-orange-800 mb-1">📋 接收方使用要求</div>
                                <div className="text-sm space-y-1">
                                  {compressedContext.receiver_instructions.context_understanding && (
                                    <div><strong>上下文理解:</strong> {compressedContext.receiver_instructions.context_understanding}</div>
                                  )}
                                  {compressedContext.receiver_instructions.response_requirements && compressedContext.receiver_instructions.response_requirements.length > 0 && (
                                    <div>
                                      <strong>响应要求:</strong>
                                      <ul className="list-disc list-inside ml-2 mt-1">
                                        {compressedContext.receiver_instructions.response_requirements.map((req: string, idx: number) => (
                                          <li key={idx} className="text-xs">{req}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {compressedContext.receiver_instructions.mandatory_reply && (
                                    <div><strong>必须回复:</strong> <span className="bg-orange-200 px-2 py-1 rounded text-xs font-mono">{compressedContext.receiver_instructions.mandatory_reply}</span></div>
                                  )}
                                  {compressedContext.receiver_instructions.forbidden_actions && (
                                    <div><strong>禁止行为:</strong> {compressedContext.receiver_instructions.forbidden_actions}</div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                          </div>
                        );
                      }
                      
                      // 🔧 优化：完整.specs格式显示，支持prompt中的所有结构
                      return (
                        <div className="space-y-3">
                          {/* 基础信息 - metadata */}
                          {(analysis as any)?.metadata && (
                            <div className="bg-blue-50 p-3 rounded">
                              <div className="font-medium text-blue-800 mb-1">📄 基础信息</div>
                              <div className="text-sm space-y-1">
                                {(analysis as any).metadata.name && (
                                  <div><strong>项目名称:</strong> {(analysis as any).metadata.name}</div>
                                )}
                                {(analysis as any).metadata.task_type && (
                                  <div><strong>任务类型:</strong> {(analysis as any).metadata.task_type}</div>
                                )}
                                {(analysis as any).metadata.createdAt && (
                                  <div><strong>创建时间:</strong> {new Date((analysis as any).metadata.createdAt).toLocaleString()}</div>
                                )}
                                {(analysis as any).metadata.source_file && (
                                  <div><strong>源文件:</strong> {(analysis as any).metadata.source_file}</div>
                                )}
                                {(analysis as any).metadata.source_platform && (
                                  <div><strong>来源平台:</strong> {(analysis as any).metadata.source_platform}</div>
                                )}
                                {(analysis as any).metadata.analysis_model && (
                                  <div><strong>分析模型:</strong> {(analysis as any).metadata.analysis_model}</div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* 指令信息 - instructions */}
                          {(analysis as any)?.instructions && (
                            <div className="bg-green-50 p-3 rounded">
                              <div className="font-medium text-green-800 mb-1">🎯 指令信息</div>
                              <div className="text-sm space-y-2">
                                {(analysis as any).instructions.role_and_goal && (
                                  <div><strong>AI角色:</strong> {(analysis as any).instructions.role_and_goal}</div>
                                )}
                                {(analysis as any).instructions.context && (
                                  <div><strong>上下文:</strong> {(analysis as any).instructions.context}</div>
                                )}
                                {(analysis as any).instructions.key_topics && (analysis as any).instructions.key_topics.length > 0 && (
                                  <div>
                                    <strong>关键主题:</strong>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {(analysis as any).instructions.key_topics.map((topic: string, idx: number) => (
                                        <span key={idx} className="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">
                                          {topic}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* 资产信息 - assets */}
                          {(analysis as any)?.assets?.files && Object.keys((analysis as any).assets.files).length > 0 && (
                            <div className="bg-purple-50 p-3 rounded">
                              <div className="font-medium text-purple-800 mb-1">📁 项目资产</div>
                              <div className="text-sm space-y-2">
                                {Object.entries((analysis as any).assets.files).slice(0, 3).map(([filePath, fileData]: [string, any], idx: number) => (
                                  <div key={idx} className="border-l-2 border-purple-300 pl-2">
                                    <div><strong>{filePath}</strong></div>
                                    {fileData.asset_id && (
                                      <div className="text-xs text-purple-700">ID: {fileData.asset_id}</div>
                                    )}
                                    {fileData.state_chain && fileData.state_chain.length > 0 && (
                                      <div className="text-xs text-purple-700">
                                        状态链: {fileData.state_chain.length} 个状态
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {Object.keys((analysis as any).assets.files).length > 3 && (
                                  <div className="text-xs text-purple-700">
                                    ... 还有 {Object.keys((analysis as any).assets.files).length - 3} 个文件
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* 示例信息 - examples */}
                          {(analysis as any)?.examples && (analysis as any).examples.length > 0 && (
                            <div className="bg-cyan-50 p-3 rounded">
                              <div className="font-medium text-cyan-800 mb-1">💡 示例</div>
                              <div className="text-sm space-y-2">
                                {(analysis as any).examples.slice(0, 2).map((example: any, idx: number) => (
                                  <div key={idx} className="border-l-2 border-cyan-300 pl-2">
                                    {example.context && (
                                      <div><strong>上下文:</strong> {example.context}</div>
                                    )}
                                    {example.usage && (
                                      <div><strong>用法:</strong> {example.usage}</div>
                                    )}
                                    {example.source && (
                                      <div className="text-xs text-cyan-700">来源: {example.source}</div>
                                    )}
                                  </div>
                                ))}
                                {(analysis as any).examples.length > 2 && (
                                  <div className="text-xs text-cyan-700">
                                    ... 还有 {(analysis as any).examples.length - 2} 个示例
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* 对话历史 - history */}
                          {(analysis as any)?.history && (analysis as any).history.length > 0 && (
                            <div className="bg-amber-50 p-3 rounded">
                              <div className="font-medium text-amber-800 mb-1">💬 对话记录</div>
                              <div className="text-sm space-y-2">
                                <div>包含 {(analysis as any).history.length} 轮对话</div>
                                {(analysis as any).history.slice(-2).map((historyItem: any, idx: number) => (
                                  <div key={idx} className="border-l-2 border-amber-300 pl-2">
                                    <div className="font-medium">{historyItem.role}: {historyItem.content?.substring(0, 100)}{historyItem.content?.length > 100 ? '...' : ''}</div>
                                    {historyItem.timestamp && (
                                      <div className="text-xs text-amber-700">{new Date(historyItem.timestamp).toLocaleString()}</div>
                                    )}
                                    {historyItem.metadata?.asset_reference && (
                                      <div className="text-xs text-amber-700">资产引用: {historyItem.metadata.asset_reference}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* 版本信息 - version */}
                          {(analysis as any)?.version && (
                            <div className="bg-gray-100 p-2 rounded">
                              <div className="text-xs text-gray-600">
                                <strong>版本:</strong> {(analysis as any).version}
                              </div>
                            </div>
                          )}
                          
                          
                          {/* 默认显示 - 当没有识别的结构时显示基本信息 */}
                          {!((analysis as any)?.metadata || (analysis as any)?.instructions || (analysis as any)?.compressed_context || (analysis as any)?.assets || (analysis as any)?.history || (analysis as any)?.examples) && (
                            <div className="bg-blue-50 p-4 rounded border">
                              <div className="text-sm font-medium mb-2 text-blue-800">✅ 处理完成</div>
                              <div className="text-sm text-blue-700">
                                文件已成功处理并生成.specs格式。所有可用的信息已被结构化存储。
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="text-right text-gray-400">
                    {new Date(file.result.generatedAt).toLocaleTimeString()}
                  </div>
                </div>
              )}

              {file.processingState === "error" && file.error && (
                <p className="text-xs text-red-600">{file.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-gray-50">
      {/* Toast 通知 */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
          已复制到剪切板，发给别的ai吧～
        </div>
      )}
      
      <Header
        isDarkMode={false}
        onToggleTheme={() => {}}
        user={user}
        onLogout={onLogout}
      />

      <div className="max-w-7xl mx-auto p-6">
        {searchParams.get("id") && (
          <div className="flex justify-end mb-6">
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>上传成功 - ID: {searchParams.get("id")}</span>
            </div>
          </div>
        )}

        {renderStepIndicator()}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex h-[600px]">
            {renderUploadSection()}
            {renderProcessSection()}
            {renderResultSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
